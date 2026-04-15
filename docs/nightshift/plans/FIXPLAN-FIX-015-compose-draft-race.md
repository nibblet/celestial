# Fix: [FIX-015] composeDraft() Race Condition — No Synchronous Double-Submit Guard

## Problem
The "Write it up for the library" button in Tell calls `composeDraft()`. The function checks
`draftLoading` state as its guard, but React state updates are asynchronous — they don't apply
until the next render. A user who rapidly double-clicks the button fires two simultaneous
`composeDraft()` calls before `setDraftLoading(true)` causes a re-render that would disable
the button. This creates two `sb_story_drafts` rows in the database for the same conversation
and sends two separate 4096-token Claude API calls.

**Impact:** Duplicate drafts in the admin queue, wasted API spend (each draft call costs ~4096
tokens), and confusing admin experience when reviewing. Low probability in practice (double-click
on mobile is rare) but the consequence is non-trivial.

## Root Cause

`src/app/tell/page.tsx`, `composeDraft()` function (around line 127):
```ts
async function composeDraft() {
  if (!sessionId || draftLoading) return;  // ← draftLoading is stale until next render
  setDraftLoading(true);  // ← this doesn't take effect synchronously
  ...
```

The button is disabled via `disabled={draftLoading || loading}` in JSX, but both the prop check
and the state update happen after the function call — a second click can slip through before the
disabled attribute renders.

Compare to Ask Keith's `sendInFlightRef` pattern: `src/app/ask/page.tsx` uses
`sendInFlightRef.current` (a ref, not state) as a synchronous guard. Refs update immediately
in the same tick.

## Steps

1. Open `src/app/tell/page.tsx`

2. Add a ref after the existing `bottomRef`:
```ts
const bottomRef = useRef<HTMLDivElement>(null);
const composeDraftInFlightRef = useRef(false);
```

3. Update `composeDraft()` to use the ref as the primary guard:
```ts
async function composeDraft() {
  if (!sessionId || draftLoading || composeDraftInFlightRef.current) return;
  composeDraftInFlightRef.current = true;
  setDraftLoading(true);
  setViewMode("drafting");
  setError(null);

  try {
    ...
  } catch {
    ...
  } finally {
    composeDraftInFlightRef.current = false;
    setDraftLoading(false);
  }
}
```

Note: the `finally` block must reset `composeDraftInFlightRef.current = false` so that if the
user returns to chat and tries again after an error, the button works.

4. Run `npm run build` to verify no breakage.

## Files Modified
- `src/app/tell/page.tsx` — add `composeDraftInFlightRef`, use it as synchronous guard in `composeDraft()`

## Verify
- [ ] Build passes
- [ ] Only one draft is created when "Write it up for the library" is clicked rapidly
- [ ] After a draft error, user can return to chat and try composing again (ref is reset)
