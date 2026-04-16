# Dev Plan: [IDEA-004] Bookmark a Story as a Favorite

## What This Does
Lets any family member mark any of Keith's stories (or family-contributed stories) as a
personal favorite with a single tap. Favorited stories are collected in a "My Favorites"
section accessible from the profile page. A heart icon on each story's detail page shows
the current state — filled when favorited, outlined when not — and toggles on click.

This is a lightweight personal curation layer on top of the archive. A grandchild might
favorite the stories that mean the most to them; a teenager might save the ones they want
to re-read. The profile becomes a personal corner of the storybook, not just settings.

## User Stories
- As a grandchild, I want to favorite stories so I can find the ones I love without searching.
- As a family member, I want my profile page to show my saved stories so the storybook
  feels personally mine.
- As a user, I want the heart to fill instantly on click so favoriting feels satisfying and
  immediate (optimistic update).

---

## Implementation

### Phase 1: Database — Migration 011

Create `supabase/migrations/011_story_favorites.sql`:

```sql
-- Favorite stories per user (a bookmark, not a rating)
create table public.sb_story_favorites (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  story_id    text        not null,
  story_title text        not null default '',
  favorited_at timestamptz not null default now(),
  unique (user_id, story_id)
);

create index idx_sb_story_favorites_user_id
  on public.sb_story_favorites (user_id, favorited_at desc);

alter table public.sb_story_favorites enable row level security;

create policy "Users read own favorites"
  on public.sb_story_favorites for select
  using (auth.uid() = user_id);

create policy "Users insert own favorites"
  on public.sb_story_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users delete own favorites"
  on public.sb_story_favorites for delete
  using (auth.uid() = user_id);
```

**Apply:** `supabase db push` or paste into the Supabase SQL editor.

**Checkpoint:** Table exists in Supabase dashboard, RLS enabled.

---

### Phase 2: API Routes

**`src/app/api/stories/[storyId]/favorite/route.ts`**

Toggle endpoint — POST inserts or deletes based on current state:

```ts
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  if (!storyId?.trim()) {
    return Response.json({ error: "storyId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = checkRateLimit(`${user.id}:favorite`, 60, 60_000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { story_title?: string; action?: "add" | "remove" } = {};
  try { body = await request.json(); } catch { /* ok */ }

  const action = body.action;
  const storyTitle = typeof body.story_title === "string" ? body.story_title : "";

  if (action === "remove") {
    await supabase
      .from("sb_story_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("story_id", storyId);
    return Response.json({ favorited: false });
  }

  // Insert (ignore conflict so double-click is safe)
  await supabase
    .from("sb_story_favorites")
    .upsert({ user_id: user.id, story_id: storyId, story_title: storyTitle },
             { onConflict: "user_id,story_id", ignoreDuplicates: true });
  return Response.json({ favorited: true });
}
```

**`src/app/api/profile/favorites/route.ts`**

```ts
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("sb_story_favorites")
    .select("id, story_id, story_title, favorited_at")
    .eq("user_id", user.id)
    .order("favorited_at", { ascending: false })
    .limit(200);

  return Response.json({ favorites: data ?? [] });
}
```

**Checkpoint:** Test with curl/Insomnia — POST to `/api/stories/P1_S01/favorite` with
`{ action: "add", story_title: "..." }` inserts row; POST with `action: "remove"` deletes it.

---

### Phase 3: FavoriteButton Client Component

Create `src/components/story/FavoriteButton.tsx`:

```tsx
"use client";

import { useState } from "react";

interface FavoriteButtonProps {
  storyId: string;
  storyTitle: string;
  initialFavorited: boolean;
}

export function FavoriteButton({
  storyId,
  storyTitle,
  initialFavorited,
}: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    // Optimistic update
    setFavorited((prev) => !prev);
    setBusy(true);

    try {
      const res = await fetch(`/api/stories/${storyId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: favorited ? "remove" : "add",
          story_title: storyTitle,
        }),
      });
      if (!res.ok) {
        // Revert on failure
        setFavorited((prev) => !prev);
      }
    } catch {
      setFavorited((prev) => !prev);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={favorited ? "Remove from favorites" : "Save as favorite"}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-warm-white px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-clay-border hover:text-clay disabled:opacity-50"
    >
      <span aria-hidden className="text-base leading-none">
        {favorited ? "♥" : "♡"}
      </span>
      {favorited ? "Saved" : "Save story"}
    </button>
  );
}
```

**Checkpoint:** Component renders, heart fills/unfills on click.

---

### Phase 4: Add FavoriteButton to Story Detail Page

Open `src/app/stories/[storyId]/page.tsx`.

1. In the server component, check if the current user has favorited this story:

```ts
import { createClient } from "@/lib/supabase/server";
import { FavoriteButton } from "@/components/story/FavoriteButton";

