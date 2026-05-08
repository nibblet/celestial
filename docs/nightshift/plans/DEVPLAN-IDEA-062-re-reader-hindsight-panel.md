# Dev Plan: [IDEA-062] Re-Reader Hindsight Panel — Chapter Arc Insights for Completed Readers

**Theme:** post-read-world

## What This Does

For readers with `show_all_content = true` on their profile, each fiction chapter page (`/stories/[storyId]`) gains a collapsible "Hindsight" accordion panel at the bottom. It shows 2–4 concise arc-state annotations — sourced from the existing character arc ledgers in `content/wiki/arcs/characters/` — showing how that chapter's events connect to later revelations. Re-readers see the foreshadowing and payoffs they missed on first pass.

No AI generation. No new DB tables. All insight content is from manually-authored arc ledger markdown files, already in the repo. The panel auto-updates as the author edits arc ledgers.

## User Stories

- As a first-time reader: The panel is completely invisible. Zero impact on first-read UX.
- As a re-reader (`show_all_content = true`): At the bottom of CH03, I see a collapsed "Hindsight" accordion. Opening it shows notes like "**ALARA** — Observation turns into participation; her threshold measurement of Thane's resonance is the first sign she's not just a system." and "**Thane** — The partial alignment here is deliberately incomplete — what he withholds sets up the Choir encoding in CH14." Compact, in-world annotations that reframe the chapter I just reread.
- As the author: Hindsight content is sourced entirely from arc ledgers I already maintain. Editing `content/wiki/arcs/characters/alara.md`'s CH03 row updates the panel automatically.

## Implementation

### Phase 1: Server Utility

**1.** Create `src/lib/wiki/chapter-hindsight.ts`:

```typescript
import { getAllCharacterArcs } from "@/lib/wiki/character-arcs";

export interface ChapterHindsightEntry {
  character: string;
  slug: string;
  sceneAnchor: string;
  stateAfter: string;
}

function parseArcTable(markdown: string): Array<Record<string, string>> {
  // Find the "Chapter Arc Entries" table
  const tableMatch = markdown.match(
    /##\s+Chapter Arc Entries\s*\n[\s\S]*?(?=\n##|\Z)/
  );
  if (!tableMatch) return [];

  const rows: Array<Record<string, string>> = [];
  const lines = tableMatch[0].split("\n").filter((l) => l.trim().startsWith("|"));

  let headers: string[] = [];
  for (const line of lines) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.every((c) => /^-+$/.test(c))) continue; // separator row
    if (headers.length === 0) {
      headers = cells.map((h) => h.toLowerCase().replace(/\s+\/\s+/, "_").replace(/\s+/g, "_"));
      continue;
    }
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    rows.push(row);
  }
  return rows;
}

const NO_BEAT_PATTERN = /no direct arc beat|no arc beat|not foregrounded/i;

export function getChapterHindsight(chapterId: string): ChapterHindsightEntry[] {
  const arcs = getAllCharacterArcs();
  const entries: ChapterHindsightEntry[] = [];

  for (const arc of arcs) {
    const rows = parseArcTable(arc.markdown);
    const match = rows.find((r) => r["chapter"]?.trim() === chapterId);
    if (!match) continue;
    const stateAfter = match["state_after"] ?? "";
    if (!stateAfter || NO_BEAT_PATTERN.test(stateAfter)) continue;
    entries.push({
      character: arc.character,
      slug: arc.slug,
      sceneAnchor: match["scene_/_anchor"] ?? match["scene_anchor"] ?? "",
      stateAfter,
    });
  }

  return entries.slice(0, 4);
}
```

**2.** Checkpoint: Add a quick test `src/lib/wiki/chapter-hindsight.test.ts`:
- `getChapterHindsight("CH03")` returns at least one entry (ALARA or Thane) with non-empty `stateAfter`
- `getChapterHindsight("CH01")` returns entries or empty array (no crash)
- Filters out "no direct arc beat" rows

### Phase 2: Chapter Page Integration

**3.** In `src/app/stories/[storyId]/page.tsx`, add after the existing `chapterTags` fetch (around line 68):

```typescript
import { getChapterHindsight } from "@/lib/wiki/chapter-hindsight";
import type { ChapterHindsightEntry } from "@/lib/wiki/chapter-hindsight";

// Existing: const chapterTags = getChapterTags(storyId);
// Add below the readerProgress block (readerProgress is already fetched via getReaderProgress()):
const isLegacy = story.source === "memoir" || story.source === "interview";
const chapterId = !isLegacy && story.chapterNumber != null
  ? `CH${String(story.chapterNumber).padStart(2, "0")}`
  : null;
const hindsightEntries: ChapterHindsightEntry[] =
  readerProgress?.showAllContent && chapterId
    ? getChapterHindsight(chapterId)
    : [];
```

**4.** Create `src/components/story/HindsightPanel.tsx`:

