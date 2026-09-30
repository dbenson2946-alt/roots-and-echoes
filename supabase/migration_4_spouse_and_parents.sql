-- Roots & Echoes — migration 4: spouse links and specific-parent
-- assignment for the family tree
--
-- Until now `people.relationship_to_senior` was the only relationship
-- recorded, always relative to the senior themselves — there was no way to
-- say "this is David's wife" or "this grandchild belongs to David and
-- Susan specifically". This migration adds exactly those two links:
-- a symmetric spouse pointer on `people`, and a `people_parents` join
-- table (a person can have 0-2 parents on record, referencing other
-- `people` rows — not the senior, who isn't a `people` row at all).
--
-- Run this AFTER schema.sql, migration_2_placeholder_fields.sql,
-- migration_3_edit_delete.sql, and storage.sql, once, in the Supabase SQL
-- editor.

alter table people
  add column spouse_id uuid references people (id) on delete set null;

-- A person can't be their own spouse. (Symmetry — if A's spouse is B, B's
-- spouse is A — is enforced in application code, not a DB constraint,
-- since Postgres can't easily express "these two rows must agree" as a
-- check constraint; src/lib/store.ts's setPersonSpouse always writes both
-- sides together.)
alter table people
  add constraint people_spouse_not_self check (spouse_id is distinct from id);

create table people_parents (
  person_id uuid not null references people (id) on delete cascade,
  parent_id uuid not null references people (id) on delete cascade,
  primary key (person_id, parent_id),
  constraint people_parents_not_self check (person_id <> parent_id)
);

alter table people_parents enable row level security;

-- Same "join table inherits access through its parent row" pattern as
-- photo_tags (see migration_3) — contribute access required to write,
-- view access enough to read.
create policy "people_parents: read via person" on people_parents
  for select using (
    exists (select 1 from people p where p.id = person_id and has_senior_access(p.senior_id, false))
  );

create policy "people_parents: write with contribute access" on people_parents
  for insert with check (
    exists (select 1 from people p where p.id = person_id and has_senior_access(p.senior_id, true))
  );

create policy "people_parents: delete with contribute access" on people_parents
  for delete using (
    exists (select 1 from people p where p.id = person_id and has_senior_access(p.senior_id, true))
  );

-- Note: spouse_id needs no separate RLS policy — it's just a column on
-- `people`, already covered by the existing "people: update with
-- contribute access" policy. The max-2-parents rule is enforced in
-- src/lib/store.ts, not the database.
