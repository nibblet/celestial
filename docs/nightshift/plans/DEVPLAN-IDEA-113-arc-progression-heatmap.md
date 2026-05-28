# Dev Plan: [IDEA-113] Arc Progression Heatmap — Character Activity Grid for Completed Readers
**Theme:** post-read-world

## What This Does

A new `/world/arcs` page for `show_all_content=true` readers. Displays a 9×17 heatmap grid showing dramatic arc activity for each of the 9 main characters across all 17 chapters. Rows = characters (alphabetical); columns = CH01–CH17. Cell intensity is derived from the "Choice" and "Consequence" columns in each character's arc ledger table:
- Both non-empty → full color (full arc activity)
- One non-empty → half-intensity (partial beat)
- Both empty/dash → transparent (no arc beat)

Zero AI calls, zero DB changes, zero npm packages. Two new files.

## User Stories

- As a first-time reader (show_all_content=false), visiting `/world/arcs` redirects to `/profile`.
- As a re-reader (show_all_content=true), I see a 9×17 heatmap at a glance: who was dramatically active in which chapters, how story tension is distributed, which characters have sparse vs. dense arcs across the book.
- As the author, I can cross-link this page from `/world/voices` (IDEA-095) as part of the post-read `/world/` cluster.

## Implementation

### Phase 1: Arc Heatmap Utility

1. Create `src/lib/wiki/arc-heatmap.ts`:

```typescript
import { getAllCharacterArcs } from "@/lib/wiki/character-arcs";

export type HeatmapIntensity = 0 | 0.5 | 1;

export interface ArcHeatmapCell {
  chapterNum: number;   // 1–17
  chapterLabel: string; // "CH01"–"CH17"
  intensity: HeatmapIntensity;
}

export interface ArcHeatmapRow {
  slug: string;
  character: string;
  cells: ArcHeatmapCell[]; // 17 cells, one per chapter
}

const EMPTY_CELL_VALUES = new Set(["", "—", "-", "–", "–"]);

function isEmptyCell(text: string): boolean {
  return EMPTY_CELL_VALUES.has(text.trim());
}

/**
 * Parses the "Chapter Arc Entries" markdown table from an arc ledger.
 * Returns an array of 17 cells (CH01–CH17). Missing chapters get intensity 0.
 *
 * Table column layout (0-indexed after splitting on "|" and trimming):
 *   0: ""  1: "CH01"  2: Scene  3: Pressure  4: Choice  5: Consequence  6: State After  7: Evidence
 */
function parseArcTableCells(markdown: string): ArcHeatmapCell[] {
  const cells: ArcHeatmapCell[] = [];

  // Extract the "Chapter Arc Entries" section
  const sectionMatch = markdown.match(
    /## Chapter Arc Entries\n+([\s\S]*?)(?=\n## |\n---|$)/
  );
  if (!sectionMatch) {
    // Return all 17 chapters with 0 intensity
    return Array.from({ length: 17 }, (_, i) => ({
      chapterNum: i + 1,
      chapterLabel: `CH${String(i + 1).padStart(2, "0")}`,
      intensity: 0,
    }));
  }

  const tableText = sectionMatch[1];

  for (let i = 1; i <= 17; i++) {
    const chLabel = `CH${String(i).padStart(2, "0")}`;
    // Match the row for this chapter — starts with | CHxx |
    const rowMatch = tableText.match(
      new RegExp(`^\\| ${chLabel} \\|.+$`, "m")
    );

    if (!rowMatch) {
      cells.push({ chapterNum: i, chapterLabel: chLabel, intensity: 0 });
      continue;
    }

    const cols = rowMatch[0].split("|").map((c) => c.trim());
    // cols[4] = Choice, cols[5] = Consequence
    const choiceFilled = cols.length > 4 && !isEmptyCell(cols[4]);
    const consequenceFilled = cols.length > 5 && !isEmptyCell(cols[5]);

    let intensity: HeatmapIntensity;
    if (choiceFilled && consequenceFilled) {
      intensity = 1;
    } else if (choiceFilled || consequenceFilled) {
      intensity = 0.5;
    } else {
      intensity = 0;
    }

    cells.push({ chapterNum: i, chapterLabel: chLabel, intensity });
  }

  return cells;
}

export function getArcHeatmap(): ArcHeatmapRow[] {
  return getAllCharacterArcs().map((arc) => ({
    slug: arc.slug,
    character: arc.character,
    cells: parseArcTableCells(arc.markdown),
  }));
}
```

