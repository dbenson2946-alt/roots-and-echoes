-- Roots & Echoes — migration 2: placeholder-content fields + email invites
--
-- schema.sql (migration 1) was written for the fully-real end state, where
-- every photo/art piece/person portrait is a real uploaded image, and where
-- a caregiver invite always names an existing profile. Two things in the
-- live app need small additions on top of that:
--
--   1. The UI still uses generated color-tile placeholders for photos/art/
--      portraits (real upload is a flagged follow-up — see the README's
--      "Photos & audio in this demo"), so those tables need a few extra
--      columns and two NOT NULL constraints relaxed.
--   2. Inviting a caregiver now happens by email (there's no more global
--      profile picker once real accounts exist), and the person being
--      invited may not have signed up yet — so invites need their own
--      table, matched up by email once that person completes onboarding.
--
-- Run this AFTER schema.sql, once, in the Supabase SQL editor.

alter table photos
  alter column storage_path drop not null,
  add column if not exists color_swatch text,
  add column if not exists label text not null default 'Photo';

alter table art_pieces
  add column if not exists color_swatch text,
  add column if not exists label text;

alter table people
  add column if not exists photo_initials text,
  add column if not exists photo_color text;

-- The "record yourself singing" control currently keeps the clip in the
-- browser tab only (not yet uploaded to Storage) — see AudioRecorder.tsx —
-- so a recording row is saved with just a label/timestamp for now.
alter table song_recordings
  alter column audio_path drop not null;

-- Story Time's "record this memory" button is the same story: it captures
-- audio in the browser tab but doesn't upload it yet, so the timeline just
-- needs a flag to show the little headphones icon, not a real audio_path.
alter table memory_entries
  add column if not exists has_audio boolean not null default false;

-- ---------------------------------------------------------------------
-- Missing policy: schema.sql never added an INSERT policy for profiles,
-- so with RLS enabled a brand-new user could never create their own row
-- during onboarding. (select/update were covered; insert was not.)
-- ---------------------------------------------------------------------

create policy "profiles: self can insert own row" on profiles
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- Caregiver invites by email
-- ---------------------------------------------------------------------
-- A senior invites a caregiver by email from Settings. If that email
-- hasn't signed up yet, the invite sits here until they do; the
-- onboarding step (creating a profiles row) checks for and claims any
-- matching invites, turning each into a real caregiver_grants row. Also
-- checked again whenever an existing caregiver revisits the account
-- switcher, in case they were invited after they already had an account.
--
-- senior_name is denormalized (copied from the inviting senior's own
-- profile at invite time) rather than joined, because the invitee's RLS
-- read access to `profiles` doesn't exist yet at the moment they'd need
-- to see it — has_senior_access() only grants that once the grant itself
-- exists, which is exactly the chicken-and-egg this invite is resolving.

create table pending_invites (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  senior_name text not null,
  email text not null,
  permission caregiver_permission not null default 'contribute',
  created_at timestamptz not null default now(),
  unique (senior_id, email)
);

alter table pending_invites enable row level security;

create policy "pending_invites: senior manages own" on pending_invites
  for all using (senior_id = auth.uid()) with check (senior_id = auth.uid());

-- The invitee can see (and, once claimed, delete) invites addressed to
-- their own email — auth.jwt() reads the current session's own token, so
-- this never exposes anyone else's email or invites.
create policy "pending_invites: invitee can read own by email" on pending_invites
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "pending_invites: invitee can delete own by email" on pending_invites
  for delete using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------------------------------------------------------------------
-- Missing policy: schema.sql's caregiver_grants policy only lets the
-- SENIOR insert/update a grant row (`with check (senior_id = auth.uid())`).
-- That's right for revoking, but claiming an invite is the one case where
-- the CAREGIVER needs to create/reactivate their own grant row — so add a
-- narrow, additive policy: a caregiver may insert or reactivate a grant
-- for themselves only when a matching pending_invites row addressed to
-- their own (JWT) email still exists for that senior.
-- ---------------------------------------------------------------------

create policy "grants: caregiver claims own via matching invite" on caregiver_grants
  for insert
  with check (
    caregiver_id = auth.uid()
    and exists (
      select 1 from pending_invites pi
      where pi.senior_id = caregiver_grants.senior_id
        and lower(pi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy "grants: caregiver reactivates own via matching invite" on caregiver_grants
  for update
  using (caregiver_id = auth.uid())
  with check (
    caregiver_id = auth.uid()
    and exists (
      select 1 from pending_invites pi
      where pi.senior_id = caregiver_grants.senior_id
        and lower(pi.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
