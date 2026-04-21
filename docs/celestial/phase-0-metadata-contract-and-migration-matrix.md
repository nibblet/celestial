# Phase 0 Metadata Contract and Migration Matrix

## Purpose

Lock a canonical metadata model before Phase 1 cutover so chapter, mission log, timeline, entity, and AI surfaces remain consistent.

## Canonical contract (v1)

### Required fields

| Field | Type | Allowed values / format | Notes |
|---|---|---|---|
| `contentType` | enum | `chapter`, `mission_log`, `timeline_event`, `character`, `faction`, `location`, `artifact`, `rule`, `parable`, `foundational_lore`, `ai_continuation`, `user_created` | Primary type discriminator |
| `sourceType` | enum | `book_i_chapter`, `book_i_mission_log`, `foundational_dossier`, `series_bible`, `world_snapshot`, `technical_brief`, `parable_catalog`, `style_guide`, `ai_generated`, `user_submitted`, `legacy_import` | Provenance family |
| `canonStatus` | enum | `canon`, `adjacent`, `experimental` | Canon precedence control |
| `provenance` | object | `{ sourceDocument, sourcePath, extractedAt, extractorVersion }` | Required for all ingested non-chapter records |
| `visibilityPolicy` | enum | `progressive`, `always_visible`, `profile_override_only`, `admin_only` | Reveal behavior |
| `chapterRefs` | string[] | `CH##` IDs | Required for mission logs and chapter-linked lore |
| `aliases` | string[] | free text aliases | For dedupe and lookup normalization |

### Optional fields

| Field | Type | Notes |
|---|---|---|
| `timelineYear` | number | For `timeline_event` normalization |
| `timelinePrecision` | enum (`year`, `approximate`, `era`) | Handles BCE/approximate dates |
| `confidence` | number (0-1) | Ingestion confidence score for reviewed lore |
| `conflictRef` | string | Links to conflict ID from Phase 0A register |
| `styleConstraints` | string[] | For AI continuation and generation prompts |

## Visibility/reveal policy matrix

| contentType | Default policy | Progress-linked? | Notes |
|---|---|---|---|
| `chapter` | `progressive` | Yes | Existing unlock semantics remain |
| `mission_log` | `progressive` | Yes (via `chapterRefs`) | Already implemented in app |
| `timeline_event` | `always_visible` | No | Filter by canon status, not reveal lock |
| `character` / `faction` / `location` / `artifact` / `rule` | `always_visible` | No | Detail blocks can still respect spoilers if needed |
| `parable` | `progressive` | Usually yes | Tie to chapter or arc |
| `foundational_lore` | `always_visible` | No | Mark as `adjacent` until canon-backed |
| `ai_continuation` | `profile_override_only` | User-controlled | Never silently merged into canon |
| `user_created` | `profile_override_only` | User-controlled | Explicit labeling required |

## Normalization and dedupe rules

1. **Primary keying**
   - Chapters keyed by `CH##`.
   - Mission logs keyed by normalized `logId` with raw value retained.
   - Entities keyed by slug; aliases retained for lookup.

2. **Slug policy**
   - Lowercase kebab-case.
   - Strip punctuation except hyphen.
   - Preserve numeric suffixes when meaningful.

3. **Alias policy**
   - Every renamed/variant entity must retain prior forms in `aliases`.
   - Example: `jax-delcor` becomes alias for canonical `jax-reyes`.

4. **Merge policy**
   - Prefer `canon` over `adjacent`, `adjacent` over `experimental`.
   - For same canonicality, prefer chapter-backed evidence over dossier-only statements.
   - Preserve losing values in `provenance` notes; do not drop silently.

5. **Conflict handling**
   - Any record matching a Phase 0A conflict ID must include `conflictRef`.
   - `reject_conflict_with_book_i` records remain excluded from canonical build output.

## Migration matrix (legacy -> v1)

### Story source mapping

| Legacy field | Legacy value | New field(s) | New value(s) |
|---|---|---|---|
| `StorySource` | `family` (CH01-CH17 narrative) | `sourceType`, `contentType`, `canonStatus` | `book_i_chapter`, `chapter`, `canon` |
| `StorySource` | `memoir` | `sourceType`, `canonStatus` | `legacy_import`, `adjacent` |
| `StorySource` | `interview` | `sourceType`, `canonStatus` | `legacy_import`, `adjacent` |

### Timeline source mapping

| Legacy field | Legacy value | New field(s) | New value(s) |
|---|---|---|---|
| `TimelineSource` | `memoir` | `sourceType`, `canonStatus` | `book_i_chapter`, `canon` |
| `TimelineSource` | `public_record` | `sourceType`, `canonStatus` | `world_snapshot`, `adjacent` |
| `TimelineSource` | `interview` | `sourceType`, `canonStatus` | `legacy_import`, `adjacent` |

### Theme/tag mapping

| Legacy value | New handling |
|---|---|
| `Fiction Narrative` | Replace with Celestial domain taxonomy (e.g., `Resonance`, `Legacy`, `Ethical Alignment`, `Vault Encounter`, `Crew Cohesion`) based on chapter-level reclassification pass in Phase 1 |

## Source doc classification (Phase 0A corpus)

| Document | Default `sourceType` | Default `canonStatus` |
|---|---|---|
| `🛰️ Valkyrie-1 Interior Specifications.docx` | `technical_brief` | `canon` |
| `Valkyrie-1 Technical Brief.docx` | `technical_brief` | `canon` |
| `Valkyrie-1_ Visual & Structural Specification Brief.docx` | `technical_brief` | `canon` |
| `Valkyrie-1 Mission Log Framework.docx` | `foundational_dossier` | `canon` (format guidance) |
| `Celestial Heritage_ Character Dossier.docx` | `foundational_dossier` | `canon` (except conflict-marked entries) |
| `Celestial Heritage Series Bible.docx` | `series_bible` | `adjacent` (promote selectively) |
| `Ancient Lore & Watcher Dossier.docx` | `foundational_dossier` | `adjacent` |
| `Parable Catalog v2 – Celestial Heritage Series.docx` | `parable_catalog` | `adjacent` |
| `Style & Voice Guide Celestial Heritage.docx` | `style_guide` | `canon` (for generation constraints) |
| `Earth 2050_ World Snapshot.docx` | `world_snapshot` | `adjacent` |
| `Addendum Earth 2050 World Snapshot.docx` | `world_snapshot` | `adjacent` (promote per chapter evidence) |
| `Vault Encounter Tracker v2.docx` | `foundational_dossier` | mixed (`canon` for chapter-backed entries, else `adjacent`) |

## Phase 0 implementation checklist (completed)

- Contract fields defined.
- Visibility matrix defined.
- Normalization/dedupe/conflict rules defined.
- Legacy-to-v1 migration matrix defined.
- Source corpus classification defined.

## Immediate implementation hooks for Phase 1

1. Update parser/static types to include `contentType`, `sourceType`, `canonStatus`, `visibilityPolicy`.
2. Add compatibility mapping so existing pages continue rendering during transition.
3. Enforce alias mapping for known conflicts (`jax-delcor` -> `jax-reyes`).
4. Ensure timeline ingestion tolerates absent timeline markdown file and supports adjacent/canon filtering.