**Checkpoint:** Compile with `npx tsc --noEmit`. Verify `getArcHeatmap()` returns 9 rows each with 17 cells.

### Phase 2: Arc Heatmap Page

2. Create `src/app/world/arcs/page.tsx`:

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getReaderProgress } from "@/lib/progress/reader-progress";
import { getArcHeatmap } from "@/lib/wiki/arc-heatmap";

export const metadata: Metadata = {
  title: "Character Arc Heatmap",
  description:
    "Which chapters drove the crew's story arcs — for completed readers.",
};

const CHAPTER_LABELS = Array.from({ length: 17 }, (_, i) =>
  `CH${String(i + 1).padStart(2, "0")}`
);

export default async function WorldArcsPage() {
  const progress = await getReaderProgress();

  if (!progress.showAllContent) {
    redirect("/profile");
  }

  const rows = getArcHeatmap();

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ink-dark mb-2">
        Arc Activity — All 17 Chapters
      </h1>
      <p className="text-ink-mid mb-8 max-w-2xl">
        Each cell shows whether a character had a documented arc beat (Choice and/or
        Consequence) in that chapter. Darker = both Choice and Consequence active.
        Half-intensity = one of the two. Transparent = no arc beat.
      </p>

      {/* Heatmap grid: 1 label column + 17 chapter columns */}
      <div
        className="overflow-x-auto"
        aria-label="Character arc heatmap"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `minmax(9rem,1fr) repeat(17, minmax(1.75rem,1fr))`,
            gap: "2px",
          }}
        >
          {/* Header row */}
          <div className="text-xs text-ink-ghost py-1" />
          {CHAPTER_LABELS.map((ch) => (
            <div
              key={ch}
              className="text-center text-[10px] text-ink-ghost py-1 leading-tight"
            >
              {ch.replace("CH", "")}
            </div>
          ))}

          {/* Data rows */}
          {rows.map((row) => (
            <>
              <Link
                key={`label-${row.slug}`}
                href={`/characters/${row.slug}`}
                className="text-sm text-ink-mid hover:text-ink-dark truncate pr-2 py-1 self-center"
              >
                {row.character}
              </Link>
              {row.cells.map((cell) => (
                <Link
                  key={`${row.slug}-${cell.chapterLabel}`}
                  href={`/ask?story=${cell.chapterLabel}&entity=${row.slug}`}
                  title={`${row.character} in ${cell.chapterLabel}`}
                  className="rounded-sm h-6 self-center block"
                  style={{
                    backgroundColor:
                      cell.intensity === 0
                        ? "transparent"
                        : `color-mix(in srgb, var(--color-ocean) ${
                            cell.intensity === 1 ? "80%" : "35%"
                          }, transparent)`,
                    border: "1px solid color-mix(in srgb, var(--color-ocean) 15%, transparent)",
                  }}
                  aria-label={
                    cell.intensity === 0
                      ? `${row.character} — no arc beat in ${cell.chapterLabel}`
                      : `${row.character} — arc beat in ${cell.chapterLabel}`
                  }
                />
              ))}
            </>
          ))}
        </div>
      </div>

      <p className="mt-8 text-xs text-ink-ghost">
        Source: arc ledger Choice + Consequence columns. For completed readers only.
        Cells link to Ask with that chapter and character pre-loaded.
      </p>
    </main>
  );
}
```

**Checkpoint:** Route renders at `/world/arcs`. Grid shows 9 character rows × 17 chapter columns. Cell opacity varies by intensity. Non-`show_all_content` reader is redirected to `/profile`.

### Phase 3: Build, Lint, Test

3. Run `npx next build` — verify `/world/arcs` appears in build output as a valid route.
4. Run `npm run lint` — 0 new errors (note: `color-mix()` in inline styles is not an ESLint concern).
5. Run `npm test` — confirm all 192 tests still pass (no new tests required for this feature; no existing tests touch arc parsing at the Chapter Arc Entries level).
6. Manual verification (see Testing section).

## Content Considerations

- Data sourced exclusively from `content/wiki/arcs/characters/*.md` — existing manually-authored arc ledger files, no `<!-- generated:ingest -->` marker.
- The heatmap reveals the structural shape of the story (where each character's arc is dense vs. sparse) — appropriate for completed readers only.
- No changes to any `content/` files or the `brain_lab/` pipeline.
- If an arc file has no "Chapter Arc Entries" section, `parseArcTableCells()` returns 17 empty cells — no crash.
- A character with a missing CH0X row gets intensity 0 for that chapter — silent no-op.

## Spoiler & Gating Impact

- **Gate:** `getReaderProgress().showAllContent` checked server-side. If false → `redirect("/profile")`. Guests are not authenticated; `getReaderProgress()` returns `showAllContent: false` → redirected to `/profile`.
- **What the heatmap reveals:** Structural/pacing data only — which characters have arc beats per chapter. Cell labels say "arc beat active"; they do not expose narrative text. No chapter event text, no character state descriptions, no story outcomes. A first-time reader who somehow accessed this page would see a visual pattern grid, not spoilers.
- **Partial-completion edge cases:** `showAllContent` is the sole gate. The flag is author-controlled.
- **Cell links:** Each cell links to `/ask?story={ch}&entity={charSlug}` — these are Ask queries, not direct arc content. The Ask companion applies its normal context filtering.

## Theme-Specific Requirements (post-read-world)

1. **Hidden for first-time/guest readers:** Enforced via server-side `getReaderProgress().showAllContent === false` → redirect before any rendering.
2. **Integration with show_all_content:** Direct server-side check using the same `getReaderProgress()` pattern as IDEA-095 (`/world/voices`).
3. **Partial-completion edge cases:** `showAllContent` is the sole gate — consistent with all other `/world/` pages.

## Testing

- [ ] `npx next build` passes — `/world/arcs` in route list
- [ ] `npm run lint` — 0 new errors
- [ ] `npm test` — 192 pass (no new or broken tests)
- [ ] Locked-reader path: visiting `/world/arcs` without `show_all_content=true` → redirect to `/profile`
- [ ] Guest path: unauthenticated user → redirected to `/profile`
- [ ] Re-reader path: `show_all_content=true` → 9 rows × 17 columns render; no crashes
- [ ] Cell intensity: a chapter with both Choice + Consequence non-empty shows full-opacity cell; one non-empty shows half-opacity; both empty/dash shows transparent
- [ ] Cell click: routes to `/ask?story=CH0X&entity={slug}` (even without IDEA-069 shipped, the URL is correct)
- [ ] Character name click: routes to `/characters/{slug}`
- [ ] Arc file with no "Chapter Arc Entries" section: character row renders 17 transparent cells (no crash)
- [ ] Overflow: on narrow viewport, `overflow-x-auto` keeps the grid horizontally scrollable

## Files Modified
None (page and utility are new files only)

## New Files
- `src/lib/wiki/arc-heatmap.ts` — utility: parse Choice + Consequence columns from arc ledger tables to produce heatmap intensity data
- `src/app/world/arcs/page.tsx` — new server component route, `show_all_content` gated

## Database Changes
None.

## Dependencies
- `getAllCharacterArcs()` in `src/lib/wiki/character-arcs.ts` — already present and server-safe (uses `fs`)
- `getReaderProgress()` in `src/lib/progress/reader-progress.ts` — already present
- All 9 arc ledger files in `content/wiki/arcs/characters/` — already authored
- `--color-ocean` CSS variable — already in `src/app/globals.css`
- `text-ink-dark`, `text-ink-mid`, `text-ink-ghost` — existing design tokens
- `redirect`, `Link` — already used across other server components
- **IDEA-095 is NOT required** — `arc-heatmap.ts` is self-contained and does not depend on `arc-endpoints.ts`. Once IDEA-095 ships, the `extractCH17StateAfter` parsing logic in `arc-endpoints.ts` and the row-parsing logic in `arc-heatmap.ts` could be consolidated into a shared `src/lib/wiki/arc-table-parser.ts` utility (optional cleanup).

## Estimated Total: 2 hours
