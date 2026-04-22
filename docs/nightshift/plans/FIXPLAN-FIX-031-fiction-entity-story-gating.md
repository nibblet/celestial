# Fix: [FIX-031] Fiction Entity Detail Pages Leak Future Chapter IDs

## Problem
`/factions/[slug]`, `/locations/[slug]`, and `/artifacts/[slug]` detail pages show "Appearances" and "Additional appearances" sections that list chapter IDs (e.g. CH04, CH07) and link to story pages, without checking whether those chapters are unlocked for the current reader.

Example: visiting `/factions/council-of-orbits` as a reader at CH01 reveals that the Council of Orbits appears in CH04 and CH07 — spoiling the entity's significance in those future chapters.

The character detail page (`/characters/[slug]`) correctly applies `isStoryUnlocked()` filtering. `FictionEntityViews.tsx` does not.

**Severity: P1 — chapter-gating gap.** Story content itself is not shown (the story pages are separately gated), but the appearance-in-chapter metadata is revealed.

## Root Cause
`src/components/entities/FictionEntityViews.tsx`, function `FictionEntityDetailPage` (lines 76–103):
```tsx
{entity.memoirStoryIds.map((id) => (
  <li key={id}>
    <Link href={`/stories/${id}`}>{id}</Link>
  </li>
))}
```
No `isStoryUnlocked()` filter. The component is a Server Component but receives no `readerProgress` prop. The three page files that render it (`factions/[slug]/page.tsx`, `locations/[slug]/page.tsx`, `artifacts/[slug]/page.tsx`) also pass no progress data.

## Steps

### 1. Update `FictionEntityDetailPage` to accept and use reader progress

Open `src/components/entities/FictionEntityViews.tsx`.

Add the import at the top (after existing imports):
```ts
import type { ReaderProgress } from "@/lib/progress/reader-progress";
import { isStoryUnlocked } from "@/lib/progress/reader-progress";
```

Update the `FictionEntityDetailPage` function signature:
```ts
export function FictionEntityDetailPage({
  entity,
  heading,
  basePath,
  readerProgress,
}: {
  entity: WikiFictionNounEntity;
  heading: string;
  basePath: string;
  readerProgress: ReaderProgress;
}) {
```

Apply the gate in the `memoirStoryIds` block (replace the existing `.map` call):
```tsx
{entity.memoirStoryIds
  .filter((id) => isStoryUnlocked(id, readerProgress))
  .map((id) => (
    <li key={id}>
      <Link href={`/stories/${id}`} className="hover:text-ocean">{id}</Link>
    </li>
  ))}
```

Apply the same gate in the `interviewStoryIds` block:
```tsx
{entity.interviewStoryIds
  .filter((id) => isStoryUnlocked(id, readerProgress))
  .map((id) => (
    <li key={id}>
      <Link href={`/stories/${id}`} className="hover:text-ocean">{id}</Link>
    </li>
  ))}
```

Also update the `{entity.memoirStoryIds.length > 0}` and `{entity.interviewStoryIds.length > 0}` guards to account for post-filter emptiness — otherwise the section header still renders with no items. Replace both conditions with a computed variable:

Before the return statement:
```ts
const visibleMemoirIds = entity.memoirStoryIds.filter((id) => isStoryUnlocked(id, readerProgress));
const visibleInterviewIds = entity.interviewStoryIds.filter((id) => isStoryUnlocked(id, readerProgress));
```

Use `visibleMemoirIds.length > 0` and `visibleInterviewIds.length > 0` as the section guards, and `.map()` over the pre-filtered arrays.

### 2. Update the three page files to fetch and pass reader progress

For each of these three files:
- `src/app/factions/[slug]/page.tsx`
- `src/app/locations/[slug]/page.tsx`
- `src/app/artifacts/[slug]/page.tsx`

Add imports at the top:
```ts
import { getReaderProgress } from "@/lib/progress/reader-progress";
```

Change the page function from a synchronous component to async and fetch progress:
```ts
export default async function FactionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const faction = getFactionBySlug(slug);
  if (!faction) notFound();
  const progress = await getReaderProgress();
  return (
    <FictionEntityDetailPage
      entity={faction}
      heading="Factions"
      basePath="/factions"
      readerProgress={progress}
    />
  );
}
```

Apply the same pattern to the locations and artifacts page files (changing the entity getter and heading/basePath accordingly).

### 3. Build and lint

```
npx next build
npm run lint
npm test
```

## Manual Verification
- Log in as a reader at CH01 (only CH01 in `cel_story_reads`).
  - Visit `/factions/council-of-orbits` — the "Appearances" and "Additional appearances" sections should be empty (CH04 and CH07 are locked).
- As a re-reader (show_all_content = true):
  - Visit `/factions/council-of-orbits` — both CH04 and CH07 links should appear.
- As a guest (no auth, guest cookie at CH01):
  - Same behavior as locked reader — future chapter IDs should not appear.

## Files Modified
- `src/components/entities/FictionEntityViews.tsx`
- `src/app/factions/[slug]/page.tsx`
- `src/app/locations/[slug]/page.tsx`
- `src/app/artifacts/[slug]/page.tsx`

## New Files (if any)
None.

## Database Changes (if any)
None.

## Verify
- [ ] Build, lint, tests pass
- [ ] Locked reader (CH01) sees no future chapter IDs on faction/location/artifact pages
- [ ] Re-reader (show_all_content) sees all chapter IDs
- [ ] Guest-cookie reader behaves same as locked reader
