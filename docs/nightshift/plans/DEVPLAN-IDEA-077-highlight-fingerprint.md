# Dev Plan: [IDEA-077] Re-Reader Highlight Fingerprint — Chapter Intensity Mosaic on Profile

**Theme:** post-read-world

## What This Does

Adds a 17-chapter "fingerprint" grid above the highlights list on `/profile/highlights` for readers with `show_all_content=true`. Each tile represents one chapter (CH01–CH17), with background opacity proportional to the reader's highlight density in that chapter. Chapters they highlighted most appear deepest in color. Makes the profile page personal and shows at a glance which parts of the story resonated most. Zero new DB, zero new content — sourced entirely from existing `cel_story_highlights` table.

## User Stories

- As a first-time reader (show_all_content=false): I see the highlights list unchanged. No mosaic, no mention of the feature.
- As a re-reader (show_all_content=true): Above my highlights list I see a 17-tile grid where chapters I highlighted the most appear darker/more opaque. I click any tile to navigate directly to that chapter. The legend reads "Chapters you highlighted most · deeper = more highlights."
- As a re-reader with zero highlights: I see the grid but all tiles are at minimum opacity (8%), with a visual cue suggesting I can start highlighting.
- As the author: Feature is gated by `show_all_content` — readers without this flag see no change to the highlights page.
- As a guest: Page requires auth (existing gate); fingerprint is irrelevant.

## Implementation

### Phase 1: Server-Side Count Query

1. Open `src/app/profile/highlights/page.tsx`
2. Locate the existing `readerProgress` fetch (or wherever `userId` and highlights are fetched)
3. Add a conditional count query inside the same server component, after the `readerProgress` check:

```typescript
let highlightCounts: Record<string, number> = {}

if (readerProgress.showAllContent) {
  const { data: rows } = await supabase
    .from('cel_story_highlights')
    .select('story_id')
    .eq('user_id', userId)

  if (rows) {
    for (const row of rows) {
      highlightCounts[row.story_id] = (highlightCounts[row.story_id] ?? 0) + 1
    }
  }
}
```

4. Pass `highlightCounts` to a new `<HighlightFingerprint>` component (see Phase 2)

**Checkpoint:** Server component fetches count data without error; `highlightCounts` is a flat object like `{ 'ch01-the-departure': 3, 'ch04-resonance': 7 }`.

### Phase 2: HighlightFingerprint Component

1. Create `src/components/profile/HighlightFingerprint.tsx`:

```typescript
'use client'

import Link from 'next/link'

interface Story {
  id: string
  slug: string
  chapterNumber: number
  title: string
}

interface Props {
  highlightCounts: Record<string, number>
  stories: Story[]
}

export function HighlightFingerprint({ highlightCounts, stories }: Props) {
  const chStories = stories
    .filter(s => s.chapterNumber >= 1 && s.chapterNumber <= 17)
    .sort((a, b) => a.chapterNumber - b.chapterNumber)

  const maxCount = Math.max(...chStories.map(s => highlightCounts[s.slug] ?? 0), 1)

  return (
    <div className="mb-8">
      <p className="text-xs text-ink-ghost mb-3">
        Chapters you highlighted most · deeper = more highlights
      </p>
      <div className="flex flex-wrap gap-1">
        {chStories.map(s => {
          const count = highlightCounts[s.slug] ?? 0
          const opacity = count === 0 ? 0.08 : 0.15 + (count / maxCount) * 0.85
          return (
            <Link
              key={s.id}
              href={`/stories/${s.slug}`}
              title={`${s.title} — ${count} highlight${count !== 1 ? 's' : ''}`}
              className="w-10 h-10 rounded flex items-center justify-center text-[10px] font-mono hover:scale-110 transition-transform"
              style={{
                backgroundColor: `rgb(var(--color-ocean-rgb, 16 155 197) / ${opacity})`,
                color: opacity > 0.4 ? 'white' : 'var(--color-ink-ghost)',
              }}
            >
              {s.chapterNumber}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

**Note on color tokens:** Use existing Tailwind 4 CSS custom properties. If `--color-ocean-rgb` is not available as an RGB triplet, fall back to `backgroundColor: \`rgba(16, 155, 197, ${opacity})\`` — verify against `src/app/globals.css` before executing.

