import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  parseDossierSource,
  normalizeName,
  mergeIntoWikiDir,
} from "./merge-character-dossier";

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
  const firstPass = fs.readFileSync(
    path.join(wikiDir, "galen-voss.md"),
    "utf-8"
  );

  const summary2 = mergeIntoWikiDir(SOURCE_FIXTURE, wikiDir);
  const secondPass = fs.readFileSync(
    path.join(wikiDir, "galen-voss.md"),
    "utf-8"
  );

  assert.equal(firstPass, secondPass);
  assert.equal(summary2.merged, 0);
  assert.equal(summary2.created, 0);
  assert.equal(summary2.skipped, 2);
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
  assert.ok(
    updated.indexOf("## Dossier") < updated.indexOf("## Lore metadata")
  );
});

test("errors when no valid anchor exists in target file", () => {
  const tmp = mkTmp();
  const wikiDir = path.join(tmp, "characters");
  fs.mkdirSync(wikiDir, { recursive: true });
  fs.writeFileSync(
    path.join(wikiDir, "galen-voss.md"),
    "# Galen Voss\n**Slug:** galen-voss\n"
  );

  const summary = mergeIntoWikiDir(SOURCE_FIXTURE, wikiDir);
  assert.ok(summary.errors.some((e) => e.includes("no anchor")));
});
