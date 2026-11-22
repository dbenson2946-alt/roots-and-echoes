-- Migration 16: let a conversation be deleted from Let's Talk.
--
-- The senior it is for, or the person who started it (while they still have
-- "can add" access), may delete it. Its lines go with it (conversation_messages
-- cascades). A memory that was saved from it is NOT touched.
-- Safe to run more than once.

drop policy if exists "conversations: owner or starter deletes" on conversations;
create policy "conversations: owner or starter deletes" on conversations
  for delete using (
    senior_id = auth.uid()
    or (started_by = auth.uid() and has_senior_access(senior_id, true))
  );
