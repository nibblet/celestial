-- Reader questions about a chapter, and Keith's answers.
-- A question can yield a lightweight inline answer (answer_text) or a full
-- Volume 2 chapter draft (linked_draft_id) seeded from the question. RLS uses
-- the 'keith' role added in 005_keith_role.sql to gate steward operations.

create table public.sb_chapter_questions (
  id uuid primary key default gen_random_uuid(),
  asker_id uuid not null references public.sb_profiles(id) on delete cascade,
  story_id text not null,
  category text check (category in ('person', 'place', 'object', 'timeline', 'other')),
  context_excerpt text,
  question text not null,
  age_mode text check (age_mode in ('young_reader', 'teen', 'adult')),
  status text not null default 'pending'
    check (status in ('pending', 'answered', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sb_chapter_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.sb_chapter_questions(id) on delete cascade,
  answerer_id uuid not null references public.sb_profiles(id),
  answer_text text,
  linked_draft_id uuid references public.sb_story_drafts(id) on delete set null,
  visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sb_chapter_answers_has_content
    check (answer_text is not null or linked_draft_id is not null)
);

create index idx_sb_chapter_questions_story on public.sb_chapter_questions(story_id);
create index idx_sb_chapter_questions_status on public.sb_chapter_questions(status);
create index idx_sb_chapter_questions_asker on public.sb_chapter_questions(asker_id);
create index idx_sb_chapter_answers_question on public.sb_chapter_answers(question_id);

alter table public.sb_chapter_questions enable row level security;
alter table public.sb_chapter_answers enable row level security;

-- sb_chapter_questions: asker-scoped read, Keith reads all.
create policy "Askers read their own questions"
  on public.sb_chapter_questions for select
  using (auth.uid() = asker_id);

create policy "Keith reads all questions"
  on public.sb_chapter_questions for select
  using (
    exists (
      select 1 from public.sb_profiles
      where sb_profiles.id = auth.uid()
        and sb_profiles.role = 'keith'
    )
  );

create policy "Askers create their own questions"
  on public.sb_chapter_questions for insert
  with check (auth.uid() = asker_id);

create policy "Keith updates questions"
  on public.sb_chapter_questions for update
  using (
    exists (
      select 1 from public.sb_profiles
      where sb_profiles.id = auth.uid()
        and sb_profiles.role = 'keith'
    )
  );

-- sb_chapter_answers: public answers visible to any authenticated user; private
-- answers readable only by the original asker; Keith reads and writes all.
create policy "Authenticated users read public answers"
  on public.sb_chapter_answers for select
  using (visibility = 'public' and auth.uid() is not null);

create policy "Askers read their own private answers"
  on public.sb_chapter_answers for select
  using (
    visibility = 'private'
    and exists (
      select 1 from public.sb_chapter_questions q
      where q.id = sb_chapter_answers.question_id
        and q.asker_id = auth.uid()
    )
  );

create policy "Keith reads all answers"
  on public.sb_chapter_answers for select
  using (
    exists (
      select 1 from public.sb_profiles
      where sb_profiles.id = auth.uid()
        and sb_profiles.role = 'keith'
    )
  );

create policy "Keith writes answers"
  on public.sb_chapter_answers for insert
  with check (
    answerer_id = auth.uid()
    and exists (
      select 1 from public.sb_profiles
      where sb_profiles.id = auth.uid()
        and sb_profiles.role = 'keith'
    )
  );

create policy "Keith updates answers"
  on public.sb_chapter_answers for update
  using (
    exists (
      select 1 from public.sb_profiles
      where sb_profiles.id = auth.uid()
        and sb_profiles.role = 'keith'
    )
  );
