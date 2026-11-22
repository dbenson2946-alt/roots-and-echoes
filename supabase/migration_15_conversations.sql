-- Roots & Echoes — migration 15: "Let's Talk" conversations (Package A, step 1)
--
-- A scripted back-and-forth between the senior and a "guide" (a persona such
-- as The Neighbor or The Biographer — hand-written prompts, no AI). This adds:
--
--   * conversations          — one row per conversation: who it is for, who
--                              started it, which persona, which mood, whether
--                              it is still open, and the Story Time memory it
--                              was saved as (if the person chose to save it).
--   * conversation_messages  — every line of a conversation: the guide's
--                              questions and the answers given.
--   * conversation_settings  — the account owner's switches: the whole feature
--                              on or off, and which personas are turned off.
--
-- Privacy: a conversation is NOT a memory until the person chooses to save
-- it. Until then only the senior (the account owner) and whoever sat down to
-- run it (a caregiver with "can add" access, helping beside the senior) can
-- read it. Other caregivers cannot. (Step 2 adds a short recap for caregivers
-- and an owner switch for allowing more; it will add its own policies.)
--
-- Run after schema.sql, storage.sql and every earlier migration
-- (migration_2 through migration_14). It is safe to run again.

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  started_by uuid not null references profiles (id),
  persona text not null,
  mood text not null default 'chat',
  status text not null default 'open' check (status in ('open', 'finished')),
  -- the Story Time memory made from this conversation, if it was saved; the
  -- link just clears if that memory is later deleted
  saved_memory_id uuid references memory_entries (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table conversations enable row level security;
create index if not exists conversations_senior_started_idx on conversations (senior_id, started_at desc);

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  -- a plain increasing number, so lines always come back in the order they
  -- were written even when two are saved in the same instant
  seq bigint generated always as identity,
  conversation_id uuid not null references conversations (id) on delete cascade,
  senior_id uuid not null references profiles (id) on delete cascade,
  author text not null check (author in ('persona', 'senior')),
  -- 'prompt' (a new question), 'followup' (a follow-up to it), 'checkpoint'
  -- (the guide offering another question or to save), 'answer' (the senior's)
  kind text not null check (kind in ('prompt', 'followup', 'checkpoint', 'answer')),
  -- who typed an answer: the senior, or a caregiver sitting beside them
  entered_by uuid references profiles (id),
  -- a short warm lead-in ("Thank you for telling me that.") kept apart from
  -- the question itself, so saving a memory can use the question alone
  lead text,
  body text not null,
  -- the hand-written prompt this line came from (see src/content/conversationLibrary.ts)
  prompt_id text,
  -- the song title / person's name / photo label a personalised prompt used
  subject text,
  -- a photo shown with the question; clears if the photo is deleted
  photo_id uuid references photos (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table conversation_messages enable row level security;
create index if not exists conversation_messages_conv_seq_idx on conversation_messages (conversation_id, seq);
create index if not exists conversation_messages_senior_prompt_idx on conversation_messages (senior_id, prompt_id);

create table if not exists conversation_settings (
  senior_id uuid primary key references profiles (id) on delete cascade,
  -- the owner can hide "Let's Talk" entirely
  talk_enabled boolean not null default true,
  -- persona ids the owner has turned off, e.g. {music}
  disabled_personas text[] not null default '{}'
);
alter table conversation_settings enable row level security;

-- ---------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------

-- A conversation can be read and continued by the senior it is for, or by
-- the person who started it for them — as long as that person still has
-- "can add" access.
drop policy if exists "conversations: owner or starter reads" on conversations;
create policy "conversations: owner or starter reads" on conversations
  for select using (
    senior_id = auth.uid()
    or (started_by = auth.uid() and has_senior_access(senior_id, true))
  );

drop policy if exists "conversations: contribute access starts" on conversations;
create policy "conversations: contribute access starts" on conversations
  for insert with check (started_by = auth.uid() and has_senior_access(senior_id, true));

drop policy if exists "conversations: owner or starter updates" on conversations;
create policy "conversations: owner or starter updates" on conversations
  for update using (
    senior_id = auth.uid()
    or (started_by = auth.uid() and has_senior_access(senior_id, true))
  );

drop policy if exists "conversation_messages: owner or starter reads" on conversation_messages;
create policy "conversation_messages: owner or starter reads" on conversation_messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_messages.conversation_id
        and (c.senior_id = auth.uid() or (c.started_by = auth.uid() and has_senior_access(c.senior_id, true)))
    )
  );

drop policy if exists "conversation_messages: owner or starter writes" on conversation_messages;
create policy "conversation_messages: owner or starter writes" on conversation_messages
  for insert with check (
    exists (
      select 1 from conversations c
      where c.id = conversation_messages.conversation_id
        and c.senior_id = conversation_messages.senior_id
        and (c.senior_id = auth.uid() or (c.started_by = auth.uid() and has_senior_access(c.senior_id, true)))
    )
  );

-- Settings: anyone with access to the story can read them (so the Home tile
-- and Let's Talk follow the owner's choices); only the owner changes them.
drop policy if exists "conversation_settings: read with access" on conversation_settings;
create policy "conversation_settings: read with access" on conversation_settings
  for select using (has_senior_access(senior_id, false));

drop policy if exists "conversation_settings: owner writes" on conversation_settings;
create policy "conversation_settings: owner writes" on conversation_settings
  for insert with check (senior_id = auth.uid());

drop policy if exists "conversation_settings: owner updates" on conversation_settings;
create policy "conversation_settings: owner updates" on conversation_settings
  for update using (senior_id = auth.uid());
