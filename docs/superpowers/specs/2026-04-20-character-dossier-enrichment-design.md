# Character Dossier Enrichment — AI Pass (v1)

**Status:** Draft
**Owner:** Celestial team
**Supersedes:** none
**Depends on:** `2026-04-20-entity-dossier-integration-design.md` (structural dossier already in place)

---

## 1. Problem

The foundational dossier merge shipped the canonical skeleton for nine primary
characters: `Role`, `Profile`, `Character Arc`. That's ~3 sentences per
character — enough to identify them, not enough to read about them.

We want the character page to feel like a real encyclopedia entry: relationships,
notable moments quoted from the book, how they speak, what drives them, and a
per-chapter timeline. All of that information is latent in the ingested book
prose and the existing wiki metadata — it just hasn't been surfaced.

This spec describes the AI-enrichment pass that generates those new sub-fields,
wires them into the entity pipeline, and lets Keith review and lock content
before it ships to readers.

## 2. Scope

### In scope (v1)

- Enrich the 9 primary characters (= characters with a `## Dossier` block):
  Galen Voss, Aven Voss, Thane Meric, Lena Osei, Marco Ruiz, Evelyn Tran,
  Jonah Revas, Jax Reyes, ALARA.
- Generate four new AI-backed dossier sub-fields per character:
  1. `### Key Relationships`
  2. `### Notable Moments`
  3. `### Voice & Manner`
  4. `### Timeline`
- Store results inline in each wiki file inside idempotent HTML markers, using
  the same pattern as `ai-draft:*` and `generated:ingest`.
- Extend `parseCharacterDossierSection` to surface the new fields as typed
  optional sub-fields on `CharacterDossier`.
- Render the new fields in `EntityDossier.tsx` with clear visual distinction
  between **canonical** dossier text (Role / Profile / Arc) and **AI-derived**
  enrichment (everything else).
- Ship a `reviewed: true | false` flag per enrichment block so Keith can lock
  edits; reviewed blocks are never overwritten by re-runs.
- Add `npm run enrich:character-dossier` with `--dry-run`, `--character <slug>`,
  and `--force` / `--force-reviewed` flags to match existing conventions.

### Out of scope (v1 — tracked for follow-ups)

- `### Psychological Profile` sub-field. Adds value but is higher-risk for
  hallucination; defer until the simpler fields are tuned and reviewed.
- Cross-entity **conflict detection** pass (Aven says X, Galen says Y). Write
  the data model in a way that makes this straightforward later; do not build
  it yet.
- Artifacts, locations, factions, rules enrichment. Those reuse this pattern
  but with different field sets; a separate spec per entity kind.
- Narrative "About" synthesis paragraph. Wait until reviewer feedback on v1
  before adding another block.
- Reader-facing "AI-generated" visibility toggle. For v1, enrichment is
  `always_visible` once `reviewed: true`; hidden from UI while `reviewed:
  false` (shown to admins only).

## 3. Background & precedent

Existing idempotent AI generation patterns we must follow:

- `scripts/draft-people-bios.ts` (ai-draft:start / ai-draft:end markers,
  `--dry-run`, `--force`, `--force-reviewed` flags; reviewed blocks preserved).
- `scripts/merge-character-dossier.ts` (idempotent merge; never overwrites
  existing `## Dossier` section).
- `## Lore metadata` block convention (trailing metadata at end of file, read
  by `ingest:lore` into `lore_inventory.json`).

We reuse these patterns verbatim so there's one way to do idempotent
re-runs, not three.

## 4. Data model

### 4.1 Marker shape

Each enrichment sub-field lives between markers inside `## Dossier`:

```markdown
## Dossier

### Role
Mission Commander

### Profile
Former USAF pilot…

### Character Arc
From explorer to protector…

<!-- ai-dossier:relationships generated="2026-04-21" reviewed="false" model="claude-sonnet-4-5" source-hash="a1b2c3" -->
### Key Relationships
- **Aven Voss** — wife of 82 years; grounds him morally (CH01, CH02, CH10).
- **Thane Meric** — mentor-protégé; Galen recognizes Thane's resonance first (CH04, CH06).
<!-- ai-dossier:end -->

<!-- ai-dossier:moments generated="2026-04-21" reviewed="false" model="claude-sonnet-4-5" source-hash="a1b2c3" -->
### Notable Moments
- **Dustfall (CH01)** — quoted: "…"
- **Alignment (CH04)** — quoted: "…"
<!-- ai-dossier:end -->

<!-- ai-dossier:voice generated="2026-04-21" reviewed="false" model="claude-sonnet-4-5" source-hash="a1b2c3" -->
### Voice & Manner
Measured, direct, formal under pressure…
<!-- ai-dossier:end -->

<!-- ai-dossier:timeline generated="2026-04-21" reviewed="false" model="claude-sonnet-4-5" source-hash="a1b2c3" -->
### Timeline
- **CH01 Dustfall** — excavation kickoff; first to perceive anomaly.
- **CH02 Alignment** — …
<!-- ai-dossier:end -->
```

