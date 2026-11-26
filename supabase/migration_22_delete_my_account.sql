-- Roots & Echoes — migration 22: delete my account
--
-- From the pre-pilot code review (finding 3, second part): there was no way to delete
-- an account. This adds one function, delete_my_account(), that a signed-in person calls
-- for themselves only (it uses their own sign-in, nobody else's).
--
--   * If they are the account owner (a "senior" profile): their login and everything in
--     the story go: memories, photos, people, songs, books, art, recordings, milestones,
--     conversations, family questions, settings, invitations and the list of helpers.
--     Helpers keep their own logins; they simply lose access to this story.
--   * If they are a helper: their login goes. Everything they added to other people's
--     stories stays in those stories, and from then on shows as added by the account
--     owner (a login that no longer exists cannot be named). Invitations sent to their
--     email address are removed.
--
-- The files in Storage (pictures and audio) are NOT removed by this function; the app
-- removes them first, because deleting rows alone leaves the files behind.
--
-- Also: conversations_lock_owner (migration 19) stops anyone changing who started a
-- conversation. It now only applies to people using the app, so this function (which
-- runs with the database owner's rights) can hand a leaving helper's conversations to
-- the account owner.
--
-- Run after migration_21 (and everything before). Safe to run again.

create or replace function conversations_lock_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.senior_id is distinct from old.senior_id
     or new.started_by is distinct from old.started_by
     or new.started_at is distinct from old.started_at then
    raise exception 'A conversation cannot be moved to another account or person';
  end if;
  return new;
end;
$$;

create or replace function delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  my_role text;
  my_email text;
begin
  if me is null then
    raise exception 'You must be signed in';
  end if;

  select p.role::text into my_role from public.profiles p where p.id = me;
  select u.email into my_email from auth.users u where u.id = me;

  if my_role is distinct from 'senior' then
    -- A helper: what they added stays, under the account owner's name.
    update public.memory_entries set entered_by = senior_id where entered_by = me;
    update public.life_story_recordings set entered_by = senior_id where entered_by = me;
    update public.life_milestones set entered_by = senior_id where entered_by = me;
    update public.conversations set started_by = senior_id where started_by = me;
    update public.conversation_messages set entered_by = senior_id where entered_by = me;
    update public.activity_log set acted_by = senior_id where acted_by = me;
  end if;

  if my_email is not null then
    delete from public.pending_invites where lower(email) = lower(my_email);
  end if;

  -- The login itself. Everything that belongs to it follows (profiles and, for an
  -- account owner, the whole story, through the "on delete cascade" links).
  delete from auth.users where id = me;
end;
$$;

revoke all on function delete_my_account() from public;
revoke all on function delete_my_account() from anon;
grant execute on function delete_my_account() to authenticated;
