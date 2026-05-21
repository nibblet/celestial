# Dev Plan: [IDEA-095] Arc Endpoint Quotes Gallery — Closing Words of the Crew at CH17
**Theme:** post-read-world

## What This Does

A new `/world/voices` page for readers who have completed the book (`show_all_content=true`). It displays a 3×3 typographic quote-card gallery — one card per main character — showing their CH17 arc "State After" entry extracted from the arc ledger files in `content/wiki/arcs/characters/`. Each card links to the character's wiki page. Zero AI calls, zero DB changes. A contemplative anchor page that turns arc ledger data into a reader-facing artifact.

## User Stories

- As a first-time reader (show_all_content=false), I cannot access `/world/voices` — the server redirects me to `/profile`.
- As a re-reader (show_all_content=true), I visit `/world/voices` and see nine typographic cards summarizing where each crew member stood at the end of the story. Clicking a card goes to their character wiki page.
- As the author, I can surface this page to a completed reader from the profile page or any future completion ceremony surface (IDEA-089).

## Implementation

### Phase 1: Arc Endpoint Utility

1. Create `src/lib/wiki/arc-endpoints.ts`:

```typescript
import { getAllCharacterArcs } from "@/lib/wiki/character-arcs";

export interface ArcEndpoint {
  slug: string;
  character: string;
  stateAfter: string;
  characterHref: string;
}

function extractCH17StateAfter(markdown: string): string {
  // Find the Chapter Arc Entries section
  const sectionMatch = markdown.match(
    /## Chapter Arc Entries\n+([\s\S]*?)(?=\n## |\n---|$)/
  );
  if (!sectionMatch) return "";

  const tableText = sectionMatch[1];
  // Find the row starting with | CH17 |
  const ch17Match = tableText.match(/^\| CH17 \|.+$/m);
  if (!ch17Match) return "";

  // Table cols: [empty, Chapter, Scene, Pressure, Choice, Consequence, State After, Evidence, empty]
  // Split by | — col index 6 (1-based) = State After
  const cols = ch17Match[0].split("|").map((c) => c.trim());
  // cols[0]="", cols[1]="CH17", cols[2]=Scene, cols[3]=Pressure,
  // cols[4]=Choice, cols[5]=Consequence, cols[6]=State After, cols[7]=Evidence
  return cols[6] ?? "";
}

export function getArcEndpoints(): ArcEndpoint[] {
  return getAllCharacterArcs()
    .map((arc) => ({
      slug: arc.slug,
      character: arc.character,
      stateAfter: extractCH17StateAfter(arc.markdown),
      characterHref: `/characters/${arc.slug}`,
    }))
    .filter((ep) => ep.stateAfter.length > 0);
}
```

**Checkpoint:** Verify column index. The arc table header is:
`| Chapter | Scene / Anchor | Pressure / Test | Choice / Reaction | Consequence | State After | Evidence |`
After splitting `ch17Match[0]` by `|` and trimming: cols[0]="", cols[1]="CH17", cols[2]=scene, cols[3]=pressure, cols[4]=choice, cols[5]=consequence, cols[6]=stateAfter, cols[7]=evidence. Index 6 is correct.

Run `npx tsc --noEmit` to verify types compile.

### Phase 2: World Voices Page

2. Create `src/app/world/voices/page.tsx`:

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getReaderProgress } from "@/lib/progress/reader-progress";
import { getArcEndpoints } from "@/lib/wiki/arc-endpoints";

export const metadata: Metadata = {
  title: "Crew Voices",
  description: "Where the crew stood at the story's end.",
};

