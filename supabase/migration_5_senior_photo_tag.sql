-- Roots & Echoes — migration 5: let the senior tag themselves in a photo
--
-- The account owner (the senior) has never been a row in `people` — that
-- table is only everyone *else* in their life (family & friends). That's
-- fine for the family tree, but it meant there was no way to tag the
-- senior as present in one of their own photos: the "Tag someone in this
-- photo" picker is built entirely from `people`, so the one person every
-- photo-tagging screen could never offer was the person the app is for.
--
-- Rather than inventing a fake `people` row for the senior (which would
-- also show up in the family tree, the Spouse/Parent pickers, etc. — not
-- what this is about), this adds one simple boolean directly on `photos`:
-- "the senior is in this photo too". No new table, no new RLS policy
-- needed — toggling it is just an ordinary update to a `photos` row,
-- already covered by the existing "photos: update with contribute access"
-- policy in schema.sql.
--
-- Run this AFTER schema.sql, migration_2_placeholder_fields.sql,
-- migration_3_edit_delete.sql, migration_4_spouse_and_parents.sql, and
-- storage.sql, once, in the Supabase SQL editor.

alter table photos
  add column senior_tagged boolean not null default false;
