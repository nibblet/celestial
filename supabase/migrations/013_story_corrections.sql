-- Story correction reports — lets any reader flag a passage with an OCR/transcription error.
-- Admins triage via /profile/admin.

create table public.sb_story_corrections (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  story_id     text        not null,
  story_title  text        not null default '',
  passage_text text        not null check (char_length(passage_text) between 3 and 1000),
  status       text        not null default 'open'
                           check (status in ('open', 'resolved')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create index idx_sb_story_corrections_status
  on public.sb_story_corrections (status, created_at desc);

alter table public.sb_story_corrections enable row level security;

-- Any authenticated user may submit a report
create policy "Users insert own corrections"
  on public.sb_story_corrections for insert
  with check (auth.uid() = user_id);

-- Admins (role = 'admin') can read, update, and delete any row
create policy "Admins read all corrections"
  on public.sb_story_corrections for select
  using (
    exists (
      select 1 from public.sb_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins update corrections"
  on public.sb_story_corrections for update
  using (
    exists (
      select 1 from public.sb_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins delete corrections"
  on public.sb_story_corrections for delete
  using (
    exists (
      select 1 from public.sb_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Grant admin role to Paul (idempotent — no-op if email not found)
update public.sb_profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'paul.cobb@homevestors.com'
);
