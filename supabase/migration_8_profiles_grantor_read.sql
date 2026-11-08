-- NOTE: the policy this migration creates below has its own bug -- a
-- Postgres column-name-shadowing trap inside the EXISTS subquery (bare
-- `id` resolving to caregiver_grants.id instead of the intended outer
-- profiles.id) that makes its third clause never match anything. See
-- migration_10_profiles_grantor_read_fix.sql, which replaces this same
-- policy with the corrected, explicitly-qualified version. Run both, in
-- order, rather than stopping after this one.
--
-- Fixes a real bug reported by David: caregivers he had already added to
-- his senior account were not showing up in Settings' "People helping with
-- your story" list, even though the grant giving them access was real and
-- active.
--
-- Root cause, confirmed by reading the policy directly: the original
-- "profiles: self or grantor can read" policy (schema.sql) only ever
-- supported one direction of access, despite its name. It reads:
--
--   for select using (id = auth.uid() or has_senior_access(id, false));
--
-- has_senior_access(target_senior, ...) answers "does the current user
-- have a caregiver grant for the senior named target_senior" -- it checks
-- for a row where g.senior_id = target_senior and g.caregiver_id =
-- auth.uid(). That lets a caregiver read the *senior's* profile (id =
-- senior_id). It never lets the *senior* read a *caregiver's* profile
-- (id = caregiver_id) -- in that direction, has_senior_access(id, false)
-- checks for a grant where senior_id equals the caregiver's own profile
-- id, which is never true.
--
-- The Settings page's code was already correct: getActiveGrantsForSenior()
-- found the real, active grant, then called getProfile(grant.caregiverId)
-- to get that caregiver's name/relationship label -- but that query came
-- back empty under RLS, and the page's `if (!caregiver) return null;`
-- silently dropped that caregiver from the rendered list instead of
-- erroring. This affected every senior account, not just David's.
--
-- The fix: add the missing third direction -- a senior may also read the
-- profile of anyone who holds an active grant *on their own account* --
-- alongside the two that already worked (reading your own row; a
-- caregiver reading the senior they have access to).
--
-- Run this after schema.sql, migration_2 through migration_7, and
-- storage.sql.

drop policy if exists "profiles: self or grantor can read" on profiles;

create policy "profiles: self, grantor, or granted caregiver can read" on profiles
  for select using (
    id = auth.uid()
    or has_senior_access(id, false)
    or exists (
      select 1 from caregiver_grants g
      where g.caregiver_id = id
        and g.senior_id = auth.uid()
        and g.revoked_at is null
    )
  );
