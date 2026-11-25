-- Roots & Echoes — migration 19: link tables, rows that can't move, authorship, storage
--
-- From the pre-pilot code review (findings 13, 14, 22 and parts of 11 and 29):
--   13. A view-only helper could add and remove the links between a memory and
--       its people, photos and art through the public API (the rule only
--       checked view access, for every kind of change).
--   22. Update rules did not stop a helper moving a row to another account (or
--       moving a conversation to their own account) by editing senior_id.
--   29. Authorship columns could be forged: a helper could add a memory, an
--       activity entry or a conversation line "by" someone else.
--   14. Storage: a helper with Can add access could overwrite the senior's custom
--       voice sample (and any other file); audio files could never be deleted;
--       the photos bucket had no file-type or size limit.
--
-- What this does
--   * Link tables: anyone with access can read; only Can add access can add or
--     remove, and the linked person, photo or art piece must belong to the same
--     account as the memory.
--   * A trigger on every table the app edits stops a record being moved to
--     another account (and a conversation changing who started it).
--   * A trigger on the tables that record who added something requires that to
--     be the signed-in person. Lines written by the guide itself stay empty.
--   * Storage: the custom voice sample lives under its own folder, "<account>/voice/",
--     which only the account owner can write to or delete from; everyone with Can add
--     access can delete other audio files; photos are limited to common image types
--     and 25 MB. (Audio keeps its 50 MB limit from migration 9. A file-type limit on
--     audio is deliberately not added: browsers label recordings in several ways and
--     a wrong guess would refuse a real recording.)
--
-- Run after migration_18 (and everything before). Safe to run again.
-- Not changed here: the keys that stop a helper's login being deleted once they
-- have added something. That belongs with the "delete my account" feature.
--
-- If a photo upload is ever refused after this, the one-line way back is:
--   update storage.buckets set allowed_mime_types = null where id = 'photos';

-- ---------------------------------------------------------------------
-- 1. Link tables: read with access, change with Can add access
-- ---------------------------------------------------------------------

drop policy if exists "memory_people: access via memory" on memory_people;
drop policy if exists "memory_people: read via memory" on memory_people;
drop policy if exists "memory_people: add with contribute" on memory_people;
drop policy if exists "memory_people: remove with contribute" on memory_people;
create policy "memory_people: read via memory" on memory_people
  for select using (
    exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, false))
  );
create policy "memory_people: add with contribute" on memory_people
  for insert with check (
    exists (
      select 1 from memory_entries m
      join people p on p.id = person_id and p.senior_id = m.senior_id
      where m.id = memory_id and has_senior_access(m.senior_id, true)
    )
  );
create policy "memory_people: remove with contribute" on memory_people
  for delete using (
    exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, true))
  );

drop policy if exists "memory_photos: access via memory" on memory_photos;
drop policy if exists "memory_photos: read via memory" on memory_photos;
drop policy if exists "memory_photos: add with contribute" on memory_photos;
drop policy if exists "memory_photos: remove with contribute" on memory_photos;
create policy "memory_photos: read via memory" on memory_photos
  for select using (
    exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, false))
  );
create policy "memory_photos: add with contribute" on memory_photos
  for insert with check (
    exists (
      select 1 from memory_entries m
      join photos p on p.id = photo_id and p.senior_id = m.senior_id
      where m.id = memory_id and has_senior_access(m.senior_id, true)
    )
  );
create policy "memory_photos: remove with contribute" on memory_photos
  for delete using (
    exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, true))
  );

drop policy if exists "memory_art: access via memory" on memory_art;
drop policy if exists "memory_art: read via memory" on memory_art;
drop policy if exists "memory_art: add with contribute" on memory_art;
drop policy if exists "memory_art: remove with contribute" on memory_art;
create policy "memory_art: read via memory" on memory_art
  for select using (
    exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, false))
  );
create policy "memory_art: add with contribute" on memory_art
  for insert with check (
    exists (
      select 1 from memory_entries m
      join art_pieces a on a.id = art_id and a.senior_id = m.senior_id
      where m.id = memory_id and has_senior_access(m.senior_id, true)
    )
  );
create policy "memory_art: remove with contribute" on memory_art
  for delete using (
    exists (select 1 from memory_entries m where m.id = memory_id and has_senior_access(m.senior_id, true))
  );

