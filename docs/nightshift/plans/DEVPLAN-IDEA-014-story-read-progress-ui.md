# Dev Plan: [IDEA-014] Story Read Progress UI — Profile Bar + Story Card Badges

## What This Does
The reading tracking infrastructure is already live: `sb_story_reads` table (migration 005),
`ReadTracker` component fires a POST on every story visit, and Keith's analytics dashboard
shows family-wide read counts. What's missing is the user-facing feedback loop — family members
can't see their own progress through Keith's 39 stories.

This feature adds two visible elements:
1. **Profile page**: "X of 39 stories read" progress bar on the family member's profile page.
2. **Story library**: Small "✓ Read" badge on story cards the user has already visited.

This closes the loop on IDEA-013. No new DB work needed — everything reads from `sb_story_reads`.

## User Stories
- As a grandchild, I want to see how many of Grandpa's stories I've read so I know how far
  I've gotten through his life.
- As a family member, I want to see which story cards I've already read in the library so I can
  find new ones quickly.

## Implementation

### Phase 1: Profile Page Progress Bar

**File:** `src/app/profile/page.tsx`

1. In the server component, after the existing `unreadAnswerCount` query, add a read count query
   for non-Keith users:

```ts
let storiesReadCount = 0;
if (!isKeithSpecialAccess) {
  const { count } = await supabase
    .from("sb_story_reads")
    .select("story_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  storiesReadCount = count ?? 0;
}
```

2. Pass `storiesReadCount` to `ProfileHero`:
```ts
return (
  <ProfileHero
    displayName={displayName}
    email={user.email ?? ""}
    unreadAnswerCount={unreadAnswerCount ?? 0}
    storiesReadCount={storiesReadCount}
  />
);
```

**File:** `src/components/profile/ProfileHero.tsx`

3. Add `storiesReadCount` prop to the component type.

4. Add a progress section just above (or below) the existing quick links grid:

```tsx
{storiesReadCount > 0 && (
  <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-warm-white p-4">
    <div className="mb-2 flex items-baseline justify-between">
      <p className="type-meta text-ink">Stories read</p>
      <p className="type-meta text-ink-ghost">
        {storiesReadCount} of 39
      </p>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
      <div
        className="h-full rounded-full bg-clay transition-[width] duration-500"
        style={{ width: `${Math.round((storiesReadCount / 39) * 100)}%` }}
      />
    </div>
    {storiesReadCount === 39 && (
      <p className="type-ui mt-2 text-sm text-clay">
        You've read every story. ✓
      </p>
    )}
  </div>
)}
```

**Checkpoint:** Visit `/profile` — if you've read at least 1 story, a progress bar shows.
"0 of 39" does not show (the bar only appears after the first read).

---

### Phase 2: Story Library Read Badges

This is more involved because the stories library is a server component and needs per-user
read data. The approach: fetch the user's read story IDs on the `/stories` server page and
pass them into the story card renderer.

**File:** `src/app/stories/page.tsx`

1. In the server component, add a query for the current user's read story IDs:
```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

let readStoryIds = new Set<string>();
if (user) {
  const { data: reads } = await supabase
    .from("sb_story_reads")
    .select("story_id")
    .eq("user_id", user.id);
  readStoryIds = new Set((reads ?? []).map(r => r.story_id));
}
```

2. Pass `readStoryIds` to the story card component (or render a small badge overlay).

**Note:** Inspect the current story card component structure before implementing — the story
card may be an inline component or a separate file. Adjust accordingly.

3. On each story card, if `readStoryIds.has(story.id)`, render a small indicator:
```tsx
{isRead && (
  <span className="type-meta absolute right-3 top-3 rounded-full bg-clay/10 px-2 py-0.5 text-xs text-clay">
    Read
  </span>
)}
```

**Checkpoint:** After reading a story, return to `/stories` — the story card shows "Read".

---

### Phase 3: Minor — Young Reader Mode

For `young_reader` mode, the progress bar copy and badge should be warm and celebratory.
Consider a simple conditional: if `ageMode === "young_reader"` and `storiesReadCount === 39`,
show "You read ALL of Grandpa's stories! 🎉".

This can be done inline in `ProfileHero` using the existing `useAgeMode()` hook (already
imported in that component if it uses client state) or by receiving `ageMode` as a prop.

**Checkpoint:** Toggle age mode to young_reader on profile, verify message differs.

---

## Content Considerations
No wiki or markdown changes.

## Age-Mode Impact
- `young_reader`: celebratory copy on profile ("You read ALL of Grandpa's stories!")
- `teen` + `adult`: standard "X of 39" phrasing

## Testing
- [ ] Build passes
- [ ] Visit any story page — fires read event silently (no UI change on story)
- [ ] Visit `/profile` — progress bar shows if ≥1 story read
- [ ] Visit `/stories` — read story cards show "Read" badge
- [ ] Progress bar fills correctly (1/39, 10/39, 39/39)
- [ ] `young_reader` mode: check celebratory copy at 39/39

## Dependencies
- Migration `005_story_reads.sql` must be applied (already done).
- `ReadTracker` must be on story pages (already done).

## Estimated Total: 1–1.5 hours
