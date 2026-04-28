# Fix: [FIX-043] `requireKeith()` in Visuals API Routes and Admin Page Blocks Author Accounts

## Problem

The entire corpus-grounded visuals system (prompt synthesis, asset generation, approval, reference upload, delete) is **inaccessible to `role = 'author'` accounts** because all 5 mutation API routes and the admin console page define an inline `requireKeith()` helper that checks `["admin", "keith"].includes(profile.role)`. The Celestial author role is `'author'`, not `'keith'`.

Affected surfaces:
- `src/app/api/visuals/prompt/route.ts` — prompt synthesis (POST)
- `src/app/api/visuals/generate/route.ts` — asset generation (POST)
- `src/app/api/visuals/approve/route.ts` — approval toggle (POST)
- `src/app/api/visuals/asset/[id]/route.ts` — asset delete (DELETE)
- `src/app/api/visuals/reference/route.ts` — reference upload (POST/DELETE)
- `src/app/profile/admin/visuals/page.tsx` — admin console (page render)

The GET route (`/api/visuals/preferred`) is public by design — no change needed.

**Severity: Medium-High** — the entire visuals feature is broken for the intended author user. No spoiler-leak risk; functional completeness gap.

## Root Cause

Commit `af27957` built the visuals pipeline using the old `'keith'` role string (same pattern as FIX-027 and FIX-030). The inline `requireKeith()` function was copy-pasted across all 5 route files rather than extracted to a shared helper — creating 5 duplicated copies of the same stale pattern.

## Steps

1. Open `src/app/api/visuals/prompt/route.ts`
   - Find `requireKeith()` function (around line 24)
   - In the role check line, change `["admin", "keith"]` → `["admin", "author"]`
   - Rename the function `requireAuthor` (optional but recommended for clarity)

2. Open `src/app/api/visuals/generate/route.ts`
   - Same change: `["admin", "keith"]` → `["admin", "author"]` in the `requireKeith` body
   - Rename to `requireAuthor` if renamed in step 1

3. Open `src/app/api/visuals/approve/route.ts`
   - Same change

4. Open `src/app/api/visuals/asset/[id]/route.ts`
   - Same change

5. Open `src/app/api/visuals/reference/route.ts`
   - Same change

6. Open `src/app/profile/admin/visuals/page.tsx`
   - Line ~25: change `["admin", "keith"].includes(profile.role)` → `["admin", "author"].includes(profile.role)`

7. Run `npm run lint` — confirm 0 errors (warnings on `<img>` are pre-existing, unrelated)

8. Run `npx next build` — confirm clean build

9. Manual verification:
   - Log in as an `author` role account; confirm `/profile/admin/visuals` loads (not 403)
   - Send POST to `/api/visuals/prompt` as author; confirm 200 (not 403)
   - Log in as a regular reader; confirm `/profile/admin/visuals` returns 403

## Optional Refactor (IDEA-040)

After fixing the role string, extract the repeated pattern into
`src/lib/auth/require-author.ts` so future routes don't re-introduce this bug.
The five routes currently each paste ~15 lines of identical auth boilerplate.

## Files Modified
- `src/app/api/visuals/prompt/route.ts`
- `src/app/api/visuals/generate/route.ts`
- `src/app/api/visuals/approve/route.ts`
- `src/app/api/visuals/asset/[id]/route.ts`
- `src/app/api/visuals/reference/route.ts`
- `src/app/profile/admin/visuals/page.tsx`

## New Files (if any)
None required (see IDEA-040 for optional refactor).

## Database Changes (if any)
None — RLS policy fix is tracked separately in FIX-044.

## Verify
- [ ] Build passes (`npx next build`)
- [ ] Lint passes (`npm run lint`, 0 errors)
- [ ] Author-role account can access `/profile/admin/visuals` (not 403)
- [ ] Author-role account can POST to `/api/visuals/prompt` (not 403)
- [ ] Non-author reader still receives 403 from all mutation routes
- [ ] Public GET `/api/visuals/preferred` unchanged (no auth required)
