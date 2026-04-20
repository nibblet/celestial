# Entity Dossier Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the Celestial Heritage Character Dossier prose into per-character wiki files as a structured `## Dossier` section, parse it into a typed `CharacterDossier`, and render it as a panel on the character detail page alongside the existing lore-metadata card.

**Architecture:** One-time idempotent merge script inserts `## Dossier` into `content/wiki/characters/<slug>.md`. A pure parser (`src/lib/wiki/entity-dossier.ts`) extracts `role`/`profile`/`arc` sub-fields. The existing wiki loader (`entity-loader.ts → parseNounCommon`) plumbs `dossier` onto `WikiPerson`. A new `<EntityDossier>` component renders the panel next to `<EntityLoreCard>`. The existing `ingest:lore` script is extended to include the dossier in `lore_inventory.json` for debuggability.

**Tech Stack:** TypeScript, Next.js 16 (App Router), React 19, existing `tsx` + `node --test` runner, existing `StoryMarkdown` renderer. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-04-20-entity-dossier-integration-design.md`

---

## File map

**Create:**
- `src/lib/wiki/entity-dossier.ts` — pure parser, exports `CharacterDossier`, `parseCharacterDossierSection`.
- `src/lib/wiki/entity-dossier.test.ts` — parser unit tests.
- `src/components/entities/EntityDossier.tsx` — presentational component.
- `scripts/merge-character-dossier.ts` — one-time idempotent merge script.
- `scripts/merge-character-dossier.test.ts` — merge script tests (temp dirs).

**Modify:**
- `src/lib/wiki/entity-loader.ts` — extend `parseNounCommon` to include `dossier`.
- `src/lib/wiki/parser.ts` — add `dossier?: CharacterDossier` to `WikiPerson` and `WikiFictionNounEntity`; pass `base.dossier` through `parseWikiNounMarkdown`.
- `src/app/characters/[slug]/page.tsx` — render `<EntityDossier dossier={person.dossier} />` after `<EntityLoreCard>`.
- `scripts/ingest-foundational-lore.ts` — also extract dossier per entity; emit `withDossierParsed` counter + `dossier` field.
- `package.json` — add `merge:character-dossier` script entry.

---

## Task 1: CharacterDossier type + parser (TDD)

**Files:**
- Create: `src/lib/wiki/entity-dossier.ts`
- Create: `src/lib/wiki/entity-dossier.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/wiki/entity-dossier.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { parseCharacterDossierSection } from "@/lib/wiki/entity-dossier";

const FULL = `
# Aven Voss

## Dossier

### Role
Strategic & Medical Officer

### Profile
Galen's wife of 82 years. Background in medicine, law enforcement, and intelligence work.

### Character Arc
Becomes the spiritual and emotional center of the crew.

## Appearances
- stub
`;

test("parses all three character dossier fields", () => {
  const { dossier, warnings } = parseCharacterDossierSection(FULL);
  assert.ok(dossier);
  assert.equal(dossier!.kind, "character");
  assert.equal(dossier!.role, "Strategic & Medical Officer");
  assert.ok(dossier!.profile?.startsWith("Galen's wife"));
  assert.ok(dossier!.arc?.startsWith("Becomes the spiritual"));
  assert.deepEqual(dossier!.presentFields, ["role", "profile", "arc"]);
  assert.deepEqual(warnings, []);
});

test("missing sub-headings are omitted (no warnings)", () => {
  const md = `
## Dossier

### Profile
Only profile is present.

## Appearances
`;
  const { dossier, warnings } = parseCharacterDossierSection(md);
  assert.ok(dossier);
  assert.equal(dossier!.role, undefined);
  assert.equal(dossier!.arc, undefined);
  assert.equal(dossier!.profile, "Only profile is present.");
  assert.deepEqual(dossier!.presentFields, ["profile"]);
  assert.deepEqual(warnings, []);
});

test("no ## Dossier section returns undefined dossier", () => {
  const md = `
# Someone

## Lore metadata
**Content type:** character
`;
  const { dossier, warnings } = parseCharacterDossierSection(md);
  assert.equal(dossier, undefined);
  assert.deepEqual(warnings, []);
});

test("unknown sub-heading emits warning, not error", () => {
  const md = `
## Dossier

### Role
Commander

### Notes
extra prose

## Appearances
`;
  const { dossier, warnings } = parseCharacterDossierSection(md);
  assert.ok(dossier);
  assert.equal(dossier!.role, "Commander");
  assert.deepEqual(dossier!.presentFields, ["role"]);
  assert.deepEqual(warnings, ["unknown sub-heading: notes"]);
});

test("multi-paragraph profile preserved", () => {
  const md = `
## Dossier

### Profile
First paragraph here.

Second paragraph here.

## Appearances
`;
  const { dossier } = parseCharacterDossierSection(md);
  assert.ok(dossier);
  assert.ok(dossier!.profile?.includes("First paragraph here."));
  assert.ok(dossier!.profile?.includes("Second paragraph here."));
});

