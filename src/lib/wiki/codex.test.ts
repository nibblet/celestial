import test from "node:test";
import assert from "node:assert/strict";
import {
  getCodexEntries,
  getCodexEntriesIntroducedIn,
  isCodexEntryVisible,
} from "@/lib/wiki/codex";

test("codex hides entries introduced after the reader's bookmark", () => {
  const at3 = { currentChapterNumber: 3, showAllContent: false };
  assert.equal(isCodexEntryVisible({ firstChapter: 3 }, at3), true);
  assert.equal(isCodexEntryVisible({ firstChapter: 4 }, at3), false);
  assert.equal(isCodexEntryVisible({ firstChapter: null }, at3), false);
  assert.equal(
    isCodexEntryVisible(
      { firstChapter: null },
      { currentChapterNumber: 0, showAllContent: true }
    ),
    true
  );
});

test("a brand-new reader sees an empty codex", () => {
  const fresh = { currentChapterNumber: 0, showAllContent: false };
  const visible = getCodexEntries().filter((e) => isCodexEntryVisible(e, fresh));
  assert.equal(visible.length, 0);
});

test("chapter 1 introduces entries, each with a unique kind+slug", () => {
  const all = getCodexEntries();
  assert.ok(all.length > 0);
  const keys = new Set(all.map((e) => `${e.kind}:${e.slug}`));
  assert.equal(keys.size, all.length);
  assert.ok(getCodexEntriesIntroducedIn(1).length > 0);
});
