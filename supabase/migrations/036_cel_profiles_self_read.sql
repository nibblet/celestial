-- cel_profiles was created via `like sb_profiles including all` in 023, but
-- `including all` does not copy RLS policies. The table has RLS enabled with
-- no policies, so user-scoped reads return zero rows — which silently breaks
-- onboarding/role checks (e.g. proxy.ts redirecting onboarded keiths to
-- /welcome, admin gates redirecting to /profile).
--
-- This migration adds the minimum read policy each authenticated user needs:
-- they can select their own row. Service-role (admin client) bypasses RLS
-- and is unaffected. Writes remain restricted — add explicit policies if/when
-- the app starts updating cel_profiles via the user-scoped client.

create policy "Users can read their own profile row"
  on public.cel_profiles for select
  using (auth.uid() = id);
