import test from "node:test";
import assert from "node:assert/strict";
import { getChapterRecord } from "@/lib/archive/record";

test("a file's record lists what each chapter puts on record, in order", () => {
  const all = getChapterRecord("characters", "galen-voss", {
    currentChapterNumber: 0,
    showAllContent: true,
  });
  assert.ok(all.length > 5);
  assert.equal(all[0]!.chapterNumber, 1);
  assert.equal(all[0]!.chapterTitle, "Dustfall");
  assert.ok(all.every((e, i) => i === 0 || e.chapterNumber > all[i - 1]!.chapterNumber));
});

test("a spoiler-safe reader's record stops at their bookmark", () => {
  const safe = getChapterRecord("characters", "galen-voss", {
    currentChapterNumber: 3,
    showAllContent: false,
  });
  assert.ok(safe.length > 0);
  assert.ok(safe.every((e) => e.chapterNumber <= 3));
  assert.deepEqual(
    getChapterRecord("characters", "galen-voss", {
      currentChapterNumber: 0,
      showAllContent: false,
    }),
    []
  );
});
