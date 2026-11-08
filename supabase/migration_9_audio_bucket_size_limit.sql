-- Raises the `audio` Storage bucket's own file-size limit to match the
-- app's 50MB client-side cap (src/lib/ui.ts's MAX_AUDIO_UPLOAD_BYTES).
--
-- Audio uploads (song audio, memory/song recordings, the custom read-aloud
-- voice sample) used to route through a Server Action, bounded by Vercel's
-- hard, non-configurable 4.5MB function request-body limit — a real
-- constraint for anything longer than a few minutes of recording. The app
-- now uploads audio the same way photos already did (see
-- createAudioUploadTicket / uploadAudioDirect): straight from the browser
-- to Supabase Storage with a one-time signed upload token, bypassing
-- Vercel's function entirely.
--
-- 50MB, not the 100MB David originally asked for: this Supabase project's
-- Storage dashboard (Settings -> Storage) caps its own global upload-size
-- setting at 50MB as a hard maximum -- confirmed directly in the
-- dashboard, where 50MB is the largest selectable value. A per-bucket
-- file_size_limit (set here) can never exceed that project-wide ceiling,
-- so 50MB is the real limit regardless of what this column is set to;
-- matching it here (rather than leaving it at the originally-planned
-- 100MB) keeps this file honest about what the app actually allows.
--
-- The `audio` bucket itself was created in storage.sql with no explicit
-- file_size_limit, so it was silently governed by the project's global
-- Storage upload-size setting alone until this migration gave it its own
-- explicit, version-controlled value.
--
-- Run this after schema.sql, storage.sql, and migration_2 through
-- migration_8 (and ideally migration_10, though the order between this
-- and migration_10 doesn't matter -- they touch unrelated tables).

update storage.buckets
set file_size_limit = 52428800  -- 50 MiB, in bytes -- this project's own Storage dashboard maximum
where id = 'audio';
