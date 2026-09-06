-- Roots & Echoes — Supabase schema
--
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh
-- project to create the real, persistent version of the data model that
-- /src/lib/store.ts currently mocks in memory.
--
-- Auth: this assumes Supabase Auth (auth.users) for login. Each app user
-- (senior or caregiver) has a row in `profiles` keyed by their auth.users id.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Profiles & caregiver access
-- ---------------------------------------------------------------------

create type user_role as enum ('senior', 'caregiver');

create type voice_preset as enum ('default', 'warm', 'bright', 'custom');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  name text not null,
  relationship_label text,
  -- Which voice reads content aloud for this account (senior accounts in
  -- practice). "default"/"warm"/"bright" are all synthesized on the fly by
  -- the browser's own text-to-speech; only "custom" depends on a row in
  -- custom_voices below. Real distinct AI voices and real voice cloning
  -- both need a paid third-party provider (e.g. ElevenLabs) — not wired up
  -- yet, see custom_voices.sample_audio_path.
  voice_preference voice_preset not null default 'default',
  created_at timestamptz not null default now()
);

-- One row per profile (at most): the sample recording behind "custom"
-- voice read-aloud. Kept separate from `profiles` since it's optional and
-- holds a Storage path + consent bookkeeping rather than core identity.
create table custom_voices (
  profile_id uuid primary key references profiles (id) on delete cascade,
  sample_audio_path text not null,  -- Supabase Storage object path, `audio` bucket
  label text not null,
  -- The uploader confirmed they have permission to use this recording
  -- (required at upload time — see the Settings page consent checkbox).
  consent_confirmed boolean not null default false,
  uploaded_at timestamptz not null default now()
);

create type caregiver_permission as enum ('contribute', 'view_only');

create table caregiver_grants (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references profiles (id) on delete cascade,
  senior_id uuid not null references profiles (id) on delete cascade,
  permission caregiver_permission not null default 'contribute',
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (caregiver_id, senior_id)
);

-- ---------------------------------------------------------------------
-- Story Time
-- ---------------------------------------------------------------------

create type memory_category as enum
  ('childhood', 'family', 'work', 'travel', 'music', 'love', 'milestone', 'other');

