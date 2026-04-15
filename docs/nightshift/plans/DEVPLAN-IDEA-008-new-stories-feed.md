# Dev Plan: [IDEA-008] "New Stories" Feed on Home Page

## What This Does
The home page currently shows static navigation cards (Stories, Themes, Timeline, Ask Keith,
Journeys, Tell a Story). Now that family members can contribute stories via `/tell`, the home
page should celebrate those contributions by showing the most recently published stories.

A "Recently Added" section beneath the nav cards lists the newest 3 published Supabase stories
(Volume 2+), sorted by `created_at`. Each card links to the story detail page. If no family
stories have been published yet, the section is omitted entirely. This makes the archive feel
alive and rewards contributors by making their work visible immediately.

## User Stories
- As a family member, I want to see new stories on the home page so I know when someone has
  contributed something new to the archive.
- As a contributor, I want to see my published story appear on the home page so I feel
  recognized and motivated to share more.
- As a grandchild, I want to see what family members have added so I can read their stories too.

## Implementation

### Phase 1: Load Published Stories in Home Page Server Component

1. Open `src/app/page.tsx` (the home page). It is currently a server component.

2. Import `getPublishedStories` from `@/lib/wiki/supabase-stories`:
   ```ts
   import { getPublishedStories } from "@/lib/wiki/supabase-stories";
   ```

3. In the page component body (before the `return`), fetch the latest stories:
   ```ts
   const recentStories = await getPublishedStories();
   const latestStories = recentStories
     .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
     .slice(0, 3);
   ```
   Note: `getPublishedStories()` is already in the codebase (`src/lib/wiki/supabase-stories.ts`).
   Check what fields the returned objects have — at minimum `storyId`, `title`, `summary`,
   `lifeStage`. Add `createdAt` if it's not already mapped.

4. **Checkpoint:** Add a console.log to verify `latestStories` returns data from Supabase before
   building UI.

### Phase 2: Build the "Recently Added" UI Section

5. In `src/app/page.tsx`, add the section after the existing nav grid (keep nav grid as-is):

```tsx
{latestStories.length > 0 && (
  <section className="mt-10">
    <h2 className="type-section-label mb-4 text-ink-muted">
      Recently Added
    </h2>
    <div className="space-y-3">
      {latestStories.map((story) => (
        <Link
          key={story.storyId}
          href={`/stories/${story.storyId}`}
          className="block rounded-xl border border-[var(--color-border)] bg-warm-white p-4 transition-colors hover:border-clay-border"
        >
          <p className="type-ui font-medium text-ink">{story.title}</p>
          <p className="mt-0.5 line-clamp-2 font-[family-name:var(--font-lora)] text-xs text-ink-muted">
            {story.summary}
          </p>
        </Link>
      ))}
    </div>
  </section>
)}
```

6. **Checkpoint:** Verify the section renders when there are published stories in Supabase, and
   is absent when there are none.

### Phase 3: Supabase Story Type — Add createdAt if Missing

7. Open `src/lib/wiki/supabase-stories.ts`. Check whether the returned story objects include
   `createdAt`. The `sb_story_drafts` table has a `created_at` column.

8. If `createdAt` is not in the return type, add it:
   - Update the `.select()` query to include `created_at`
   - Map it to `createdAt` in the returned object
   - Add `createdAt?: string` to the `WikiStory` type or the supabase-specific return type

9. **Checkpoint:** Sort still works — `latestStories` ordered newest-first.

### Phase 4: Edge Case Handling

10. If `getPublishedStories()` throws (Supabase unavailable), it should not crash the home page.
    Wrap in a try/catch with fallback to empty array:
    ```ts
    const recentStories = await getPublishedStories().catch(() => []);
    ```

11. **Checkpoint:** Home page still loads correctly even if Supabase is unreachable.

## Content Considerations
- Only published Volume 2+ stories appear (Supabase-sourced). Volume 1 (Keith's memoir stories)
  don't appear here — they're curated, not "new." The distinction matters: this section is for
  family contributions, not the archive itself.
- Section header: "Recently Added" feels warm and inviting. Could also be "Family Stories" if
  Paul prefers.

## Age-Mode Impact
- UI renders identically for all age modes — no age-mode variation needed here.
- Young readers can click into these stories just like any other.

## Testing
- [ ] Build passes
- [ ] Home page renders with "Recently Added" section when published Supabase stories exist
- [ ] Section is hidden when `latestStories.length === 0`
- [ ] Stories are sorted newest-first
- [ ] Clicking a story card navigates to the correct story detail page
- [ ] Home page loads correctly when Supabase is unreachable (graceful fallback)
- [ ] Verify in mobile layout (stories stack cleanly)

## Dependencies
- None. `getPublishedStories()` already exists. Home page is already a server component.

## Estimated Total: 30–45 minutes
