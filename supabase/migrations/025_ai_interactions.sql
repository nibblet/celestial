-- Append-only ledger of every server-side AI call.
--
-- Namespace: Celestial runtime targets cel_* tables (see migration 023).
-- Code calls `.from("sb_ai_interactions")` which is proxied to `cel_ai_interactions`
-- by withCelTablePrefix() in src/lib/supabase/{server,admin}.ts.
--
-- Design mirrors buildabook's ai_interactions so extraction into a shared
-- package later is trivial.

create table if not exists public.cel_ai_interactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  persona         text not null,                   -- narrator | archivist | lorekeeper | finder | synthesizer | tell_gather | tell_draft | beyond_polish | profile_reflection | other
  context_type    text not null,                   -- 'ask' | 'tell_session' | 'beyond_draft' | 'beyond_polish' | 'profile' | 'script'
  context_id      text,                            -- free-form id: conversation id, session id, draft id, user id, ''
  model           text not null,
  input_tokens    integer,
  output_tokens   integer,
  latency_ms      integer,
  cost_usd        numeric(12, 8),
  status          text not null default 'ok' check (status in ('ok', 'error')),
  error_message   text,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_cel_ai_interactions_created_at
  on public.cel_ai_interactions (created_at desc);
create index if not exists idx_cel_ai_interactions_context
  on public.cel_ai_interactions (context_type, context_id);
create index if not exists idx_cel_ai_interactions_user
  on public.cel_ai_interactions (user_id, created_at desc);

alter table public.cel_ai_interactions enable row level security;

-- Users may read their own call records (useful if we ever expose a "your AI spend" UI).
create policy "Users read own ai_interactions"
  on public.cel_ai_interactions for select
  using (auth.uid() = user_id);

-- Admin / keith read-all. Role source of truth is the shared sb_profiles table.
create policy "Admin or keith reads all ai_interactions"
  on public.cel_ai_interactions for select
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'keith')
    )
  );

-- Writes are service-role only (no insert policy for authenticated users).
