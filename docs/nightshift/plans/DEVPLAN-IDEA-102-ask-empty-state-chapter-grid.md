# Dev Plan: [IDEA-102] Ask Empty State Chapter Grid — Discovery Entry Without Story Context
**Theme:** ask-forward

## What This Does

When the Ask page opens with no `?story=` param, no prefilled prompt, no passage, and no highlight (i.e., a reader arrived directly from the home hero widget, the nav, or a bookmark), the empty state shows a compact 17-chapter tile grid instead of generic suggestion chips. Clicking any tile sets the story context (`?story=CH01`, etc.) and triggers the same breadcrumb display — and, once IDEA-057 ships, the chapter-specific welcome message + entity chips.

The generic suggestion chips remain visible when a story context IS set but IDEA-057 hasn't replaced them yet (backward compatible).

## User Stories

- As a first-time reader navigating to Ask directly (no story context), I see the 17 chapter tiles and can click any chapter to ground the companion — rather than staring at generic questions that don't connect to what I just read.
- As a re-reader (show_all_content on), I see the same chapter grid — all chapters are accessible under companion-first.
- As the author, this surface is identical to any reader's view (no author-specific path).
- As a guest (unauthenticated), the chapter grid renders the same way — clicking a tile routes to `/ask?story=CH01`, and the companion handles guests gracefully.

## Implementation

### Phase 1: CHAPTER_QUICK_TILES constant + router import

1. Open `src/app/ask/page.tsx`
2. Add `useRouter` to the existing `next/navigation` import (line 4):
   ```tsx
   import { useRouter, useSearchParams } from "next/navigation";
   ```
3. Add `CHAPTER_QUICK_TILES` constant near `SUGGESTIONS_BY_AGE_MODE` (after line 198):
   ```tsx
   const CHAPTER_QUICK_TILES = [
     { storyId: "CH01", chNum: "CH01", subtitle: "Dustfall" },
     { storyId: "CH02", chNum: "CH02", subtitle: "Footprints in Silence" },
     { storyId: "CH03", chNum: "CH03", subtitle: "Resonant Memory" },
     { storyId: "CH04", chNum: "CH04", subtitle: "The Awakening Voice" },
     { storyId: "CH05", chNum: "CH05", subtitle: "Echoes of Intent" },
     { storyId: "CH06", chNum: "CH06", subtitle: "Alignment Vectors" },
     { storyId: "CH07", chNum: "CH07", subtitle: "Harmonic Breach" },
     { storyId: "CH08", chNum: "CH08", subtitle: "Witness Protocol" },
     { storyId: "CH09", chNum: "CH09", subtitle: "Memory Carries Forward" },
     { storyId: "CH10", chNum: "CH10", subtitle: "Convergence Window" },
     { storyId: "CH11", chNum: "CH11", subtitle: "Directive 14" },
     { storyId: "CH12", chNum: "CH12", subtitle: "Divergence" },
     { storyId: "CH13", chNum: "CH13", subtitle: "The Intercept" },
     { storyId: "CH14", chNum: "CH14", subtitle: "The Choice" },
     { storyId: "CH15", chNum: "CH15", subtitle: "The Signal Beneath" },
     { storyId: "CH16", chNum: "CH16", subtitle: "The Giza Pulse" },
     { storyId: "CH17", chNum: "CH17", subtitle: "Vault of the Veil" },
   ] as const;
   ```
   > Hardcoded rather than imported from `static-data.ts` to avoid bundle bloat (static-data.ts is ~500KB of generated data). Titles sourced from `static-data.ts` at plan-write time.

**Checkpoint:** TypeScript compiles with no errors. No visible change yet.

### Phase 2: Add router to AskPageContent + update empty state

1. Inside `AskPageContent()` (after line 241 `const storySlug = ...`), add:
   ```tsx
   const router = useRouter();
   ```
2. Locate the empty state block at lines 672–691:
   ```tsx
   {messages.length === 0 &&
     !(highlightIdFromUrl && highlightHydration === "loading") && (
     <div className="py-12 text-center">
       <p className="mb-4 text-sm text-ink-muted">
         What would you like to know about {book.title}?
       </p>
       <div className="flex flex-wrap justify-center gap-2">
         {SUGGESTIONS_BY_AGE_MODE[ageMode].map((suggestion) => (
           <button ...>{suggestion}</button>
         ))}
       </div>
     </div>
   )}
   ```
3. Replace with the branched version:
   ```tsx
   {messages.length === 0 &&
     !(highlightIdFromUrl && highlightHydration === "loading") && (
     <div className="py-12 text-center">
       {!storySlug && !prefilledPrompt && !urlPassage ? (
         <>
           <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-ghost">
             Explore a chapter
           </p>
           <div className="mx-auto mb-6 grid max-w-lg grid-cols-3 gap-1.5 sm:grid-cols-6">
             {CHAPTER_QUICK_TILES.map((tile) => (
               <button
                 key={tile.storyId}
                 type="button"
                 onClick={() => router.push(`/ask?story=${tile.storyId}`)}
                 className="type-ui rounded border border-[var(--color-border)] bg-warm-white px-2 py-2 text-left text-xs text-ink-muted transition-colors hover:border-clay-border hover:text-clay"
               >
                 <span className="block font-semibold">{tile.chNum}</span>
                 <span className="block truncate text-ink-ghost">{tile.subtitle}</span>
               </button>
             ))}
           </div>
         </>
       ) : (
         <>
           <p className="mb-4 text-sm text-ink-muted">
             What would you like to know about {book.title}?
           </p>
           <div className="flex flex-wrap justify-center gap-2">
             {SUGGESTIONS_BY_AGE_MODE[ageMode].map((suggestion) => (
               <button
                 key={suggestion}
                 type="button"
                 onClick={() => sendMessage(suggestion)}
                 className="type-ui rounded-full border border-[var(--color-border)] bg-warm-white px-3 py-1.5 text-ink-muted transition-colors hover:border-clay-border hover:text-clay"
               >
                 {suggestion}
               </button>
             ))}
           </div>
         </>
       )}
     </div>
   )}
   ```

