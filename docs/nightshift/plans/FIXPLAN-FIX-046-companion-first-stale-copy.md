# Fix: [FIX-046] Stale "Unlock As You Progress" UI Copy After Companion-First Shift

## Problem

Commit `0e60b8c` introduced a **companion-first product direction shift**: `getReaderProgress()` in `reader-progress.ts` now defaults ALL users (unauthenticated and authenticated with no DB reads) to `currentChapterNumber = max chapter (17)`. This means `isStoryUnlocked()` returns `true` for every story for every user — the progressive-unlock model is no longer the default experience.

Three places in the UI still carry copy that describes the old "read chapter N to unlock chapter N+1" model:

1. **`src/components/home/HomePageClient.tsx:16`**
   ```
   description: `Begin at Chapter 1 and unlock the companion as you progress.`
   ```
   This is the subtitle on the "Stories" nav card on the home page. It implies a gated progression that no longer applies.

2. **`src/app/stories/StoriesPageClient.tsx:217`**
   ```
   read to unlock.
   ```
   This text appears inside the story library silhouette card for unread chapters. With companion-first defaults, this state is only reachable if a user has some DB reads but is missing a specific chapter — an edge case now, not the default. The copy is still technically reachable but highly misleading.

3. **`src/app/stories/[storyId]/page.tsx:42–60`** — Dead code block:
   ```tsx
   if (!unlocked) {
     return <div>...This chapter is locked until you reach it in your reading progress...
     Use the chapter library card action to mark it read and unlock this page.</div>
   }
   ```
   With companion-first, `currentChapterNumber` is always ≥ 17, so `isStoryUnlocked()` always returns `true` for all CH01–CH17 stories. This `if (!unlocked)` block is **dead code** — it can never execute for any story under current defaults. However, it still adds bundle weight and will confuse future developers.

**Severity:** Low — no spoiler or auth impact. Cosmetic + dead code. But the home page copy is user-visible and directly contradicts the product direction.

## Root Cause

The companion-first logic was added to `reader-progress.ts` in commit `0e60b8c` without updating the UI copy that referenced the old gating model.

## Steps

### File 1: `src/components/home/HomePageClient.tsx`

1. Open `src/components/home/HomePageClient.tsx`
2. Around line 16, find:
   ```
   description: `Begin at Chapter 1 and unlock the companion as you progress.`,
   ```
3. Replace with copy that matches the companion-first experience. Suggested:
   ```
   description: `All chapters open. Explore the full story world.`,
   ```
   Or, if Paul wants something warmer: `Read from the start or dive in anywhere — the full companion is open.`
   **Paul should confirm preferred copy before executing.**

### File 2: `src/app/stories/StoriesPageClient.tsx`

1. Open `src/app/stories/StoriesPageClient.tsx`
2. Around line 217, find the text `read to unlock.` inside the silhouette card for an unread chapter
3. Either remove the silhouette/lock UI entirely (since all chapters are now accessible), OR update the copy to reflect that this card is "not yet read" rather than "locked"
4. Suggested: replace `read to unlock.` with `not yet read.`
   **Paul should decide whether to keep the silhouette state at all.**

### File 3: `src/app/stories/[storyId]/page.tsx`

1. Open `src/app/stories/[storyId]/page.tsx`
2. Around lines 42–60, find the `if (!unlocked) { return (...) }` block
3. This block is unreachable with companion-first defaults. Remove the block entirely
4. Alternatively, keep it as a safety fallback but update the copy ("This chapter isn't available yet" without referencing chapter progression)
   **Paul should decide whether to remove entirely or keep as fallback.**

### After edits:
5. Run `npx next build` — confirm no TypeScript errors
6. Run `npm run lint` — confirm no new lint issues
7. Manual check: visit `/` (home nav card copy), `/stories` (silhouette cards), `/stories/CH01` (story detail renders normally)

## Files Modified
- `src/components/home/HomePageClient.tsx`
- `src/app/stories/StoriesPageClient.tsx`
- `src/app/stories/[storyId]/page.tsx`

## New Files (if any)
None.

## Database Changes (if any)
None.

## Verify
- [ ] Build and lint pass
- [ ] Home page nav card copy no longer references "unlock as you progress"
- [ ] `/stories/CH01` loads normally for unauthenticated user
- [ ] Story library silhouette cards (if kept) use "not yet read" rather than "locked" copy
- [ ] Dead `if (!unlocked)` block removed or updated
