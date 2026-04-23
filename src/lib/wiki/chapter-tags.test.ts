import test from "node:test";
import assert from "node:assert/strict";
import {
  getChapterTags,
  getChapterTagSlugSet,
  getChapterTagsPromptBlock,
  getAllChapterTags,
} from "./chapter-tags";

test("getAllChapterTags returns at least one chapter", () => {
  const all = getAllChapterTags();
  assert.ok(all.length > 0, "expected chapter_tags.json to be populated");
});

test("getChapterTags accepts chapter id and full slug", () => {
  const byId = getChapterTags("CH01");
  assert.ok(byId, "CH01 should exist");
  const bySlug = getChapterTags("ch01-dustfall");
  assert.equal(bySlug?.chapterId, byId?.chapterId);
});

test("getChapterTagSlugSet returns kind:slug pairs", () => {
  const set = getChapterTagSlugSet("CH01");
  for (const key of set) {
    const [kind] = key.split(":");
    assert.match(kind, /^(rules|characters|artifacts|vaults|locations|factions)$/);
  }
});

test("getChapterTagsPromptBlock produces a non-empty block with controlled routes", () => {
  const block = getChapterTagsPromptBlock("CH01");
  assert.ok(block.includes("## Chapter tags for CH01"));
  assert.ok(/\[`\/(characters|rules|locations|factions|artifacts|vaults)\//.test(block));
});

test("unknown chapter returns empty helpers", () => {
  assert.equal(getChapterTags("CH99"), null);
  assert.equal(getChapterTagsPromptBlock("CH99"), "");
  assert.equal(getChapterTagSlugSet("CH99").size, 0);
});