-- ---------------------------------------------------------------------
-- 2. Records can't be moved to another account
-- ---------------------------------------------------------------------

create or replace function lock_senior_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.senior_id is distinct from old.senior_id then
    raise exception 'A record cannot be moved to another account';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'memory_entries', 'people', 'photos', 'songs', 'books', 'art_pieces',
    'life_milestones', 'life_story_recordings'
  ] loop
    execute format('drop trigger if exists lock_senior_id on public.%I', t);
    execute format(
      'create trigger lock_senior_id before update on public.%I for each row execute function public.lock_senior_id()', t
    );
  end loop;
end;
$$;

-- A conversation also keeps the helper who started it and when.
create or replace function conversations_lock_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.senior_id is distinct from old.senior_id
     or new.started_by is distinct from old.started_by
     or new.started_at is distinct from old.started_at then
    raise exception 'A conversation cannot be moved to another account or person';
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_lock_owner on conversations;
create trigger conversations_lock_owner
  before update on conversations
  for each row execute function conversations_lock_owner();

-- ---------------------------------------------------------------------
-- 3. Authorship: "added by" must be the signed-in person
-- ---------------------------------------------------------------------

create or replace function enforce_author()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  col text := tg_argv[0];
  empty_ok boolean := coalesce(tg_argv[1], '') = 'empty_ok';
  val text;
begin
  -- Only people using the app's public API are checked; the SQL editor is not.
  if me is null or current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  val := to_jsonb(new) ->> col;
  if val is null then
    if empty_ok then
      return new;
    end if;
    raise exception 'This must be added under your own name';
  end if;
  if val::uuid is distinct from me then
    raise exception 'This must be added under your own name';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_author on memory_entries;
create trigger enforce_author before insert on memory_entries
  for each row execute function enforce_author('entered_by');

drop trigger if exists enforce_author on life_story_recordings;
create trigger enforce_author before insert on life_story_recordings
  for each row execute function enforce_author('entered_by');

drop trigger if exists enforce_author on life_milestones;
create trigger enforce_author before insert on life_milestones
  for each row execute function enforce_author('entered_by');

drop trigger if exists enforce_author on activity_log;
create trigger enforce_author before insert on activity_log
  for each row execute function enforce_author('acted_by');

-- Lines the guide itself writes have no author; a person's own lines carry theirs.
drop trigger if exists enforce_author on conversation_messages;
create trigger enforce_author before insert on conversation_messages
  for each row execute function enforce_author('entered_by', 'empty_ok');

-- An invitation always has an email address.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pending_invites_email_not_empty') then
    alter table pending_invites add constraint pending_invites_email_not_empty check (email <> '') not valid;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Storage
-- ---------------------------------------------------------------------

-- Common image types and a size cap for photos (this bucket also holds portraits
-- and artwork photos). The audio bucket is left as migration 9 set it.
update storage.buckets
set file_size_limit = 26214400,  -- 25 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'
    ]
where id = 'photos';

-- Anyone with Can add access can add, replace or delete ordinary audio files; the
-- custom voice sample (folder "<account>/voice/") is the account owner's alone.
drop policy if exists "audio: write with contribute access" on storage.objects;
create policy "audio: write with contribute access" on storage.objects
  for insert with check (
    bucket_id = 'audio'
    and (storage.foldername(name))[2] is distinct from 'voice'
    and has_senior_access((storage.foldername(name))[1]::uuid, true)
  );

drop policy if exists "audio: update with contribute access" on storage.objects;
create policy "audio: update with contribute access" on storage.objects
  for update using (
    bucket_id = 'audio'
    and (storage.foldername(name))[2] is distinct from 'voice'
    and has_senior_access((storage.foldername(name))[1]::uuid, true)
  );

drop policy if exists "audio: delete with contribute access" on storage.objects;
create policy "audio: delete with contribute access" on storage.objects
  for delete using (
    bucket_id = 'audio'
    and (storage.foldername(name))[2] is distinct from 'voice'
    and has_senior_access((storage.foldername(name))[1]::uuid, true)
  );

drop policy if exists "audio: owner manages voice sample" on storage.objects;
create policy "audio: owner manages voice sample" on storage.objects
  for all using (
    bucket_id = 'audio'
    and (storage.foldername(name))[2] = 'voice'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  )
  with check (
    bucket_id = 'audio'
    and (storage.foldername(name))[2] = 'voice'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );
