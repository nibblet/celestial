# Fix: [FIX-030] `/api/admin/threads` Checks Stale `'keith'` Role

## Problem
`/api/admin/threads` (GET/POST/PATCH) returns 403 Forbidden for all `author`-role accounts. The `requireAdmin()` helper on line 45 checks `["admin", "keith"].includes(profile.role)`. Since migration 021 renamed the profile role `'keith'` → `'author'`, no author account ever passes this gate. The endpoint was introduced in Phase E (commit `0b64011`) after migration 021, so it was written with the stale role from the start.

This blocks Paul from creating, listing, or resolving open narrative threads through the admin API — the primary way threads are managed until a Beyond UI is built.

**Severity: Medium** — feature blocked for author accounts; not a data leak.

## Root Cause
`src/app/api/admin/threads/route.ts:45`:
```ts
if (!profile || !["admin", "keith"].includes(profile.role)) {
```
Same pattern as FIX-027 (`/api/admin/ai-activity`). The comment on line 19 also says `'keith'` instead of `'author'`.

## Steps
1. Open `src/app/api/admin/threads/route.ts`
2. Line 19 — update comment:
   - Before: `* Access: sb_profiles.role IN ('admin', 'keith'). Matches ...`
   - After:  `* Access: sb_profiles.role IN ('admin', 'author'). Matches ...`
3. Line 45 — change the role check:
   - Before: `if (!profile || !["admin", "keith"].includes(profile.role)) {`
   - After:  `if (!profile || !["admin", "author"].includes(profile.role)) {`
4. While here: also update the comment in `src/lib/threads/repo.ts` line 12:
   - Before: `* writes go through the same client but only succeed under the admin/keith`
   - After:  `* writes go through the same client but only succeed under the admin/author`
5. Run `npx next build` — build should pass.
6. Run `npm run lint` — no new warnings.
7. Run `npm test` — 147 PASS.

## Manual Verification
- Log in as an `author`-role account.
- `GET /api/admin/threads` should return `{ rows: [...], limit: 200 }` (empty array is fine if table is empty).
- `POST /api/admin/threads` with a valid body should return 201.
- Log in as a standard `member` account — should still receive 403.

## Files Modified
- `src/app/api/admin/threads/route.ts` (lines 19 + 45)
- `src/lib/threads/repo.ts` (comment on line 12)

## New Files (if any)
None.

## Database Changes (if any)
None — this is a code-layer fix only. The underlying RLS on `cel_open_threads` is fixed separately by FIX-026 (migration 030).

## Verify
- [ ] Build, lint, tests pass
- [ ] Author-role account can call GET/POST/PATCH on `/api/admin/threads`
- [ ] Member-role account still receives 403