// Inside StoryDetailPage, after resolving `story`:
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

let initialFavorited = false;
if (user) {
  const { data } = await supabase
    .from("sb_story_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_id", storyId)
    .single();
  initialFavorited = !!data;
}
```

2. Render `FavoriteButton` in the story header, alongside the existing source badge row
   (after the themes section, before the audio controls / body):

```tsx
<div className="mb-6 flex flex-wrap items-center gap-2">
  <FavoriteButton
    storyId={storyId}
    storyTitle={story.title}
    initialFavorited={initialFavorited}
  />
</div>
```

**Checkpoint:** Visit any story page → heart button appears → click fills it → revisit page,
button is still filled (state persisted to DB).

---

### Phase 5: Profile — Favorites Page

Create `src/app/profile/favorites/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Favorites" };

export default async function ProfileFavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("sb_story_favorites")
    .select("id, story_id, story_title, favorited_at")
    .eq("user_id", user.id)
    .order("favorited_at", { ascending: false })
    .limit(200);

  const favorites = data ?? [];

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-10 md:py-14">
      <Link
        href="/profile"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; Profile
      </Link>
      <h1 className="type-page-title mb-2">My Favorites</h1>
      <p className="mb-8 font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted">
        Stories you&apos;ve saved for easy return.
      </p>

      {favorites.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-6 text-center">
          <p className="type-ui mb-2 text-ink">No favorites yet.</p>
          <p className="font-[family-name:var(--font-lora)] text-sm text-ink-muted">
            Tap the heart on any story to save it here.
          </p>
          <Link href="/stories" className="type-ui mt-3 inline-block text-sm text-clay hover:text-clay-mid">
            Browse stories →
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {favorites.map((fav) => (
          <li key={fav.id}>
            <Link
              href={`/stories/${fav.story_id}`}
              className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-warm-white p-4 transition-[border-color,background-color] hover:border-clay-border hover:bg-gold-pale/30"
            >
              <div>
                <p className="font-[family-name:var(--font-lora)] text-base text-ink">
                  {fav.story_title || fav.story_id}
                </p>
                <p className="type-meta mt-0.5 text-ink-ghost">
                  {fav.story_id}
                </p>
              </div>
              <span className="text-xl text-clay" aria-hidden>♥</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Checkpoint:** Visit `/profile/favorites` — empty state shows; after favoriting a story, it
appears in the list with a link back to the story page.

---

### Phase 6: Add "My Favorites" Link to ProfileHero

Open `src/components/profile/ProfileHero.tsx`.

Add a "My Favorites" button alongside "My questions" in the button row:

```tsx
<Link
  href="/profile/favorites"
  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-[rgba(240,232,213,0.55)] bg-[rgba(240,232,213,0.12)] px-6 py-2.5 font-[family-name:var(--font-inter)] text-sm font-semibold tracking-wide text-[#f7f3ed] transition-[background-color,border-color] duration-[var(--duration-normal)] hover:border-[#f0e8d5] hover:bg-[rgba(240,232,213,0.22)]"
>
  ♥ My favorites
</Link>
```

---

## Files Modified
- `src/app/stories/[storyId]/page.tsx` — add favorite check + FavoriteButton
- `src/components/profile/ProfileHero.tsx` — add "My Favorites" link button

## New Files
- `supabase/migrations/011_story_favorites.sql` — DB migration
- `src/app/api/stories/[storyId]/favorite/route.ts` — toggle API
- `src/app/api/profile/favorites/route.ts` — list API
- `src/components/story/FavoriteButton.tsx` — heart toggle button
- `src/app/profile/favorites/page.tsx` — favorites page

## Database Changes
See migration above — `sb_story_favorites` table with RLS.

## Age-Mode Impact
No change. Works identically across all age modes. Young readers might enjoy the heart button even more.

## Testing
- [ ] Migration applies cleanly (no errors in Supabase SQL editor)
- [ ] Build passes
- [ ] Visit a story → heart button shows "♡ Save story"
- [ ] Click heart → optimistic fill, "♥ Saved"
- [ ] Refresh story page → still shows "♥ Saved" (persisted)
- [ ] Click again → unfavorites, returns to "♡ Save story"
- [ ] Visit `/profile/favorites` → story appears in list, links back
- [ ] Profile page shows "My favorites" button → routes to `/profile/favorites`
- [ ] Empty state shows on `/profile/favorites` before any are saved

## Estimated Total: 1.5–2 hours
