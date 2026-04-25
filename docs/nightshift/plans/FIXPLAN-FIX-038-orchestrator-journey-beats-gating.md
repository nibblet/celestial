# Fix: [FIX-038] Journey Beats Injected into Ask AI Prompt Without Reader Progress Gate

## Problem
**Severity: P1 — chapter-gating gap in the Ask AI context layer**

When a reader passes `journeySlug` to the `/api/ask` endpoint (from the journey ask-about-this page or a crafted request), the orchestrator fetches ALL published beats for the journey via `listBeatsByJourney()` and injects them into every AI persona's system prompt — regardless of whether the reader has unlocked the chapters those beats reference.

Beat records include `whyItMatters` narrative text that contains verbatim descriptions of specific story events. For example, the `directive-14` journey has beats for CH08 and CH11 with `whyItMatters` like: `"Evelyn's private notes diverge from the official log for the first time"` (CH08) and a verbatim story quote from CH11. A reader at CH01 asking a question with `journeySlug: "directive-14"` would have all of these injected into the AI system prompt.

This is distinct from FIX-032 (which covers the BeatTimeline UI rendering on the journey page). This is the AI context injection path. The STATUS.md noted it as "FIX-032 in Ask path too" but the existing FIXPLAN-FIX-032 does not cover this orchestrator path.

## Root Cause

`src/lib/ai/orchestrator.ts` `buildPromptArgs()` (line ~193–234):

```ts
journeySlug
  ? listBeatsByJourney(supabase, journeySlug)
  : Promise.resolve([]),
```

The fetched beats are then mapped and placed into `PersonaPromptArgs.beats` without any reader progress filter:

```ts
beats: journeyBeats.map((b) => ({
  act: b.act,
  title: b.title,
  whyItMatters: b.whyItMatters,
  beatType: b.beatType,
  chapterId: b.chapterId,
})),
```

`readerProgress` is already in scope (line 171 destructures it from `params`), and `isStoryUnlocked` is already imported (line 39). The fix is a single filter expression.

## Steps

1. Open `src/lib/ai/orchestrator.ts`

2. Locate the `beats:` assignment in `buildPromptArgs` (around line 228). Replace the unfiltered map:

   ```ts
   // Before:
   beats: journeyBeats.map((b) => ({
     act: b.act,
     title: b.title,
     whyItMatters: b.whyItMatters,
     beatType: b.beatType,
     chapterId: b.chapterId,
   })),
   ```

   With a filtered version:

   ```ts
   // After:
   beats: journeyBeats
     .filter((b) => !b.chapterId || !readerProgress || isStoryUnlocked(b.chapterId, readerProgress))
     .map((b) => ({
       act: b.act,
       title: b.title,
       whyItMatters: b.whyItMatters,
       beatType: b.beatType,
       chapterId: b.chapterId,
     })),
   ```

   Logic: beats with no `chapterId` are journey-level (always shown). Beats with a `chapterId` are shown only if `isStoryUnlocked` returns true. When `readerProgress` is null/undefined (unauthenticated edge case), all beats are shown — the outer route already requires auth.

3. Run `npx next build`
4. Run `npm run lint`
5. Run `npm test`

## Manual Verification

**Locked reader path (CH01, journeySlug: "directive-14" in Ask API):**
- Ask a question with `journeySlug: "directive-14"` from a CH01 account
- Confirm AI response does not reference CH08 or CH11 beat content
- Check server logs: the persona system prompt should not contain a `## Journey Beats` block with CH08/CH11 entries

**Partial reader path (CH08 reached, directive-14 journey):**
- CH08 beats should be visible (and in the AI context)
- CH11 beats should still be absent

**Re-reader (show_all_content = true):**
- `isStoryUnlocked` returns true for all chapters → all beats injected → no regression

**No journeySlug (normal Ask):**
- `journeyBeats` is an empty array → filter is a no-op → no regression

## Files Modified
- `src/lib/ai/orchestrator.ts`

## New Files
None.

## Database Changes
None.

## Verify
- [ ] Build passes
- [ ] Lint passes (0 errors)
- [ ] Tests pass (170+/173)
- [ ] CH01 reader: Ask with `journeySlug` → AI prompt has NO CH08/CH11 beat content
- [ ] CH08 reader: CH08 beats visible in AI prompt, CH11 beats absent
- [ ] Re-reader: all beats present in AI context
- [ ] Normal Ask (no journeySlug): no regression
