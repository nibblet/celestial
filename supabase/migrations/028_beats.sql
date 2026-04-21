-- Beats can target a chapter, a scene, or live free-floating attached to a
-- journey. `why_it_matters` is the teaching payload.
--
-- Namespace: creates cel_beats (see 023). TS uses sb_beats.

create table if not exists public.cel_beats (
  id                uuid primary key default gen_random_uuid(),
  journey_slug      text,                                          -- nullable: beats can exist outside a journey
  chapter_id        text,                                          -- e.g. 'CH04'
  scene_slug        text,                                          -- pairs with chapter_id to target a scene
  act               integer not null check (act between 1 and 5),
  order_index       integer not null,
  beat_type         text not null check (beat_type in (
    'opening', 'inciting', 'rising', 'midpoint', 'climax',
    'falling', 'resolution', 'reveal', 'decision', 'reflection', 'setup', 'payoff'
  )),
  title             text not null,
  summary           text not null default '',
  why_it_matters    text not null default '',
  status            text not null default 'draft' check (status in ('draft', 'published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_cel_beats_journey
  on public.cel_beats (journey_slug, order_index);
create index if not exists idx_cel_beats_chapter
  on public.cel_beats (chapter_id);

alter table public.cel_beats enable row level security;

create policy "Anyone can read published beats"
  on public.cel_beats for select
  using (status = 'published');

create policy "Admin or keith can read all beats"
  on public.cel_beats for select
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'keith')
    )
  );

create policy "Admin or keith can write beats"
  on public.cel_beats for all
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
