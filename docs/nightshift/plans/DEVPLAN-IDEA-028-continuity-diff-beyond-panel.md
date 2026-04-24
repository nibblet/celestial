# Dev Plan: [IDEA-028] Continuity Diff Panel in Beyond Workspace

## What This Does

Adds a read-only "Continuity Health" panel to the Beyond author workspace (`/beyond`). The panel loads the latest canon snapshot (`content/raw/.continuity/last-snapshot.json`), diffs it against the current wiki state using the existing `diffCanonSnapshots()` module, and renders any blocking contradictions grouped by severity. Gives Paul a "no regressions" signal before publishing new wiki content — without leaving the app.

## User Stories

- As the **author** viewing `/beyond`: I see a collapsible "Continuity Health" card that shows 0 issues (green) or a list of canon contradictions (alias_moved, relation_flipped, entity_vanished, chapter_theme_changed) with severity and file paths, so I can catch breaks before they go live.
- As a **first-time reader**: No impact — Beyond is author-only; this panel is not visible.
- As a **re-reader** (`show_all_content=true`): No impact — same as above; this feature is behind the author role gate.

## Implementation

### Phase 1: Foundation — Server Component that reads the snapshot and diffs

1. Open `content/raw/.continuity/last-snapshot.json` — confirm it exists and has shape `{ timestamp, entities, ... }` as produced by `scripts/review-ingestion.ts`.
2. Open `src/lib/wiki/continuity-diff.ts` — confirm the exported API:
   - `diffCanonSnapshots(prev: CanonSnapshot, current: CanonSnapshot): ContradictionReport[]`
   - `ContradictionReport.severity: "blocking" | "warning" | "note"`
   - `ContradictionReport.kind: "alias_moved" | "relation_flipped" | "entity_vanished" | "chapter_theme_changed"`
3. Create `src/components/beyond/ContinuityHealthPanel.tsx` as a **Server Component** (no `"use client"`):
   ```tsx
   import fs from "node:fs";
   import path from "node:path";
   import { diffCanonSnapshots } from "@/lib/wiki/continuity-diff";
   // Read snapshot from disk (server-only); diff against itself for now to prove shape.
   // Phase 2 will diff prev vs. current.
   export function ContinuityHealthPanel() { ... }
   ```
4. **Checkpoint:** Component renders "No snapshot found" when file is absent; renders contradiction count when snapshot exists.

### Phase 2: Core Logic — diff + render

5. The snapshot is a point-in-time capture. For a diff you need both a `prev` and a `current`. Strategy: the current snapshot IS the `last-snapshot.json`; generate a fresh in-memory snapshot from disk wiki files using the same shape the review-ingestion script produces. This avoids needing two snapshot files.
   - Import `buildCanonSnapshot` from `src/lib/wiki/continuity-diff.ts` (check if exported; if not, expose it).
   - If `buildCanonSnapshot` is not exported, the alternative is to load `content/raw/canon_entities.json` and compare its entity list against the snapshot's entity list — a coarser but workable diff.
6. Render contradiction list grouped by severity:
   ```tsx
   <section>
     <h3>Continuity Health</h3>
     {blocking.length === 0 && warning.length === 0 && <p>✓ No contradictions</p>}
     {blocking.map(r => <ContradictionCard key={r.id} report={r} />)}
     {warning.map(r => <ContradictionCard key={r.id} report={r} />)}
   </section>
   ```
7. `ContradictionCard` shows: kind badge, entity slug, before/after values, file path link.
8. **Checkpoint:** Panel shows real diffs (or zero issues) pulled from disk state.

### Phase 3: Polish

9. Wire `ContinuityHealthPanel` into `src/app/beyond/page.tsx`:
   - Add below the session-wrap card, wrapped in a `<Suspense fallback={<p>Loading continuity…</p>}>`.
10. Collapse by default (use `<details>` with `<summary>Continuity Health ({count} issues)</summary>`).
11. Add a "Last checked" timestamp from `lastSnapshot.timestamp`.
12. Style with the existing `sci-panel` design tokens to match the Beyond workspace look.

## Content Considerations

No wiki content changes. The panel reads from existing snapshot + canon entity files. No new markdown needed.

## Spoiler & Gating Impact

**Does not touch locked content.** Beyond is gated by `hasAuthorSpecialAccess()` (checks `role = 'author'` or `AUTHOR_SPECIAL_EMAILS`). Only the author sees this panel. No reader-facing surface is changed. No Ask filter changes.

The continuity diff operates on structural metadata (entity aliases, parent relationships, chapter themes) — not story bodies. No spoiler risk.

## Testing

- [ ] `npx next build` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] **Author path:** Sign in with author role → `/beyond` → panel renders with contradiction count
- [ ] **No-snapshot path:** Delete or rename `last-snapshot.json` → panel renders "No snapshot found" gracefully
- [ ] **Reader path:** Sign in as non-author reader → `/beyond` returns 403/redirect; panel never rendered
- [ ] **Re-reader path:** N/A — Beyond is author-only regardless of `show_all_content`
- [ ] **Guest path:** N/A — Beyond requires auth

## Dependencies

- `src/lib/wiki/continuity-diff.ts` — must export `buildCanonSnapshot` or equivalent (check before Phase 2 begins; if not exported, adjust approach to use `canon_entities.json` comparison)
- `content/raw/.continuity/last-snapshot.json` — must exist (created by `npm run review:ingestion`)
- No DB changes
- No new migrations

## Estimated Total: 1.5 hours

- Phase 1 (foundation): 30 min
- Phase 2 (diff logic): 45 min
- Phase 3 (polish + wire-up): 15 min
