import test from "node:test";
import assert from "node:assert/strict";
import { parseCanonDossier, prettifySlug } from "@/lib/wiki/canon-dossier";

const LOCATION_FIXTURE = `# Command Dome
**Slug:** command-dome

<!-- canon:dossier slug="command-dome" kind="locations" subkind="ship-section" parent="valkyrie-1" generated="2026-04-21" mentions="5" -->
## Canon Dossier

**Aliases:** The Command Dome, Central Core, command deck

**Parent:** [[valkyrie-1]]

The command deck of Valkyrie-1 is not a military bridge. It is a resonant core.

A second paragraph about the dome.

### Related
- [[valkyrie-1]]
- [[alara]]
- [[galen-voss]]

### Canon sources
- **Celestial Heritage Series Bible.md** › ALARA
- **Valkyrie-1 Technical Brief.md** › Command & Navigation

<!-- canon:end -->

## Appearances
_(auto-generated; review and expand.)_
`;

test("parseCanonDossier extracts attrs, aliases, parent, prose, related, sources", () => {
  const d = parseCanonDossier(LOCATION_FIXTURE);
  assert.ok(d, "expected a dossier");
  assert.equal(d!.slug, "command-dome");
  assert.equal(d!.kind, "locations");
  assert.equal(d!.subkind, "ship-section");
  assert.equal(d!.parentSlug, "valkyrie-1");
  assert.equal(d!.generated, "2026-04-21");
  assert.equal(d!.mentions, 5);
  assert.deepEqual(d!.aliases, [
    "The Command Dome",
    "Central Core",
    "command deck",
  ]);
  assert.match(d!.primaryProse, /resonant core/);
  assert.match(d!.primaryProse, /second paragraph/);
  assert.ok(
    !d!.primaryProse.includes("### Related"),
    "prose must not include subheadings",
  );
  assert.deepEqual(d!.related, ["valkyrie-1", "alara", "galen-voss"]);
  assert.deepEqual(d!.sources, [
    {
      sourceDoc: "Celestial Heritage Series Bible.md",
      sourceAnchor: "ALARA",
    },
    {
      sourceDoc: "Valkyrie-1 Technical Brief.md",
      sourceAnchor: "Command & Navigation",
    },
  ]);
});

test("parseCanonDossier returns null when no canon block is present", () => {
  assert.equal(parseCanonDossier("# Some file\njust some notes"), null);
  assert.equal(parseCanonDossier(""), null);
});

test("parseCanonDossier tolerates missing aliases, parent, related, and sources", () => {
  const minimal = `<!-- canon:dossier slug="coherence" kind="rules" subkind="principle" parent="" generated="2026-04-21" mentions="2" -->
## Canon Dossier

The Coherence is described as a presence, not a deity.

<!-- canon:end -->`;
  const d = parseCanonDossier(minimal);
  assert.ok(d);
  assert.equal(d!.slug, "coherence");
  assert.equal(d!.parentSlug, null);
  assert.deepEqual(d!.aliases, []);
  assert.deepEqual(d!.related, []);
  assert.deepEqual(d!.sources, []);
  assert.match(d!.primaryProse, /^The Coherence/);
});

test("parseCanonDossier treats empty subkind/parent as null", () => {
  const noParent = `<!-- canon:dossier slug="earth" kind="locations" subkind="" parent="" generated="2026-04-21" mentions="1" -->
## Canon Dossier

**Aliases:** Earth

Blue marble.

<!-- canon:end -->`;
  const d = parseCanonDossier(noParent);
  assert.ok(d);
  assert.equal(d!.subkind, null);
  assert.equal(d!.parentSlug, null);
});

test("parseCanonDossier deduplicates related slugs and lowercases them", () => {
  const src = `<!-- canon:dossier slug="x" kind="locations" subkind="" parent="" generated="2026-04-21" mentions="0" -->
## Canon Dossier

Body.

### Related
- [[Alara]]
- [[alara]]
- [[Galen-Voss]]

<!-- canon:end -->`;
  const d = parseCanonDossier(src);
  assert.ok(d);
  assert.deepEqual(d!.related, ["alara", "galen-voss"]);
});

test("parseCanonDossier handles malformed mentions by returning null count", () => {
  const src = `<!-- canon:dossier slug="x" kind="locations" subkind="" parent="" generated="2026-04-21" mentions="abc" -->
## Canon Dossier

Body.

<!-- canon:end -->`;
  const d = parseCanonDossier(src);
  assert.ok(d);
  assert.equal(d!.mentions, null);
});

test("prettifySlug capitalizes kebab-case tokens", () => {
  assert.equal(prettifySlug("vault-builders"), "Vault Builders");
  assert.equal(prettifySlug("command-dome"), "Command Dome");
  assert.equal(prettifySlug("alara"), "Alara");
  assert.equal(prettifySlug(""), "");
});