export default async function WorldVoicesPage() {
  const progress = await getReaderProgress();

  if (!progress.showAllContent) {
    redirect("/profile");
  }

  const endpoints = getArcEndpoints();

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ink-dark mb-2">
        The Crew — Where They Ended
      </h1>
      <p className="text-ink-mid mb-10">
        Nine voices. One translation. This is where they stood at the close of
        <em> Vault of the Veil</em>.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {endpoints.map((ep) => (
          <Link key={ep.slug} href={ep.characterHref}>
            <div className="sci-card-link rounded-lg p-5 transition-colors">
              <p className="type-ui mb-2 text-xs uppercase tracking-wide text-ink-ghost">
                {ep.character}
              </p>
              <p className="text-sm italic leading-relaxed text-ink-dark">
                &ldquo;
                {ep.stateAfter.length > 160
                  ? ep.stateAfter.slice(0, 157) + "…"
                  : ep.stateAfter}
                &rdquo;
              </p>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-10 text-center text-xs text-ink-ghost">
        Arc ledger state — Book I, CH17. For completed readers.
      </p>
    </main>
  );
}
```

**Checkpoint:** Route renders at `/world/voices`. Non-`show_all_content` reader is redirected to `/profile`. Cards render with character names and state text.

### Phase 3: Build, Lint, Test

3. Run `npx next build` — verify the new route compiles (`/world/voices` appears in route list as `ƒ`).
4. Run `npm run lint` — 0 new errors.
5. Run `npm test` — 192 pass.
6. Manual verification (see below).

## Content Considerations

- Data sourced exclusively from `content/wiki/arcs/characters/*.md` CH17 table rows — existing, manually authored arc ledger files with no `<!-- generated:ingest -->` marker.
- The CH17 "State After" text contains arc-endpoint spoilers — this is the intended content for completed readers.
- No changes to any content/ files or brain_lab/ pipeline.
- If an arc file has no CH17 row in its table, `extractCH17StateAfter` returns `""` and that character is filtered from the grid (no runtime error).

## Spoiler & Gating Impact

- **Gate:** `getReaderProgress().showAllContent` checked server-side in `WorldVoicesPage`. If false → `redirect("/profile")`. Guests are not authenticated; `getReaderProgress()` returns `showAllContent: false` for unauthenticated users → redirected to `/profile` (they then hit the login gate).
- **Partial-completion edge cases:** `showAllContent` is the sole gate. A reader who has read 16/17 chapters but not toggled `show_all_content` cannot access this page. The gate is `cel_profiles.show_all_content` column — a deliberate author-controlled toggle, not an automatic unlock.
- **No spoiler risk for locked readers:** The page is never rendered for them; the redirect fires before any arc data is loaded.

## Theme-Specific Requirements (post-read-world)

1. **Hidden for first-time/guest readers:** Enforced via server-side `getReaderProgress().showAllContent === false` → redirect. No partial render.
2. **Integration with show_all_content:** Direct server-side check — same pattern as `profile/page.tsx` using `getReaderProgress()`.
3. **Partial-completion edge cases:** `showAllContent` is the sole gate (not chapter count). This is intentional — the toggle is controlled by the author/admin, so the page is surfaced precisely when appropriate.

## Testing

- [ ] `npx next build` passes — new route `/world/voices` in build output
- [ ] `npm run lint` — 0 new errors
- [ ] `npm test` — 192 pass (no arc-related tests broken)
- [ ] Locked-reader path: visiting `/world/voices` as non-`show_all_content` reader → redirected to `/profile`
- [ ] Guest path: unauthenticated user visits `/world/voices` → redirected to `/profile` (via login gate if needed)
- [ ] Unlocked re-reader path: `show_all_content=true` → page renders with 9 cards (or fewer if any arc has no CH17 row)
- [ ] Card text: each card shows character name + State After text truncated at 160 chars + link to character wiki page
- [ ] Click a card: navigates to `/characters/{slug}` (character wiki page)
- [ ] No CH17 row in arc file: character is silently omitted from grid (no crash)

## Files Modified
- None (page and utility are new files only)

## New Files
- `src/lib/wiki/arc-endpoints.ts` — utility: parse CH17 State After from arc markdown tables
- `src/app/world/voices/page.tsx` — new server component route, show_all_content gated

## Database Changes
None.

## Dependencies
- `getAllCharacterArcs()` in `src/lib/wiki/character-arcs.ts` — already present and server-safe
- `getReaderProgress()` in `src/lib/progress/reader-progress.ts` — already present
- All 9 arc ledger files in `content/wiki/arcs/characters/` — already authored
- `sci-card-link` CSS class — already in `src/app/globals.css` (used across entity index pages)
- `text-ink-dark`, `text-ink-mid`, `text-ink-ghost`, `type-ui` — all existing design tokens

## Estimated Total: 1.5 hours
