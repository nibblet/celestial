# Dev Plan: [IDEA-023] Explore Hub — Fiction Entity Graph

## What This Does

A dedicated `/explore` page that gives readers a visual and navigable overview of the Celestial story world. Three tabbed views:
1. **Entity Map** — `ThemePrincipleMatrix`-style grid or `ChordDiagram` showing which characters/factions appear across chapters
2. **Story Arc Map** — `StorySankey`-style flow of chapter unlock progress (which chapters are unlocked, what comes next)
3. **Connections** — Cross-entity relation browser using the `[[faction:x]] predicate [[character:y]]` relation graph already parsed in `entity-loader.ts`

All data infrastructure already exists. This is purely a UI assembly + routing task.

## User Stories

- As a first-time reader (CH04 unlocked): I want to see at a glance which factions and characters I've encountered so far and how they connect — without seeing spoilers from later chapters.
- As a re-reader (`show_all_content = true`): I want to explore the full entity graph across all 17 chapters, see how all factions interrelate, and use it as a reference while rereading.
- As the author: I want to see which entities appear in which chapters to spot coverage gaps before new chapters ship.

## Implementation

### Phase 1: Foundation — Route + Tab Shell (30 min)

1. Create `src/app/explore/page.tsx` — server component that fetches entity data and reader progress.
2. Create `src/app/explore/layout.tsx` — minimal layout (reuse pattern from other entity layouts).
3. Create `src/components/explore/ExploreHub.tsx` — client component with 3 tab state (entity-map | arc-map | connections).
4. Wire tab buttons using the existing tab pattern from `BeyondModeTabs.tsx`.
5. **Checkpoint:** `/explore` renders with 3 empty tab panels and a "Coming soon" placeholder in each.

### Phase 2: Story Arc Map Tab (45 min)

1. Reuse `StorySankey` component from `src/components/viz/StorySankey.tsx`.
2. For first-time reader: filter `stories` to `isStoryUnlocked(storyId, progress)` and show only unlocked chapters in the Sankey. Locked nodes render as a minimal "locked" placeholder (no title, no theme).
3. For re-reader (`showAllContent = true`): show full chapter set.
4. Pass `buildStorySankey(stories)` data from `src/lib/wiki/graph.ts`.
5. **Checkpoint:** Arc Map tab shows chapter flow, locked nodes are silhouetted for first-time readers, full graph for re-readers.

### Phase 3: Entity Map Tab (30 min)

1. Build an entity-by-chapter grid: rows = entities (characters + factions), columns = chapters the entity appears in.
2. Gate columns: chapters beyond `currentChapterNumber` render as a locked column (greyed-out with a lock icon), not revealing entity names in that column.
3. Show entity name + chapter appearance count (already in `memoirStoryIds` / `interviewStoryIds` fields on `WikiFictionNounEntity`).
4. **Checkpoint:** Entity Map shows a scannable grid; locked chapter columns don't leak entity names.

### Phase 4: Connections Tab (30 min)

1. Build a simple relation list from `entity.relations` (already parsed in `entity-loader.ts`).
2. Group by entity type (faction, character, location, artifact, rule).
3. Each relation row: `SourceType:SourceSlug predicate TargetType:TargetSlug` — link to the entity detail page.
4. Filter: only show relations where the source entity's `chapterRefs` are all within the reader's unlocked range.
5. **Checkpoint:** Connections tab shows cross-entity relations with links; no future-chapter entities appear for first-time readers.

### Phase 5: Navigation Hookup (15 min)

1. Add `/explore` link to `src/components/layout/Nav.tsx`.
2. Optional: redirect `/arcs` from journeys alias to redirect to `/explore` instead (or keep as-is if journeys = arcs are distinct).

## Content Considerations

- Entity markdown is the source of truth; no new markdown needed
- The `chapterRefs` field on `WikiEntityLoreMetadata` is the key for chapter-level gating in Phase 4
- Entities with `visibilityPolicy: "always_visible"` can always appear in the hub (all current entities)
- Entities with `visibilityPolicy: "progressive"` should be gated by `chapterRefs`

## Spoiler & Gating Impact

**Does this touch locked content?** Yes — the entity graph could reveal entities from unread chapters.

**How is the gate enforced?**
- Phase 2 (Arc Map): locked chapters render without content, silhouette-only
- Phase 3 (Entity Map): locked chapter columns are rendered as greyed-out column headers with no entity data
- Phase 4 (Connections): relations from locked chapters are filtered out

**Unlocked-state UX:** Full entity graph, all chapter columns, all connections visible.

**Guest-cookie path:** `getReaderProgress()` handles the guest cookie fallback. If `currentChapterNumber = 0`, all chapters except CH01 are locked. The explore hub still renders but shows mostly locked columns.

## Testing

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] First-time reader (CH04): locked chapter columns and locked Sankey nodes visible; no CH05+ content shown
- [ ] Re-reader (`show_all_content = true`): full graph visible
- [ ] Guest cookie path: `currentChapterNumber = 0` renders locked state cleanly
- [ ] Entity detail page links from Connections tab navigate correctly

## Dependencies

- `StorySankey`, `ThemePrincipleMatrix`, `ChordDiagram` — already built
- `getAllFactions()`, `getAllArtifacts()`, `getAllLocations()` — in parser.ts
- `buildStorySankey()` — in graph.ts
- `getReaderProgress()`, `isStoryUnlocked()` — in reader-progress.ts

## Estimated Total: 2.5 hours
