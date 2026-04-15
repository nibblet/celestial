-- Link a Beyond session back to the reader question that seeded it so the
-- eventual draft can auto-publish as a public answer when submitted.

alter table public.sb_story_sessions
  add column from_question_id uuid
  references public.sb_chapter_questions(id) on delete set null;

create index idx_sb_story_sessions_from_question
  on public.sb_story_sessions(from_question_id)
  where from_question_id is not null;
