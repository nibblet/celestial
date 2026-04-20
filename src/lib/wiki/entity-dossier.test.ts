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

test("parses AI-enrichment sub-fields with marker meta", () => {
  const md = `
## Dossier

### Role
Commander

<!-- ai-dossier:relationships generated="2026-04-21" reviewed="false" model="claude-sonnet-4-5" source-hash="abc123" -->
### Key Relationships
- **Aven Voss** — wife (CH01).
<!-- ai-dossier:end -->

<!-- ai-dossier:voice generated="2026-04-21" reviewed="true" model="claude-sonnet-4-5" source-hash="def456" -->
### Voice & Manner
Measured and direct.
<!-- ai-dossier:end -->

## Appearances
`;
  const { dossier, warnings } = parseCharacterDossierSection(md);
  assert.ok(dossier);
  assert.equal(dossier!.role, "Commander");
  assert.equal(dossier!.relationships, "- **Aven Voss** — wife (CH01).");
  assert.equal(dossier!.voice, "Measured and direct.");
  assert.ok(dossier!.enrichment);
  assert.equal(dossier!.enrichment!.relationships!.reviewed, false);
  assert.equal(dossier!.enrichment!.relationships!.sourceHash, "abc123");
  assert.equal(dossier!.enrichment!.voice!.reviewed, true);
  assert.equal(dossier!.enrichment!.voice!.model, "claude-sonnet-4-5");
  assert.deepEqual(warnings, []);
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