**Checkpoint:** Component renders in Storybook or a test page with mock data. 17 tiles, correct opacity gradient, links resolve to `/stories/{slug}`.

### Phase 3: Wire Into Profile Page

1. In `src/app/profile/highlights/page.tsx`, import and render the component:

```tsx
import { HighlightFingerprint } from '@/components/profile/HighlightFingerprint'
// ...
// In JSX, before the highlights list, conditionally render:
{readerProgress.showAllContent && Object.keys(highlightCounts).length >= 0 && (
  <HighlightFingerprint
    highlightCounts={highlightCounts}
    stories={allChStories} // 17 CH stories from static wiki data
  />
)}
```

2. For `allChStories`, use the same static wiki data source the page already uses (e.g., `getStaticWikiData().stories` or equivalent). Filter to `chapterNumber >= 1 && chapterNumber <= 17`.

**Checkpoint:** Full page renders for a `show_all_content=true` user. The fingerprint grid appears above the highlights list. A locked reader sees the page unchanged.

## Content Considerations

No wiki content changes. No new markdown files. No brain_lab impact.

## Spoiler & Gating Impact

- **Gate:** `show_all_content === true`, checked server-side in `profile/highlights/page.tsx`
- **Spoiler risk:** None. The fingerprint shows the reader's own highlight counts per chapter — it reveals nothing about chapter narrative (a count of 7 highlights in CH11 conveys no story information)
- **If gate is false:** Component does not render. Zero visual change for locked readers.
- **Re-render safety:** `highlightCounts` is computed server-side and passed as a plain object; no client-side DB calls

## Theme-Specific Requirements (post-read-world)

1. **Degradation for locked/first-time readers:** Component simply does not render. No placeholder, no empty shell, no mention of the feature. The highlights list renders exactly as today.
2. **Integration with `show_all_content`:** Direct server-side check in the page component before issuing the count query. `show_all_content` is read from `readerProgress` which is already fetched for the highlights page.
3. **Partial-completion edge cases:** Under companion-first, all content is accessible regardless of reads. `show_all_content` is the sole gate — validated server-side, no edge cases. A reader who has read all chapters but lacks `show_all_content=true` still sees the standard page.

## Testing

- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `npm run lint` passes (0 new errors — verify no raw `<img>` tags)
- [ ] `npm test` passes (no new tests required — pure UI addition)
- [ ] **Locked-reader path:** Navigate to `/profile/highlights` as a user with `show_all_content=false` — page renders normally, no mosaic visible
- [ ] **Unlocked / re-reader path:** Navigate as `show_all_content=true` user — 17-tile grid renders above list; tiles link to correct chapter pages; title tooltip shows count
- [ ] **Guest path:** Page requires auth (verify existing gate) — no change
- [ ] **Zero highlights edge case:** `show_all_content=true` user with no saved highlights — all tiles render at 8% opacity (minOpacity), no errors
- [ ] **Single-chapter edge case:** User highlighted only CH06 — CH06 tile is 100% opacity; all others at 8%

## Files Modified

- `src/app/profile/highlights/page.tsx` — add `highlightCounts` query + conditional render of fingerprint

## New Files

- `src/components/profile/HighlightFingerprint.tsx` — new mosaic component

## Database Changes

None. Uses existing `cel_story_highlights` table (read-only count query).

## Verify

- [ ] Build passes, lint clean, 192 tests still pass
- [ ] `show_all_content=false` user: highlights page unchanged
- [ ] `show_all_content=true` user: 17-tile fingerprint renders above highlights list
- [ ] All 17 tiles link to `/stories/{slug}`; title attribute shows count
- [ ] Color scale correct: zero-highlight tiles at min opacity; max-highlight tile at ~100% opacity

## Estimated Total: 1.5 hours
