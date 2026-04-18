import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPrincipleAskPrompt,
  getAllCanonicalPrinciples,
  getAllPrinciples,
  getAllThemes,
  getCanonicalPrincipleBySlug,
  getPrincipleBySlug,
} from "@/lib/wiki/parser";

test("getAllPrinciples produces canonical principle objects from clustered data", () => {
  const principles = getAllPrinciples();
  assert.ok(principles.length > 0);
  assert.ok(principles.every((principle) => principle.slug.length > 0));
  assert.ok(principles.every((principle) => principle.storyCount > 0));
  assert.ok(
    principles.some(
      (principle) =>
        principle.relatedThemes.length > 0 && principle.variants.length > 0
    )
  );
});

test("getPrincipleBySlug resolves the same canonical principle", () => {
  const principle = getAllPrinciples()[0];
  assert.ok(principle);
  assert.deepEqual(getPrincipleBySlug(principle.slug), principle);
});

test("buildPrincipleAskPrompt embeds the principle label in a reusable Ask question", () => {
  const prompt = buildPrincipleAskPrompt("Build relationships before you need them.");
  assert.match(prompt, /Build relationships before you need them\./);
  assert.match(prompt, /Keith's stories/);
  assert.match(prompt, /broader themes/);
});

test("getAllCanonicalPrinciples rolls raw statements into twelve browse-level principles", () => {
  const principles = getAllCanonicalPrinciples();
  assert.equal(principles.length, 12);
  assert.ok(principles.every((principle) => principle.title.length > 0));
  assert.ok(principles.every((principle) => principle.supportingStatements.length > 0));
  assert.ok(principles.every((principle) => principle.stories.length > 0));
});

test("canonical principles collectively cover every current theme", () => {
  const themes = getAllThemes().map((theme) => theme.slug).sort();
  const covered = Array.from(
    new Set(
      getAllCanonicalPrinciples().flatMap((principle) =>
        principle.relatedThemes.map((theme) => theme.slug)
      )
    )
  ).sort();
  assert.deepEqual(covered, themes);
});

test("getCanonicalPrincipleBySlug resolves a canonical principle", () => {
  const principle = getAllCanonicalPrinciples()[0];
  assert.ok(principle);
  assert.deepEqual(getCanonicalPrincipleBySlug(principle.slug), principle);
});
