# Fix: [FIX-015] submitDraft() Has No In-Progress Guard

## Problem
The `submitDraft()` function in `tell/page.tsx` has no loading/submitting state guard. If the user double-clicks "Submit Story", two PATCH calls to `/api/tell/draft/update` are fired simultaneously. While the net effect (both calls set `submitted=true`) is typically harmless, it's a quality gap: if the PATCH fails on one but succeeds on the other, the UI can enter a confusing state (error shown but submitted=true). The button also has no disabled state during the submit, so it remains fully clickable while the network request is in-flight.

Impact: Low severity — no data loss, but polish gap on a UX-critical action (final story submission).

## Root Cause
`src/app/tell/page.tsx` `submitDraft()` (lines 162–183) calls `fetch` in an async function with no `submitting` state or ref guard. The Submit Story button has no `disabled` prop linked to an in-progress flag.

## Steps

1. Open `src/app/tell/page.tsx`

2. Add a `submitting` state variable alongside the other state declarations (e.g., after line 36 `const [submitted, setSubmitted]...`):
   ```ts
   const [submitting, setSubmitting] = useState(false);
   ```

3. Update `submitDraft()` to guard and track progress:
   ```ts
   // Before:
   async function submitDraft() {
     if (!draft) return;
     const hasEdits = editTitle !== draft.title || editBody !== draft.body;
     if (hasEdits) {
       const res = await fetch("/api/tell/draft/update", { ... });
       if (!res.ok) {
         setError("Failed to save your edits. Please try again.");
         return;
       }
     }
     setSubmitted(true);
   }

   // After:
   async function submitDraft() {
     if (!draft || submitting) return;
     setSubmitting(true);
     try {
       const hasEdits = editTitle !== draft.title || editBody !== draft.body;
       if (hasEdits) {
         const res = await fetch("/api/tell/draft/update", {
           method: "PATCH",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             draftId: draft.draftId,
             title: editTitle,
             body: editBody,
           }),
         });
         if (!res.ok) {
           setError("Failed to save your edits. Please try again.");
           return;
         }
       }
       setSubmitted(true);
     } finally {
       setSubmitting(false);
     }
   }
   ```

4. Add `disabled={submitting}` to the Submit Story button:
   ```tsx
   // Before:
   <button
     onClick={submitDraft}
     className="type-ui rounded-lg bg-clay px-6 py-2.5 font-medium text-warm-white transition-colors hover:bg-clay-mid"
   >
     Submit Story
   </button>

   // After:
   <button
     onClick={submitDraft}
     disabled={submitting}
     className="type-ui rounded-lg bg-clay px-6 py-2.5 font-medium text-warm-white transition-colors hover:bg-clay-mid disabled:opacity-50 disabled:cursor-not-allowed"
   >
     {submitting ? "Submitting..." : "Submit Story"}
   </button>
   ```

5. Run `npm run build` — should pass clean.
6. Run `npm run lint` — should pass clean.

7. Test:
   - Go through a Tell conversation → compose draft → reach review screen
   - Double-click "Submit Story" quickly
   - Verify only the success screen shows (not an error)
   - Verify button shows "Submitting..." during in-flight

## Files Modified
- `src/app/tell/page.tsx` — adds `submitting` state and disables button during submit

## Verify
- [ ] Build passes
- [ ] Lint passes
- [ ] Double-clicking Submit Story doesn't produce double API calls
- [ ] Button shows "Submitting..." while request is in-flight
- [ ] Normal submit flow unaffected
