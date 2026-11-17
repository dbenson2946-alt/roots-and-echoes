-- Roots & Echoes — migration 13: the Life Story Book (life milestones)
--
-- A curated timeline of the key milestones in a person's life — born,
-- siblings born, school, first job, marriage, children, career
-- milestones, retirement — shown as its own section (the "Life Story
-- Book" tile on Home), separate from Story Time. It is deliberately NOT
-- every Story Time memory: a small set of dated entries (perhaps 15-40)
-- that together span the whole life, up to ~100 years.
--
-- Why its own table rather than a flag on memory_entries: a memory's date
-- is free text ("Summer 1968", "around 2003", or nothing), which can't be
-- placed on a timeline. A milestone needs a real year (month and day
-- optional), so it gets real integer columns here.
--
-- A milestone's photo is a link to a row in the existing `photos` table
-- (photo_id), not a second copy of the file — a photo uploaded while
-- adding a milestone is saved as an ordinary photo in Photos & Family and
-- linked here, and an existing photo can be picked instead. Deleting a
-- milestone therefore never deletes a photo; deleting the photo simply
-- clears the link (on delete set null).
--
-- Also adds two values to the activity_type enum:
--   * 'milestone_added'            — for this feature's Activity entries.
--   * 'life_story_recording_added' — used by the app since migration 11
--     (Life Story Recordings) but never actually added to the enum there,
--     so logging that activity would be rejected by the database. Added
--     here with "if not exists", so it is harmless if it is already there.
--
-- Run this after schema.sql, storage.sql and every earlier migration
-- (migration_2 through migration_12). It can be run as one script: the two
-- new enum values are only added here, not used, which Postgres allows in
-- a single run.

alter type activity_type add value if not exists 'life_story_recording_added';
alter type activity_type add value if not exists 'milestone_added';

create table life_milestones (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  entered_by uuid not null references profiles (id),
  -- what sort of milestone this is (born, school, marriage, ...). Plain
  -- text rather than an enum so new kinds can be added in the app without
  -- another migration; the app falls back to "other" for anything it
  -- doesn't recognize.
  kind text not null default 'other',
  title text not null,
  description text not null default '',
  event_year integer not null check (event_year between 1800 and 2200),
  event_month integer check (event_month between 1 and 12),
  event_day integer check (event_day between 1 and 31),
  photo_id uuid references photos (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table life_milestones enable row level security;

create index life_milestones_senior_year_idx on life_milestones (senior_id, event_year);

-- Same access rules as every other senior-owned table: reading needs view
-- access, any write needs contribute access.
create policy "life_milestones: read with access" on life_milestones
  for select using (has_senior_access(senior_id, false));
create policy "life_milestones: write with contribute access" on life_milestones
  for insert with check (has_senior_access(senior_id, true));
create policy "life_milestones: update with contribute access" on life_milestones
  for update using (has_senior_access(senior_id, true));
create policy "life_milestones: delete with contribute access" on life_milestones
  for delete using (has_senior_access(senior_id, true));
