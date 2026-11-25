-- Roots & Echoes — migration 18: close the invite, grant and Family Questions holes
--
-- From the pre-pilot code review (findings 1, 2 and 10):
--   1. A helper invited as "view only" could write their own grant row through
--      the public API with permission "contribute" (the claim policy never
--      compared the permission to the invite).
--   10. Any signed-in user could attach another user to their own account
--       (and so read that person's name and email) by inserting a grant row.
--   2. Family Questions rows could be forged or hijacked through the API: the
--      asker, or any helper with Can add access while a question waited, could
--      change the answer, status, who answered, who asked, or which senior the
--      row belonged to; a removed helper kept access to questions they asked.
--
-- What this does
--   * Claiming an invite now goes through one function, claim_my_invites(),
--     which copies the invite's own permission. Nobody can insert a grant row
--     directly any more (there is no insert policy), and a grant can never be
--     moved to another person.
--   * Answering or setting aside a Family Question now goes through two
--     functions, answer_family_question() and skip_family_question(), which
--     check who is calling. (Before this, a helper beside the senior was
--     refused by the database as soon as their answer hid the row from them.)
--   * A trigger on family_questions fixes who sent a question and what its
--     name is, starts every row as "waiting", and allows nobody to change the
--     question, its owner, its sender, its status or its answer directly. The
--     person who asked may mark an answer as seen; only the senior may link the
--     answer to a Story Time memory.
--   * A person who asked a question keeps access to it only while they still
--     have a live grant on that senior's account.
--
-- Run after migration_17 (and everything before). Safe to run again.
-- Edits made in the SQL editor (not through the app) are not restricted by the
-- trigger, so you can still repair a row by hand.

-- ---------------------------------------------------------------------
-- 0. The access check itself
-- ---------------------------------------------------------------------
-- Same rule as before, but it no longer depends on the caller's search path
-- (the functions below run with an empty one, and call this through the
-- table rules).
create or replace function has_senior_access(target_senior uuid, require_contribute boolean)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    auth.uid() = target_senior
    or exists (
      select 1 from public.caregiver_grants g
      where g.senior_id = target_senior
        and g.caregiver_id = auth.uid()
        and g.revoked_at is null
        and (not require_contribute or g.permission = 'contribute')
    );
$$;

-- ---------------------------------------------------------------------
-- 1. Invites and grants
-- ---------------------------------------------------------------------

create or replace function claim_my_invites()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  inv record;
  claimed integer := 0;
begin
  if me is null or my_email = '' then
    return 0;
  end if;
  -- The profile must exist first (onboarding creates it).
  if not exists (select 1 from public.profiles p where p.id = me) then
    return 0;
  end if;

  for inv in
    select i.id, i.senior_id, i.permission
    from public.pending_invites i
    where lower(i.email) = my_email and i.senior_id <> me
  loop
    insert into public.caregiver_grants (caregiver_id, senior_id, permission, granted_at, revoked_at)
    values (me, inv.senior_id, inv.permission, now(), null)
    on conflict (caregiver_id, senior_id) do update
      set permission = excluded.permission, revoked_at = null, granted_at = now();
    delete from public.pending_invites where id = inv.id;
    claimed := claimed + 1;
  end loop;

  return claimed;
end;
$$;

revoke all on function claim_my_invites() from public, anon;
grant execute on function claim_my_invites() to authenticated;

drop policy if exists "grants: senior manages, caregiver reads own" on caregiver_grants;
drop policy if exists "grants: caregiver claims own via matching invite" on caregiver_grants;
drop policy if exists "grants: caregiver reactivates own via matching invite" on caregiver_grants;
drop policy if exists "grants: read own" on caregiver_grants;
drop policy if exists "grants: senior changes" on caregiver_grants;
drop policy if exists "grants: senior or helper removes" on caregiver_grants;

-- No insert policy on purpose: grants are created only by claim_my_invites().
create policy "grants: read own" on caregiver_grants
  for select using (senior_id = auth.uid() or caregiver_id = auth.uid());

-- The senior can revoke, restore or change the level of a grant.
create policy "grants: senior changes" on caregiver_grants
  for update using (senior_id = auth.uid()) with check (senior_id = auth.uid());

create policy "grants: senior or helper removes" on caregiver_grants
  for delete using (senior_id = auth.uid() or caregiver_id = auth.uid());

create or replace function caregiver_grants_lock_ids()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.senior_id is distinct from old.senior_id or new.caregiver_id is distinct from old.caregiver_id then
    raise exception 'A grant cannot be moved to another person';
  end if;
  return new;
end;
$$;

drop trigger if exists caregiver_grants_lock_ids on caregiver_grants;
create trigger caregiver_grants_lock_ids
  before update on caregiver_grants
  for each row execute function caregiver_grants_lock_ids();

-- ---------------------------------------------------------------------
-- 2. Family Questions
-- ---------------------------------------------------------------------

-- Reading: the senior; the person who asked (while they still have access);
-- a helper with Can add access, while the question is still waiting.
drop policy if exists "family_questions: read" on family_questions;
create policy "family_questions: read" on family_questions
  for select using (
    senior_id = auth.uid()
    or (asked_by = auth.uid() and has_senior_access(senior_id, false))
    or (status = 'waiting' and has_senior_access(senior_id, true))
  );

-- Sending: a helper with Can add access, never the senior. (The trigger below
-- fills in who sent it and starts it as "waiting".)
drop policy if exists "family_questions: contribute access asks" on family_questions;
create policy "family_questions: contribute access asks" on family_questions
  for insert with check (
    asked_by = auth.uid()
    and asked_by <> senior_id
    and has_senior_access(senior_id, true)
  );

-- Direct updates are for the senior (linking a memory) and the person who
-- asked (marking an answer seen). The trigger limits them to exactly that.
-- Answering and setting aside go through the two functions further down.
drop policy if exists "family_questions: update" on family_questions;
create policy "family_questions: update" on family_questions
  for update
  using (
    senior_id = auth.uid()
    or (asked_by = auth.uid() and has_senior_access(senior_id, false))
  )
  with check (
    senior_id = auth.uid()
    or (asked_by = auth.uid() and has_senior_access(senior_id, false))
  );

-- The senior can delete any question to them; the person who asked can take
-- their own back while they still have access.
drop policy if exists "family_questions: delete" on family_questions;
create policy "family_questions: delete" on family_questions
  for delete using (
    senior_id = auth.uid()
    or (asked_by = auth.uid() and has_senior_access(senior_id, false))
  );

create or replace function family_questions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  -- Only people using the app's public API are restricted. The SQL editor and
  -- the functions below run as the database owner and are not.
  if me is null or current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.asked_by := me;
    new.asker_name := coalesce((select p.name from public.profiles p where p.id = me), '');
    new.status := 'waiting';
    new.answer := null;
    new.answered_by := null;
    new.answered_at := null;
    new.seen_by_asker := false;
    new.saved_memory_id := null;
    if new.photo_id is not null and not exists (
      select 1 from public.photos ph where ph.id = new.photo_id and ph.senior_id = new.senior_id
    ) then
      raise exception 'That photo does not belong to this account';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.id is distinct from old.id
     or new.senior_id is distinct from old.senior_id
     or new.asked_by is distinct from old.asked_by
     or new.asker_name is distinct from old.asker_name
     or new.body is distinct from old.body
     or new.photo_id is distinct from old.photo_id
     or new.created_at is distinct from old.created_at then
    raise exception 'A question cannot be changed once it is sent';
  end if;

  if new.status is distinct from old.status
     or new.answer is distinct from old.answer
     or new.answered_by is distinct from old.answered_by
     or new.answered_at is distinct from old.answered_at then
    raise exception 'Questions are answered or set aside only through the app';
  end if;

  if new.seen_by_asker is distinct from old.seen_by_asker then
    if me is distinct from old.asked_by or old.status <> 'answered' or new.seen_by_asker is not true then
      raise exception 'Only the person who asked can mark an answer as seen';
    end if;
  end if;

  if new.saved_memory_id is distinct from old.saved_memory_id then
    if me is distinct from old.senior_id or old.status <> 'answered' then
      raise exception 'Only the senior can keep an answer as a memory';
    end if;
    if new.saved_memory_id is not null and not exists (
      select 1 from public.memory_entries m where m.id = new.saved_memory_id and m.senior_id = old.senior_id
    ) then
      raise exception 'That memory does not belong to this account';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists family_questions_guard on family_questions;
create trigger family_questions_guard
  before insert or update on family_questions
  for each row execute function family_questions_guard();

-- Answering: the senior, or a helper with Can add access beside them, while the
-- question is waiting. Not the person who asked.
create or replace function answer_family_question(question_id uuid, answer_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  q public.family_questions;
begin
  if me is null then
    raise exception 'Please sign in';
  end if;
  answer_text := btrim(coalesce(answer_text, ''));
  if char_length(answer_text) < 1 or char_length(answer_text) > 4000 then
    raise exception 'An answer must be between 1 and 4000 characters';
  end if;

  select * into q from public.family_questions where id = question_id for update;
  if not found or not (q.senior_id = me or public.has_senior_access(q.senior_id, true)) then
    raise exception 'That question was not found';
  end if;
  if q.asked_by = me then
    raise exception 'You cannot answer your own question';
  end if;
  if q.status <> 'waiting' then
    raise exception 'This question has already been answered or set aside';
  end if;

  update public.family_questions
  set status = 'answered', answer = answer_text, answered_by = me, answered_at = now()
  where id = question_id;
end;
$$;

-- Setting aside ("Not now" / "Skip this one"): same people as answering.
create or replace function skip_family_question(question_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  q public.family_questions;
begin
  if me is null then
    raise exception 'Please sign in';
  end if;

  select * into q from public.family_questions where id = question_id for update;
  if not found or not (q.senior_id = me or public.has_senior_access(q.senior_id, true)) then
    raise exception 'That question was not found';
  end if;
  if q.asked_by = me then
    raise exception 'You cannot set aside your own question; take it back instead';
  end if;
  if q.status <> 'waiting' then
    raise exception 'This question has already been answered or set aside';
  end if;

  update public.family_questions set status = 'skipped' where id = question_id;
end;
$$;

revoke all on function answer_family_question(uuid, text) from public, anon;
revoke all on function skip_family_question(uuid) from public, anon;
grant execute on function answer_family_question(uuid, text) to authenticated;
grant execute on function skip_family_question(uuid) to authenticated;
