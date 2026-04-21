import test from "node:test";
import assert from "node:assert/strict";
import { parseChapterScenes } from "@/lib/wiki/scene-parser";
import { slugifyHeading } from "@/lib/wiki/markdown-headings";

// ── Fixtures ────────────────────────────────────────────────────────

const TWO_SCENE_CHAPTER = `# Chapter 1: Dustfall

> Epigraph.

**Story ID:** CH01

## Full Text

### Scene 1: Waking Dust

The Martian wind didn't howl; it whispered.

Galen stood at the edge of the trench.

### Scene 2: The Quiet Weight

The command shelter wasn't much more than a reinforced dome.

Galen removed his helmet.
`;

const SCENES_WITH_MISSION_LOG = `# Chapter 2

## Full Text

### Scene 1: First Light

Opening prose for scene one.

### Mission Log VLK-M001-CH02-A

- Author: Galen
- Summary: Noise baseline established.

### Scene 2: Second Light

Opening prose for scene two.

### Mission Log VLK-M001-CH02-B

- Closing note.
`;

const SCENES_FOLLOWED_BY_OTHER_SECTION = `# Chapter 3

## Full Text

### Scene 1: Only One

Just the body.

## References

- External link (must not be parsed as scene content)
`;

const NO_FULL_TEXT_BLOCK = `# Chapter 99

Some prose without a Full Text section.`;

// ── Tests ───────────────────────────────────────────────────────────

test("parses a simple 2-scene chapter", () => {
  const scenes = parseChapterScenes(TWO_SCENE_CHAPTER);
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].orderIndex, 1);
  assert.equal(scenes[0].title, "Waking Dust");
  assert.equal(scenes[1].orderIndex, 2);
  assert.equal(scenes[1].title, "The Quiet Weight");
  assert.ok(scenes[0].body.includes("Martian wind"));
  assert.ok(scenes[1].body.includes("command shelter"));
  // Scene 1's body must NOT leak into Scene 2.
  assert.ok(!scenes[0].body.includes("command shelter"));
});

test("scene slug matches the StoryMarkdown renderer's h3 anchor id", () => {
  // StoryMarkdown.tsx emits id = `scene-${slugifyHeading(fullHeading)}`,
  // where fullHeading is the literal text after `### `. The parser must
  // produce exactly the same slug so that clicking an entry in the DB-
  // backed StorySceneJump / StoryTOC scrolls to a real heading.
  const scenes = parseChapterScenes(TWO_SCENE_CHAPTER);
  const expectedSlug1 = `scene-${slugifyHeading("Scene 1: Waking Dust")}`;
  const expectedSlug2 = `scene-${slugifyHeading("Scene 2: The Quiet Weight")}`;
  assert.equal(scenes[0].slug, expectedSlug1);
  assert.equal(scenes[1].slug, expectedSlug2);
});

test("mission log ### headings close the current scene but do not create a new scene row", () => {
  const scenes = parseChapterScenes(SCENES_WITH_MISSION_LOG);
  assert.equal(scenes.length, 2, "only Scene 1 and Scene 2 are emitted");
  assert.deepEqual(
    scenes.map((s) => s.title),
    ["First Light", "Second Light"],
  );
  // Scene 1's body must NOT include any mission-log prose.
  assert.ok(!scenes[0].body.includes("Mission Log"));
  assert.ok(!scenes[0].body.includes("Galen"), "no mission log leakage");
  // Scene 2's body must NOT include the trailing mission log either.
  assert.ok(!scenes[1].body.includes("Closing note"));
});

test("parsing stops at the next ## top-level heading after Full Text", () => {
  const scenes = parseChapterScenes(SCENES_FOLLOWED_BY_OTHER_SECTION);
  assert.equal(scenes.length, 1);
  assert.equal(scenes[0].title, "Only One");
  assert.ok(!scenes[0].body.includes("External link"));
});

test("returns empty array when no `## Full Text` block is present", () => {
  assert.deepEqual(parseChapterScenes(NO_FULL_TEXT_BLOCK), []);
});

test("returns empty array for empty input", () => {
  assert.deepEqual(parseChapterScenes(""), []);
});

test("content hash is stable for identical bodies", () => {
  const a = parseChapterScenes(TWO_SCENE_CHAPTER);
  const b = parseChapterScenes(TWO_SCENE_CHAPTER);
  assert.equal(a[0].contentHash, b[0].contentHash);
  assert.equal(a[1].contentHash, b[1].contentHash);
  assert.equal(a[0].contentHash.length, 32);
});

test("content hash changes when the body changes", () => {
  const modified = TWO_SCENE_CHAPTER.replace("Martian wind", "Plutonian wind");
  const original = parseChapterScenes(TWO_SCENE_CHAPTER);
  const edited = parseChapterScenes(modified);
  assert.notEqual(original[0].contentHash, edited[0].contentHash);
  // Other scenes are untouched.
  assert.equal(original[1].contentHash, edited[1].contentHash);
});

test("word count reflects the scene body only", () => {
  const scenes = parseChapterScenes(TWO_SCENE_CHAPTER);
  // Scene 1 body has roughly 13 words across two sentences; we just check
  // the counter is >0 and monotonic with obvious expectations.
  assert.ok(scenes[0].wordCount > 5);
  assert.ok(scenes[0].wordCount < 100);
});

test("`### Scene` matching is strict — other ### headings never count as scenes", () => {
  const input = `# Chapter X

## Full Text

### Notes before scene
Ignored.

### Scene 1: Real

Real body.

### Appendix

Also ignored.
`;
  const scenes = parseChapterScenes(input);
  assert.equal(scenes.length, 1);
  assert.equal(scenes[0].title, "Real");
  assert.ok(scenes[0].body.trim().startsWith("Real body"));
});
