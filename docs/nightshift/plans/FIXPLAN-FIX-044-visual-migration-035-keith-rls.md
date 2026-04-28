# Fix: [FIX-044] Migration 035 RLS Policies Check `role = 'keith'` on Visual Tables

## Problem

`supabase/migrations/035_visual_prompts_assets.sql` defines four RLS policies
that restrict write access to `cel_visual_prompts` and `cel_visual_assets` using
`p.role = 'keith' or p.role = 'admin'`. The Celestial author role is `'author'`,
so author accounts are blocked by RLS from inserting or updating visual prompts
and assets — even after the application-layer fix in FIX-043.

Affected policies (all in migration 035):
- `"Keith admin can insert visual prompts"` — `cel_visual_prompts` INSERT
- `"Keith admin can update visual prompts"` — `cel_visual_prompts` UPDATE
- `"Keith admin can insert visual assets"` — `cel_visual_assets` INSERT
- `"Keith admin can update visual assets"` — `cel_visual_assets` UPDATE

The read (SELECT) and admin-delete (DELETE) policies are unaffected.

**Severity: Medium** — without this fix, even after FIX-043, the application
routes will return 200 but all DB inserts/updates from `author` role accounts will
be silently blocked by RLS. The visuals system will appear to work but produce no
data. Note: the API routes use `createAdminClient()` (bypasses RLS) for some
operations, so the practical impact depends on which specific operations use the
server client vs. the user-scoped client. Fix in any case to keep RLS semantics
consistent with intended author-role access.

## Root Cause

Commit `af27957` introduced migration 035 using the old `'keith'` role name
(same pattern as migrations 025–028, tracked in FIX-026). The fix is a new
append-only migration that drops the four stale policies and recreates them with
`'author'` instead of `'keith'`.

## Steps

1. Create `supabase/migrations/039_visual_rls_keith_to_author.sql` with the
   following content:

```sql
-- Fix: replace 'keith' role checks with 'author' in visual table RLS policies.
-- Targets four policies created in migration 035.

-- cel_visual_prompts
drop policy if exists "Keith admin can insert visual prompts" on public.cel_visual_prompts;
drop policy if exists "Keith admin can update visual prompts" on public.cel_visual_prompts;

create policy "Author admin can insert visual prompts"
  on public.cel_visual_prompts for insert
  with check (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'author' or p.role = 'admin')
    )
  );

create policy "Author admin can update visual prompts"
  on public.cel_visual_prompts for update
  using (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'author' or p.role = 'admin')
    )
  );

-- cel_visual_assets
drop policy if exists "Keith admin can insert visual assets" on public.cel_visual_assets;
drop policy if exists "Keith admin can update visual assets" on public.cel_visual_assets;

create policy "Author admin can insert visual assets"
  on public.cel_visual_assets for insert
  with check (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'author' or p.role = 'admin')
    )
  );

create policy "Author admin can update visual assets"
  on public.cel_visual_assets for update
  using (
    exists (
      select 1 from public.cel_profiles p
      where p.id = auth.uid()
        and (p.role = 'author' or p.role = 'admin')
    )
  );
```

2. Apply to Supabase: `npx supabase db push` (or merge into the project's
   migration workflow via the Supabase dashboard "Run migration" if using the
   hosted project).

3. Run `npx next build` — confirm clean build.

4. Run `npm test` — confirm 188 still passing (no new failures; migrations
   are not directly tested but the test suite validates wiki content).

5. Manual verification:
   - Log in as an `author` role account; try generating a visual prompt via
     `/profile/admin/visuals`. Confirm the `cel_visual_prompts` row is created.
   - Confirm a regular-reader account cannot insert rows (RLS blocks them at DB
     level beyond the application-layer 403).

## Files Modified
None (supabase migrations are append-only).

## New Files
- `supabase/migrations/039_visual_rls_keith_to_author.sql`

## Database Changes
- Drops 4 stale RLS policies on `cel_visual_prompts` and `cel_visual_assets`
- Recreates them with `'author'` instead of `'keith'`
- No schema changes; RLS policy change only
- Next migration after 039: **040**

## Verify
- [ ] Migration file is at `supabase/migrations/039_...` (next sequential after 038)
- [ ] Build passes
- [ ] Tests pass (188/191)
- [ ] Author-role account can insert into `cel_visual_prompts` (not RLS-blocked)
- [ ] Author-role account can insert into `cel_visual_assets` (not RLS-blocked)
- [ ] Regular reader account remains RLS-blocked from inserts/updates
