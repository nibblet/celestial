# Fix: [FIX-032] BeatTimeline Leaks Locked Chapter Content on Journey Pages

## Problem
**Severity: P0 — chapter content leak via BeatTimeline**

The `BeatTimeline` component on `/journeys/[slug]` (the journey intro page) renders ALL beats for a journey regardless of reader progress. Beat records include `summary` text and `whyItMatters` narrative payload that describe specific events from named chapters.

The seeded `directive-14` journey includes beats tied to CH08, CH11, CH13, and CH14. Their summaries contain actual story content:
- CH08: *"Evelyn's private notes diverge from the official log for the first time."*
- CH11: *"`Preemptive Ethical Override in the Presence of Uncontained Sentient Architectures.` The sentence lands on Evelyn's terminal and nothing in the cabin moves."* — a verbatim story excerpt.

A reader at CH01 visiting `/journeys/directive-14` sees all ten beats including the CH11 quote and the CH08 character revelation. This is a spoiler leak of locked chapter content.

The journey page currently makes NO call to `getReaderProgress()`.

## Root Cause
`src/app/journeys/[slug]/page.tsx` (lines 30–31):
```ts
const supabase = await createClient();
const beats = await listBeatsByJourney(supabase, journey.slug);
```
`listBeatsByJourney` returns all published beats. The beat list is passed unfiltered to `<BeatTimeline beats={beats} />`.

`src/components/journeys/BeatTimeline.tsx` renders all beats it receives — it has no knowledge of reader progress.

## Steps

### 1. Fetch reader progress on the journey page

Open `src/app/journeys/[slug]/page.tsx`.

Add import:
```ts
import { getReaderProgress, isStoryUnlocked } from "@/lib/progress/reader-progress";
```

In the page body, fetch progress alongside beats (both are async, run in parallel):
```ts
const supabase = await createClient();
const [beats, progress] = await Promise.all([
  listBeatsByJourney(supabase, journey.slug),
  getReaderProgress(),
]);
```

### 2. Filter beats to unlocked chapters before rendering

After the parallel fetch, filter:
```ts
// Gate beats: only show beats whose chapterId is unlocked for this reader.
// Beats without a chapterId are always shown (they're journey-level, not
// tied to a specific chapter).
const visibleBeats = beats.filter(
  (beat) => !beat.chapterId || isStoryUnlocked(beat.chapterId, progress),
);
```

Pass `visibleBeats` (not `beats`) to `BeatTimeline`:
```tsx
<BeatTimeline beats={visibleBeats} />
```

### 3. Build and lint

```
npx next build
npm run lint
npm test
```

## Manual Verification

**Locked reader path (CH01 reader, directive-14 journey):**
- Visit `/journeys/directive-14`
- BeatTimeline section should be absent (all directive-14 beats have chapterIds ≥ CH01; only the CH01 beat should show, not CH03/CH06/CH08/CH11/CH13/CH14)
- Verify by checking that no "Why it matters" expander for CH11 appears on page

**CH06 reader (partway through directive-14):**
- Beats for CH01, CH03, CH06 should be visible
- Beats for CH08 and beyond should NOT appear

**Re-reader (show_all_content = true):**
- All 10 beats should be visible including CH11 quote and CH14 beats

**Guest (cookie-based CH01):**
- Same as locked reader path — no future beats visible

**No beats journey:**
- Visit a journey that has no beats in DB — BeatTimeline section should not render (existing `if (beats.length === 0) return null` guard in BeatTimeline.tsx handles this)

## Files Modified
- `src/app/journeys/[slug]/page.tsx`

## New Files (if any)
None.

## Database Changes (if any)
None.

## Verify
- [ ] Build, lint, tests pass
- [ ] **P0 verified**: CH01 reader cannot see CH11 beat content or any other future-chapter beats
- [ ] Re-reader sees all beats
- [ ] Guest-cookie reader is gated same as locked reader
- [ ] Journey with no beats still renders without error
