-- Roots & Echoes — migration 11: Life Story Recordings
--
-- A second, separate capability on the Story Time page, alongside the
-- existing prompted-memory timeline (left completely untouched by this
-- migration — David explicitly likes the existing questions/categories
-- as-is). Where a MemoryEntry is a quick, prompted answer (required
-- category, optional prompt, a typically-short transcript), a Life Story
-- Recording is a longer, standalone piece: a title, a written summary
-- (David's guideline: roughly 300-500 words, not enforced in the
-- database — a soft guideline shown in the UI, not a hard constraint),
-- and one or more audio clips. Deliberately its own pair of tables
-- rather than new nullable columns on memory_entries, so the two kinds of
-- content never blend into one confusing shape.
--
-- Shaped as closely as possible on the existing memory_recordings /
-- song_recordings pattern (migration_6_recordings.sql) specifically so
-- the already-proven pieces carry over unchanged: the signed-upload-
-- ticket audio pipeline (createAudioUploadTicket / uploadAudioDirect,
-- §31, already verified up to 50MB per file), the record-live-or-upload-
-- a-file UI (AudioRecorder.tsx), and the read/insert/delete RLS split
-- every join-style audio table in this app already uses.
--
-- Multiple clips per entry (decided with David) is what keeps a long
-- recording from ever needing a bigger per-file ceiling revisited again —
-- a lengthy conversation can be saved as "Part 1" / "Part 2" / etc.,
-- the same way a memory or song can already hold more than one clip.
--
-- Run this after schema.sql, storage.sql, and every earlier migration
-- (migration_2 through migration_10) — it only adds new tables/policies
-- and touches nothing existing.

create table life_story_recordings (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  entered_by uuid not null references profiles (id),
  title text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
alter table life_story_recordings enable row level security;

create policy "life_story_recordings: read with access" on life_story_recordings
  for select using (has_senior_access(senior_id, false));
create policy "life_story_recordings: write with contribute access" on life_story_recordings
  for insert with check (has_senior_access(senior_id, true));
create policy "life_story_recordings: update with contribute access" on life_story_recordings
  for update using (has_senior_access(senior_id, true));
-- No delete policy for v1, matching songs/books/art_pieces — none of
-- those have one either; only people/photos do (migration_3), because
-- those specifically were the gap David asked to close back then.

create table life_story_recording_clips (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references life_story_recordings (id) on delete cascade,
  label text not null default 'Recording',
  audio_path text not null,
  recorded_at timestamptz not null default now()
);
alter table life_story_recording_clips enable row level security;

-- Same "access flows through the parent row" shape as memory_recordings/
-- song_recordings, split into read/insert/delete from the start (not the
-- looser "for all using (view access)" shorthand some older join tables
-- still use) so writing a real audio file always requires contribute
-- access, matching migration_6's own tightening of this exact pattern.
create policy "life_story_recording_clips: read with access" on life_story_recording_clips
  for select using (exists (
    select 1 from life_story_recordings r
    where r.id = recording_id and has_senior_access(r.senior_id, false)
  ));
create policy "life_story_recording_clips: insert with contribute access" on life_story_recording_clips
  for insert with check (exists (
    select 1 from life_story_recordings r
    where r.id = recording_id and has_senior_access(r.senior_id, true)
  ));
create policy "life_story_recording_clips: delete with contribute access" on life_story_recording_clips
  for delete using (exists (
    select 1 from life_story_recordings r
    where r.id = recording_id and has_senior_access(r.senior_id, true)
  ));
