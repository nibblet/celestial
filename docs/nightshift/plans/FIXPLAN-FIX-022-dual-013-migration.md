# Fix: [FIX-022] Duplicate Migration Prefix — Two `013_` Files

## Problem
`supabase/migrations/` has two files with the `013_` prefix:
- `013_onboarding_flags.sql` (added in Run 6)
- `013_story_corrections.sql` (added this week)

The subsequent migrations were numbered correctly (014, 015, 016, 017), leaving only these two with the same prefix. This creates ambiguity for anyone doing a fresh deployment, running `supabase db reset`, or applying migrations to a staging environment.

## Root Cause
The story corrections migration was named `013_...` without checking that `013_onboarding_flags.sql` already existed. The migrations that followed (014–017) then used correct sequential numbers.

## Impact

**Current deployed environment:** Likely no problem — Supabase tracks migrations by full filename in `supabase_migrations.schema_migrations`, not by prefix number. If both were applied as separate rows, the system is consistent.

**Fresh deployments / `supabase db reset`:** Migrations are applied in alphabetical filename order. `013_onboarding_flags.sql` sorts before `013_story_corrections.sql` alphabetically, so they apply in a consistent order regardless of environment. The two migrations are independent (different tables), so ordering between them doesn't matter functionally.

**Risk:** Low, but it's a naming inconsistency. Running `supabase migration list` will show two migrations with the same number, which is confusing and non-standard.

## Fix Option A (Safe — No Rename) — Recommended for Active Deployments

Do nothing to the files. Add a comment at the top of `013_story_corrections.sql` explaining the deliberate out-of-sequence numbering:

```sql
-- Note: This migration is numbered 013 because 013_onboarding_flags.sql
-- already existed when this was written. The migrations are independent
-- (different tables) and alphabetical ordering ensures correct application.
-- New migrations should start at 018_.
```

This is the safest option if migrations have already been applied in production.

## Fix Option B (Clean — Rename) — Only If NOT Applied in Production Yet

Rename the conflicting file and update the sequence:
1. Rename `013_story_corrections.sql` → `018_story_corrections.sql` (after `017_media.sql`)
2. No other files need to change (014–017 already exist and are correct)
3. If Supabase has already tracked `013_story_corrections` in `schema_migrations`, you'll need to update that row too — run:
   ```sql
   UPDATE supabase_migrations.schema_migrations
   SET version = '018_story_corrections'
   WHERE version = '013_story_corrections';
   ```

## Steps (Recommended Path: Option A)

1. Open `supabase/migrations/013_story_corrections.sql`
2. Add a comment block at the top (before the `-- Story correction reports...` comment):
   ```sql
   -- Migration numbering note: 013_onboarding_flags.sql already existed when
   -- this file was created. These migrations are independent (separate tables)
   -- and are applied in alphabetical order. Next new migration: 018_*.
   ```
3. Commit only the docs/nightshift changes (as per nightshift rules — no code commits)

**Paul's action:** On the next dev session, apply Option A comment to acknowledge the situation, or verify in Supabase dashboard that both 013_* migrations appear as separate applied rows and all is well.

## Files Modified
- `supabase/migrations/013_story_corrections.sql` — add clarifying comment (Option A)

## Verify
- [ ] `supabase migration list` shows both 013_* files as separate entries
- [ ] Local `supabase db reset` applies all migrations without error
- [ ] Next new migration file is named `018_*.sql`
