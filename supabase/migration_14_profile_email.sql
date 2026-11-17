-- Roots & Echoes — migration 14: each profile carries its sign-in email
--
-- So the "People helping with your story" list in Settings can show each
-- caregiver's email address. Until now the address lived only in Supabase
-- Auth (auth.users), which the app can't read for anyone but the person
-- signed in, so the list showed a name and nothing to tell two people with
-- the same name apart.
--
-- The column is kept in step by the database itself, not by the app: a
-- trigger copies the address from auth.users every time a profile row is
-- inserted or updated, overriding whatever value was supplied. That means
-- nobody can put a different address on their own profile (the existing
-- "self can update own row" policy would otherwise allow it), and a row
-- corrects itself the next time it is saved.
--
-- Run after schema.sql, storage.sql and every earlier migration
-- (migration_2 through migration_13). Safe to run again.

alter table profiles add column if not exists email text;

create or replace function profiles_sync_email() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.email := (select u.email from auth.users u where u.id = new.id);
  return new;
end;
$$;

drop trigger if exists profiles_email_sync on profiles;
create trigger profiles_email_sync
  before insert or update on profiles
  for each row execute function profiles_sync_email();

-- Fill in everyone who already has an account (the trigger does the work).
update profiles set email = null;
