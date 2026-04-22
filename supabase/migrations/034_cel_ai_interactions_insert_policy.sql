-- Ledger inserts use the authenticated Supabase client (see src/lib/ai/ledger.ts).
-- Migration 025 allowed SELECT only; without INSERT policy, logAiCall fails RLS.

drop policy if exists "Users insert own ai_interactions" on public.cel_ai_interactions;

create policy "Users insert own ai_interactions"
  on public.cel_ai_interactions for insert
  with check (auth.uid() = user_id);
