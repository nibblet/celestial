-- Reader-facing row-level security for Celestial's cel_* tables.
--
-- Migration 023 cloned the cel_* tables from sb_* with
-- `create table ... (like ... including all)`, which copies columns and
-- indexes but NOT row-level-security policies. RLS is enabled on the clones,
-- so without these policies a signed-in reader cannot save reading progress,
-- favorites, highlights, questions, or update their own profile.
--
-- Only cel_* tables are touched; the memoir app's sb_* tables are untouched.

do $$
declare
  t text;
begin
  -- Tables keyed by user_id: a reader owns their own rows.
  for t in
    select unnest(array['cel_story_reads', 'cel_story_favorites', 'cel_story_highlights'])
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "Readers read own rows" on public.%I', t);
      execute format('create policy "Readers read own rows" on public.%I for select using (auth.uid() = user_id)', t);
      execute format('drop policy if exists "Readers insert own rows" on public.%I', t);
      execute format('create policy "Readers insert own rows" on public.%I for insert with check (auth.uid() = user_id)', t);
      execute format('drop policy if exists "Readers delete own rows" on public.%I', t);
      execute format('create policy "Readers delete own rows" on public.%I for delete using (auth.uid() = user_id)', t);
    end if;
  end loop;

  if to_regclass('public.cel_story_highlights') is not null then
    drop policy if exists "Readers update own highlights" on public.cel_story_highlights;
    create policy "Readers update own highlights" on public.cel_story_highlights
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  -- Profiles: a reader can create and update their own row. (Select-own
  -- already exists from migration 036.) No trigger creates cel_profiles rows
  -- at sign-up, so the app inserts the row on first visit.
  if to_regclass('public.cel_profiles') is not null then
    drop policy if exists "Readers insert own profile" on public.cel_profiles;
    create policy "Readers insert own profile" on public.cel_profiles
      for insert with check (auth.uid() = id);
    drop policy if exists "Readers update own profile" on public.cel_profiles;
    create policy "Readers update own profile" on public.cel_profiles
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;

  -- Error reports from readers.
  if to_regclass('public.cel_story_corrections') is not null then
    drop policy if exists "Readers insert own corrections" on public.cel_story_corrections;
    create policy "Readers insert own corrections" on public.cel_story_corrections
      for insert with check (auth.uid() = user_id);
    drop policy if exists "Readers read own corrections" on public.cel_story_corrections;
    create policy "Readers read own corrections" on public.cel_story_corrections
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- A reader may write only the harmless columns of their own profile. `role`
-- gates the admin and author screens, so it must never be reader-writable:
-- replace the table-wide INSERT/UPDATE grants with column-level ones.
do $$
begin
  if to_regclass('public.cel_profiles') is not null then
    -- Re-reader mode ("I've finished the book") is stored here. The column
    -- was never added to the cel_ clone, so the setting could not persist.
    alter table public.cel_profiles
      add column if not exists show_all_content boolean not null default false;

    revoke insert, update on public.cel_profiles from authenticated, anon;
    grant insert (id, display_name, age, age_mode, has_onboarded, onboarded_at, show_all_content, updated_at)
      on public.cel_profiles to authenticated;
    grant update (display_name, age, age_mode, has_onboarded, onboarded_at, show_all_content, updated_at)
      on public.cel_profiles to authenticated;
  end if;
end $$;
