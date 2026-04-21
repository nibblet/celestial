-- Cache of author-side "story so far" / session-wrap summaries for the Beyond
-- experience. Mirrors the shape of sb_profile_reflections / cel_profile_reflections
-- so a shared helper can treat both tables uniformly.
--
-- Namespace: creates cel_beyond_reflections (see 023). TS uses sb_beyond_reflections.

create table if not exists public.cel_beyond_reflections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  kind              text not null check (kind in (
    'session_wrap', 'story_so_far', 'draft_digest'
  )),
  target_id         text,                                              -- session id, draft id, or null for cross-draft digest
  reflection_text   text not null check (char_length(reflection_text) between 10 and 4000),
  input_signature   text not null,
  model_slug        text not null,
  ai_interaction_id uuid references public.cel_ai_interactions(id) on delete set null,
  generated_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, kind, target_id)
);

create index if not exists idx_cel_beyond_reflections_user_kind
  on public.cel_beyond_reflections (user_id, kind, generated_at desc);

alter table public.cel_beyond_reflections enable row level security;

create policy "Users read own beyond_reflections"
  on public.cel_beyond_reflections for select
  using (auth.uid() = user_id);

-- Writes are service-role only. No insert/update/delete policies for authenticated users.
