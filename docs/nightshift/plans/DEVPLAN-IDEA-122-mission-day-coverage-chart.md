# Dev Plan: [IDEA-122] Mission Day Coverage Chart
**Theme:** post-read-world

## What This Does

For `show_all_content=true` readers, adds a compact horizontal bar chart at the top of `/stories/timeline` visualising how many mission logs (and which chapters) map to each Mission Day. The chart reveals the story's non-linear temporal architecture — some Mission Days span multiple chapters, and the chapter order doesn't match the chronological Mission Day order. A structural "aha" for re-readers.

## User Stories

- As a re-reader (show_all_content on): I can see the story's mission day pacing at a glance — which days are dense with action vs sparse — without needing to excavate the full timeline.
- As a first-time reader or guest: I see the `/stories/timeline` page exactly as before (chart is hidden, no content shift).
- As the author: no content authoring required; chart is derived entirely from `mission_logs_inventory.json`.

## Implementation

### Phase 1: Data Layer

1. Open `content/raw/mission_logs_inventory.json` — verify `missionLogs[].dateShipTime` follows "Mission Day N / date UTC" format (confirmed: 69 log entries, 21 unique mission days).
2. Create `src/components/timeline/MissionDayCoverageChart.tsx` — server component (no `'use client'`):

```typescript
import { readFileSync } from 'fs'
import path from 'path'

interface MissionDayRow {
  day: number
  chapters: string[]  // unique chapter IDs on this day
  logCount: number
}

function getMissionDayCoverage(): MissionDayRow[] {
  const raw = readFileSync(
    path.join(process.cwd(), 'content/raw/mission_logs_inventory.json'),
    'utf-8'
  )
  const { missionLogs } = JSON.parse(raw) as {
    missionLogs: { chapterId: string; dateShipTime: string }[]
  }

  const map = new Map<number, Set<string>>()
  const counts = new Map<number, number>()
  for (const log of missionLogs) {
    const m = log.dateShipTime.match(/Mission Day (\d+)/)
    if (!m) continue
    const day = parseInt(m[1], 10)
    if (!map.has(day)) { map.set(day, new Set()); counts.set(day, 0) }
    map.get(day)!.add(log.chapterId)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, chapters]) => ({
      day,
      chapters: [...chapters].sort(),
      logCount: counts.get(day) ?? 0,
    }))
}
```

3. Render function in the same file:

```tsx
export function MissionDayCoverageChart() {
  const rows = getMissionDayCoverage()
  const maxLogs = Math.max(...rows.map(r => r.logCount))

  return (
    <section className="mb-8 p-4 rounded-md border border-[var(--color-border)] bg-[var(--color-sci-panel)]">
      <h2 className="font-mono text-xs tracking-widest text-[var(--color-text-muted)] uppercase mb-4">
        Mission Day Coverage — {rows.length} Days, {rows.reduce((s, r) => s + r.logCount, 0)} Log Entries
      </h2>
      <div className="space-y-1">
        {rows.map(row => (
          <div key={row.day} className="flex items-center gap-2 text-xs font-mono">
            <span className="w-20 text-right text-[var(--color-text-muted)] shrink-0">
              Day {row.day}
            </span>
            <div
              className="h-4 rounded-sm bg-[var(--color-ocean)] opacity-70 transition-all"
              style={{ width: `${(row.logCount / maxLogs) * 100}%`, minWidth: '2px' }}
            />
            <span className="text-[var(--color-text-muted)] shrink-0">
              {row.chapters.join(' · ')}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)] italic">
        Bar width = number of mission logs. Chapters span multiple Mission Days due to the story&apos;s non-linear mission log structure.
      </p>
    </section>
  )
}
```

**Checkpoint:** Component renders as a static server component. Test with `npx next build` — no new deps.

### Phase 2: Page Integration

4. Open `src/app/stories/timeline/page.tsx`. Currently just:
```tsx
import { TimelineView } from "@/components/timeline/TimelineView";
export default function StoriesTimelinePage() {
  return <TimelineView />;
}
```

5. Update to:
```tsx
import { TimelineView } from "@/components/timeline/TimelineView";
import { MissionDayCoverageChart } from "@/components/timeline/MissionDayCoverageChart";
import { getReaderProgress } from "@/lib/reader-progress";

export default async function StoriesTimelinePage() {
  const progress = await getReaderProgress();
  return (
    <>
      {progress?.showAllContent && <MissionDayCoverageChart />}
      <TimelineView />
    </>
  );
}
```

**Checkpoint:** Build passes. Logged-in `show_all_content` user sees the chart above the timeline; all other users see the timeline unchanged.

### Phase 3: Polish

6. Run `npm run lint` — fix any warnings.
7. Run `npm test` — no new tests needed (chart is purely presentational from static JSON).
8. Manual verification:
   - With `show_all_content = false` (or unauthenticated): chart does not appear, layout unchanged.
   - With `show_all_content = true`: chart appears above the timeline. 21 mission day bars visible.

## Content Considerations

No new markdown files. No changes to wiki compiler. `mission_logs_inventory.json` is read-only at runtime.

## Spoiler & Gating Impact

**No spoiler risk.** Mission Day numbers are structural metadata (not narrative prose). The chapter IDs (CH01–CH17) displayed in the chart labels are not story events — they're chapter identifiers already visible everywhere. The chart is gated behind `show_all_content` not for spoiler reasons but as a "post-read structural insight" feature appropriate only for completed readers.

- Locked first-time reader: `show_all_content = false` → chart not rendered → 0 impact.
- Unauthenticated guest: `getReaderProgress()` returns null → chart not rendered → 0 impact.
- Re-reader (`show_all_content = true`): chart renders above the timeline.
- Partial-completion edge case: `show_all_content` is the sole gate; any partial state without that flag sees no chart.

## Theme-Specific Requirements (post-read-world)

1. **Degradation for locked/guest readers:** Complete — chart block not rendered when `showAllContent` is falsy.
2. **Integration with show_all_content:** Direct — `progress?.showAllContent` is the conditional.
3. **Partial-completion edge cases:** Same `show_all_content` flag handles all edge cases; the server component reads it from `getReaderProgress()` which is auth-aware.

## Testing

- [ ] `npx next build` passes
- [ ] `npm run lint` passes (0 errors, ≤ 4 existing warnings)
- [ ] `npm test` passes (192 tests, no regressions)
- [ ] Locked-reader path: unauthenticated visit to `/stories/timeline` — no chart visible, layout identical to before
- [ ] Re-reader path: visit with `show_all_content = true` — 21-bar chart visible above timeline
- [ ] Guest-cookie path: no `show_all_content` flag → no chart

## Dependencies

- FIX-048 (images to Supabase): NOT a prerequisite — chart uses JSON, not images.
- IDEA-095 (arc-endpoints): NOT a prerequisite — chart is purely from `mission_logs_inventory.json`.
- No new npm packages.
- No new DB tables or migrations.

## Files Modified

- `src/app/stories/timeline/page.tsx` — add `getReaderProgress()` + conditional chart

## New Files

- `src/components/timeline/MissionDayCoverageChart.tsx` — new server component

## Estimated Total: 1 hour