**Checkpoint:** Navigate to `/ask` with no params → see the chapter grid. Click "CH03" → URL becomes `/ask?story=CH03` → breadcrumb appears with "Resonant Memory" → grid is gone, replaced by generic chips (until IDEA-057 ships its welcome variant).

### Phase 3: Verify edge cases

- `/ask?story=CH05` (existing behavior): grid does NOT render; suggestion chips render (or IDEA-057 welcome when it ships). ✓
- `/ask?prompt=...` (prefilledPrompt): grid does NOT render; suggestion chips render. ✓
- `/ask?passage=...` (urlPassage): grid does NOT render. ✓
- `/ask?highlight=...` (highlightIdFromUrl): loading state shows, then after hydration the message auto-sends — grid never visible. ✓
- After sending a message (messages.length > 0): entire empty state block hidden. ✓

## Content Considerations

None. All chapter titles are hardcoded from the existing `storiesData` in `static-data.ts`. If chapter titles change via re-ingest, update `CHAPTER_QUICK_TILES` accordingly (one-time sync step).

## Spoiler & Gating Impact

Under companion-first, all 17 chapters are accessible to all users. The chapter tile grid shows all 17 tiles without gating — this is correct and consistent with the app's current product direction. No spoiler concern: the tiles show only chapter numbers and short titles (world-building vocabulary), not arc content or narrative events.

If chapter gating is ever re-enabled, the grid would need filtering by `readerProgress.currentChapterNumber`. Note this in a comment near `CHAPTER_QUICK_TILES`:
```tsx
// Under companion-first, all 17 tiles are always shown.
// If chapter gating is re-enabled, filter by readerProgress.currentChapterNumber.
```

## Theme-Specific Requirements (ask-forward)

- **Prompt changes:** None. The chapter tile simply sets `?story=` in the URL, which existing Ask infrastructure handles.
- **Latency budget:** Zero — no fetch, no server call. Pure client-side `router.push()`.
- **Conversation-memory storage:** N/A for this feature.
- **Voice/TTS:** N/A.
- **Synergy with IDEA-057:** Once IDEA-057 ships, clicking a chapter tile → `?story=CH03` → IDEA-057's `chapterWelcome` fetch activates → chapter-specific greeting + entity suggestion chips replace the generic chips. This feature is the "before" half of that story; IDEA-057 is the "after" half. They compose cleanly.
- **Synergy with IDEA-084:** The home hero widget (IDEA-084) routes to `/ask?q={query}`. When `q` is set, `prefilledPrompt` is non-null → chapter grid does NOT show → `?q=` auto-submit fires as expected. No conflict.
- **Synergy with IDEA-096:** The context band (IDEA-096) shows a story pill when `contextStoryTitle` is non-null. After clicking a chapter tile, `storySlug` is set → meta fetch → `contextStoryTitle` populates → context band Phase 1 pill appears. Composites cleanly.

## Files Modified

- `src/app/ask/page.tsx` — add `useRouter` import, add `CHAPTER_QUICK_TILES` constant, update empty state render (~40 new lines, ~8 removed lines)

## New Files

None.

## Database Changes

None.

## Testing

- [ ] `npm run build` passes — no TypeScript errors
- [ ] `npm run lint` passes — no new ESLint warnings
- [ ] `npm test` passes — 192 green (no test changes needed; UI-only change)
- [ ] Navigate to `/ask` (no params): chapter grid renders with 17 tiles in 3×3 on mobile / 3×6 on desktop
- [ ] Click CH03 tile: URL changes to `/ask?story=CH03`, breadcrumb shows "Resonant Memory", grid disappears
- [ ] Navigate to `/ask?story=CH01`: chapter grid does NOT render; generic chips show
- [ ] Navigate to `/ask?prompt=Hello`: chapter grid does NOT render; generic chips show
- [ ] Navigate to `/ask` and send a message: grid disappears (messages.length > 0)
- [ ] Guest (unauthenticated): same grid renders; clicking tile routes to `/ask?story=CH05` correctly

## Dependencies

- No prerequisites. Standalone change.
- IDEA-057 (Context-Aware Welcome) is complementary — when IDEA-057 ships, clicking a tile → story context → IDEA-057's welcome activates. No code dependency between the two.
- IDEA-084 (Ask Home Hero Widget) — the `?q=` param the widget sets suppresses the chapter grid via `prefilledPrompt` check. No conflict.

## Estimated Total: 45 minutes
