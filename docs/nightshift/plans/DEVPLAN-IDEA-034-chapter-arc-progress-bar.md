# Dev Plan: [IDEA-034] Chapter Arc Progress Indicator on /stories

## What This Does

Adds a slim "N of 17 chapters read" progress bar above the chapter grid on `/stories`. The bar uses sci-fi styling (segmented neon accent) and a context-sensitive label for three reader states: new reader (0/17), mid-reader (N/17), and re-reader (show_all_content=true → "Full archive — re-reader mode"). No new API calls, no DB changes — data is already present as props in `StoriesPageClient`.

## User Stories

- As a **first-time reader**: I see a segmented progress bar showing "3 of 17 chapters read" above the chapter grid, giving me a clear sense of my arc position.
- As a **re-reader** (show_all_content on): I see "Full archive — re-reader mode" instead of a progress bar, signaling that all chapters are accessible.
- As a **guest reader** (cookie-based progress): The progress bar shows my chapter count from the cookie (e.g., "0 of 17" if no chapters started), no auth required.

## Implementation

### Phase 1: Progress Bar Component

1. Open `src/app/stories/StoriesPageClient.tsx`
2. Locate the section rendering the chapter grid (after the heading/intro text and before `{stories.map(...)}`). The component already receives `currentChapterNumber: number` and `showAllContent: boolean` as props.
3. Add a constant for total chapter count, derived from the stories array:
   ```typescript
   const totalChapters = stories.filter(s => /^CH\d+/i.test(s.storyId)).length;
   ```
4. Add the progress bar JSX above the grid:
   ```tsx
   <div className="mb-8">
     {showAllContent ? (
       <div className="flex items-center gap-2">
         <div className="h-1.5 flex-1 rounded-full bg-[var(--color-border)]">
           <div className="h-full w-full rounded-full bg-ocean opacity-60" />
         </div>
         <span className="type-meta whitespace-nowrap text-ink-ghost normal-case tracking-normal">
           Full archive — re-reader mode
         </span>
       </div>
     ) : (
       <div className="flex items-center gap-2">
         <div className="h-1.5 flex-1 rounded-full bg-[var(--color-border)]">
           <div
             className="h-full rounded-full bg-ocean transition-all"
             style={{
               width: `${totalChapters > 0 ? (Math.min(currentChapterNumber, totalChapters) / totalChapters) * 100 : 0}%`,
             }}
           />
         </div>
         <span className="type-meta whitespace-nowrap text-ink-ghost normal-case tracking-normal">
           {currentChapterNumber} of {totalChapters}
         </span>
       </div>
     )}
   </div>
   ```
   **Checkpoint:** Progress bar renders. Verify at `/stories` in browser. Check all three reader states.

### Phase 2: Segmented Styling (Optional Enhancement)

If Paul wants segment marks at every chapter boundary (17 tick marks), replace the smooth bar with a flex row of 17 small squares, each filled or empty based on `currentChapterNumber`. This is a stylistic preference — Phase 1 smooth bar is the default.

## Content Considerations

No wiki content impact. No new markdown files. No brain_lab ingest changes.

## Spoiler & Gating Impact

This feature does **not** touch locked content. The progress bar number is `currentChapterNumber` — the count of chapters the reader has already unlocked. No future chapter content is revealed. The bar tells readers how far they are, not what comes next.

- **Locked-reader path (first-time):** Bar shows N/17. No locked chapter titles or content.
- **Re-reader path (show_all_content=true):** Label says "Full archive — re-reader mode". No progress bar.
- **Guest path (cookie fallback):** `currentChapterNumber` derived from `celestial_ch` cookie. If 0 (no chapters started), bar width is 0%.
- **Ask-filter impact:** None — this is a pure display component.

## Testing

- [ ] Build passes (`npx next build`)
- [ ] Lint passes (`npm run lint`)
- [ ] `npm test` passes
- [ ] **Locked-reader path:** `/stories` shows "2 of 17" for a reader at CH02
- [ ] **Re-reader path:** `/stories` shows "Full archive — re-reader mode"
- [ ] **Guest path (0 chapters):** Bar renders with 0% width, "0 of 17"
- [ ] Progress bar does not reveal chapter titles or content from locked chapters

## Dependencies

None. `StoriesPageClient` already receives all required data as props.

## Estimated Total: 0.5 hours
