# Fix: [FIX-026] Stale `role = 'keith'` in RLS Policies (Migrations 025–028)

## Problem

Author accounts (`role = 'author'`) cannot write to `cel_open_threads`, `cel_chapter_scenes`, or `cel_beats`, and cannot read all rows in `cel_ai_interactions`. Any author-role API call or UI action targeting these tables gets silently blocked by RLS and returns empty results or permission errors.

**Impact:** The scene ingest script, open thread management, beats authoring, and AI activity visibility are all broken for author accounts. Ingest scripts use service-role keys (bypass RLS) so automated writes still work, but interactive/API use cases do not.

## Root Cause

`021_author_role.sql` renamed the profile role `'keith'` → `'author'` and updated the constraint. However, migrations 025–028 were written after 021 and still check `p.role = 'keith'` in their RLS policies:

- `025_ai_interactions.sql` line 48: `and (p.role = 'admin' or p.role = 'keith')`
- `026_open_threads.sql` lines 39, 46: `and (p.role = 'admin' or p.role = 'keith')`
- `027_chapter_scenes.sql` lines 41, 48: `and (p.role = 'admin' or p.role = 'keith')`
- `028_beats.sql` lines 42, 52, 59: `and (p.role = 'admin' or p.role = 'keith')`

Since `'keith'` no longer exists as a valid role value, these `or p.role = 'keith'` clauses never match any row in `sb_profiles`.

## Steps

1. Open `supabase/migrations/` and create `030_fix_author_role_in_rls.sql` with the content below.
2. Apply the migration to the Supabase project (`supabase db push` or apply via dashboard).
3. Run `npm run build` to verify no regressions.
4. Run `npm run lint`.
5. Verify: log in as an author account and confirm:
   - GET `/api/admin/ai-activity` returns data (after FIX-027 is also applied)
   - `cel_chapter_scenes` writes succeed from an author session
   - `cel_beats` writes succeed from an author session
   - `cel_open_threads` writes succeed from an author session

**Migration content for `030_fix_author_role_in_rls.sql`:**

```sql
-- Fix stale `role = 'keith'` references in RLS policies introduced by
-- migrations 025–028 after migration 021 renamed the role to 'author'.
-- All four tables are `cel_*` (Celestial namespace).

-- ── cel_ai_interactions ──────────────────────────────────────────────

drop policy if exists "Admin or keith reads all ai_interactions"
  on public.cel_ai_interactions;

create policy "Admin or author reads all ai_interactions"
  on public.cel_ai_interactions for select
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'author')
    )
  );

-- ── cel_open_threads ─────────────────────────────────────────────────

drop policy if exists "Admin or keith can write open_threads"
  on public.cel_open_threads;

create policy "Admin or author can write open_threads"
  on public.cel_open_threads for all
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'author')
    )
  )
  with check (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'author')
    )
  );

-- ── cel_chapter_scenes ───────────────────────────────────────────────

drop policy if exists "Admin or keith can write chapter_scenes"
  on public.cel_chapter_scenes;

create policy "Admin or author can write chapter_scenes"
  on public.cel_chapter_scenes for all
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'author')
    )
  )
  with check (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'author')
    )
  );

-- ── cel_beats ────────────────────────────────────────────────────────

drop policy if exists "Admin or keith can read all beats"
  on public.cel_beats;

drop policy if exists "Admin or keith can write beats"
  on public.cel_beats;

create policy "Admin or author can read all beats"
  on public.cel_beats for select
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'author')
    )
  );

create policy "Admin or author can write beats"
  on public.cel_beats for all
  using (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'author')
    )
  )
  with check (
    exists (
      select 1 from public.sb_profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'author')
    )
  );
```

## Files Modified
- `supabase/migrations/030_fix_author_role_in_rls.sql` (new file)

## New Files
- `supabase/migrations/030_fix_author_role_in_rls.sql`

## Database Changes
- Drops 6 stale RLS policies across 4 tables
- Creates 6 replacement policies with `role = 'author'` instead of `role = 'keith'`
- No table structure changes

## Verify
- [ ] Migration applies cleanly (`supabase db push` or dashboard)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Author account can write a row to `cel_open_threads` via Supabase client
- [ ] Author account can write a row to `cel_beats` via Supabase client
- [ ] Author account can write a row to `cel_chapter_scenes` via Supabase client
- [ ] Author account can read all rows in `cel_ai_interactions` (after FIX-027 applied)
