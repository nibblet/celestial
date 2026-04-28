import test from "node:test";
import assert from "node:assert/strict";
import {
  getCompanionDefaultChapterNumber,
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

test("companion defaults to latest published chapter unlocked", () => {
  const defaultChapterNumber = getCompanionDefaultChapterNumber();
  assert.ok(defaultChapterNumber > 0);
  assert.equal(isStoryUnlocked("CH01", {
    ...baseProgress,
    currentChapterNumber: defaultChapterNumber,
  }), true);
});
