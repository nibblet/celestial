# Fix: [FIX-027] `/api/admin/ai-activity` Checks Stale `'keith'` Role

## Problem

Author accounts (`role = 'author'`) are blocked from the AI activity dashboard at `/api/admin/ai-activity` with a 403 Forbidden response. The route explicitly checks the profile role before querying, and the check still uses the renamed role `'keith'`.

**Impact:** Author accounts cannot view the AI call ledger to monitor token usage, latency, or errors for Ask/Tell/Beyond sessions. This dashboard was built specifically for author-level monitoring.

## Root Cause

`src/app/api/admin/ai-activity/route.ts` line 31:
```ts
if (!profile || !["admin", "keith"].includes(profile.role)) {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
```

Migration 021 renamed the role `'keith'` → `'author'`. The route was not updated to reflect this.

## Steps

1. Open `src/app/api/admin/ai-activity/route.ts`.
2. Change line 11 (comment):
   - From: `* Access: requires sb_profiles.role IN ('admin', 'keith').`
   - To: `* Access: requires sb_profiles.role IN ('admin', 'author').`
3. Change line 31 (role check):
   - From: `if (!profile || !["admin", "keith"].includes(profile.role)) {`
   - To: `if (!profile || !["admin", "author"].includes(profile.role)) {`
4. Run `npm run build`.
5. Run `npm run lint`.
6. Manual verification: log in as an author account and confirm GET `/api/admin/ai-activity` returns `{ rows: [...], limit: 100 }` instead of `{ error: "Forbidden" }`.

## Files Modified
- `src/app/api/admin/ai-activity/route.ts` — lines 11 and 31

## New Files
None.

## Database Changes
None. (RLS fix is in FIX-026.)

## Verify
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Author account: GET `/api/admin/ai-activity` returns 200 with rows array
- [ ] Non-author/non-admin account: GET still returns 403
