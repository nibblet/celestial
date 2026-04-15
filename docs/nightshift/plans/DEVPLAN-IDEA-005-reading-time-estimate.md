# Dev Plan: [IDEA-005] Reading Time Estimate on Story Cards

## What This Does
Displays a small estimated reading time (e.g. "~4 min read") on story cards in the library and in the story detail header. The `wordCount` field already exists on every `WikiStory` object (populated during wiki compilation). This is a pure UI addition — no database changes, no content pipeline changes, no new API calls.

For family members browsing the library, a reading time gives a quick sense of commitment before opening a story. For young readers, knowing a story is "~2 min read" versus "~8 min read" shapes which one they pick.

## User Stories
- As a family member browsing the library, I want to see how long a story is at a glance so I can choose one that fits my time.
- As a grandchild on a journey, I want to know if I have time for the next story before I click.

## Implementation

### Phase 1: Utility function
1. Open `src/lib/utils/` and create `reading-time.ts`:
   ```ts
   /** Returns estimated reading time label, e.g. "~3 min read" */
   export function readingTimeLabel(wordCount: number): string {
     const minutes = Math.max(1, Math.round(wordCount / 200));
     return `~${minutes} min read`;
   }
   ```
   Average adult reading speed = 200 wpm. Minimum 1 min.

2. **Checkpoint:** Import the function into any component and verify it returns sensible values.

### Phase 2: Story Library Cards
1. Open `src/app/stories/page.tsx` (the story library).
2. Find the story card render loop. Locate where `story.summary` / `story.themes` are displayed.
3. Import `readingTimeLabel` and add the label to each card — below the summary, using a subtle muted style:
   ```tsx
   <span className="type-ui text-xs text-ink-ghost mt-1 block">
     {readingTimeLabel(story.wordCount)}
   </span>
   ```
4. **Checkpoint:** Load `/stories` — every card shows a reading time.

### Phase 3: Story Detail Header
1. Open `src/app/stories/[storyId]/page.tsx`.
2. In the story header area (near title, life stage, year), add the reading time label:
   ```tsx
   <span className="type-ui text-xs text-ink-ghost">
     {readingTimeLabel(story.wordCount)}
   </span>
   ```
3. **Checkpoint:** Open a story — the header shows the reading time.

### Phase 4: Journey Step Page (optional polish)
1. Open `src/app/journeys/[slug]/[step]/page.tsx`.
2. If the current story's `wordCount` is accessible, show reading time near the story title.
3. **Checkpoint:** Journey step page shows reading time.

## Content Considerations
- `wordCount` is already populated by `scripts/compile-wiki.ts` for all Volume 1 stories.
- Volume 2+ (Supabase) stories: `sb_story_drafts` doesn't have a `wordCount` field. For the library page, those stories can fall back to `body.split(/\s+/).length` computed inline, or skip the label. The simplest approach: skip the label if `wordCount` is 0 or undefined.

## Age-Mode Impact
- All three modes benefit equally. Young readers especially benefit from knowing upfront if a story is quick.
- Consider: for `young_reader` mode, use "~3 min" instead of "~3 min read" (simpler).

## Testing
- [ ] Build passes
- [ ] Story library cards all show reading times
- [ ] Story detail header shows reading time
- [ ] Stories with 0 wordCount don't crash (graceful fallback)
- [ ] Values are reasonable (not 0 min or 100 min for typical stories)

## Dependencies
None. `wordCount` is already on `WikiStory`.

## Estimated Total: 20 minutes
