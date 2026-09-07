-- Roots & Echoes — storage buckets + policies
--
-- Run this AFTER schema.sql and migration_2_placeholder_fields.sql, once,
-- in the Supabase SQL editor. Buckets can be created via SQL just like any
-- other Supabase Storage setup — no separate dashboard clicking needed.
--
-- Both buckets are used by the app: `audio` for song audio uploads + the
-- custom read-aloud voice sample, and `photos` for photo and art-piece
-- image uploads (photos.storage_path / art_pieces.image_path in schema.sql,
-- uploaded via src/lib/storage.ts's uploadPhotoFile).

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Objects are stored as `<senior_id>/<filename>` within each bucket, so
-- access can be checked with the same has_senior_access() function schema.sql
-- already defines, keyed off the first path segment.

create policy "audio: read with access" on storage.objects
  for select using (
    bucket_id = 'audio'
    and has_senior_access((storage.foldername(name))[1]::uuid, false)
  );

create policy "audio: write with contribute access" on storage.objects
  for insert with check (
    bucket_id = 'audio'
    and has_senior_access((storage.foldername(name))[1]::uuid, true)
  );

create policy "audio: update with contribute access" on storage.objects
  for update using (
    bucket_id = 'audio'
    and has_senior_access((storage.foldername(name))[1]::uuid, true)
  );

create policy "photos: read with access" on storage.objects
  for select using (
    bucket_id = 'photos'
    and has_senior_access((storage.foldername(name))[1]::uuid, false)
  );

create policy "photos: write with contribute access" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and has_senior_access((storage.foldername(name))[1]::uuid, true)
  );

create policy "photos: update with contribute access" on storage.objects
  for update using (
    bucket_id = 'photos'
    and has_senior_access((storage.foldername(name))[1]::uuid, true)
  );
