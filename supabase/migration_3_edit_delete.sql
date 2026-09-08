-- Roots & Echoes — migration 3: edit/delete a person, remove a photo tag,
-- delete a photo
--
-- schema.sql and storage.sql only ever granted select/insert/update on
-- `people` and `photos` (and their Storage objects) — there was no way to
-- delete either one at the database level, regardless of what the app's
-- own code did. This migration adds exactly the missing delete policies,
-- plus tightens `photo_tags` (see below), so the new store.ts functions
-- (updatePerson, deletePerson, deletePhoto, removePhotoTag) actually work.
--
-- Run this AFTER schema.sql, migration_2_placeholder_fields.sql, and
-- storage.sql, once, in the Supabase SQL editor.

create policy "people: delete with contribute access" on people
  for delete using (has_senior_access(senior_id, true));

create policy "photos: delete with contribute access" on photos
  for delete using (has_senior_access(senior_id, true));

-- Deleting a photo also needs to remove its actual file from Storage, not
-- just the database row — otherwise it's an orphaned object nothing can
-- ever clean up (storage.sql never added a delete policy for either
-- bucket, since nothing needed to delete a file until now).
create policy "photos: delete with contribute access" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and has_senior_access((storage.foldername(name))[1]::uuid, true)
  );

-- photo_tags' original policy (schema.sql) used `has_senior_access(..., false)`
-- — read/view access — for every operation via `for all`, which is looser
-- than every other write in the app (everything else requires contribute
-- access). Removing a tag is exactly the kind of write that policy should
-- have required contribute access for all along, so replace it with two
-- narrower policies instead of one over-permissive one.
drop policy if exists "photo_tags: access via photo" on photo_tags;

create policy "photo_tags: read via photo" on photo_tags
  for select using (
    exists (select 1 from photos p where p.id = photo_id and has_senior_access(p.senior_id, false))
  );

create policy "photo_tags: write with contribute access" on photo_tags
  for insert with check (
    exists (select 1 from photos p where p.id = photo_id and has_senior_access(p.senior_id, true))
  );

create policy "photo_tags: delete with contribute access" on photo_tags
  for delete using (
    exists (select 1 from photos p where p.id = photo_id and has_senior_access(p.senior_id, true))
  );
