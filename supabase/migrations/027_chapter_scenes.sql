-- DB mirror of the `### Scene N: Title` headings under `## Full Text` in each
-- content/wiki/stories/CH*.md file. Annotations (goal/conflict/outcome, pov,
-- location) are authored on top.
--
-- Namespace: creates cel_chapter_scenes (see 023). TS uses sb_chapter_scenes.

create table if not exists public.cel_chapter_scenes (
  id                  uuid primary key default gen_random_uuid(),
  chapter_id          text not null,                                  -- 'CH01'
  order_index         integer not null,                               -- 1-based
  slug                text not null,                                  -- 'scene-waking-dust'
  title               text not null,                                  -- 'Waking Dust'
  goal                text,                                           -- optional annotation
  conflict            text,
  outcome             text,
  pov                 text,
  location_slug       text,
  -- Cheap ingestion stat; recomputed on every ingest.
  word_count          integer,
  -- Lets us detect when the scene body changed in source.
  content_hash        text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (chapter_id, slug)
);

create index if not exists idx_cel_chapter_scenes_chapter_order
  on public.cel_chapter_scenes (chapter_id, order_index);

alter table public.cel_chapter_scenes enable row level security;

create policy "Anyone can read chapter_scenes"
  on public.cel_chapter_scenes for select using (true);

create policy "Admin or keith can write chapter_scenes"
  on public.cel_chapter_scenes for all
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
