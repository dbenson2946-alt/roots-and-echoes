-- Raises the `audio` Storage bucket's own file-size limit to match the
-- app's new 100MB client-side cap (src/lib/ui.ts's MAX_AUDIO_UPLOAD_BYTES).
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
-- The `audio` bucket itself was created in storage.sql with no explicit
-- file_size_limit, so it was silently governed by this project's global
-- Storage upload-size setting (Dashboard -> Storage -> Settings) instead.
-- This migration sets an explicit per-bucket limit so the real ceiling is
-- version-controlled here rather than living only in a dashboard setting —
-- but the project's global Storage limit, if set lower than 100MB, will
-- still cap uploads beneath this value. Worth checking that dashboard
-- setting if a large upload still fails after this runs.
--
-- Run this after schema.sql, storage.sql, and migration_2 through
-- migration_8.

update storage.buckets
set file_size_limit = 104857600  -- 100 MiB, in bytes
where id = 'audio';
