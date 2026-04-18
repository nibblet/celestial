-- Cached narrator-voiced reflection about each user's reading pattern.
-- Generated lazily on /profile render; regenerated only when the user's
-- activity signature has moved meaningfully and the 24h cooldown has passed.

create table public.sb_profile_reflections (
  user_id          uuid        primary key references auth.users(id) on delete cascade,
  reflection_text  text        not null check (char_length(reflection_text) between 10 and 800),
  generated_at     timestamptz not null default now(),
  input_signature  text        not null,
  model_slug       text        not null
);

alter table public.sb_profile_reflections enable row level security;

create policy "Users read own reflection"
  on public.sb_profile_reflections for select
  using (auth.uid() = user_id);

-- Writes are restricted to service role (server-side generator) only.
-- No insert/update/delete policies for authenticated users.