test("label case-insensitive", () => {
  const md = `
## Dossier

### CHARACTER ARC
All caps arc.

## Appearances
`;
  const { dossier } = parseCharacterDossierSection(md);
  assert.ok(dossier);
  assert.equal(dossier!.arc, "All caps arc.");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- --test-name-pattern='character dossier|parses all three|missing sub-headings|no ## Dossier|unknown sub-heading|multi-paragraph|label case'`

Expected: FAIL with "Cannot find module '@/lib/wiki/entity-dossier'".

- [ ] **Step 3: Write minimal parser implementation**

Create `src/lib/wiki/entity-dossier.ts`:

```typescript
/**
 * Phase 5 — parses the `## Dossier` section of a wiki entity file into
 * typed sub-fields. Character kind only for now; artifact/location kinds
 * will add sibling parsers with their own label maps.
 */

import { extractSectionBlock } from "@/lib/wiki/markdown-sections";

export type CharacterDossierField = "role" | "profile" | "arc";

export interface CharacterDossier {
  kind: "character";
  role?: string;
  profile?: string;
  arc?: string;
  /** Sub-fields actually present in source, in file order. */
  presentFields: CharacterDossierField[];
}

export interface EntityDossierParseResult {
  dossier?: CharacterDossier;
  warnings: string[];
}

const WIKI_DOSSIER_HEADING = "Dossier";

const CHARACTER_LABEL_TO_FIELD: Record<string, CharacterDossierField> = {
  role: "role",
  profile: "profile",
  "character arc": "arc",
  arc: "arc",
};

interface SubSection {
  labelRaw: string;
  body: string;
}

function splitSubSections(block: string): SubSection[] {
  if (!block.trim()) return [];
  const lines = block.split("\n");
  const sections: SubSection[] = [];
  let current: SubSection | null = null;

  for (const line of lines) {
    const m = line.match(/^### +(.+?)\s*$/);
    if (m) {
      if (current) sections.push(current);
      current = { labelRaw: m[1], body: "" };
      continue;
    }
    if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  return sections.map((s) => ({ labelRaw: s.labelRaw, body: s.body.trim() }));
}

export function parseCharacterDossierSection(
  content: string
): EntityDossierParseResult {
  const block = extractSectionBlock(content, WIKI_DOSSIER_HEADING);
  if (!block.trim()) return { dossier: undefined, warnings: [] };

  const subs = splitSubSections(block);
  if (subs.length === 0) return { dossier: undefined, warnings: [] };

  const warnings: string[] = [];
  const dossier: CharacterDossier = {
    kind: "character",
    presentFields: [],
  };

  for (const sub of subs) {
    const key = sub.labelRaw.trim().toLowerCase();
    const field = CHARACTER_LABEL_TO_FIELD[key];
    if (!field) {
      warnings.push(`unknown sub-heading: ${key}`);
      continue;
    }
    if (!sub.body) continue;
    dossier[field] = sub.body;
    if (!dossier.presentFields.includes(field)) {
      dossier.presentFields.push(field);
    }
  }

  if (dossier.presentFields.length === 0 && warnings.length === 0) {
    return { dossier: undefined, warnings };
  }
  if (dossier.presentFields.length === 0) {
    return { dossier: undefined, warnings };
  }

  return { dossier, warnings };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`

Expected: all six new tests pass; no other tests regress.

- [ ] **Step 5: Commit**

```bash
git add src/lib/wiki/entity-dossier.ts src/lib/wiki/entity-dossier.test.ts
git commit -m "feat(wiki): add CharacterDossier parser for ## Dossier sections"
```

---

## Task 2: Thread dossier through the entity loader

**Files:**
- Modify: `src/lib/wiki/entity-loader.ts:106-147`
- Modify: `src/lib/wiki/parser.ts:749-764` (type), `749-800` (WikiFictionNounEntity), `157-171` (parseWikiNounMarkdown)

- [ ] **Step 1: Add a failing integration test**

Create `src/lib/wiki/entity-dossier-loader.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { parseWikiNounMarkdown } from "@/lib/wiki/entity-loader";
import { FICTION_CHARACTERS_NOUN } from "@/config/wiki-entities";

const FIXTURE = `# Test Person
**Slug:** test-person
Inventory entry (tiers: C)
reviewed: false

## Dossier

### Role
Commander

### Profile
Test profile prose.

### Character Arc
Test arc prose.

## Appearances
- stub

## Lore metadata

**Content type:** character
**Source type:** foundational_dossier
**Canon status:** adjacent
**Visibility policy:** always_visible
**Source document:** Celestial Heritage — Character Dossier

## Note
n/a
`;

test("parseWikiNounMarkdown surfaces dossier on WikiPerson", () => {
  const person = parseWikiNounMarkdown(
    FIXTURE,
    FICTION_CHARACTERS_NOUN,
    "test-person.md"
  );
  assert.ok(person);
  assert.ok(person!.dossier);
  assert.equal(person!.dossier!.role, "Commander");
  assert.equal(person!.dossier!.profile, "Test profile prose.");
  assert.equal(person!.dossier!.arc, "Test arc prose.");
  assert.deepEqual(person!.dossier!.presentFields, ["role", "profile", "arc"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`

Expected: FAIL because `dossier` is not in the returned object and not in the type.

- [ ] **Step 3: Add `dossier?: CharacterDossier` to WikiPerson and WikiFictionNounEntity**

In `src/lib/wiki/parser.ts` at the top of the `// --- People ---` region, add the import near the other wiki-entity imports. Find the line:

```typescript
import type { WikiEntityKind, WikiEntityLoreMetadata } from "@/lib/wiki/lore-provenance";
```

...and just below it add:

```typescript
import type { CharacterDossier } from "@/lib/wiki/entity-dossier";
```

(If the existing import uses `./lore-provenance` style, match that style.)

Modify the `WikiPerson` interface at `src/lib/wiki/parser.ts:749-764`. After the existing `lore?: WikiEntityLoreMetadata;` line, add:

```typescript
  /** Optional Phase 5 foundational dossier block (Role/Profile/Arc). */
  dossier?: CharacterDossier;
```

Modify `WikiFictionNounEntity` at `src/lib/wiki/parser.ts:772-787`. After the existing `lore?: WikiEntityLoreMetadata;` line, add the same field:

```typescript
  dossier?: CharacterDossier;
```

- [ ] **Step 4: Extend `parseNounCommon` to parse and return the dossier**

In `src/lib/wiki/entity-loader.ts`, add the import near line 22 where `lore-provenance` is imported:

```typescript
import { parseCharacterDossierSection } from "./entity-dossier";
import type { CharacterDossier } from "./entity-dossier";
```

Modify `parseNounCommon` (lines 106-147) to compute and include the dossier. After the existing `const lore = parseWikiEntityLoreSection(...)` block at line 128, add:

```typescript
  const kind = nounConfigToWikiKind(config);
  const dossier: CharacterDossier | undefined =
    kind === "character"
      ? parseCharacterDossierSection(content).dossier
      : undefined;
```

In the returned object (lines 133-146), add `dossier,` after the `lore,` line:

```typescript
    lore,
    dossier,
  };
```

Also update the function's return type annotation if you touch it — the return is `Omit<WikiFictionNounEntity, "kind" | "entityType">`, and because we added `dossier?` to `WikiFictionNounEntity` in Step 3, the type carries through automatically. No separate type edit needed here.

- [ ] **Step 5: Pass `base.dossier` through `parseWikiNounMarkdown`**

In `src/lib/wiki/entity-loader.ts:149-172`, inside the returned object, add after `lore: base.lore,` (line 170):

```typescript
    lore: base.lore,
    dossier: base.dossier,
  };
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test`

Expected: new loader test passes; all existing tests still pass.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/wiki/entity-loader.ts src/lib/wiki/parser.ts src/lib/wiki/entity-dossier-loader.test.ts
git commit -m "feat(wiki): thread CharacterDossier through entity-loader onto WikiPerson"
```

---

## Task 3: `<EntityDossier>` component + page integration

**Files:**
- Create: `src/components/entities/EntityDossier.tsx`
- Modify: `src/app/characters/[slug]/page.tsx:11` (import), `:75` (render)

- [ ] **Step 1: Create the component**

Create `src/components/entities/EntityDossier.tsx`:

```tsx
import { StoryMarkdown } from "@/components/story/StoryMarkdown";
import type { CharacterDossier } from "@/lib/wiki/entity-dossier";

export function EntityDossier({ dossier }: { dossier: CharacterDossier }) {
  return (
    <section
      aria-labelledby="entity-dossier-heading"
      className="mb-6 rounded-xl border border-clay-border bg-warm-white px-4 py-3"
    >
      <h2
        id="entity-dossier-heading"
        className="type-meta mb-3 text-ink"
      >
        Dossier
      </h2>

      <div className="space-y-4">
        {dossier.role && (
          <div>
            <h3 className="type-meta mb-1 text-ink-ghost">Role</h3>
            <p className="text-ink">{dossier.role}</p>
          </div>
        )}

        {dossier.profile && (
          <div>
            <h3 className="type-meta mb-1 text-ink-ghost">Profile</h3>
            <div className="prose prose-story max-w-none">
              <StoryMarkdown content={dossier.profile} />
            </div>
          </div>
        )}

        {dossier.arc && (
          <div>
            <h3 className="type-meta mb-1 text-ink-ghost">Character Arc</h3>
            <div className="prose prose-story max-w-none">
              <StoryMarkdown content={dossier.arc} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Import and render on the character page**

In `src/app/characters/[slug]/page.tsx`, find the existing import of `EntityLoreCard` (line 11):

```typescript
import { EntityLoreCard } from "@/components/entities/EntityLoreCard";
```

Add immediately after it:

```typescript
import { EntityDossier } from "@/components/entities/EntityDossier";
```

Find the existing lore-card render (line 75):

```tsx
      {person.lore && <EntityLoreCard lore={person.lore} />}
```

Replace the single line with these two lines:

```tsx
      {person.lore && <EntityLoreCard lore={person.lore} />}
      {person.dossier && <EntityDossier dossier={person.dossier} />}
```

- [ ] **Step 3: Verify build and lint**

Run: `npm run lint`
Expected: pass.

Run: `npx tsc --noEmit`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/entities/EntityDossier.tsx src/app/characters/[slug]/page.tsx
git commit -m "feat(characters): render EntityDossier panel on character detail page"
```

---

## Task 4: Extend ingest:lore to include dossier in inventory

**Files:**
- Modify: `scripts/ingest-foundational-lore.ts`

- [ ] **Step 1: Add dossier import and type**

In `scripts/ingest-foundational-lore.ts`, below the existing `parseWikiEntityLoreSection` import, add:

```typescript
import { parseCharacterDossierSection } from "@/lib/wiki/entity-dossier";
import type { CharacterDossier } from "@/lib/wiki/entity-dossier";
```

- [ ] **Step 2: Populate dossier per entity row**

Extend the `rows` declaration type to include `dossier`. Replace the existing declaration:

```typescript
  const rows: Array<{
    slug: string;
    wikiPath: string;
    wikiEntityKind: WikiEntityKind;
    lore: ReturnType<typeof parseWikiEntityLoreSection>;
  }> = [];
```

With:

```typescript
  const rows: Array<{
    slug: string;
    wikiPath: string;
    wikiEntityKind: WikiEntityKind;
    lore: ReturnType<typeof parseWikiEntityLoreSection>;
    dossier?: CharacterDossier;
  }> = [];
```

In the scan loop, after the existing `const lore = parseWikiEntityLoreSection(...)` line, add:

```typescript
      const dossier =
        kind === "character"
          ? parseCharacterDossierSection(content).dossier
          : undefined;
```

Update the `rows.push(...)` call to include `dossier`:

```typescript
      rows.push({ slug, wikiPath, wikiEntityKind: kind, lore, dossier });
```

- [ ] **Step 3: Add `withDossierParsed` counter to the emitted JSON**

After the existing `const withLore = ...` line, add:

```typescript
  const withDossier = rows.filter(
    (r) => r.wikiEntityKind === "character" && r.dossier !== undefined
  ).length;
```

In the `JSON.stringify(...)` call, add `withDossierParsed` to the payload:

```typescript
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        extractorVersion: "ingest-foundational-lore/1",
        entityCount: rows.length,
        withLoreSectionParsed: withLore,
        withDossierParsed: withDossier,
        entities: rows,
      },
      null,
      2
    )
  );
```

Update the trailing log line to surface the new counter:

```typescript
  console.log(`✅ Lore inventory → ${OUT}`);
  console.log(
    `   ${rows.length} wiki files, ${withLore} with lore, ${withDossier} with dossier`
  );
```

- [ ] **Step 4: Run the script, verify output changes safely**

Run: `npm run ingest:lore`

Expected: completes cleanly. `content/raw/lore_inventory.json` now includes `withDossierParsed: 0` (no wiki files have `## Dossier` yet — we merge them in Task 5), and `entities[*].dossier` is undefined for all rows.

- [ ] **Step 5: Typecheck + tests**

Run: `npx tsc --noEmit && npm run test`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/ingest-foundational-lore.ts content/raw/lore_inventory.json
git commit -m "feat(ingest): include CharacterDossier + withDossierParsed counter in lore inventory"
```

---

## Task 5: Merge script — source parser (TDD)

**Files:**
- Create: `scripts/merge-character-dossier.ts` (first pure-function slice only)
- Create: `scripts/merge-character-dossier.test.ts`

This task implements only the **pure source-dossier parser** (no filesystem). Task 6 adds filesystem I/O and orchestration.

- [ ] **Step 1: Write failing tests for source parsing**

Create `scripts/merge-character-dossier.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { parseDossierSource, normalizeName } from "./merge-character-dossier";

const SOURCE = `Celestial Heritage: Character Dossier (Updated)

# **Galen Voss**

Role: Mission Commander

Profile: Former USAF pilot, rejuvenated from 82 to 50 via advanced gene therapy.

Character Arc: From explorer to protector of humanity's moral heritage.

# **Jaxon 'Jax' Reyes**

Role: Systems Hacker / Engineer

Profile: Brilliant, rogue technologist.

Character Arc: From loner to crew loyalist.

# **ALARA**

Role: AI Partner (Valkyrie-1)

Profile: Adaptive Logic And Responsive Assistant.

Character Arc: Evolves from a system of logic to a guardian of continuity.
`;

test("parseDossierSource extracts each entity block with three labeled fields", () => {
  const entries = parseDossierSource(SOURCE);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].displayName, "Galen Voss");
  assert.equal(entries[0].role, "Mission Commander");
  assert.ok(entries[0].profile?.startsWith("Former USAF pilot"));
  assert.ok(entries[0].arc?.startsWith("From explorer"));

  assert.equal(entries[1].displayName, "Jaxon 'Jax' Reyes");
  assert.equal(entries[1].role, "Systems Hacker / Engineer");

  assert.equal(entries[2].displayName, "ALARA");
});

test("parseDossierSource skips the leading title line", () => {
  const entries = parseDossierSource(SOURCE);
  assert.equal(
    entries.find((e) => e.displayName.includes("Celestial Heritage")),
    undefined
  );
});

test("normalizeName strips honorifics and quoted nicknames", () => {
  assert.equal(normalizeName("Dr. Lena Osei"), "lena osei");
  assert.equal(normalizeName("Major Marco Ruiz"), "marco ruiz");
  assert.equal(normalizeName("Jaxon 'Jax' Reyes"), "jaxon reyes");
  assert.equal(normalizeName("Galen Voss"), "galen voss");
  assert.equal(normalizeName("ALARA"), "alara");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test scripts/merge-character-dossier.test.ts`

Expected: FAIL with "Cannot find module './merge-character-dossier'".

- [ ] **Step 3: Create the script with only the pure parser exports**

Create `scripts/merge-character-dossier.ts`:

```typescript
/**
 * One-time idempotent merge of celestial_original/Celestial Heritage_ Character Dossier.md
 * into per-character wiki files. Inserts `## Dossier` before `## Appearances` (or
 * `## Lore metadata` / `## Note` as fallback anchors). Creates stub wiki files for
 * dossier entries that have no matching slug.
 *
 *   npx tsx scripts/merge-character-dossier.ts
 */

export interface DossierSourceEntry {
  displayName: string;
  role?: string;
  profile?: string;
  arc?: string;
}

const LABELS: ReadonlyArray<{ key: "role" | "profile" | "arc"; re: RegExp }> = [
  { key: "role", re: /^role\s*:\s*(.*)$/i },
  { key: "profile", re: /^profile\s*:\s*(.*)$/i },
  { key: "arc", re: /^character arc\s*:\s*(.*)$/i },
];

export function parseDossierSource(source: string): DossierSourceEntry[] {
  const lines = source.split("\n");
  const entries: DossierSourceEntry[] = [];
  let current: DossierSourceEntry | null = null;
  let currentField: "role" | "profile" | "arc" | null = null;

  const flushField = () => {
    if (!current || !currentField) return;
    const v = current[currentField];
    if (typeof v === "string") {
      current[currentField] = v.trim();
    }
    currentField = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");

    const headingMatch = line.match(/^#\s+\*\*(.+?)\*\*\s*$/);
    if (headingMatch) {
      flushField();
      if (current) entries.push(current);
      current = { displayName: headingMatch[1].trim() };
      continue;
    }

    if (!current) continue;

    let matchedLabel = false;
    for (const { key, re } of LABELS) {
      const m = line.match(re);
      if (m) {
        flushField();
        current[key] = m[1];
        currentField = key;
        matchedLabel = true;
        break;
      }
    }
    if (matchedLabel) continue;

    if (currentField) {
      const prev = current[currentField] ?? "";
      current[currentField] = prev + (prev ? "\n" : "") + line;
    }
  }

  flushField();
  if (current) entries.push(current);

  return entries;
}

const HONORIFICS = new Set(["dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "major", "captain", "colonel", "lt", "lt.", "lieutenant", "sgt", "sgt.", "professor", "prof", "prof."]);

export function normalizeName(display: string): string {
  // Drop quoted nicknames like 'Jax'
  let s = display.replace(/'[^']+'|"[^"]+"/g, " ");
  // Tokenize, drop honorifics, lowercase
  const tokens = s
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const kept = tokens.filter((t) => !HONORIFICS.has(t.toLowerCase()));
  return kept.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test scripts/merge-character-dossier.test.ts`

Expected: all three tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/merge-character-dossier.ts scripts/merge-character-dossier.test.ts
git commit -m "feat(scripts): pure source-parser + name-normalizer for dossier merge"
```

---

## Task 6: Merge script — filesystem orchestration (TDD)

**Files:**
- Modify: `scripts/merge-character-dossier.ts` (add filesystem + main)
- Modify: `scripts/merge-character-dossier.test.ts` (add fs tests)
- Modify: `package.json` (add script)

- [ ] **Step 1: Write failing filesystem tests**

Append to `scripts/merge-character-dossier.test.ts`:

```typescript
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { mergeIntoWikiDir } from "./merge-character-dossier";

function mkTmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "dossier-merge-"));
}

const MINIMAL_WIKI_FILE = `# Galen Voss
**Slug:** galen-voss
Inventory entry (tiers: A)
reviewed: false

## Appearances
- stub

## Lore metadata

**Content type:** character
**Source type:** foundational_dossier
**Canon status:** adjacent
**Visibility policy:** always_visible
**Source document:** Celestial Heritage — Character Dossier

## Note
n/a
`;

const SOURCE_FIXTURE = `# **Galen Voss**

Role: Mission Commander

Profile: Former USAF pilot.

Character Arc: From explorer to protector.

# **ALARA**

Role: AI Partner

Profile: Adaptive Logic And Responsive Assistant.

Character Arc: Evolves from logic to continuity.
`;

test("merges dossier into existing wiki file before ## Appearances", () => {
  const tmp = mkTmp();
  const wikiDir = path.join(tmp, "characters");
  fs.mkdirSync(wikiDir, { recursive: true });
  fs.writeFileSync(path.join(wikiDir, "galen-voss.md"), MINIMAL_WIKI_FILE);

  const summary = mergeIntoWikiDir(SOURCE_FIXTURE, wikiDir);
  const updated = fs.readFileSync(path.join(wikiDir, "galen-voss.md"), "utf-8");

  assert.match(updated, /## Dossier\n\n### Role\nMission Commander/);
  assert.ok(updated.indexOf("## Dossier") < updated.indexOf("## Appearances"));
  assert.equal(summary.merged, 1);
  assert.equal(summary.created, 1);
  assert.equal(summary.skipped, 0);
  assert.equal(summary.errors.length, 0);
});

test("idempotent: second run is a no-op on already-merged file", () => {
  const tmp = mkTmp();
  const wikiDir = path.join(tmp, "characters");
  fs.mkdirSync(wikiDir, { recursive: true });
  fs.writeFileSync(path.join(wikiDir, "galen-voss.md"), MINIMAL_WIKI_FILE);

  mergeIntoWikiDir(SOURCE_FIXTURE, wikiDir);
  const firstPass = fs.readFileSync(path.join(wikiDir, "galen-voss.md"), "utf-8");

  const summary2 = mergeIntoWikiDir(SOURCE_FIXTURE, wikiDir);
  const secondPass = fs.readFileSync(path.join(wikiDir, "galen-voss.md"), "utf-8");

  assert.equal(firstPass, secondPass);
  assert.equal(summary2.merged, 0);
  assert.equal(summary2.skipped, 1);
});

test("creates stub wiki file for unmatched dossier entity (ALARA)", () => {
  const tmp = mkTmp();
  const wikiDir = path.join(tmp, "characters");
  fs.mkdirSync(wikiDir, { recursive: true });
  fs.writeFileSync(path.join(wikiDir, "galen-voss.md"), MINIMAL_WIKI_FILE);

  mergeIntoWikiDir(SOURCE_FIXTURE, wikiDir);
  const stubPath = path.join(wikiDir, "alara.md");
  assert.ok(fs.existsSync(stubPath));
  const stub = fs.readFileSync(stubPath, "utf-8");
  assert.match(stub, /^# ALARA/m);
  assert.match(stub, /\*\*Slug:\*\* alara/);
  assert.match(stub, /## Dossier\n\n### Role\nAI Partner/);
  assert.match(stub, /## Lore metadata/);
});

test("fallback anchor: inserts before ## Lore metadata when ## Appearances is missing", () => {
  const tmp = mkTmp();
  const wikiDir = path.join(tmp, "characters");
  fs.mkdirSync(wikiDir, { recursive: true });
  const noAppearances = MINIMAL_WIKI_FILE.replace(
    /## Appearances\n- stub\n\n/,
    ""
  );
  fs.writeFileSync(path.join(wikiDir, "galen-voss.md"), noAppearances);

  mergeIntoWikiDir(SOURCE_FIXTURE, wikiDir);
  const updated = fs.readFileSync(path.join(wikiDir, "galen-voss.md"), "utf-8");
  assert.ok(updated.indexOf("## Dossier") < updated.indexOf("## Lore metadata"));
});

test("errors when no valid anchor exists in target file", () => {
  const tmp = mkTmp();
  const wikiDir = path.join(tmp, "characters");
  fs.mkdirSync(wikiDir, { recursive: true });
  // File with none of: ## Appearances, ## Lore metadata, ## Note
  fs.writeFileSync(
    path.join(wikiDir, "galen-voss.md"),
    "# Galen Voss\n**Slug:** galen-voss\n"
  );

  const summary = mergeIntoWikiDir(SOURCE_FIXTURE, wikiDir);
  assert.ok(summary.errors.some((e) => e.includes("no anchor")));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test scripts/merge-character-dossier.test.ts`

Expected: FAIL — `mergeIntoWikiDir` is not exported.

- [ ] **Step 3: Implement filesystem orchestration**

Append to `scripts/merge-character-dossier.ts`:

```typescript
import * as fs from "fs";
import * as path from "path";

export interface MergeSummary {
  merged: number;
  skipped: number;
  created: number;
  errors: string[];
}

const ANCHOR_ORDER = ["## Appearances", "## Lore metadata", "## Note"];

function slugFromDisplayName(display: string): string {
  const normalized = normalizeName(display);
  return normalized.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function readAliases(content: string): string[] {
  const m = content.match(/\*\*Aliases:\*\*\s*(.+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function readNameHeading(content: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

function buildResolver(wikiDir: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(wikiDir)) return map;
  for (const f of fs.readdirSync(wikiDir).filter((x) => x.endsWith(".md"))) {
    const slug = f.replace(/\.md$/, "");
    const content = fs.readFileSync(path.join(wikiDir, f), "utf-8");
    map.set(slug, slug);
    const heading = readNameHeading(content);
    if (heading) map.set(normalizeName(heading), slug);
    for (const a of readAliases(content)) {
      map.set(a.toLowerCase(), slug);
    }
  }
  return map;
}

function buildDossierBlock(entry: DossierSourceEntry): string {
  const parts: string[] = ["## Dossier", ""];
  if (entry.role) {
    parts.push("### Role", entry.role, "");
  }
  if (entry.profile) {
    parts.push("### Profile", entry.profile, "");
  }
  if (entry.arc) {
    parts.push("### Character Arc", entry.arc, "");
  }
  return parts.join("\n").trimEnd() + "\n";
}

function insertDossier(
  content: string,
  block: string
): { content: string; ok: boolean } {
  for (const anchor of ANCHOR_ORDER) {
    const idx = content.indexOf(anchor);
    if (idx === -1) continue;
    const before = content.slice(0, idx).trimEnd();
    const after = content.slice(idx);
    const merged = `${before}\n\n${block}\n${after}`;
    return { content: merged, ok: true };
  }
  return { content, ok: false };
}

function stubForNewEntity(entry: DossierSourceEntry, slug: string): string {
  return [
    `# ${entry.displayName}`,
    `**Slug:** ${slug}`,
    `Inventory entry (tiers: —)`,
    `reviewed: false`,
    ``,
    buildDossierBlock(entry),
    `## Appearances`,
    `_(auto-generated; review and expand.)_`,
    ``,
    `## Additional appearances`,
    `_(auto-generated; review and expand.)_`,
    ``,
    `## Lore metadata`,
    ``,
    `**Content type:** character`,
    `**Source type:** foundational_dossier`,
    `**Canon status:** adjacent`,
    `**Visibility policy:** always_visible`,
    `**Source document:** Celestial Heritage — Character Dossier`,
    `**Source path:** celestial_original/Celestial Heritage_ Character Dossier.docx`,
    `**Extractor version:** merge-character-dossier/1`,
    ``,
    `## Note`,
    `Auto-generated by scripts/merge-character-dossier.ts. Remove the generated marker to take manual ownership.`,
    ``,
  ].join("\n");
}

export function mergeIntoWikiDir(
  source: string,
  wikiDir: string
): MergeSummary {
  const summary: MergeSummary = { merged: 0, skipped: 0, created: 0, errors: [] };
  const entries = parseDossierSource(source);
  const resolver = buildResolver(wikiDir);

  for (const entry of entries) {
    const normalized = normalizeName(entry.displayName);
    const matchedSlug = resolver.get(normalized);
    const block = buildDossierBlock(entry);

    if (matchedSlug) {
      const filePath = path.join(wikiDir, `${matchedSlug}.md`);
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes("## Dossier")) {
        summary.skipped++;
        console.log(`⏭  ${matchedSlug} (dossier already present)`);
        continue;
      }
      const { content: next, ok } = insertDossier(content, block);
      if (!ok) {
        summary.errors.push(
          `${matchedSlug}: no anchor (## Appearances / ## Lore metadata / ## Note) found`
        );
        continue;
      }
      fs.writeFileSync(filePath, next);
      summary.merged++;
      console.log(`✓ ${matchedSlug}`);
      continue;
    }

    const slug = slugFromDisplayName(entry.displayName);
    if (!slug) {
      summary.errors.push(
        `could not derive slug for display name "${entry.displayName}"`
      );
      continue;
    }
    const filePath = path.join(wikiDir, `${slug}.md`);
    if (fs.existsSync(filePath)) {
      summary.errors.push(
        `slug collision creating stub for "${entry.displayName}" at ${slug}.md (existing file did not match by alias or heading); add an alias to the existing file or rename`
      );
      continue;
    }
    fs.writeFileSync(filePath, stubForNewEntity(entry, slug));
    summary.created++;
    console.log(`🆕 created ${path.relative(process.cwd(), filePath)}`);
  }

  return summary;
}

function main() {
  const SOURCE = path.join(
    process.cwd(),
    "celestial_original/Celestial Heritage_ Character Dossier.md"
  );
  const WIKI_DIR = path.join(process.cwd(), "content/wiki/characters");

  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing source file: ${SOURCE}`);
    process.exit(1);
  }
  const source = fs.readFileSync(SOURCE, "utf-8");
  const summary = mergeIntoWikiDir(source, WIKI_DIR);

  console.log("");
  console.log("Character dossier merge");
  console.log(`  ✓ merged into existing: ${summary.merged}`);
  console.log(`  ⏭  skipped (dossier present): ${summary.skipped}`);
  console.log(`  🆕 created new wiki file:  ${summary.created}`);
  console.log(`  ⚠  errors:                ${summary.errors.length}`);

  if (summary.errors.length > 0) {
    for (const e of summary.errors) console.error(`  ERROR: ${e}`);
    process.exit(1);
  }
}

// Only execute when invoked directly (not when imported by tests).
const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("merge-character-dossier.ts");
if (invokedDirectly && process.env.NODE_TEST_CONTEXT === undefined) {
  main();
}
```

**Note on direct-invocation detection:** The node test runner sets `NODE_TEST_CONTEXT`. The two-condition guard avoids running `main()` during tests while still executing when invoked via `npx tsx scripts/merge-character-dossier.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test scripts/merge-character-dossier.test.ts`

Expected: all tests pass.

- [ ] **Step 5: Add the `npm run merge:character-dossier` script**

In `package.json`, add to the `scripts` block (after `seed:lore-metadata`):

```json
    "merge:character-dossier": "node --import tsx scripts/merge-character-dossier.ts"
```

- [ ] **Step 6: Commit**

```bash
git add scripts/merge-character-dossier.ts scripts/merge-character-dossier.test.ts package.json
git commit -m "feat(scripts): add idempotent merge-character-dossier script"
```

---

## Task 7: Run the merge for real, then refresh the ingest

**Files:**
- Modify: `content/wiki/characters/*.md` (via script)
- Create: `content/wiki/characters/alara.md` (via script, if ALARA is present in the source)
- Modify: `content/raw/lore_inventory.json` (via script)

- [ ] **Step 1: Run the merge script**

Run: `npm run merge:character-dossier`

Expected output (counts may vary):

```
✓ galen-voss
✓ aven-voss
✓ thane-meric
✓ lena-osei
✓ marco-ruiz
✓ evelyn-tran
✓ jax-reyes
✓ jonah-revas
🆕 created content/wiki/characters/alara.md

Character dossier merge
  ✓ merged into existing: 8
  ⏭  skipped (dossier present): 0
  🆕 created new wiki file:  1
  ⚠  errors:                0
```

If there are errors, fix them (most likely: a display name that needs an explicit alias added to the wiki file's `## Lore metadata` **Aliases** field) and rerun. The script is idempotent; already-merged files will show `⏭`.

- [ ] **Step 2: Spot-check two merged files**

Run: `sed -n '1,40p' content/wiki/characters/aven-voss.md`
Expected: a `## Dossier` section with three `### Role / ### Profile / ### Character Arc` sub-sections sits between the ai-draft block and `## Appearances`.

Run: `cat content/wiki/characters/alara.md`
Expected: the stub file contains the full scaffold (name heading, slug, dossier, appearances, lore metadata, note).

- [ ] **Step 3: Refresh the inventory**

Run: `npm run ingest:lore`

Expected: summary reports `withDossierParsed: 9` (or however many entities now have dossier sections). `content/raw/lore_inventory.json` now contains populated `dossier` objects on the corresponding entities.

- [ ] **Step 4: Run full test + build chain**

Run: `npm run test && npm run lint && npx tsc --noEmit`
Expected: all pass.

Run: `npm run build`
Expected: prebuild chain (`ingest:book → ingest:lore → generate-static-data`) and Next.js build both succeed.

- [ ] **Step 5: Manual smoke**

Start dev server (if not already running): `npm run dev`
Visit `/characters/aven-voss`. Expected: `<EntityLoreCard>` at top, `<EntityDossier>` immediately below with three sub-sections (Role / Profile / Character Arc) rendered as labeled blocks.
Visit `/characters/amar-cael` (or any entity with no dossier section). Expected: no dossier panel; page is otherwise unchanged.

- [ ] **Step 6: Commit the merged wiki content and refreshed inventory**

```bash
git add content/wiki/characters/ content/raw/lore_inventory.json
git commit -m "content: merge Character Dossier prose into wiki entities"
```

---

## Self-review

Spec coverage check:

- Architecture diagram (spec §Architecture) — Tasks 1–4 + 5–6 implement each stage; Task 7 executes end-to-end.
- Data model + parser contract (spec §Data model) — Task 1 (parser + types), Task 2 (integration onto `WikiPerson`).
- Merge script behavior (spec §Merge script) — Tasks 5–6 implement source parsing, resolver, anchor fallback, stub creation, slug-collision guard, summary counts; Task 7 runs it.
- UI component (spec §UI) — Task 3 creates `<EntityDossier>` and integrates on character page.
- Forward-compatibility for progressive reveal (spec §Forward-compatibility) — `CharacterDossier` type ships with `presentFields` and the shape is extensible; no additional work required for v1.
- Testing plan (spec §Testing) — parser unit tests (Task 1), loader integration (Task 2), merge script tests (Tasks 5–6), real-world regression covered implicitly by `npm run test && npm run build` in Task 7.
- End-to-end workflow (spec §End-to-end workflow) — Task 7 executes the full chain.

Placeholder scan: no "TBD", "TODO", "implement later", "handle edge cases" — every step has either code or an exact command. Test code is shown in full, not referenced. New entity stub format is written out once in `stubForNewEntity` and referenced (not repeated) in the test that asserts its output shape.

Type consistency check: `CharacterDossier` defined in Task 1 is imported in Task 2 (`entity-loader.ts`, `parser.ts`), Task 3 (`EntityDossier.tsx`), and Task 4 (`ingest-foundational-lore.ts`). `parseCharacterDossierSection` signature is consistent across callers. `DossierSourceEntry`, `MergeSummary`, `mergeIntoWikiDir`, `parseDossierSource`, `normalizeName` are all defined in Task 5/6 and used identically in tests.
