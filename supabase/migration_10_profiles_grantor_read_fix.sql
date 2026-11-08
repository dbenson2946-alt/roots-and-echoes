-- Fixes a second, more subtle bug in the exact same policy migration_8
-- shipped -- migration_8's own fix for "caregivers aren't showing up in
-- Settings" turned out to still not actually work in production, for a
-- different reason than the one migration_8 diagnosed and fixed.
--
-- Root cause, confirmed empirically (not just by re-reading the SQL),
-- after David reported the caregiver list was *still* empty even after
-- running migration_8 in full: migration_8's new policy looked completely
-- correct by inspection --
--
--   create policy "profiles: self, grantor, or granted caregiver can read"
--   on profiles
--     for select using (
--       id = auth.uid()
--       or has_senior_access(id, false)
--       or exists (
--         select 1 from caregiver_grants g
--         where g.caregiver_id = id
--           and g.senior_id = auth.uid()
--           and g.revoked_at is null
--       )
--     );
--
-- -- but the bare `id` inside that EXISTS subquery is a Postgres
-- column-name-shadowing trap: `caregiver_grants` has its own primary key
-- column also named `id`. Inside the subquery's own FROM clause, an
-- unqualified `id` resolves to the *inner* table's column (g.id) before
-- it ever considers the outer, correlated `profiles.id` -- silently, with
-- no error or warning. So the condition actually being checked was
-- `g.caregiver_id = g.id` (a grant row's own primary key compared to its
-- own caregiver_id), which is never true. The policy's third clause never
-- matched anything, for any grant, ever -- it just happened to look right
-- on a plain pg_policies text read.
--
-- Confirmed fixed by simulating a real signed-in session directly in the
-- SQL editor (not just checking the policy's text):
--
--   begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub": "<caregiver-uuid>", "role": "authenticated"}';
--   select id, name, role from profiles where id = '<senior-uuid>';
--   rollback;
--
-- which returned nothing before this fix and the expected row after it.
--
-- Lesson for any future RLS policy work in this project: prove a policy
-- change with a simulated-session test like the one above, not only a
-- pg_policies text check -- this exact bug passed that weaker check
-- twice (once when migration_8 was written, again when David first
-- re-ran it) before the empirical test caught it.
--
-- Run this after migration_8_profiles_grantor_read.sql (and everything
-- migration_8 itself needs to run after).

drop policy if exists "profiles: self, grantor, or granted caregiver can read" on profiles;

create policy "profiles: self, grantor, or granted caregiver can read" on profiles
  for select using (
    id = auth.uid()
    or has_senior_access(id, false)
    or exists (
      select 1 from caregiver_grants g
      where g.caregiver_id = profiles.id
        and g.senior_id = auth.uid()
        and g.revoked_at is null
    )
  );
