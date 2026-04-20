# Entity Dossier Integration — Design Spec

**Date:** 2026-04-20
**Slice:** Phase 5 lore integration, iteration 1 (character dossiers)
**Status:** approved (pre-implementation)

## Goal

Bring the substantive prose of the Celestial Heritage Character Dossier into the app so that each character's wiki page surfaces a structured `Dossier` panel (Role / Profile / Character Arc) alongside the existing `Lore metadata` card. The dossier export becomes the source input; the per-character wiki markdown becomes the single source of truth after a one-time idempotent merge.

This is the first slice of a larger lore integration roadmap. Subsequent slices (world/setting lore, mission-log framework, Parable Catalog, Style & Voice) will follow the same pattern but are out of scope here.

## Non-goals

- World/setting lore surfaces (Series Bible, Earth 2050, Ancient Lore & Watcher Dossier). A separate spec.
- Artifact / location dossiers. Reuse the same pipeline when we have exports; label sets differ per `wikiEntityKind`.
- Progressive reveal of dossier fields by reader progress. Data model is forward-compatible; v1 renders always-visible.
- Editing dossier content via the author UI (`PersonEditDrawer`). Edits happen by committing to the wiki markdown.
- Cross-entity link parsing inside dossier prose (e.g. "Galen's wife" → link to `galen-voss`).
- Per-field canon status. The whole dossier inherits the entity-level `Lore metadata` canonStatus.
- Touching `## Lore metadata` — that remains `seed:lore-metadata`'s job.

## Inputs (ground truth as of this spec)

- `celestial_original/Celestial Heritage_ Character Dossier.md` (75 lines, 9 entities, labeled `Role:` / `Profile:` / `Character Arc:` under `# **<Name>**` headings).
- `content/wiki/characters/*.md` (22 files) — already carrying `## Lore metadata` blocks. 10 match dossier display names today (`galen-voss`, `aven-voss`, `thane-meric`, `lena-osei`, `marco-ruiz`, `evelyn-tran`, `jax-reyes`, `jonah-revas`, plus `elara-varen` and others). `ALARA` is present in the dossier but has no matching wiki file.
- `src/app/characters/[slug]/page.tsx` already renders `<EntityLoreCard>` from `person.lore`. The new `<EntityDossier>` slots in next to it.

## Architecture

```
celestial_original/Celestial Heritage_ Character Dossier.md   (reference after merge)
                        │
                        ▼
      scripts/merge-character-dossier.ts        (one-time, idempotent)
                        │
                        ▼
      content/wiki/characters/<slug>.md         (canonical — adds ## Dossier)
                        │
                        ▼
      npm run ingest:lore                        (existing; extended)
                        │
                        ▼
      content/raw/lore_inventory.json            (adds per-entity dossier + counter)
                        │
                        ▼
      src/lib/wiki/parser.ts                     (person.dossier populated)
                        │
                        ▼
      src/app/characters/[slug]/page.tsx
                        │
                        ▼
      <EntityDossier />                          (new component)
```

Module boundaries:

- `scripts/merge-character-dossier.ts` — filesystem-side-effecting, content-authoring tool. Never runs at build time.
- `src/lib/wiki/entity-dossier.ts` — pure parser. No filesystem. Unit-tested in isolation.
- `src/lib/wiki/parser.ts` — extends existing `Person` shape with typed `dossier` field. Caller contract unchanged.
- `src/components/entities/EntityDossier.tsx` — presentational only. Accepts `{ dossier }`. No data fetching, no auth branching.
- `scripts/ingest-foundational-lore.ts` — extended to include `dossier` in the emitted inventory.

## Data model

Source format (inserted by the merge script into `content/wiki/characters/<slug>.md` between the ai-draft block and `## Appearances`):

```markdown
## Dossier

### Role
<one line>

### Profile
<one or more paragraphs>

### Character Arc
<one or more paragraphs>
```

Rules:

- `## Dossier` is the section anchor. Sub-headings `### Role`, `### Profile`, `### Character Arc` are the recognized character-kind labels.
- Each sub-heading is optional. Missing sub-headings are simply absent from the rendered UI.
- File order is preserved in `presentFields`; UI renders in canonical order: Role → Profile → Character Arc.
- Content under each sub-heading is markdown, rendered by the existing `StoryMarkdown` component.
- Label set is keyed on `wikiEntityKind`. Future artifact/location dossiers will declare their own label sets (e.g. `Function` / `Specifications` / `Significance`); they are out of scope for this spec but the parser's type-dispatch table is designed to accommodate them.

Parsed type (new file `src/lib/wiki/entity-dossier.ts`):

