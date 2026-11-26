-- Roots & Echoes — migration 23: invitations expire after 14 days
--
-- From the pre-pilot code review (pilot gates): an invitation stayed open for ever,
-- so an old invitation to an email address that later changed hands, or that was
-- mistyped, could still be claimed years later.
--
--   * Every invitation now has an expiry time, 14 days after it was created or last
--     sent again. Existing invitations get 14 days from when this is run.
--   * claim_my_invites() ignores an expired invitation. It stays in the owner's list,
--     marked as expired, where it can be sent again (which starts a new 14 days) or
--     cancelled.
--   * People using the app cannot set the expiry themselves: a trigger always sets it
--     to 14 days from now whenever the app saves an invitation. (Edits made in the SQL
--     editor are not restricted, so you can still adjust one by hand.)
--
-- Run after migration_22 (and everything before). Safe to run again.

alter table pending_invites add column if not exists expires_at timestamptz not null default (now() + interval '14 days');

create or replace function pending_invites_set_expiry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.expires_at := now() + interval '14 days';
  end if;
  return new;
end;
$$;

drop trigger if exists pending_invites_set_expiry on pending_invites;
create trigger pending_invites_set_expiry
  before insert or update on pending_invites
  for each row execute function pending_invites_set_expiry();

-- Same function as migration 18, plus: an expired invitation is not claimed.
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
    where lower(i.email) = my_email and i.senior_id <> me and i.expires_at > now()
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
