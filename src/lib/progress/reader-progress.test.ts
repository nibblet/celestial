import test from "node:test";
import assert from "node:assert/strict";
import {
  canOpenChapter,
  getLastChapterNumber,
  nextChapterId,
  isStoryUnlocked,
  type ReaderProgress,
} from "@/lib/progress/reader-progress";

const baseProgress: ReaderProgress = {
  readStoryIds: ["CH01", "CH02", "CH03"],
  currentChapter: "CH03",
  currentChapterNumber: 3,
  showAllContent: false,
};

test("isStoryUnlocked allows legacy IDs and unlocked chapters", () => {
  assert.equal(isStoryUnlocked("P1_S01", baseProgress), true);
  assert.equal(isStoryUnlocked("CH02", baseProgress), true);
  assert.equal(isStoryUnlocked("CH03", baseProgress), true);
});

test("isStoryUnlocked blocks future chapters unless showAllContent is true", () => {
  assert.equal(isStoryUnlocked("CH06", baseProgress), false);
  assert.equal(
    isStoryUnlocked("CH06", { ...baseProgress, showAllContent: true }),
    true
  );
});

test("canOpenChapter always allows the chapter after the last one finished", () => {
  assert.equal(canOpenChapter("CH04", baseProgress), true);
  assert.equal(canOpenChapter("CH05", baseProgress), false);
  assert.equal(
    canOpenChapter("CH01", { ...baseProgress, currentChapterNumber: 0 }),
    true
  );
  assert.equal(
    canOpenChapter("CH02", { ...baseProgress, currentChapterNumber: 0 }),
    false
  );
});

test("nextChapterId points at the next chapter and stops at the end", () => {
  assert.equal(nextChapterId(baseProgress), "CH04");
  const last = getLastChapterNumber();
  assert.ok(last > 0);
  assert.equal(
    nextChapterId({ ...baseProgress, currentChapterNumber: last }),
    `CH${String(last).padStart(2, "0")}`
  );
});
