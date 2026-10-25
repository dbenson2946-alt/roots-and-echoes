-- Roots & Echoes — migration 6: real, multiple audio recordings for
-- memories and songs
--
-- Two related fixes, built together since they share the same root cause:
--
--   1. "Record this memory" (Story Time) and "Record yourself singing"
--      (Music) have never actually uploaded the recorded clip anywhere —
--      AudioRecorder.tsx only ever kept it in the browser tab as a
--      temporary blob URL (see its own old doc comment, and migration_2's
--      comments on memory_entries.has_audio / song_recordings.audio_path).
--      Fixed for real now: the component hands back an actual File, which
--      actions.ts uploads via the existing uploadAudioFile() path (same
--      one song audio and the custom voice sample already use).
--   2. A memory or song can now hold more than one recorded/uploaded audio
--      clip, not just one — you can record AND upload for the same memory,
--      and add more any time afterward.
--
-- Run this AFTER schema.sql, migration_2_placeholder_fields.sql,
-- migration_3_edit_delete.sql, migration_4_spouse_and_parents.sql,
-- migration_5_senior_photo_tag.sql, and storage.sql, once, in the Supabase
-- SQL editor.

-- New: memory_recordings, mirroring the existing song_recordings table
-- (schema.sql) — a memory had no equivalent table at all before, since its
-- single has_audio boolean only ever meant "one clip or none," never
-- "which clip(s)."
create table memory_recordings (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memory_entries (id) on delete cascade,
  label text not null default 'Recording',
  audio_path text not null,
  recorded_at timestamptz not null default now()
);
alter table memory_recordings enable row level security;

-- Join-table-style access, inheriting through the parent memory_entries
-- row — same shape as memory_people/memory_photos/memory_art in
-- schema.sql, but split into read/insert/delete from the start so writing
-- actually requires contribute access (the "for all using (...)" shorthand
-- those three still use only ever checked view access, even for insert —
-- harmless there since nothing lets a view-only caregiver reach them
-- client-side, but not a pattern worth repeating for a table real audio
-- files now live behind).
create policy "memory_recordings: read with access" on memory_recordings
  for select using (exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, false)));
create policy "memory_recordings: insert with contribute access" on memory_recordings
  for insert with check (exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, true)));
create policy "memory_recordings: delete with contribute access" on memory_recordings
  for delete using (exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, true)));

-- Tighten song_recordings' access the same way. It previously had one
-- "for all using (...)" policy requiring only view access — fine while
-- every row was just a label with no real file behind it, but now that
-- audio_path is a real uploaded file, insert/delete should require
-- contribute access like every other write in the app (matching the
-- read/insert/delete split migration_3 already did for photo_tags, and
-- migration_4 did for people_parents).
drop policy "song_recordings: access via song" on song_recordings;
create policy "song_recordings: read with access" on song_recordings
  for select using (exists (select 1 from songs s where s.id = song_id and has_senior_access(s.senior_id, false)));
create policy "song_recordings: insert with contribute access" on song_recordings
  for insert with check (exists (select 1 from songs s where s.id = song_id and has_senior_access(s.senior_id, true)));
create policy "song_recordings: delete with contribute access" on song_recordings
  for delete using (exists (select 1 from songs s where s.id = song_id and has_senior_access(s.senior_id, true)));

-- Nothing to change on song_recordings.audio_path itself — migration_2
-- already made it nullable, and that stays as-is: any old label-only rows
-- (from before this fix) are left alone rather than backfilled, they just
-- render with no playback, same as a photo with no image uploaded yet.
-- Every row inserted from here on always carries a real audio_path.