create table memory_entries (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  entered_by uuid not null references profiles (id),
  category memory_category not null default 'other',
  title text not null,
  transcript text not null,
  memory_date text,             -- free text: "Summer 1968" — memories rarely have exact dates
  prompt text,
  audio_path text,               -- Supabase Storage object path, null if no recording
  recorded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- People, relationships & photos (family tree)
-- ---------------------------------------------------------------------

create type relationship_type as enum
  ('parent', 'child', 'sibling', 'spouse', 'grandparent', 'grandchild',
   'aunt_uncle', 'niece_nephew', 'friend', 'other');

create type living_status as enum ('living', 'deceased', 'unknown');

create table people (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  relationship_to_senior relationship_type not null default 'other',
  relationship_label text,
  notes text,
  living_status living_status default 'living',
  photo_path text,               -- Supabase Storage object path for their portrait, if any
  created_at timestamptz not null default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  storage_path text not null,    -- Supabase Storage object path
  caption text,
  date_taken text,
  linked_memory_id uuid references memory_entries (id) on delete set null,
  created_at timestamptz not null default now()
);

create table photo_tags (
  photo_id uuid not null references photos (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  primary key (photo_id, person_id)
);

-- link table so a memory can reference multiple people / photos
create table memory_people (
  memory_id uuid not null references memory_entries (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  primary key (memory_id, person_id)
);

create table memory_photos (
  memory_id uuid not null references memory_entries (id) on delete cascade,
  photo_id uuid not null references photos (id) on delete cascade,
  primary key (memory_id, photo_id)
);

-- ---------------------------------------------------------------------
-- Music
-- ---------------------------------------------------------------------

create table songs (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  artist text,
  lyrics text,
  personal_note text,
  audio_path text,               -- Supabase Storage object path for the playable track
  linked_memory_id uuid references memory_entries (id) on delete set null,
  created_at timestamptz not null default now()
);

create table song_recordings (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs (id) on delete cascade,
  label text not null default 'Recording',
  audio_path text not null,      -- Supabase Storage object path
  recorded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------
-- Deliberately minimal, mirroring Music's shape without lyrics/audio:
-- a title, an optional author, and a personal note on why it mattered.

create table books (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  author text,
  personal_note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Art
-- ---------------------------------------------------------------------
-- Paintings, sculptures, photography, or other visual art that has made
-- an impression — a title/artist, a medium, and a personal note, with an
-- optional link back to a Story Time memory (e.g. "the day I saw this").

create type art_medium as enum ('painting', 'sculpture', 'photography', 'other');

create table art_pieces (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  medium art_medium not null default 'other',
  title text not null,
  artist text,
  personal_note text,
  prompt text,
  image_path text,               -- Supabase Storage object path for the artwork photo
  linked_memory_id uuid references memory_entries (id) on delete set null,
  created_at timestamptz not null default now()
);

-- link table so a memory can reference multiple pieces of art
create table memory_art (
  memory_id uuid not null references memory_entries (id) on delete cascade,
  art_id uuid not null references art_pieces (id) on delete cascade,
  primary key (memory_id, art_id)
);

-- ---------------------------------------------------------------------
-- Activity tracker
-- ---------------------------------------------------------------------
-- A lightweight, append-only log of "something was added" events across
-- every category, powering the Activity page (recent activity feed + high
-- level usage stats) for the senior and any caregiver helping them. Every
-- add-action writes exactly one row here alongside its normal insert.

create type activity_type as enum (
  'memory_added', 'person_added', 'photo_added', 'photo_tagged',
  'photo_caption_added', 'song_added', 'song_audio_added',
  'recording_added', 'book_added', 'art_added'
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  acted_by uuid not null references profiles (id),
  type activity_type not null,
  summary text not null,
  occurred_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security — the core privacy guarantee
-- ---------------------------------------------------------------------
-- A senior can only ever see/write their own rows. A caregiver can only
-- see/write a senior's rows while they hold an active (non-revoked) grant,
-- and only write when that grant's permission is 'contribute'.

create or replace function has_senior_access(target_senior uuid, require_contribute boolean)
returns boolean language sql stable as $$
  select
    auth.uid() = target_senior
    or exists (
      select 1 from caregiver_grants g
      where g.senior_id = target_senior
        and g.caregiver_id = auth.uid()
        and g.revoked_at is null
        and (not require_contribute or g.permission = 'contribute')
    );
$$;

alter table profiles enable row level security;
alter table custom_voices enable row level security;
alter table caregiver_grants enable row level security;
alter table memory_entries enable row level security;
alter table people enable row level security;
alter table photos enable row level security;
alter table photo_tags enable row level security;
alter table memory_people enable row level security;
alter table memory_photos enable row level security;
alter table songs enable row level security;
alter table song_recordings enable row level security;
alter table books enable row level security;
alter table art_pieces enable row level security;
alter table memory_art enable row level security;
alter table activity_log enable row level security;

create policy "profiles: self or grantor can read" on profiles
  for select using (id = auth.uid() or has_senior_access(id, false));

create policy "profiles: self can update own row" on profiles
  for update using (id = auth.uid());

-- The custom voice sample is only ever set up by the account owner
-- themselves (never a caregiver, even one with contribute access), but
-- anyone with read access to the profile can see/use it for read-aloud.
create policy "custom_voices: read with access" on custom_voices
  for select using (has_senior_access(profile_id, false));
create policy "custom_voices: self manages own row" on custom_voices
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "grants: senior manages, caregiver reads own" on caregiver_grants
  for all using (senior_id = auth.uid() or caregiver_id = auth.uid())
  with check (senior_id = auth.uid());

create policy "memory_entries: read with access" on memory_entries
  for select using (has_senior_access(senior_id, false));
create policy "memory_entries: write with contribute access" on memory_entries
  for insert with check (has_senior_access(senior_id, true));
create policy "memory_entries: update with contribute access" on memory_entries
  for update using (has_senior_access(senior_id, true));

create policy "people: read with access" on people
  for select using (has_senior_access(senior_id, false));
create policy "people: write with contribute access" on people
  for insert with check (has_senior_access(senior_id, true));
create policy "people: update with contribute access" on people
  for update using (has_senior_access(senior_id, true));

create policy "photos: read with access" on photos
  for select using (has_senior_access(senior_id, false));
create policy "photos: write with contribute access" on photos
  for insert with check (has_senior_access(senior_id, true));
create policy "photos: update with contribute access" on photos
  for update using (has_senior_access(senior_id, true));

create policy "songs: read with access" on songs
  for select using (has_senior_access(senior_id, false));
create policy "songs: write with contribute access" on songs
  for insert with check (has_senior_access(senior_id, true));
create policy "songs: update with contribute access" on songs
  for update using (has_senior_access(senior_id, true));

create policy "books: read with access" on books
  for select using (has_senior_access(senior_id, false));
create policy "books: write with contribute access" on books
  for insert with check (has_senior_access(senior_id, true));
create policy "books: update with contribute access" on books
  for update using (has_senior_access(senior_id, true));

create policy "art_pieces: read with access" on art_pieces
  for select using (has_senior_access(senior_id, false));
create policy "art_pieces: write with contribute access" on art_pieces
  for insert with check (has_senior_access(senior_id, true));
create policy "art_pieces: update with contribute access" on art_pieces
  for update using (has_senior_access(senior_id, true));

-- read-only reporting table: any access level (including view_only) can
-- read it, but only a contribute-permission write actually appends a row
create policy "activity_log: read with access" on activity_log
  for select using (has_senior_access(senior_id, false));
create policy "activity_log: write with contribute access" on activity_log
  for insert with check (has_senior_access(senior_id, true));

-- join tables inherit access through their parent row
create policy "photo_tags: access via photo" on photo_tags
  for all using (exists (select 1 from photos p where p.id = photo_id and has_senior_access(p.senior_id, false)));
create policy "memory_people: access via memory" on memory_people
  for all using (exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, false)));
create policy "memory_photos: access via memory" on memory_photos
  for all using (exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, false)));
create policy "memory_art: access via memory" on memory_art
  for all using (exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, false)));
create policy "song_recordings: access via song" on song_recordings
  for all using (exists (select 1 from songs s where s.id = song_id and has_senior_access(s.senior_id, false)));

-- ---------------------------------------------------------------------
-- Storage buckets (run once; Supabase Storage, not plain SQL, but noted
-- here so the whole data setup lives in one place)
-- ---------------------------------------------------------------------
-- supabase storage create-bucket photos --private
-- supabase storage create-bucket audio  --private
-- Mirror the RLS pattern above with Storage policies scoped by senior_id
-- folder prefix (e.g. photos/<senior_id>/<file>), see Supabase Storage docs.
