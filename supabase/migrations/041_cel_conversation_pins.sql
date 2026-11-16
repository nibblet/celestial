-- Threads: a reader pins a conversation with the archive to keep it as a
-- saved line of inquiry. Existing row-level policies on cel_conversations
-- already limit select/update to the owner.
alter table public.cel_conversations
  add column if not exists pinned_at timestamptz;

create index if not exists cel_conversations_pinned_idx
  on public.cel_conversations (user_id, pinned_at desc)
  where pinned_at is not null;
