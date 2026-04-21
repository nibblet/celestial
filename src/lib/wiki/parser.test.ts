import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPrincipleAskPrompt,
  getAllCanonicalPrinciples,
  getMissionLogInventory,
  getAllPrinciples,
  getAllThemes,
  getCanonicalPrincipleBySlug,
  getPrincipleBySlug,
} from "@/lib/wiki/parser";

test("getAllPrinciples loads clustered principle objects when clustering output is present", () => {
  const principles = getAllPrinciples();
  assert.ok(Array.isArray(principles));
  if (principles.length === 0) return;
  assert.ok(principles.every((principle) => principle.slug.length > 0));
  assert.ok(principles.every((principle) => principle.storyCount > 0));
});

test("getPrincipleBySlug resolves when principles exist", () => {
  const principle = getAllPrinciples()[0];
  if (!principle) return;
  assert.deepEqual(getPrincipleBySlug(principle.slug), principle);
});

test("buildPrincipleAskPrompt embeds the principle label in a reusable Ask question", () => {
  const prompt = buildPrincipleAskPrompt("Build relationships before you need them.");
  assert.match(prompt, /Build relationships before you need them\./);
  assert.match(prompt, /broader themes/);
});

test("getAllCanonicalPrinciples rolls definitions into twelve browse-level principles", () => {
  const principles = getAllCanonicalPrinciples();
  assert.equal(principles.length, 12);
  assert.ok(principles.every((principle) => principle.title.length > 0));
});

test("canonical principles collectively cover every current theme when themes exist", () => {
  const themes = getAllThemes().map((theme) => theme.slug).sort();
  if (themes.length === 0) return;
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

test("getMissionLogInventory reads phase 3 mission logs when present", () => {
  const inventory = getMissionLogInventory();
  if (!inventory) return;
  assert.equal(typeof inventory.generatedAt, "string");
  assert.ok(Array.isArray(inventory.missionLogs));
  assert.ok(
    inventory.missionLogs.every(
      (log) => log.logId.length > 0 && /^CH\d{2}$/.test(log.chapterId)
    )
  );
});
