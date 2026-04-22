-- Structured Ask evidence (sources, route, in-answer links) per assistant message.
-- The app reads/writes `cel_*` (see src/lib/supabase/table-prefix.ts). Legacy rows may
-- still live under `sb_*` on shared instances.
--
-- If `023_cel_table_namespace.sql` never ran or `cel_*` were missing, clone from `sb_*`
-- here so `cel_messages` exists before we add `evidence`.

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
  if to_regclass('public.sb_messages') is not null then
    alter table public.sb_messages
      add column if not exists evidence jsonb;
  end if;
end $$;
