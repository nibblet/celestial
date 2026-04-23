# Dev Plan: [IDEA-026] Open Threads Reader Panel — Narrative Mysteries Page

## What This Does
Adds a `/mysteries` reader-facing page that surfaces unresolved narrative threads from
`cel_open_threads`, chapter-gated to the reader's progress. Readers see which mysteries
are still open in the portion of the story they've read — a "what's unresolved?" companion.
Re-readers with `show_all_content = true` see ALL threads including those resolved later,
plus resolution context. Author must seed threads via the admin API before this page has content.

## User Stories
- As a first-time reader at CH07: I see the open mysteries introduced in CH01–CH07 — unanswered
  questions, unexplained events, setups that haven't paid off. I do NOT see threads from CH08+.
- As a re-reader (`show_all_content = true`): I see all threads across the whole book, with
  resolved threads shown differently (dimmed or marked as resolved) so I can follow the
  complete arc of each mystery.
- As the author: I seed threads via `/api/admin/threads`. Once FIX-030 is applied I can POST,
  PATCH, and DELETE threads. The reader page is read-only.

## Implementation

### Phase 1: Foundation (20 min)
1. Create `src/app/mysteries/page.tsx` as a Server Component.
2. Import: `getReaderProgress` from `@/lib/progress/reader-progress`,
   `listUnresolvedThroughChapter` from `@/lib/threads/repo`,
   `createClient` from `@/lib/supabase/server`.
3. Fetch:
   ```ts
   const progress = await getReaderProgress();
   const supabase = await createClient();
   const threads = progress.showAllContent
     ? await supabase.from("cel_open_threads").select("*").order("chapter_id")
     : await listUnresolvedThroughChapter(supabase, progress.currentChapter ?? 0);
   ```
4. If `threads.length === 0`, render an empty state: "No open mysteries yet. They'll appear
   here as you read." (This is correct before author seeds any threads.)
5. **Checkpoint:** Page renders, fetches correctly, empty state looks right. No threads crash.

### Phase 2: Core Logic (30 min)
1. Group threads by `kind`: `mystery` | `setup` | `contradiction` | `gap`.
2. For each group, render a heading (e.g., "Unanswered Questions", "Setups", "Contradictions",
   "Gaps") and thread cards.
3. Thread card props: `title`, `body`, `chapter_id`, `resolved` flag (for re-readers).
4. Re-reader rendering: resolved threads show with a ✓ marker and `opacity-60` Tailwind class.
5. Add metadata export:
   ```ts
   export const metadata = { title: "Mysteries — Celestial", ... };
   ```
6. Add `/mysteries` to `ExploreHubTabs.tsx` as a new tab (after Mission Logs or as first tab).
7. **Checkpoint:** Grouping and cards render. Re-reader resolved threads are visually distinct.

### Phase 3: Polish (20 min)
1. Add a short page intro blurb: "These are the open threads woven through [book.title] as
   you've read it so far. No spoilers — only what you've encountered."
2. For locked readers near the start with no threads yet, add a callout: "Mysteries accumulate
   as you read. Come back after a few chapters."
3. Add route to `src/proxy.ts` if onboarding gate should apply (it should — same as other
   entity pages).
4. **Checkpoint:** Full golden-path test. Locked, unlocked, re-reader, and guest paths all
   render correctly.

## Content Considerations
No new markdown files needed. All data comes from `cel_open_threads` DB table. Thread content
is authored by Paul via `/api/admin/threads` (after FIX-030 is applied). No wiki content impact.

## Spoiler & Gating Impact
**This is a gating-sensitive page.** The gating logic is:
- Default path: `listUnresolvedThroughChapter(supabase, currentChapter)` — uses the existing
  DB query that filters to `chapter_id <= currentChapter`. Already implemented in `threads/repo.ts`.
- Re-reader path: `show_all_content = true` → show all threads including resolved ones.
  Re-readers have already finished the book; showing resolved threads is correct.
- Guest path: `getReaderProgress()` falls back to guest cookie; `listUnresolvedThroughChapter`
  respects guest progress.
- Ask filter: `listUnresolvedThroughChapter` is already used in the Ask orchestrator's
  `buildPromptArgs()` — consistent gating logic.

**No spoiler leak introduced:** The page only surfaces threads that were explicitly authored
for chapters ≤ reader's current chapter. The thread content is created by Paul and is by
definition non-spoilery for the reader's progress level.

## Testing
- [ ] `npx next build` — clean build, `/mysteries` appears in route list
- [ ] `npm run lint` — 0 errors
- [ ] Locked-reader path (CH01): empty state or only CH01 threads visible, no CH02+ threads
- [ ] Unlocked path (CH07): threads from CH01–CH07 visible; CH08+ threads absent
- [ ] Re-reader path (`show_all_content = true`): all threads visible, resolved ones dimmed
- [ ] Guest-cookie path: same as locked reader with guest chapter state

## Dependencies
- **FIX-030 (Medium):** Author must be able to seed threads via `/api/admin/threads` before
  this page has any content. The page renders fine (empty state) before FIX-030 is applied.
- **cel_open_threads** table must exist (migration 026 — already applied).
- `listUnresolvedThroughChapter` in `src/lib/threads/repo.ts` — already implemented and tested.

## Estimated Total: 1.2 hours
(After FIX-030 is applied so author can seed data for real testing)
