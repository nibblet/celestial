-- Narrative mysteries / setups that the *text itself* raised.
-- Distinct from cel_chapter_questions (reader-asked).
--
-- Namespace: creates cel_open_threads (see 023). TS code uses sb_open_threads
-- via the table-prefix proxy.

create table if not exists public.cel_open_threads (
  id                       uuid primary key default gen_random_uuid(),
  title                    text not null,                                -- "Why is the Vault listening?"
  question                 text not null,
  kind                     text not null default 'mystery'
    check (kind in ('mystery', 'setup', 'contradiction', 'gap')),
  opened_in_chapter_id     text not null,                                -- e.g. 'CH01'
  opened_in_scene_slug     text,                                         -- 'scene-waking-dust'
  resolved                 boolean not null default false,
  resolved_in_chapter_id   text,
  resolved_in_scene_slug   text,
  notes                    text not null default '',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_cel_open_threads_open_chapter
  on public.cel_open_threads (opened_in_chapter_id);
create index if not exists idx_cel_open_threads_resolved
  on public.cel_open_threads (resolved);

alter table public.cel_open_threads enable row level security;

create policy "Anyone can read open_threads"
  on public.cel_open_threads for select using (true);

create policy "Admin or keith can write open_threads"
  on public.cel_open_threads for all
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'keith')
    )
  )
  with check (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'keith')
    )
  );
