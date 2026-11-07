-- Adds a per-song YouTube link (David's choice: a plain outbound link,
-- pasted in by a contributor rather than auto-matched — this personal
-- lyrics library includes older/lesser-known recordings where an
-- automatic title/artist search could easily surface the wrong version).
-- No new RLS policy needed: "songs: update with contribute access"
-- (schema.sql) already covers writing any column on a song, this one
-- included — same reasoning as every prior field added to songs
-- (lyrics in §22, title/artist/personal_note in §25).
-- Run this after schema.sql, migration_2, migration_3, migration_4,
-- migration_5, migration_6, and storage.sql.

alter table songs add column if not exists youtube_url text;