**Marker attributes:**
- `generated` — ISO date of last generation pass.
- `reviewed` — `"true"` locks the block from re-runs; `"false"` is regenerable.
- `model` — slug of the model used; powers "regenerate when we upgrade the
  model" workflows later.
- `source-hash` — short hash of the exact input context (chapter excerpts +
  canonical profile) so we can detect when re-generation would actually
  produce a different answer.

**Rules:**
- `reviewed="true"` blocks are **always** preserved. Only `--force-reviewed`
  overrides, and that flag prints a loud warning.
- `reviewed="false"` blocks are regenerated when: `--force` is passed, OR the
  `source-hash` no longer matches the current input (new chapter, updated
  profile).
- Missing block → generated fresh.

### 4.2 Typed shape

Extend `src/lib/wiki/entity-dossier.ts`:

```ts
export type CharacterDossierField =
  | "role"
  | "profile"
  | "arc"
  // NEW — AI-derived, all optional:
  | "relationships"
  | "moments"
  | "voice"
  | "timeline";

export interface CharacterDossierEnrichmentMeta {
  generated: string;          // ISO date
  reviewed: boolean;
  model: string;
  sourceHash: string;
}

export interface CharacterDossier {
  kind: "character";
  role?: string;
  profile?: string;
  arc?: string;
  // NEW:
  relationships?: string;
  moments?: string;
  voice?: string;
  timeline?: string;
  /** Provenance for each AI-derived sub-field (keyed by field name). */
  enrichment?: Partial<Record<
    "relationships" | "moments" | "voice" | "timeline",
    CharacterDossierEnrichmentMeta
  >>;
  presentFields: CharacterDossierField[];
}
```

The parser reads the block body and pulls the meta from the opening marker.

### 4.3 Inventory output

`content/raw/lore_inventory.json` grows:

```json
{
  "withDossierParsed": 9,
  "withEnrichmentReviewed": 0,
  "withEnrichmentDraft": 9,
  "entities": [{
    "slug": "galen-voss",
    "dossier": {
      "kind": "character",
      "role": "…",
      "profile": "…",
      "arc": "…",
      "relationships": "…",
      "moments": "…",
      "voice": "…",
      "timeline": "…",
      "enrichment": {
        "relationships": { "generated": "2026-04-21", "reviewed": false, "model": "claude-sonnet-4-5", "sourceHash": "a1b2c3" },
        "moments": { "generated": "2026-04-21", "reviewed": false, "model": "claude-sonnet-4-5", "sourceHash": "a1b2c3" },
        "voice": { "generated": "2026-04-21", "reviewed": false, "model": "claude-sonnet-4-5", "sourceHash": "a1b2c3" },
        "timeline": { "generated": "2026-04-21", "reviewed": false, "model": "claude-sonnet-4-5", "sourceHash": "a1b2c3" }
      },
      "presentFields": ["role", "profile", "arc", "relationships", "moments", "voice", "timeline"]
    }
  }]
}
```

## 5. The enrichment script

### 5.1 Entry point

`scripts/enrich-character-dossier.ts`

```
npm run enrich:character-dossier                       # every primary char, missing blocks only
npm run enrich:character-dossier -- --character aven-voss
npm run enrich:character-dossier -- --dry-run          # no API calls; print prompts
npm run enrich:character-dossier -- --force            # regen all unreviewed blocks
npm run enrich:character-dossier -- --force-reviewed   # nuke reviewed blocks too (with warning)
npm run enrich:character-dossier -- --field moments    # only one sub-field
```

### 5.2 Pipeline per character

For each character wiki file:

1. **Load.** Read markdown, parse existing `## Dossier` including any
   enrichment markers.
2. **Gather context.**
   - Canonical Role / Profile / Arc from the existing dossier (ground truth).
   - Chapter refs from `## Appearances` + `## Additional appearances`.
   - For each chapter ref, pull the actual story file's body (from
     `content/wiki/stories/<id>.md` or whatever the current ingestion path is;
     verify during implementation) — specifically the paragraphs that mention
     this character's name, alias, or pronoun-resolved references.
   - Relation edges from `## Related` block.