```tsx
import Link from "next/link";
import type { ChapterHindsightEntry } from "@/lib/wiki/chapter-hindsight";

export function HindsightPanel({ entries }: { entries: ChapterHindsightEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <details className="mt-8 rounded-xl border border-[var(--color-border)] bg-warm-white-2/80 px-4 py-3">
      <summary className="cursor-pointer select-none font-semibold text-ink hover:text-clay">
        Re-Reader Hindsight
      </summary>
      <ul className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
        {entries.map((e) => (
          <li key={e.slug} className="text-sm">
            <span className="font-semibold text-ink">
              <Link href={`/characters/${e.slug}`} className="hover:underline">
                {e.character}
              </Link>
            </span>
            {e.sceneAnchor && (
              <span className="ml-2 text-xs text-ink-ghost">({e.sceneAnchor})</span>
            )}
            <p className="mt-0.5 text-ink-muted">{e.stateAfter}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
```

**5.** In `stories/[storyId]/page.tsx`, import and place the panel:
- Add import: `import { HindsightPanel } from "@/components/story/HindsightPanel";`
- Place after `<AskAboutStory storyId={storyId} />` (around line 311):
  ```tsx
  <HindsightPanel entries={hindsightEntries} />
  ```

**6.** Checkpoint: With `show_all_content = true`, `/stories/CH03-resonant-memory` shows a collapsed "Re-Reader Hindsight" accordion at the bottom. Opening it shows 2–4 character state entries. With `show_all_content = false` or null, panel does not render.

### Phase 3: Polish

**7.** Run `npx next build` — confirm no build errors. (The `character-arcs.ts` and new `chapter-hindsight.ts` use Node `fs`, which is server-side only; no client bundle impact.)

**8.** Run `npm run lint` — confirm 0 errors, only existing 4 img warnings.

**9.** Run `npm test` — ensure all 192 tests pass.

## Content Considerations

- Zero new markdown files. All insight content comes from existing `content/wiki/arcs/characters/*.md` files (manually authored, no `<!-- generated:ingest -->` marker).
- The "State After" column in arc tables is the primary text source — these are author-written, concise arc-state snapshots (8–20 words each).
- The "Scene / Anchor" column provides scene context for the annotation subtitle.
- If arc ledgers gain more detailed chapter entries in the future (e.g., more nuanced State After text), the panel enriches automatically.
- Not every chapter will have entries for every arc character. Some arc files have "No direct arc beat" for passive chapters — these are correctly excluded.

## Spoiler & Gating Impact

**No spoiler concern at all.** This feature is:

- **Hard-gated at the server level** in the page component: `getChapterHindsight()` is only called when `readerProgress?.showAllContent === true`.
- When `show_all_content = false` (first-time reader), `hindsightEntries = []` → `HindsightPanel` renders nothing (guarded inside the component too).
- The panel content reveals cross-chapter arc connections — inherently spoilery — but only for readers who already have full content access (`show_all_content = true`).
- Guest readers (no profile): `getReaderProgress()` returns a default where `showAllContent = false` → no entries → no panel.

## Theme-Specific Requirements

**Post-read-world:**

1. **Hidden for locked/first-time readers:** `HindsightPanel` only renders when `entries.length > 0`. Entries are always `[]` when `show_all_content !== true`. Absolutely zero visual footprint for first-time readers.
2. **Integration with `show_all_content`:** Direct dependency — the `getChapterHindsight()` call is conditional on `readerProgress?.showAllContent === true`.
3. **Partial-completion edge cases:** Under companion-first, chapter-count gating is inert. The `showAllContent` flag is the sole gate for this feature. Any reader without this flag (including guests, authenticated readers without show_all_content) sees nothing. No partial reveals.

## Testing

- [ ] `npm run build` passes
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm test` — all 192 tests pass
- [ ] `getChapterHindsight("CH03")` unit test returns correct entries
- [ ] Locked-reader path: `show_all_content = false` → `hindsightEntries = []` → no panel rendered
- [ ] Re-reader path: `show_all_content = true` on CH03 → panel appears, collapsed, shows ALARA and/or Thane arc state entries
- [ ] Chapter with no entries (e.g., CH01 where most arcs are "not foregrounded"): `HindsightPanel` renders nothing
- [ ] Legacy story path (memoir/interview source): `isLegacy = true` → `chapterId = null` → no entries → no panel
- [ ] Guest path: no authenticated user → `showAllContent` not set → no panel

## Files Modified
- `src/app/stories/[storyId]/page.tsx` — add import, add `chapterId`/`hindsightEntries` computation, add `<HindsightPanel>` placement
- (existing imports: no new npm packages needed)

## New Files
- `src/lib/wiki/chapter-hindsight.ts` — server utility
- `src/components/story/HindsightPanel.tsx` — display component
- `src/lib/wiki/chapter-hindsight.test.ts` — unit tests

## Database Changes
None.

## Dependencies
None. `character-arcs.ts` (`getAllCharacterArcs`) and `fs` are already available. No new npm packages.

## Estimated Total: 2 hours
