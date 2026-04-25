# Fix: [FIX-039] `getJourneyContextForPrompt` Injects Locked Chapter Summaries into AI Prompt

## Problem
**Severity: P2 — secondary chapter-gating gap in the Ask AI context layer**

`getJourneyContextForPrompt()` in `src/lib/ai/prompts.ts` is called from `perspectives.ts` whenever a `journeySlug` is present in the Ask request. The function iterates ALL story IDs in the journey and injects each story's `title` and `summary` into the persona system prompt — regardless of reader progress.

Story `summary` fields are the opening paragraph of each chapter (the first ~200 chars of prose). While these are less spoilery than full chapter bodies (FIX-036) or beat `whyItMatters` narratives (FIX-038), they do expose prose and character names from locked chapters. A CH01 reader asking about the directive-14 journey would have CH08 through CH14 opening paragraphs in the AI prompt.

The function currently has no `readerProgress` parameter and no `isStoryUnlocked` check.

## Root Cause

`src/lib/ai/prompts.ts` lines 413–428:

```ts
export function getJourneyContextForPrompt(journeySlug: string): string {
  const journey = getJourneyBySlug(journeySlug);
  if (!journey) return "";
  const lines = [ ... ];
  for (const id of journey.storyIds) {
    const s = getStoryById(id);
    if (s) lines.push(`- ${s.title} (${id}): ${s.summary}`);  // no gate
    else lines.push(`- ${id}`);
  }
  return lines.join("\n");
}
```

Called in `src/lib/ai/perspectives.ts` `sharedContentBlock()` at lines 122–124:

```ts
if (args.journeySlug) {
  const ctx = getJourneyContextForPrompt(args.journeySlug);
  if (ctx) parts.push(`## Journey Context\n${ctx}`);
}
```

`args.readerProgress` is present in `PersonaPromptArgs` but is not passed to the function.

## Steps

1. Open `src/lib/ai/prompts.ts`

2. Add `ReaderProgress` to the imports at the top of the file (it should already be imported; confirm). If not, add:
   ```ts
   import type { ReaderProgress } from "@/lib/progress/reader-progress";
   import { isStoryUnlocked } from "@/lib/progress/reader-progress";
   ```

3. Update the function signature and body to accept `readerProgress`:

   ```ts
   export function getJourneyContextForPrompt(
     journeySlug: string,
     readerProgress?: ReaderProgress | null,
   ): string {
     const journey = getJourneyBySlug(journeySlug);
     if (!journey) return "";
     const lines = [
       `The user is asking in the context of the guided journey "${journey.title}".`,
       journey.description,
       "",
       "Stories in this journey (in order):",
     ];
     for (const id of journey.storyIds) {
       if (readerProgress && !isStoryUnlocked(id, readerProgress)) continue;
       const s = getStoryById(id);
       if (s) lines.push(`- ${s.title} (${id}): ${s.summary}`);
       else lines.push(`- ${id}`);
     }
     return lines.join("\n");
   }
   ```

   The `continue` skips locked chapters. Re-readers (`showAllContent = true`) have `isStoryUnlocked` return true for all, so no regression. When `readerProgress` is absent (unauthenticated or not yet loaded), the old behaviour is preserved.

4. Open `src/lib/ai/perspectives.ts`

5. Update the `getJourneyContextForPrompt` call at line ~122 to pass `readerProgress`:

   ```ts
   if (args.journeySlug) {
     const ctx = getJourneyContextForPrompt(args.journeySlug, args.readerProgress);
     if (ctx) parts.push(`## Journey Context\n${ctx}`);
   }
   ```

6. Run `npx next build`
7. Run `npm run lint`
8. Run `npm test`

## Manual Verification

**Locked reader (CH01, Ask with journeySlug):**
- Server prompt log: `## Journey Context` block should list only CH01 (and any chapters before CH01's chapter number). CH08–CH14 stories should NOT appear.

**Re-reader (show_all_content = true, Ask with journeySlug):**
- All journey stories appear in `## Journey Context` — no regression.

**No journeySlug:**
- `getJourneyContextForPrompt` not called — no regression.

**Legacy `buildSystemPrompt` callers:**
- `buildSystemPrompt` in `prompts.ts` calls `getJourneyContextForPrompt(journeySlug)` (line ~459) without `readerProgress`. The new optional second parameter defaults to `undefined`, which preserves existing behaviour. No regression (this path is dead code anyway — the active path is the multi-persona orchestrator).

## Files Modified
- `src/lib/ai/prompts.ts`
- `src/lib/ai/perspectives.ts`

## New Files
None.

## Database Changes
None.

## Verify
- [ ] Build passes
- [ ] Lint passes (0 errors)
- [ ] Tests pass (170+/173)
- [ ] CH01 reader: Ask with `journeySlug` → `## Journey Context` only lists CH01 or earlier chapters
- [ ] Re-reader: all journey stories appear in context
- [ ] No journeySlug: no regression in Ask responses