3. **Compute `source-hash`.** SHA-256 of a deterministic serialization of (2),
   truncated to 8 chars. Persists across runs.
4. **Per sub-field, decide whether to (re)generate:**
   - Block missing → generate.
   - Block present, `reviewed="true"` → skip (unless `--force-reviewed`).
   - Block present, `reviewed="false"`, `source-hash` unchanged, no `--force`
     → skip.
   - Else → regenerate.
5. **Call the model** with a field-specific prompt (see §6). One API call per
   sub-field per character, for clearer prompts and cheaper partial reruns.
6. **Validate output** against a small JSON Schema (shape + length bounds +
   required fields). If invalid, retry once, then skip with a warning.
7. **Write back.** Insert / replace the block between markers, preserving all
   sibling blocks verbatim.
8. **Summary.** Print `✓ galen-voss: relationships, moments, voice, timeline
   (4/4)` per character; totals at the end.

### 5.3 Safety & rate limiting

- Sequential per character, parallel across sub-fields within a character with
  a max concurrency of 2 (kind to the API, fast enough).
- Hard cap on total runs: refuse to generate > 50 blocks in a single
  invocation without `--yes-really`.
- On any API error, abort cleanly; never write partial blocks.
- Log all prompts + responses to `content/raw/character-enrichment-log/<date>/<slug>.json`
  so we can audit hallucinations and tune prompts.

## 6. Prompts

### 6.1 Shared system message

> You are writing entries for the Celestial story wiki. You will be given (a)
> the canonical dossier for ONE character, (b) a list of chapter excerpts where
> they appear, (c) their relation edges. Produce ONLY the requested section,
> as markdown, without the heading line. Never invent chapter numbers,
> relationships, or quotes that are not grounded in the excerpts or the
> canonical dossier. If evidence is insufficient, return the literal string
> `INSUFFICIENT_EVIDENCE` and nothing else.

### 6.2 Per sub-field user prompts (outline; finalize during implementation)

- **Key Relationships.** "List 3–6 bullet points for the character's most
  important relationships in the book. Each bullet: `- **Name** — short
  description (CHxx, CHyy).` Only include relationships evidenced in the
  excerpts or relation edges." Length: ≤ 400 chars.
- **Notable Moments.** "Pick 3–5 specific scenes. For each: `- **CHxx Title**
  — one-sentence description, then a single ≤30-word direct quote from the
  excerpts in quotation marks." Must cite chapter id per bullet. Length: ≤ 800
  chars.
- **Voice & Manner.** "2–3 sentences describing how this character speaks and
  carries themselves. Ground every claim in the excerpts. No psychology or
  motivation." Length: ≤ 400 chars.
- **Timeline.** "One bullet per chapter in which the character appears:
  `- **CHxx Title** — one sentence beat.` Order by chapter number. Exclude
  chapters where the excerpt contains no actual action by the character."
  Length: ≤ 1500 chars.

Prompts live in `scripts/enrich-character-dossier/prompts.ts` so they can be
edited and code-reviewed independently.

## 7. UI changes

### 7.1 `EntityDossier.tsx`

Add two visual zones inside the existing panel, separated by a divider:

- **Canonical** (top): Role, Profile, Character Arc — unchanged styling.
- **Derived** (below divider): Key Relationships, Notable Moments, Voice &
  Manner, Timeline — each rendered only if the corresponding field is
  present.

Each derived sub-field gets a small `aria-describedby` / tooltip: "AI-drafted
from story excerpts · reviewed" or "· draft" based on `enrichment[field].reviewed`.

Styling: same card chrome, slightly muted heading color for the Derived zone,
and a single `<hr>` between the two.

### 7.2 Visibility rules

- Field renders only if its string content is non-empty.
- If `enrichment[field].reviewed === false` AND the viewer is **not** an
  admin, the field is suppressed. Admin detection uses the existing pattern
  from `/admin/drafts` (same server check).
- Once reviewed, fields render for everyone.

No new routes in v1. Review happens via direct markdown edits (flipping
`reviewed="false"` → `reviewed="true"`) — same as `ai-draft`. An optional
future `/admin/dossier-review` page is out of scope here.

## 8. Ingestion, build, and integration

- `ingest:lore` (scripts/ingest-foundational-lore.ts) already parses the
  dossier. Extend it to surface `enrichment` metadata per field and new
  counters (`withEnrichmentReviewed`, `withEnrichmentDraft`).
- `entity-loader.ts` already calls `parseCharacterDossierSection`; no change
  required other than the parser extension.
- `prebuild` chain order is unchanged: `ingest:book → ingest:lore →
  generate-static-data`. The enrichment script is **manual**, not part of
  prebuild, because it hits the network and costs money. Running it updates
  the wiki files; the next prebuild picks them up.