```ts
export type CharacterDossierField = "role" | "profile" | "arc";

export interface CharacterDossier {
  kind: "character";
  role?: string;     // markdown, trimmed
  profile?: string;
  arc?: string;
  /** Sub-fields actually present in source, in file order. */
  presentFields: CharacterDossierField[];
}

export interface EntityDossierParseResult {
  dossier?: CharacterDossier;
  warnings: string[];
}

export function parseCharacterDossierSection(
  content: string
): EntityDossierParseResult;
```

Parser rules:

- Uses `extractSectionBlock(content, "Dossier")` (the same helper `parseWikiEntityLoreSection` uses).
- Splits on `^### ` inside the block.
- Label normalization: lowercase, trim. `Character Arc` → `arc`; `Role` → `role`; `Profile` → `profile`.
- Unknown sub-heading → pushes `"unknown sub-heading: <label>"` to `warnings`; not an error; original content preserved in the block but not exposed on the typed object.
- Empty body under a recognized sub-heading → field omitted (not `""`).
- `## Dossier` section missing or entirely empty → returns `{ dossier: undefined, warnings: [] }`.

Integration into the `Person` shape (`src/lib/wiki/parser.ts`):

```ts
interface Person {
  // ... existing fields
  lore?: WikiEntityLoreMetadata;
  dossier?: CharacterDossier; // NEW
}
```

Inventory JSON extension (`content/raw/lore_inventory.json`):

- New per-entity field `dossier` sitting next to `lore`.
- New top-level counter `withDossierParsed: <number>` next to `withLoreSectionParsed`.

## Merge script — `scripts/merge-character-dossier.ts`

Invocation: `npm run merge:character-dossier` (new `package.json` script entry). Not wired into `prebuild`.

### Inputs

