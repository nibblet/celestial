# Dev Plan: [IDEA-116] World Crew Manifest
**Theme:** post-read-world

## What This Does
A `/world/manifest` page for readers with `show_all_content=true`. Presents a styled diegetic document — a MARU-classified mission roster for Valkyrie-1 — showing mission metadata and 9 crew entry cards. Styled in `font-mono` to evoke an in-world archival record. Zero AI generation at read-time; all data from existing arc ledgers and character wiki markdown.

The page can be built in two phases:
- **Phase 1 (now):** Crew names + roles + species + `"Status: [CLASSIFIED]"` placeholder for CH17 state.
- **Phase 2 (after IDEA-095 ships):** Replace the placeholder with real CH17 "State After" text from `getArcEndpoints()`.

## User Stories
- As a first-time reader (show_all_content=false): I never see this page — server redirects to `/profile`.
- As a re-reader (show_all_content=true): I land on `/world/manifest` and see a beautifully formatted in-world mission roster that makes the Valkyrie-1 crew feel like real mission personnel.
- As the author: I can verify the manifest against canon before granting `show_all_content` to any reader.

## Implementation

### Phase 1: Foundation — Character Data + Manifest Shell

1. **Open `content/wiki/characters/alara.md`** (and each of the 8 other character slugs: aven-voss, evelyn-tran, galen-voss, jax-reyes, jonah-revas, lena-osei, marco-ruiz, thane-meric).
   - Locate the lore metadata block — the `**Role:**` and `**Species:**` fields.
   - Record each value for the static crew table in step 2. _(Executor must verify against canon text.)_

2. **Create `src/app/world/manifest/page.tsx`** — a server component:

```tsx
import { redirect } from "next/navigation";
import { getReaderProgress } from "@/lib/reader-progress";
import { getAllCharacterArcs } from "@/lib/wiki/character-arcs";

// Static crew metadata verified from content/wiki/characters/*.md
const CREW_META: Record<string, { role: string; species: string }> = {
  alara:       { role: "AI Systems / Resonant Liaison", species: "Non-corporeal AI" },
  "aven-voss": { role: "First Officer",                  species: "Human" },
  // ... populate remaining 7 entries from character wiki files
};

export default async function ManifestPage() {
  const progress = await getReaderProgress();
  if (!progress?.showAllContent) redirect("/profile");

  const arcs = getAllCharacterArcs();

  // Phase 2: replace with getArcEndpoints() after IDEA-095 ships
  const endpointStatus = (slug: string) => "MARU CLASSIFIED";

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 font-mono">
      {/* Document header */}
      <div className="border border-[var(--color-border)] p-6 mb-8">
        <p className="text-xs tracking-widest text-[var(--color-ink-muted)] mb-1">
          MARU ARCHIVE — CLASSIFIED LEVEL 4
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-4">
          VALKYRIE MISSION MANIFEST
        </h1>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <dt className="text-[var(--color-ink-muted)]">DESIGNATION</dt>
          <dd>VALKYRIE-MISSION-001</dd>
          <dt className="text-[var(--color-ink-muted)]">DIRECTIVE</dt>
          <dd>MARU DIRECTIVE-14</dd>
          <dt className="text-[var(--color-ink-muted)]">VESSEL REGISTRY</dt>
          <dd>VSS VALKYRIE-1</dd>
          <dt className="text-[var(--color-ink-muted)]">DEPARTURE</dt>
          <dd>MISSION DAY 1</dd>
          <dt className="text-[var(--color-ink-muted)]">CREW COUNT</dt>
          <dd>{arcs.length} PERSONNEL</dd>
        </dl>
      </div>

      {/* Crew roster */}
      <h2 className="text-xs tracking-widest text-[var(--color-ink-muted)] mb-4">
        CREW ROSTER — FINAL STATUS
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {arcs.map((arc) => {
          const meta = CREW_META[arc.slug] ?? { role: "Unknown", species: "Unknown" };
          return (
            <div
              key={arc.slug}
              className="border border-[var(--color-border)] p-4 space-y-1"
            >
              <p className="font-bold text-sm tracking-wide">
                {arc.name.toUpperCase()}
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">{meta.role}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                SPECIES: {meta.species}
              </p>
              <p className="text-xs italic mt-2">
                FINAL STATUS:{" "}
                <span className="text-[var(--color-ink-faint)]">
                  {endpointStatus(arc.slug)}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-xs text-[var(--color-ink-faint)] mt-8 border-t border-[var(--color-border)] pt-4">
        This document is classified under MARU Directive-14 Archive Protocol.
        Unauthorized access is a violation of Interplanetary Information Security Act, Article 7.
      </p>
    </main>
  );
}
```