## 9. Acceptance criteria

1. `npm run enrich:character-dossier -- --character aven-voss --dry-run`
   prints the four prompts (one per sub-field) with real excerpts, **without
   making API calls**.
2. `npm run enrich:character-dossier -- --character aven-voss` (with API key)
   writes four new `<!-- ai-dossier:* -->` blocks into
   `content/wiki/characters/aven-voss.md`, all with `reviewed="false"`.
3. A second run with no flags is a no-op: "4/4 skipped (hash match, draft
   preserved)".
4. Flipping `reviewed="false"` → `reviewed="true"` on one block; rerunning
   with `--force` regenerates the three unreviewed blocks and leaves the
   reviewed one exactly as-is (byte-for-byte).
5. `npm run ingest:lore` reports `withEnrichmentDraft: 9,
   withEnrichmentReviewed: N` and `lore_inventory.json` includes the
   enrichment fields + meta per character.
6. Visiting `/characters/aven-voss` as a signed-in admin shows the Canonical
   zone (unchanged) followed by a divider and the four Derived sub-fields.
7. Visiting `/characters/aven-voss` as a signed-in non-admin shows **only**
   the reviewed derived sub-fields (or none, if nothing has been reviewed
   yet).
8. Any block containing a chapter id not in the character's `## Appearances` +
   `## Additional appearances` list fails schema validation and is not
   written. (Prevents hallucinated citations.)
9. Typecheck, lint, and full test suite pass.
10. New unit tests:
    - `entity-dossier.test.ts` — parses the new sub-fields and enrichment
      meta; preserves unknown marker attrs; round-trips unchanged content.
    - `enrich-character-dossier.test.ts` — hash stability, skip logic, force
      logic, schema validation, marker rewrite idempotency (uses recorded
      fixture responses, no live API).

## 10. Rollout plan

Per the parent project pattern (implement → run → verify → commit), rollout is
linear, committed in small steps:

1. **Parser extension** — `entity-dossier.ts` + tests. No behavior change.
2. **UI pass** — `EntityDossier.tsx` renders new optional fields behind the
   `reviewed` gate. Admin check wired. No data yet → no visible change for
   readers.
3. **Script skeleton** — CLI flags, file I/O, marker read/write,
   hash/skip/force logic, dry-run output. No model calls.
4. **Prompts + schema** — one sub-field at a time (start with `voice`; it's
   the lowest-stakes), behind `--field <name>`.
5. **Full enrichment pass** — run over all 9 characters, inspect diffs,
   commit wiki changes.
6. **ingest:lore counters** + `lore_inventory.json` schema bump.
7. **Review workflow doc** — a short README blurb on how to review and flip
   `reviewed="true"`.

## 11. Open questions (resolve before Step 4)

1. **Chapter excerpt granularity.** Feed the model each chapter's *full* body,
   or just paragraphs mentioning the character (± 1 neighbor for context)?
   The latter fits in budget for all 9 characters in one pass; the former is
   higher quality for minor characters. Proposed default: paragraph-windowed,
   with `--full-chapters` flag as escape hatch.
2. **Model choice.** Default to the model already used by
   `draft-people-bios.ts` (`claude-sonnet-4-5`) for consistency, or use the
   Vercel AI Gateway so we can swap per-field? Proposed default: same model,
   one-knob simplicity; revisit if voice/timeline land differently on
   different models.
3. **Canonical status stamping.** Should every AI-derived block add a row to
   `## Lore metadata`? Probably not in v1 — the inline marker attrs already
   carry provenance, and `## Lore metadata` describes the whole file. Keep
   the metadata section as-is; the enrichment markers are the source of
   truth for per-block provenance.

## 12. Risks

- **Hallucinated chapter ids / quotes.** Mitigation: schema validation
  (acceptance #8), plus human review gate (`reviewed` flag).
- **Cost creep if we enrich the long tail.** Mitigation: scope is the 9
  primary characters; artifact/location expansion is a separate spec with its
  own cost review.
- **Drift between canonical profile and derived fields** (e.g. Arc says X,
  Timeline says Y). Mitigation: v1 relies on human review; v2 adds the
  cross-entity consistency pass described in §2 / out-of-scope.
- **Reviewed content being stomped.** Mitigation: `reviewed="true"` is
  preserved unless the loud `--force-reviewed` flag is used; script test
  covers this.

---

**Next step:** Keith reviews this spec. On approval, I'll write the
implementation plan (the sectionized, task-level breakdown) the same way we
did for the parent feature, then implement.
