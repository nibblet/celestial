-- Saved story passages per user (personal reading highlights)
create table public.sb_story_highlights (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  story_id     text        not null,
  story_title  text        not null default '',
  passage_text text        not null check (char_length(passage_text) between 10 and 1000),
  note         text        check (note is null or char_length(note) <= 500),
  saved_at     timestamptz not null default now()
);

-- No unique constraint — a user can save multiple passages from the same story.
create index idx_sb_story_highlights_user_id
  on public.sb_story_highlights (user_id, saved_at desc);

alter table public.sb_story_highlights enable row level security;

create policy "Users read own highlights"
  on public.sb_story_highlights for select
  using (auth.uid() = user_id);

create policy "Users insert own highlights"
  on public.sb_story_highlights for insert
  with check (auth.uid() = user_id);

create policy "Users delete own highlights"
  on public.sb_story_highlights for delete
  using (auth.uid() = user_id);
