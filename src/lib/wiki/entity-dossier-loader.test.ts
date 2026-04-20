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
