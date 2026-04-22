# Dev Plan: [IDEA-029] Reader Arc Progress — Gated BeatTimeline on Journey Pages

## What This Does
After FIX-032 gates the BeatTimeline by reader progress (filtering out future-chapter beats), the timeline becomes a living map of the reader's position in each arc. This feature enhances that experience:

1. **Progress indicator**: Beat cards that are unlocked get a "read" visual state when their `chapterId` appears in the reader's `cel_story_reads`. Future beats are hidden (per FIX-032). This gives readers a sense of how far through an arc they are.
2. **Arc progress bar**: A compact "N of M beats revealed" chip above the timeline showing the reader's position through the arc.
3. **Tease count**: "X more beats unlock as you read on" shown when the reader has future beats available, without revealing their content.

## User Stories
- As a first-time reader at CH06 on the `directive-14` journey: I see 3 of 10 beats revealed, a progress chip "3 / 10 beats", and "7 more unlock as you read on."
- As a re-reader (show_all_content on): I see all 10 beats with no tease message; previously read beats have a subtle "read" marker.
- As the author: No author-specific surface; this is reader-facing only.

## Implementation

### Phase 1: Pass `readSet` to BeatTimeline (30 min)

*Prerequisite: FIX-032 must be applied first — this feature builds on the gated beat list.*

1. In `src/app/journeys/[slug]/page.tsx`, after fetching reader progress, also fetch the reader's read set:

```ts
import { getReaderProgress, isStoryUnlocked } from "@/lib/progress/reader-progress";
import { createClient } from "@/lib/supabase/server";

// In the page body:
const supabase = await createClient();
const [beats, progress] = await Promise.all([
  listBeatsByJourney(supabase, journey.slug),
  getReaderProgress(),
]);

// Build read set from progress
const readChapterIds = new Set(progress.readStoryIds ?? []);

const visibleBeats = beats.filter(
  (beat) => !beat.chapterId || isStoryUnlocked(beat.chapterId, progress),
);
```

2. Update `BeatTimeline` props to accept `totalBeats: number` and `readChapterIds: Set<string>`:

In `src/components/journeys/BeatTimeline.tsx`:
```ts
export function BeatTimeline({
  beats,
  totalBeats,
  readChapterIds,
}: {
  beats: Beat[];
  totalBeats: number;
  readChapterIds?: Set<string>;
}) {
```

**Checkpoint:** Build passes. No visual changes yet.

### Phase 2: Arc progress chip and tease count (30 min)

1. In `BeatTimeline.tsx`, compute progress state before the return:

```ts
const revealed = beats.length;
const lockedCount = totalBeats - revealed;
const readBeats = readChapterIds
  ? beats.filter((b) => b.chapterId && readChapterIds.has(b.chapterId))
  : [];
const readCount = readBeats.length;
```

2. Add a progress chip above the beat list:

```tsx
{totalBeats > 0 && (
  <div className="mb-3 flex items-center gap-3">
    <span className="type-meta normal-case tracking-normal text-ink-ghost">
      {revealed} of {totalBeats} beats
    </span>
    {lockedCount > 0 && (
      <span className="type-meta normal-case tracking-normal text-ink-ghost">
        · {lockedCount} more unlock as you read on
      </span>
    )}
  </div>
)}
```

3. Mark "read" beats with a subtle visual state. In the beat `<li>`:

```tsx
const isRead = readChapterIds && beat.chapterId && readChapterIds.has(beat.chapterId);
<li key={beat.id} className={`relative ${isRead ? "opacity-70" : ""}`}>
  {isRead && (
    <span className="absolute -left-[1.5rem] top-1 type-meta text-clay">✓</span>
  )}
  {/* existing beat content */}
</li>
```

4. Update the journey page to pass all required props:

```tsx
<BeatTimeline
  beats={visibleBeats}
  totalBeats={beats.length}
  readChapterIds={readChapterIds}
/>
```

**Checkpoint:** Re-reader at CH06 sees "3 of 10 beats · 7 more unlock as you read on". Re-reader (show_all) sees "10 of 10 beats" with no tease. Read beats have a checkmark and reduced opacity.

### Phase 3: Polish and build (15 min)

1. Run `npx next build` — should pass.
2. Run `npm run lint` — 0 errors.
3. Run `npm test` — 147 PASS.
4. Manual: verify guest path (no auth) shows correct locked/unlocked split based on cookie.

## Content Considerations
- `totalBeats` is derived from the unfiltered beat list fetched server-side — accurate even when reader hasn't unlocked any beats.
- "Read" state depends on `progress.readStoryIds` being populated. If a reader visits the journey page without ever marking a chapter as read, `readChapterIds` is empty and all visible beats appear un-read (correct behavior).
- No new content files, no wiki changes.

## Spoiler & Gating Impact
- FIX-032 MUST be applied first. This feature uses the already-filtered `visibleBeats` — it cannot surface locked content.
- The tease count ("N more unlock as you read on") intentionally reveals that MORE beats exist — this is not a spoiler, just a progression signal like "X chapters remaining."
- Beat titles and content from locked chapters remain hidden regardless of the progress chip.
- Re-reader (show_all_content = true): all beats visible, no tease message (lockedCount = 0).
- Guest-cookie path: behaves identically to a logged-in reader at the same chapter position.

## Testing
- [ ] Build, lint, `npm test` pass
- [ ] FIX-032 is applied before this feature
- [ ] CH01 reader sees only 1 visible beat with "1 of 10 beats · 9 more unlock" chip
- [ ] CH06 reader sees 3 beats with correct count
- [ ] Re-reader sees all 10 beats, no tease message
- [ ] Guest cookie at CH01 behaves same as logged-in CH01 reader
- [ ] Journey with no beats: BeatTimeline still returns null (existing guard)
- [ ] Journey with all beats unlocked: no "X more unlock" tease shown

## Dependencies
- **FIX-032 must be applied first** (beat gating on journey page)
- `progress.readStoryIds` must be populated by `getReaderProgress()` — confirm field exists (it does: `ReaderProgress.readStoryIds` is the set of read story IDs)

## Estimated Total: 1.25 hours (after FIX-032)
