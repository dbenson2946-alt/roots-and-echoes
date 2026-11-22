-- Roots & Echoes — migration 17: Family Questions and Let's Talk recaps
-- (Package A, step 2)
--
-- 1. family_questions: a helper with "can add" access sends the senior a
--    question (optionally with one of the senior's photos). The senior — or a
--    helper sitting beside them — answers by voice or text, or sets it aside.
--    When it is answered the person who asked finds out in the app. The
--    answer is addressed to the person who asked: only the senior, that
--    person, and (while it is still waiting) a helper sitting beside the
--    senior can read it.
--
-- 2. Recaps: every helper with access can see that a Let's Talk conversation
--    happened (which guide, when, how many answers, the topic, whether it was
--    saved) but NOT what was said — unless the account owner switches on
--    "Helpers can read full Let's Talk conversations". To make that possible
--    the recap numbers live on the conversation row itself (answer_count,
--    topic) and the row becomes readable to anyone with access, while the
--    lines of the conversation (conversation_messages) stay private unless
--    that switch is on.
--
-- 3. Two new kinds of Activity entry.
--
-- Run after migration_15 and migration_16 (and everything before). Safe to
-- run again.

-- ---------------------------------------------------------------------
-- Activity entries
-- ---------------------------------------------------------------------
alter type activity_type add value if not exists 'family_question_sent';
alter type activity_type add value if not exists 'family_question_answered';

-- ---------------------------------------------------------------------
-- Family questions
-- ---------------------------------------------------------------------
create table if not exists family_questions (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references profiles (id) on delete cascade,
  asked_by uuid not null references profiles (id) on delete cascade,
  -- the asker's name as it was when they sent it (so a helper beside the
  -- senior can see who it is from without reading other people's profiles)
  asker_name text not null default '',
  body text not null check (char_length(body) between 1 and 600),
  -- optional photo shown with the question; clears if the photo is deleted
  photo_id uuid references photos (id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'answered', 'skipped')),
  answer text,
  -- who typed the answer (the senior, or a helper sitting beside them)
  answered_by uuid references profiles (id) on delete set null,
  answered_at timestamptz,
  -- the person who asked has opened the answer (clears their Home banner)
  seen_by_asker boolean not null default false,
  -- the Story Time memory the answer was saved as, if the senior chose to
  saved_memory_id uuid references memory_entries (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table family_questions enable row level security;
create index if not exists family_questions_senior_status_idx on family_questions (senior_id, status, created_at desc);
create index if not exists family_questions_asker_idx on family_questions (asked_by, created_at desc);

drop policy if exists "family_questions: read" on family_questions;
create policy "family_questions: read" on family_questions
  for select using (
    senior_id = auth.uid()
    or asked_by = auth.uid()
    -- a helper beside the senior can read (and so answer) what is still waiting
    or (status = 'waiting' and has_senior_access(senior_id, true))
  );

drop policy if exists "family_questions: contribute access asks" on family_questions;
create policy "family_questions: contribute access asks" on family_questions
  for insert with check (
    asked_by = auth.uid()
    and asked_by <> senior_id
    and has_senior_access(senior_id, true)
  );

-- Answering, setting aside and saving as a memory by the senior or a helper
-- beside them; "seen" by the person who asked. (The app only ever changes the
-- fields that belong to each of those.)
drop policy if exists "family_questions: update" on family_questions;
create policy "family_questions: update" on family_questions
  for update
  using (
    senior_id = auth.uid()
    or asked_by = auth.uid()
    or (status = 'waiting' and has_senior_access(senior_id, true))
  )
  with check (
    senior_id = auth.uid()
    or asked_by = auth.uid()
    or has_senior_access(senior_id, true)
  );

-- The person who asked can take their own question back; the senior can
-- delete any question to them.
drop policy if exists "family_questions: delete" on family_questions;
create policy "family_questions: delete" on family_questions
  for delete using (senior_id = auth.uid() or asked_by = auth.uid());

-- ---------------------------------------------------------------------
-- Let's Talk recaps and the owner's switch
-- ---------------------------------------------------------------------
alter table conversations add column if not exists answer_count integer not null default 0;
alter table conversations add column if not exists topic text;

-- Fill the count in for conversations that already exist.
update conversations c
set answer_count = (
  select count(*) from conversation_messages m
  where m.conversation_id = c.id and m.author = 'senior'
)
where answer_count = 0;

alter table conversation_settings add column if not exists helpers_read_full boolean not null default false;

-- Anyone with access to the story can see that a conversation happened (the
-- recap); the words are in conversation_messages, below.
drop policy if exists "conversations: owner or starter reads" on conversations;
drop policy if exists "conversations: recap read" on conversations;
create policy "conversations: recap read" on conversations
  for select using (
    senior_id = auth.uid()
    or has_senior_access(senior_id, false)
  );

-- The words of a conversation: the senior, whoever ran it, or — only if the
-- owner has switched it on — any helper with access.
drop policy if exists "conversation_messages: owner or starter reads" on conversation_messages;
drop policy if exists "conversation_messages: read" on conversation_messages;
create policy "conversation_messages: read" on conversation_messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_messages.conversation_id
        and (
          c.senior_id = auth.uid()
          or (c.started_by = auth.uid() and has_senior_access(c.senior_id, true))
          or (
            has_senior_access(c.senior_id, false)
            and exists (
              select 1 from conversation_settings s
              where s.senior_id = c.senior_id and s.helpers_read_full
            )
          )
        )
    )
  );
