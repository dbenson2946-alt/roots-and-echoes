-- Roots & Echoes — migration 21: deleting memories, songs, books, art and recordings
--
-- From the pre-pilot code review (finding 3): only people, photos, milestones and
-- conversations could be deleted. Memories, songs, books, art pieces and life story
-- recordings had no delete rule at all, so there was no way to remove them.
--
-- What this does
--   * Adds a delete rule to memory_entries, songs, books, art_pieces and
--     life_story_recordings: the account owner, or a helper with "Can add, edit and
--     delete" access, can delete a row in that account. A "View only" helper cannot.
--   * What goes with an item (already the case, nothing new to set up):
--       memory       -> its recordings, its links to people, photos and art
--       song         -> its recordings
--       art piece    -> its links to memories
--       recording    -> its audio clips
--     A photo, person or art piece that was only linked to a memory stays where it is.
--     A conversation, family question or photo that pointed at a deleted memory simply
--     stops pointing at it (they were set up that way).
--   * The app removes the stored audio and picture files itself after the row is gone.
--     Deleting those files is already allowed (migrations 3 and 19).
--
-- Run after migration_20 (and everything before). Safe to run again.

drop policy if exists "memory_entries: delete with contribute access" on memory_entries;
create policy "memory_entries: delete with contribute access" on memory_entries
  for delete using (has_senior_access(senior_id, true));

drop policy if exists "songs: delete with contribute access" on songs;
create policy "songs: delete with contribute access" on songs
  for delete using (has_senior_access(senior_id, true));

drop policy if exists "books: delete with contribute access" on books;
create policy "books: delete with contribute access" on books
  for delete using (has_senior_access(senior_id, true));

drop policy if exists "art_pieces: delete with contribute access" on art_pieces;
create policy "art_pieces: delete with contribute access" on art_pieces
  for delete using (has_senior_access(senior_id, true));

drop policy if exists "life_story_recordings: delete with contribute access" on life_story_recordings;
create policy "life_story_recordings: delete with contribute access" on life_story_recordings
  for delete using (has_senior_access(senior_id, true));
