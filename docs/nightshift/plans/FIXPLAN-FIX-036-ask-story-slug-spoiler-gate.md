# Fix: [FIX-036] `storySlug` Not Validated Against Reader Progress in Ask API

## Problem
**Severity: P0 — spoiler leak**

`/api/ask/route.ts` accepts a `storySlug` field in the POST body and passes it directly to `orchestrateAsk` without checking whether the reader has unlocked that chapter. Any authenticated reader can craft a request with an arbitrary `storySlug` (e.g., `CH17`) and receive locked chapter content injected into the AI system prompt.

Content exposed via this path:
1. `getStoryContext(storySlug)` — first 3 000 chars of the chapter's markdown body (`## Currently Reading` block)
2. `getMissionLogsForChapter(storySlug)` — mission log bodies (up to 600 chars per log) for the chapter
3. `getScenesForChapter(storySlug)` — scene goal/conflict/outcome data for the chapter

The existing `visibleStories` filter in the orchestrator correctly gates the *story catalog*, but the per-chapter context block bypasses that gate entirely because it is keyed on the raw `storySlug` parameter.

## Root Cause

`src/app/api/ask/route.ts` lines 63–83: `storySlug` is destructured from `request.json()` with no validation.
Lines 154–169: `readerProgress` is fetched server-side, but `storySlug` is passed to `orchestrateAsk` before any `isStoryUnlocked` check.

## Steps

1. Open `src/app/api/ask/route.ts`
2. Add `isStoryUnlocked` to the existing import from `@/lib/progress/reader-progress`:
   ```ts
   import { getReaderProgress, isStoryUnlocked } from "@/lib/progress/reader-progress";
   ```
3. After line 154 (`const readerProgress = await getReaderProgress();`), add:
   ```ts
   // Gate storySlug: never inject locked chapter context into the AI prompt.
   const validatedStorySlug =
     storySlug && readerProgress && isStoryUnlocked(storySlug, readerProgress)
       ? storySlug
       : undefined;
   ```
4. On line 166, replace `storySlug,` with `storySlug: validatedStorySlug,`
5. On line 193 (in the `verifyAskAnswer` call), replace `storySlug,` with `storySlug: validatedStorySlug,`
6. Run `npx next build`
7. Run `npm run lint`
8. Run `npm test`

## Manual Verification

- **Locked reader path:** Authenticated reader at CH01. Craft a POST to `/api/ask` with `{ "message": "What happens?", "storySlug": "CH17-ending" }`. Confirm the AI response does not reference CH17 events. Confirm the system prompt (dev logs) does not include a `## Currently Reading` block for CH17.
- **Unlocked reader path:** Reader at CH17 (or `show_all_content=true`). Confirm that passing `storySlug: "CH17-something"` still injects story context normally.
- **Re-reader path:** `show_all_content=true` → `isStoryUnlocked` returns `true` for all chapters → no regression.

## Files Modified
- `src/app/api/ask/route.ts`

## New Files
None.

## Database Changes
None.

## Verify
- [ ] Build passes
- [ ] Lint passes (`0 errors`)
- [ ] Tests pass (173/173)
- [ ] Locked-reader: POST to `/api/ask` with locked `storySlug` → no chapter content in AI response
- [ ] Unlocked-reader: `storySlug` for an unlocked chapter still injects context correctly
- [ ] Re-reader (`show_all_content=true`): all chapters injectable as `storySlug`
