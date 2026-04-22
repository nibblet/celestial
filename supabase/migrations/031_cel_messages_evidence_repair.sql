-- Repair installs that already applied an older 030 which altered only `sb_messages`
-- and never created `cel_messages` / never added `evidence` there.
-- Safe to run on fresh DBs (everything is IF NOT EXISTS / guarded).

do $$
begin
  if to_regclass('public.sb_conversations') is not null
     and to_regclass('public.cel_conversations') is null then
    execute 'create table if not exists public.cel_conversations (like public.sb_conversations including all)';
    execute 'alter table public.cel_conversations enable row level security';
  end if;
  if to_regclass('public.sb_messages') is not null
     and to_regclass('public.cel_messages') is null then
    execute 'create table if not exists public.cel_messages (like public.sb_messages including all)';
    execute 'alter table public.cel_messages enable row level security';
  end if;
end $$;

do $$
begin
  if to_regclass('public.cel_messages') is not null then
    alter table public.cel_messages
      add column if not exists evidence jsonb;
  end if;
end $$;
