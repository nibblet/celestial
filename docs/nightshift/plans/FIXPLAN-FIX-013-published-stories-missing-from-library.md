# Fix: [FIX-013] Published V2 Stories Not Shown in Story Library

## Problem
Family members who contribute stories via `/tell`, have them approved by Paul in `/admin/drafts`,
and published — can never find those stories by browsing `/stories`. The library page only renders
Volume 1 stories from the static filesystem data file. Published Supabase stories (`status = 'published'`
in `sb_story_drafts`) exist only as detail pages (`/stories/[storyId]`) that no one can navigate to
from the library listing.

**Impact:** The entire `/tell` → `/admin/drafts` → publish pipeline's end result is invisible. This
undermines contributor motivation and makes the app appear static to family members.

## Root Cause

`src/app/stories/page.tsx` is a client component that imports `storiesData` from
`src/lib/wiki/static-data.ts` (auto-generated, Volume 1 only). It has no mechanism to fetch
published Supabase stories. `getPublishedStories()` exists in `src/lib/wiki/supabase-stories.ts`
and returns Volume 2+ stories in the same `WikiStory` shape — it just isn't called anywhere on the
listing page.

The story detail page (`src/app/stories/[storyId]/page.tsx`) already falls back to Supabase
correctly, but without the listing, those pages are unreachable.

## Steps

### 1. Create a server-side data-fetching wrapper

The current `stories/page.tsx` is a client component (uses `useState`, `useMemo`). We need to split
it into a server parent (fetches data) + client child (handles filtering UI).

**Rename** the current default export to `StoriesPageClient` and add a `stories` prop:

Open `src/app/stories/page.tsx`. Change the top of the file:

Before:
```tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { storiesData } from "@/lib/wiki/static-data";
...

export default function StoriesPage() {
  const [search, setSearch] = useState("");
  ...
  const filtered = useMemo(() => {
    return storiesData.filter(...)
  ...
```

After (add prop, combine both sources):
```tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { StoryCard } from "@/lib/wiki/static-data";
...

export function StoriesPageClient({ stories }: { stories: StoryCard[] }) {
  const [search, setSearch] = useState("");
  ...
  const filtered = useMemo(() => {
    return stories.filter(...)
```

### 2. Create the server component wrapper

Add a new default export at the bottom of `src/app/stories/page.tsx` (or at the top, before `StoriesPageClient`):

```tsx
import { storiesData } from "@/lib/wiki/static-data";
import { getPublishedStories } from "@/lib/wiki/supabase-stories";

export default async function StoriesPage() {
  const v2Stories = await getPublishedStories();

  // Convert WikiStory → StoryCard shape for V2 stories
  const v2Cards: StoryCard[] = v2Stories.map((s) => ({
    storyId: s.storyId,
    slug: s.slug,
    title: s.title,
    summary: s.summary,
    lifeStage: s.lifeStage,
    themes: s.themes,
    wordCount: s.wordCount,
    principles: s.principles,
    volume: s.volume,
  }));

  // V1 first (stable order), then V2 sorted by storyId ascending
  const allStories = [...storiesData, ...v2Cards];

  return <StoriesPageClient stories={allStories} />;
}
```

### 3. Ensure `"use client"` stays only on `StoriesPageClient`

The `"use client"` directive must NOT appear at the top of the file anymore (since the default export
is now a server component). Move `"use client"` to be the first line of the `StoriesPageClient`
function's own module if you split files, OR remove it from the top and add a new client-only file.

**Cleanest approach:** Split into two files:
- `src/app/stories/StoriesPageClient.tsx` — client component with `"use client"`, filtering UI
- `src/app/stories/page.tsx` — server component, fetches data, renders `<StoriesPageClient>`

### 4. Implementation — `src/app/stories/StoriesPageClient.tsx`

```tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { StoryCard } from "@/lib/wiki/static-data";
import { Reveal } from "@/components/ui/Reveal";
import { lifeStageToEraAccent } from "@/lib/design/era";

const LIFE_STAGES = [
  "All",
  "Childhood",
  "Education",
  "Early Career",
  "Mid Career",
  "Leadership",
  "Reflection",
  "Legacy",
];

export function StoriesPageClient({ stories }: { stories: StoryCard[] }) {
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState("All");
  const [selectedTheme, setSelectedTheme] = useState("All");

  const allThemes = useMemo(() => {
    const themes = new Set<string>();
    stories.forEach((s) => s.themes.forEach((t) => themes.add(t)));
    return ["All", ...Array.from(themes).sort()];
  }, [stories]);

  const filtered = useMemo(() => {
    return stories.filter((story) => {
      const matchesSearch =
        !search ||
        story.title.toLowerCase().includes(search.toLowerCase()) ||
        story.summary.toLowerCase().includes(search.toLowerCase());
      const matchesStage =
        selectedStage === "All" || story.lifeStage === selectedStage;
      const matchesTheme =
        selectedTheme === "All" || story.themes.includes(selectedTheme);
      return matchesSearch && matchesStage && matchesTheme;
    });
  }, [stories, search, selectedStage, selectedTheme]);

  // ... rest of JSX identical to current stories/page.tsx, plus count label update:
  // Change: `${storiesData.length} stories from Keith Cobb's life`
  // To: `${stories.length} stories in the family library` (or similar)
  ...
}
```

### 5. Implementation — `src/app/stories/page.tsx` (new server component)

```tsx
import { storiesData } from "@/lib/wiki/static-data";
import { getPublishedStories } from "@/lib/wiki/supabase-stories";
import { StoriesPageClient } from "./StoriesPageClient";
import type { StoryCard } from "@/lib/wiki/static-data";

export default async function StoriesPage() {
  const v2Stories = await getPublishedStories();

  const v2Cards: StoryCard[] = v2Stories.map((s) => ({
    storyId: s.storyId,
    slug: s.slug,
    title: s.title,
    summary: s.summary,
    lifeStage: s.lifeStage,
    themes: s.themes,
    wordCount: s.wordCount,
    principles: s.principles,
    volume: s.volume,
  }));

  const allStories: StoryCard[] = [...storiesData, ...v2Cards];

  return <StoriesPageClient stories={allStories} />;
}
```

### 6. Visual indicator for family-contributed stories (optional polish)

On each story card, if `story.volume && story.volume !== "P1"`, show a small "Family Story"
badge alongside the life stage badge. This helps family members distinguish Keith's memoir stories
from contributed family stories.

### 7. Run build and verify

```bash
npm run build
```

### 8. Test

- Start dev server: `npm run dev`
- Navigate to `/stories`
- If no stories published yet: count shows 39, library looks identical to before ✓
- After publishing one story via `/admin/drafts`: story appears at the bottom of the list ✓
- Story card links to `/stories/P2_S01` (or whatever ID) ✓
- Story detail page loads correctly ✓

## Files Modified
- `src/app/stories/page.tsx` — converted to server component, removes `"use client"`, fetches Supabase stories

## New Files
- `src/app/stories/StoriesPageClient.tsx` — client component with filtering UI (extracted from page.tsx)

## Database Changes
None. Uses existing `sb_story_drafts` table and `getPublishedStories()` function.

## Verify
- [ ] Build passes (`npm run build`)
- [ ] `/stories` shows Volume 1 stories (39 unchanged)
- [ ] After publishing a family story, it appears in the library listing
- [ ] Filtering (search, stage, theme) works on both V1 and V2 stories
- [ ] Story detail page still loads for both V1 and V2 story IDs
