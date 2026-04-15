# Fix: [FIX-013] Uncommitted Auth Redirect Changes

## Problem
Three modified files and one new file exist in the working tree but have never been committed to git. The changes represent a real, working auth-redirect improvement (NEXT_PUBLIC_SITE_URL support for Vercel deployments) that is actively used by `signup/page.tsx`. If the working tree is accidentally reset or a fresh clone is deployed, the functionality is silently lost.

Files affected:
- `src/lib/app-url.ts` — NEW file, untracked
- `src/app/signup/page.tsx` — modified to use `getAuthRedirectOrigin()`
- `src/lib/supabase/middleware.ts` — modified
- `.env.local.example` — updated with `NEXT_PUBLIC_SITE_URL` comment

## Root Cause
Work was done locally (likely to fix Vercel auth callback redirect URLs) but never staged and committed. The build passes because the files exist in the working directory, but git does not track them.

## Steps
1. Review the changes to make sure they're correct:
   ```bash
   git diff src/app/signup/page.tsx src/lib/supabase/middleware.ts .env.local.example
   cat src/lib/app-url.ts
   ```
2. Stage all four files:
   ```bash
   git add src/lib/app-url.ts src/app/signup/page.tsx src/lib/supabase/middleware.ts .env.local.example
   ```
3. Commit:
   ```bash
   git commit -m "Add NEXT_PUBLIC_SITE_URL support for auth redirect on Vercel"
   ```
4. Run `npm run build` to verify no breakage.

## Files Modified
- `src/lib/app-url.ts` — new utility for auth redirect origin
- `src/app/signup/page.tsx` — uses `getAuthRedirectOrigin()` for emailRedirectTo
- `src/lib/supabase/middleware.ts` — related auth/session improvement
- `.env.local.example` — documents new env variable

## New Files
- `src/lib/app-url.ts` — `getAuthRedirectOrigin()` returns `NEXT_PUBLIC_SITE_URL` or `window.location.origin`

## Verify
- [ ] `git status` shows clean working tree after commit
- [ ] Build passes
- [ ] Sign up flow works in local dev (auth redirect URL is correct)
- [ ] On Vercel: set `NEXT_PUBLIC_SITE_URL=https://stories.cobbcorner.com` in environment variables
