# Fix: [FIX-049] Misleading `requireKeith()` Function Name in Visuals API Routes

## Problem
Five visuals API routes define an inline async function named `requireKeith()` that now checks `["admin", "author", "keith"]`. The function name directly contradicts the actual authorization logic — a developer reading these routes would conclude that only `admin` and `keith` accounts have access, missing that `author` accounts are also authorized. This was a naming relic from FIX-043 (resolved): the role check was updated to include `"author"` but the function name was not.

**Severity: Low — code clarity / misleading naming. No functional breakage.**

## Root Cause
FIX-043 (resolved, Run 16) updated the inline role array to `["admin", "author", "keith"]` in 5 routes but left the function named `requireKeith()` intact. The function name is now semantically incorrect.

Files:
- `src/app/api/visuals/prompt/route.ts` — `requireKeith()` at line 24
- `src/app/api/visuals/generate/route.ts` — `requireKeith()` at line 13
- `src/app/api/visuals/approve/route.ts` — `requireKeith()` at line 6
- `src/app/api/visuals/asset/[id]/route.ts` — `requireKeith()` at line 8
- `src/app/api/visuals/reference/route.ts` — `requireKeith()` at line 19

## Steps

1. In each of the 5 files above:
   - Rename the function declaration from `requireKeith` to `requireAuthor`
   - Rename the call site from `requireKeith()` to `requireAuthor()`
   - Leave the role check array `["admin", "author", "keith"]` **unchanged** — the `"keith"` entry remains for backward compatibility with existing `role='keith'` DB rows until those accounts are migrated

2. Example diff for `src/app/api/visuals/prompt/route.ts`:
   ```diff
   -async function requireKeith() {
   +async function requireAuthor() {
      ...
      if (!profile || !["admin", "author", "keith"].includes(profile.role)) {
        return { error: ..., profile: null };
      }
      ...
   }
   
   export async function POST(request: Request) {
   -  const auth = await requireKeith();
   +  const auth = await requireAuthor();
   ```

3. Apply the same rename pattern to the other 4 route files.

4. Run `npm run lint` — expect 0 errors, 4 warnings (existing img-tag warnings unchanged).

5. Run `npx next build` (or `node_modules/.bin/next build`) — expect clean build.

6. No tests touch these routes directly; run `npm test` to confirm no regression.

## Files Modified
- `src/app/api/visuals/prompt/route.ts`
- `src/app/api/visuals/generate/route.ts`
- `src/app/api/visuals/approve/route.ts`
- `src/app/api/visuals/asset/[id]/route.ts`
- `src/app/api/visuals/reference/route.ts`

## New Files
None.

## Database Changes
None.

## Verify
- [ ] Build passes
- [ ] Lint passes (0 errors, 4 warnings unchanged)
- [ ] Tests pass (192/192)
- [ ] All 5 route files show `requireAuthor` — grep: `grep -rn "requireKeith" src/` returns no results
- [ ] Role check array `["admin", "author", "keith"]` still present in all 5 files
