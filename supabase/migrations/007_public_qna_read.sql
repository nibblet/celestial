-- Allow any authenticated user to read a question when a public answer exists
-- for it. Needed so the per-chapter FAQ can render other readers' questions
-- alongside the public answer.

create policy "Authenticated users read publicly-answered questions"
  on public.sb_chapter_questions for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.sb_chapter_answers a
      where a.question_id = sb_chapter_questions.id
        and a.visibility = 'public'
    )
  );
