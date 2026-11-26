-- Roots & Echoes — migration 20: guards against double taps
--
-- From the pre-pilot code review (finding 20): two quick taps (or a slow
-- connection and a second tap) could create two answers in a Let's Talk
-- conversation, or two Story Time memories from one conversation or one
-- answered question.
--
-- What this does
--   * A trigger on conversation_messages refuses an answer from the person
--     talking when the line just before it is already their own answer (the
--     guide has not replied yet). Two answers sent at the same moment are
--     lined up one behind the other, so only the first is accepted.
--   * claim_save() and release_save() let the app "claim" the right to save a
--     conversation or an answered question as a memory, one at a time. A second
--     tap while the first is still saving is told to wait, so only one memory is
--     created. A claim that is never released (the connection dropped) expires
--     after two minutes.
--
-- Run after migration_19 (and everything before). Safe to run again.

-- ---------------------------------------------------------------------
-- 1. One answer at a time
-- ---------------------------------------------------------------------
create or replace function conversation_messages_one_answer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_author text;
begin
  if new.author <> 'senior' then
    return new;
  end if;
  -- Line up simultaneous answers one behind the other.
  perform 1 from public.conversations c where c.id = new.conversation_id for update;
  select m.author into last_author
  from public.conversation_messages m
  where m.conversation_id = new.conversation_id
  order by m.seq desc
  limit 1;
  if last_author = 'senior' then
    raise exception 'That answer was already sent';
  end if;
  return new;
end;
$$;

drop trigger if exists conversation_messages_one_answer on conversation_messages;
create trigger conversation_messages_one_answer
  before insert on conversation_messages
  for each row execute function conversation_messages_one_answer();

-- ---------------------------------------------------------------------
-- 2. One save at a time
-- ---------------------------------------------------------------------
-- The table is only ever touched by the two functions below (row level
-- security is on and there are no policies, so the public API cannot read or
-- write it).
create table if not exists save_claims (
  target_id uuid primary key,
  claimed_at timestamptz not null default now()
);
alter table save_claims enable row level security;

-- Who may save: the senior (or the helper who ran the conversation, with Can add
-- access) for a conversation that has not been saved; the senior for an answered
-- question that has not been kept as a memory.
create or replace function can_claim_save(target uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case kind
    when 'conversation' then exists (
      select 1 from public.conversations c
      where c.id = target
        and c.saved_memory_id is null
        and (c.senior_id = auth.uid()
             or (c.started_by = auth.uid() and public.has_senior_access(c.senior_id, true)))
    )
    when 'question' then exists (
      select 1 from public.family_questions q
      where q.id = target
        and q.senior_id = auth.uid()
        and q.status = 'answered'
        and q.saved_memory_id is null
    )
    else false
  end;
$$;

create or replace function claim_save(target uuid, kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  got uuid;
begin
  if auth.uid() is null or not public.can_claim_save(target, kind) then
    return false;
  end if;
  insert into public.save_claims as s (target_id) values (target)
  on conflict (target_id) do update set claimed_at = now()
    where s.claimed_at < now() - interval '2 minutes'
  returning s.target_id into got;
  return got is not null;
end;
$$;

create or replace function release_save(target uuid, kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  -- Releasing is allowed for the same people who could claim, and also once the
  -- save has gone through (when the conversation or question is no longer
  -- claimable).
  delete from public.save_claims s
  where s.target_id = target
    and (
      public.can_claim_save(target, kind)
      or (kind = 'conversation' and exists (
            select 1 from public.conversations c
            where c.id = target and (c.senior_id = auth.uid() or c.started_by = auth.uid())))
      or (kind = 'question' and exists (
            select 1 from public.family_questions q
            where q.id = target and q.senior_id = auth.uid()))
    );
end;
$$;

revoke all on function can_claim_save(uuid, text) from public, anon, authenticated;
revoke all on function claim_save(uuid, text) from public, anon;
revoke all on function release_save(uuid, text) from public, anon;
grant execute on function claim_save(uuid, text) to authenticated;
grant execute on function release_save(uuid, text) to authenticated;
