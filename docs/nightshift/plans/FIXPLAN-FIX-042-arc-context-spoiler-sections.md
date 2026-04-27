# Fix: [FIX-042] Character Arc AI Context Injects Spoilery Sections Without Reader Progress Filter

## Problem

**Severity: P1 — chapter-gating gap in AI context**

`getCharacterArcContext()` in `src/lib/ai/prompts.ts` (lines 171–200) builds a compact arc context for ALL 9 characters and this is injected into every Ask persona system prompt via `sharedContentBlock()` in `src/lib/ai/perspectives.ts` (lines 109–110), regardless of reader progress.

The injected arc context includes four sections per character:
- `startingState` — Opening state of the character (relatively safe; describes the start of the story)
- `unresolvedTensions` — Contains arc-endpoint hints (e.g., "What 'no longer singular' means" = CH17 merge; "ALARA's non-intervention with CAEDEN" = CH16+)
- `futureQuestions` — Contains forward-pointing questions that spoil arc endpoints (e.g., "Can a **merged** ALARA still refuse" implies she merges at CH17; "once CAEDEN's occupation becomes visible" implies CH16+ event)
- `askGuidance` — Explicit chapter citations (e.g., "Must cite CH16 for CAEDEN occupation; CH17 for merge claims") that the AI may inadvertently surface

A CH01 reader asking any Ask question gets all 9 characters' arc endpoint hints in the AI system prompt. The "Reader Progress Gate" prompt instruction is a prompt-level hint, not a code-level gate — the AI can still be guided by or reveal content from these sections.

## Root Cause

`src/lib/ai/prompts.ts` `getCharacterArcContext()` (line 174) iterates `getAllCharacterArcs()` and maps four sections per arc into the context block. The call site at `perspectives.ts:109–110` passes no reader progress parameter. There is no filtering by `isStoryUnlocked` or reader chapter.

The `unresolvedTensions` and `futureQuestions` sections are designed as author guidance (what the AI should treat as open), but they implicitly spoil arc endpoints through their framing. These sections are not needed for the AI to answer safe, grounded character questions — that role is served by `startingState` (who the character is at the outset) and `askGuidance` (explicit per-question instructions).

## Steps

1. Open `src/lib/ai/prompts.ts`

2. In `getCharacterArcContext()` at the `entries` map (line 174), remove the `unresolvedTensions` and `futureQuestions` lines:

   **Before (lines ~181–185):**
   ```typescript
   const unresolved = compactArcSection(arc.unresolvedTensions);
   if (unresolved) lines.push(`  - Unresolved Tensions: ${unresolved}`);
   const future = compactArcSection(arc.futureQuestions);
   if (future) lines.push(`  - Future Questions: ${future}`);
   const ask = compactArcSection(arc.askGuidance);
   if (ask) lines.push(`  - ASK Guidance: ${ask}`);
   ```

   **After:**
   ```typescript
   const ask = compactArcSection(arc.askGuidance);
   if (ask) lines.push(`  - ASK Guidance: ${ask}`);
   ```

   Keep `startingState` (lines 179–180) and `askGuidance` as-is. Remove only the `unresolved` and `future` blocks.

3. The `unresolvedTensions` and `futureQuestions` fields remain in the `CharacterArcLedger` interface and are still correctly rendered on the `/arcs/[slug]` author-only page (after FIX-041). They are simply no longer injected into reader-facing AI prompts.

4. Run `npx next build` (or `npm run build`)
5. Run `npm run lint`
6. Run `npm test` — the `character-arcs.test.ts` tests don't depend on what `getCharacterArcContext()` includes, so all tests should continue to pass.

7. Manual verification:
   - Send an Ask question as a CH01 reader. Check the evidence panel's `contextSources` — the character arc block should still appear (it's still injected) but should now only contain `Starting State` and `ASK Guidance` entries.
   - Ask "Is ALARA going to merge with Thane?" as CH01 reader — AI should respond with uncertainty, not confirm the CH17 arc outcome.
   - Ask same question as a re-reader (show_all_content=true) — AI should still give a grounded answer (ASK Guidance still present).

## Files Modified
- `src/lib/ai/prompts.ts`

## New Files (if any)
None.

## Database Changes (if any)
None.

## Optional Follow-up (not in this plan)
A more sophisticated fix would add a `readerProgress` parameter to `getCharacterArcContext()` and filter each arc's injected sections by `isStoryUnlocked(arc.scope.startChapter, readerProgress)`. This would allow arc-endpoint context to become available once the reader has completed the full arc. Not implemented here because: (a) the arc `scope` field is a free-text string like "Book I, CH01-CH17", not a parseable chapter ID; (b) the simpler fix (drop the two spoilery sections) achieves safe behavior without structural changes.

## Verify
- [ ] Build, lint, tests pass
- [ ] CH01 reader: Ask prompt does not include "Unresolved Tensions" or "Future Questions" arc sections
- [ ] CH01 reader: asking about ALARA's fate does not reveal CH17 outcome
- [ ] Author: full arc sections still visible on `/arcs/alara` page (unaffected by this change)
- [ ] Re-reader (show_all_content=true): ASK Guidance still injected, arc context still present
