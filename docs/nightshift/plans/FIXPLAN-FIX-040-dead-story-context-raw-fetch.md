# Fix: [FIX-040] Dead `storyContextRaw` DB Fetch in Ask Orchestrator

## Problem
In `src/lib/ai/orchestrator.ts`, `buildPromptArgs()` calls `getCanonicalStoryMarkdown(storySlug)` as
part of the `Promise.all` at line 188, assigning the result to `storyContextRaw`. The very next
line (197) immediately discards it with `void storyContextRaw;`. The fetch was never used for
anything.

Meanwhile, the actual story context injected into AI prompts is read from the **filesystem** by
`getStoryContext(args.storySlug)` inside `perspectives.ts` `sharedContentBlock()` (line 101). This
is an entirely different code path that reads directly from `content/wiki/stories/`.

Net result on every Ask request that includes a `storySlug`:
1. **One unnecessary async Supabase DB call** (`getCanonicalStoryMarkdown` hits
   `sb_wiki_documents` / `markdownByStoryId` in `corpus.ts`) that contributes to Ask latency.
2. **AI prompts see filesystem content**, not the DB-canonical version. If a story was edited via
   Beyond (content stored in Supabase), the AI context will silently use the stale on-disk copy.

**Severity: Low-Medium** — no spoiler leak, no data loss. Primary impact is unnecessary DB latency
on every `/api/ask` call with a `storySlug` + latent content-staleness risk if Beyond-edited
stories diverge from the on-disk copy.

## Root Cause
`orchestrator.ts:181–197` — the `Promise.all` block was set up to pre-fetch the story markdown and
pass it through to persona builders (which would read it from `promptArgs` instead of re-fetching
from disk). That plumbing was never completed: `perspectives.ts` still calls `getStoryContext()`
directly, making the orchestrator's fetch dead code.

## Steps

### Option A — Remove dead fetch (minimal, immediate fix)
1. Open `src/lib/ai/orchestrator.ts`
2. In the `Promise.all` at lines 178–196, remove the `storyContextRaw` entry:
   ```ts
   // BEFORE (lines 178-196):
   const [
     wikiSummaries,
     stories,
     storyContextRaw,          // ← remove this line
     chapterScenes,
     openThreads,
     journeyBeats,
   ] = await Promise.all([
     getCanonicalWikiSummaries(),
     getCanonicalStories(),
     storySlug ? getCanonicalStoryMarkdown(storySlug) : Promise.resolve(""),   // ← remove this line
     storySlug ? getScenesForChapter(storySlug) : Promise.resolve([]),
     ...
   ]);
   void storyContextRaw; // ← remove this line
   ```
   ```ts
   // AFTER:
   const [
     wikiSummaries,
     stories,
     chapterScenes,
     openThreads,
     journeyBeats,
   ] = await Promise.all([
     getCanonicalWikiSummaries(),
     getCanonicalStories(),
     storySlug ? getScenesForChapter(storySlug) : Promise.resolve([]),
     ...
   ]);
   ```
3. Remove the `getCanonicalStoryMarkdown` import from the top of `orchestrator.ts` if it is only
   used in this dead path. Check with:
   `grep -n "getCanonicalStoryMarkdown" src/lib/ai/orchestrator.ts`
4. Run `npm run build` (or `npx next build`)
5. Run `npm run lint`
6. Run `npm test` — specifically confirm Ask-related tests still pass

### Option B — Wire through properly (future enhancement)
Pass `storyContextRaw` into `PersonaPromptArgs` and have `sharedContentBlock` consume it instead of
re-fetching from disk. This eliminates the double-read AND ensures AI context always uses the
canonical (DB-backed) version. More invasive; schedule as a separate refactor. Not urgent.

**Recommendation:** Ship Option A now. Track Option B as a future enhancement in BACKLOG.

## Files Modified
- `src/lib/ai/orchestrator.ts` — remove 3 lines (destructure entry, Promise.all entry, void stmt)
- Possibly remove unused `getCanonicalStoryMarkdown` import if confirmed unused

## New Files (if any)
None.

## Database Changes (if any)
None.

## Verify
- [ ] `npx next build` passes — 0 errors
- [ ] `npm run lint` passes — 0 errors/warnings
- [ ] `npm test` passes — 170/173 (or better if FIX-034/037 also applied)
- [ ] `grep -n "storyContextRaw" src/lib/ai/orchestrator.ts` returns no results
- [ ] Manual: trigger an Ask request with a storySlug in dev; confirm no regression in AI response quality
- [ ] Check that story context still appears in AI responses (perspectives.ts path unchanged)