- `celestial_original/Celestial Heritage_ Character Dossier.md`
- `content/wiki/characters/*.md` (including each file's `## Lore metadata` **Aliases**)

### Algorithm

1. **Parse the source dossier.** Skip the leading title line. For each `# **<Name>**` heading, extract a block ending at the next `# ` or EOF. Within the block, extract three labeled values by prefix: `Role:`, `Profile:`, `Character Arc:` (case-insensitive). A value runs from the colon through subsequent text up to the next recognized label prefix or end-of-block. Multi-paragraph values are preserved.
2. **Resolve display name → wiki slug.** Build a resolver map once by reading every existing `content/wiki/characters/*.md`:
   - filename slug
   - the first `# ` heading's name (normalized: lowercased, honorifics stripped, punctuation collapsed)
   - every value from the `Aliases` line of `## Lore metadata`
   For each dossier entity, normalize the display name the same way (strip honorifics like `Dr.` / `Major`, strip nicknames in single quotes). First match wins; alias match preferred over slugify-from-display-name fallback.
3. **Matched entity with existing wiki file:**
   - If `## Dossier` already present → skip (log `⏭`).
   - Else build the dossier block (omitting any missing sub-fields) and insert it immediately before the first existing anchor, searched in order: `## Appearances` → `## Lore metadata` → `## Note`.
   - If none of those anchors exists → error out, do not guess.
   - Write the file with a single trailing newline; log `✓ <slug>`.
4. **Unmatched entity (no wiki file):**
   - Slugify the normalized display name.
   - If the resulting path collides with an existing but unrelated wiki file (no alias match, different name heading) → error out, do not overwrite.
   - Otherwise create a new wiki file using the scaffold shape `seed:lore-metadata` expects (`# <Name>`, `**Slug:**`, empty `## Appearances`, seeded `## Lore metadata` with `foundational_dossier` / `adjacent` / `always_visible` / the dossier source doc + path, `Extractor version: merge-character-dossier/1`, and a `## Note` stub). Insert the `## Dossier` section. Log `🆕 created <path>`.
5. **Summary** to stdout with counts of merged / skipped / created / warnings. Exit 1 only on hard errors (anchor missing, slug collision, malformed source).

### Idempotency

- No source changes → zero writes.
- Source gains a new entity → only that file written.
- User-edited dossier prose in the wiki is never clobbered (presence check on section, not content compare). To force a re-merge, delete the `## Dossier` section from the wiki file and rerun.

## UI — `<EntityDossier />`

Path: `src/components/entities/EntityDossier.tsx`.

Contract:

```tsx
interface EntityDossierProps {
  dossier: CharacterDossier;
}
```

Rendered outline:

```tsx
<section aria-labelledby="dossier-heading" className="<card-classes>">
  <h2 id="dossier-heading" className="type-meta">Dossier</h2>

  {dossier.role && (
    <div>
      <h3 className="type-ui">Role</h3>
      <p>{dossier.role}</p>
    </div>
  )}
  {dossier.profile && (
    <div>
      <h3 className="type-ui">Profile</h3>
      <StoryMarkdown content={dossier.profile} />
    </div>
  )}
  {dossier.arc && (
    <div>
      <h3 className="type-ui">Character Arc</h3>
      <StoryMarkdown content={dossier.arc} />
    </div>
  )}
</section>
```

Visual treatment: matches `EntityLoreCard` — rounded card, `border-clay-border`, `bg-warm-white`, so the two panels read as a pair. Sub-heading typography `type-ui`, body via existing `prose prose-story` + `StoryMarkdown` path. Omitted fields are not rendered (no "N/A" placeholders).

Accessibility: `<section>` with `aria-labelledby`; sub-field headings are real `<h3>` elements.

Page integration (`src/app/characters/[slug]/page.tsx`):

```tsx
{person.lore && <EntityLoreCard lore={person.lore} />}
{person.dossier && <EntityDossier dossier={person.dossier} />}
```

Inserted after the lore card and before the "Appears in N stories" paragraph.

## Forward-compatibility: progressive reveal (Q5 follow-on)

The v1 renders every dossier field always. The upgrade path to per-field progressive reveal is additive only:

- Add optional `chapterRefsByField?: Partial<Record<CharacterDossierField, string[]>>` to `CharacterDossier`.
- Teach the parser to read inline markers like `### Arc [CH10]` (or a sibling metadata line) into that map.
- Teach `<EntityDossier>` to gate a field with `isStoryUnlocked(ref, progress)`.

No rename, no migration, no schema change beyond an optional field. Out of scope for this spec.

## Testing

### Parser — `src/lib/wiki/entity-dossier.test.ts`

1. Full three-field dossier parses correctly; `presentFields === ["role","profile","arc"]`.
2. Only `### Profile` present → `role`/`arc` undefined; no warnings.
3. No `## Dossier` section → `dossier === undefined`; no warnings.
4. Unknown sub-heading (`### Notes`) → warning emitted, not an error; recognized fields still parsed.
5. Multi-paragraph profile preserved verbatim for StoryMarkdown.
6. Label case-insensitivity: `### Character Arc`, `### character arc`, `### CHARACTER ARC` all resolve to `arc`.

### Merge script — `scripts/merge-character-dossier.test.ts`

Uses temporary directories seeded with fixtures; does not mutate real `content/wiki/`.

1. Idempotency: wiki file with existing `## Dossier` → byte-identical output on rerun.
2. Anchor fallback: no `## Appearances` but has `## Lore metadata` → inserted before `## Lore metadata`.
3. No anchors at all → exit 1 with an actionable message.
4. Display-name resolution: `# **Jaxon 'Jax' Reyes**` matches `jax-reyes.md` via normalization, with no alias required.
5. Unmatched entity (`ALARA`) → stub wiki file created at `content/wiki/characters/alara.md` with scaffold + dossier section.
6. Slug collision on stub creation → exit 1, no overwrite.

### Integration — new or extended regression test

1. `getPersonBySlug('aven-voss').dossier` is populated against the real wiki content post-merge.
2. `content/raw/lore_inventory.json` `withDossierParsed` counter matches the count of character entities with a non-null `dossier` field.

### Build / lint

- `npm run lint` passes.
- `npm run build` (runs the full prebuild chain) passes and produces an updated `lore_inventory.json` with the new fields.

### Manual verification (documented here, not automated)

- `/characters/aven-voss` renders `<EntityDossier>` below `<EntityLoreCard>`, three sub-sections in order.
- `/characters/amar-cael` (likely lacks dossier content in the current source) renders no dossier panel; rest of page unchanged.

## End-to-end workflow after this ships

```
1. Download updated dossier → drop at celestial_original/Celestial Heritage_ Character Dossier.md
2. npm run merge:character-dossier    # one-time, or on dossier source changes
3. npm run ingest:lore                 # refresh inventory; picks up dossier sections
4. npm run build                       # prebuild chain runs ingest automatically
5. /characters/<slug> renders the dossier panel.
```

## Open questions carried forward to implementation

None as of this writing. All scoping questions resolved:

- Scope: entity dossiers first (Q1).
- Surface: new Dossier section alongside existing prose (Q2).
- Extraction: user exports `.docx` → `.md` into `celestial_original/`; no docx parser needed.
- Authoring model: merge into wiki files; wiki is source of truth (Model 1).
- Sub-field schema: per-kind label maps; character kind uses `Role / Profile / Character Arc` (Q6 option C).
- Visibility: always_visible v1, data model progressive-ready (Q5 option A).
- Unmatched entity handling: auto-generate wiki stub, no flag (Q7 flip).
