import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllCharacterArcs,
  getCharacterArcBySlug,
  parseCharacterArcMarkdown,
} from "@/lib/wiki/character-arcs";

test("parseCharacterArcMarkdown extracts metadata and key sections", () => {
  const arc = parseCharacterArcMarkdown(
    `# Demo Character Arc Ledger
**Slug:** demo-character
**Character:** Demo Character
**Scope:** Book I, CH01-CH17
**Canon rank:** derived_inference
**Review status:** pilot-reviewed

## Starting State

Demo begins in command.

## Unresolved Tensions

- What comes next?

## Future Questions

- Can Demo change?

## ASK Guidance

- **Best for:** demo questions.
`,
    "demo-character.md",
  );

  assert.ok(arc);
  assert.equal(arc.slug, "demo-character");
  assert.equal(arc.character, "Demo Character");
  assert.equal(arc.title, "Demo Character Arc Ledger");
  assert.equal(arc.scope, "Book I, CH01-CH17");
  assert.equal(arc.canonRank, "derived_inference");
  assert.equal(arc.reviewStatus, "pilot-reviewed");
  assert.equal(arc.startingState, "Demo begins in command.");
  assert.equal(arc.unresolvedTensions, "- What comes next?");
  assert.equal(arc.futureQuestions, "- Can Demo change?");
  assert.equal(arc.askGuidance, "- **Best for:** demo questions.");
});

test("getAllCharacterArcs lists authored ledgers and skips the template", () => {
  const arcs = getAllCharacterArcs();

  assert.ok(arcs.length >= 2);
  assert.deepEqual(
    arcs.map((arc) => arc.slug).filter((slug) => slug.startsWith("_")),
    [],
  );
  assert.ok(arcs.some((arc) => arc.slug === "alara"));
  assert.ok(arcs.some((arc) => arc.slug === "galen-voss"));
});

test("getCharacterArcBySlug resolves a single ledger", () => {
  const arc = getCharacterArcBySlug("alara");

  assert.ok(arc);
  assert.equal(arc.character, "ALARA");
});

test("getCharacterArcBySlug does not expose the template", () => {
  assert.equal(getCharacterArcBySlug("_template"), null);
});
