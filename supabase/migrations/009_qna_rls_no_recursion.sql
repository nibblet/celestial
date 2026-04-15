-- Break infinite recursion between sb_chapter_questions and sb_chapter_answers
-- RLS policies. The mutual EXISTS subqueries (questions -> answers for the
-- publicly-answered read, answers -> questions for the asker's-private-answer
-- read) formed a cycle that Postgres rejects with 42P17 during
-- INSERT ... RETURNING and during SELECT joins. We route both lookups through
-- SECURITY DEFINER helpers so the planner does not re-enter the other table's
-- policies.

create or replace function public.sb_question_has_public_answer(qid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.sb_chapter_answers
    where question_id = qid and visibility = 'public'
  );
$$;

create or replace function public.sb_question_asker(qid uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select asker_id from public.sb_chapter_questions where id = qid;
$$;

-- Swap in the non-recursive versions of the two policies.

drop policy if exists "Authenticated users read publicly-answered questions"
  on public.sb_chapter_questions;

create policy "Authenticated users read publicly-answered questions"
  on public.sb_chapter_questions for select
  using (
    auth.uid() is not null
    and public.sb_question_has_public_answer(id)
  );

drop policy if exists "Askers read their own private answers"
  on public.sb_chapter_answers;

create policy "Askers read their own private answers"
  on public.sb_chapter_answers for select
  using (
    visibility = 'private'
    and public.sb_question_asker(question_id) = auth.uid()
  );