**Checkpoint:** The page renders with 9 crew cards showing names, roles, species, and "MARU CLASSIFIED" status placeholders.

3. **Add nav entry** — add a link to `/world/manifest` from the `/world/voices` page (IDEA-095, when it ships) and from the user profile page under a "World Archive" section. For now: no nav entry needed; the page is accessible by direct URL.

### Phase 2: Live Arc Status (after IDEA-095 ships)

4. **Import `getArcEndpoints()`** from `src/lib/wiki/arc-endpoints.ts` (created by IDEA-095).
   Replace the `endpointStatus` inline function:
   ```tsx
   const endpoints = getArcEndpoints(); // ArcEndpoint[]
   const endpointMap = Object.fromEntries(endpoints.map(e => [e.slug, e.stateAfter]));
   const endpointStatus = (slug: string) => endpointMap[slug] ?? "MARU CLASSIFIED";
   ```
   This surfaces the real CH17 "State After" text from each character's arc ledger.

5. **Run `npx next build`** — verify the static route `/world/manifest` renders without errors.
6. **Run `npm run lint`** — ensure no new lint warnings.

## Files Modified
- `src/app/world/manifest/page.tsx` *(new file)*

## New Files
- `src/app/world/manifest/page.tsx`

## Database Changes
None.

## Spoiler & Gating Impact
- **Gate:** `show_all_content === true` validated server-side via `getReaderProgress()`. Redirect to `/profile` if false. No client-side flash — redirect happens before any content renders.
- **Content sensitivity:** Phase 1 shows only role/species (world-building, non-narrative). Phase 2 shows CH17 "State After" text — appropriate only for completed readers, hence the `show_all_content` gate.
- **Guest path:** No session → `getReaderProgress()` returns null/default without `showAllContent` → redirect to `/profile`.
- **Partial-completion:** `show_all_content` is the sole gate; no chapter-count check required.

## Theme-Specific Requirements (post-read-world)
1. **Hidden for locked readers and guests:** Server redirect before any content renders. ✓
2. **Integration with `show_all_content`:** `progress?.showAllContent` check at the top of the server component. ✓
3. **Partial-completion edge cases:** `show_all_content` is the only qualifying signal. A reader who has completed 16/17 chapters but lacks the flag sees only the redirect. ✓

## Content Considerations
- No new markdown files needed.
- Executor must read `content/wiki/characters/{slug}.md` for each of the 9 characters to populate the `CREW_META` table with accurate `role` and `species` values before deploying. Do not guess — verify against canon text.
- `arc.name` from `getAllCharacterArcs()` returns the character display name exactly as authored in the arc ledger front-matter.

## Testing
- [ ] Build and lint pass
- [ ] Locked-reader path: user with `show_all_content=false` → redirected to `/profile`
- [ ] Unlocked / re-reader path: user with `show_all_content=true` → 9 crew cards rendered, all metadata correct
- [ ] Guest-cookie path: no authenticated user → redirect to `/profile`
- [ ] Phase 2: after IDEA-095 ships, confirm `endpointMap` lookup returns non-null values for all 9 character slugs

## Dependencies
- `src/lib/wiki/character-arcs.ts` — `getAllCharacterArcs()` (existing)
- `src/lib/reader-progress.ts` — `getReaderProgress()` (existing)
- Phase 2 dependency: `src/lib/wiki/arc-endpoints.ts` — `getArcEndpoints()` (from IDEA-095)

## Estimated Total: 1.5 hours
(30 min reading character wiki files to populate `CREW_META`, 45 min implementing the page, 15 min verification)
