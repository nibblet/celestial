import test from "node:test";
import assert from "node:assert/strict";
import {
  loadArchivePrompts,
  pickOpeningPrompt,
  type ArchivePrompt,
} from "@/lib/archive/prompts";

const base = { label: "l", quote: "q", question: "?" };
const prompts: ArchivePrompt[] = [
  { ...base, id: "a", approved: true, afterChapter: 17 },
  { ...base, id: "draft", approved: false, afterChapter: 0 },
  { ...base, id: "b", approved: true, afterChapter: 2 },
];
const open = { currentChapterNumber: 0, showAllContent: true };

test("unapproved prompts are never shown", () => {
  for (let d = 0; d < 10; d++) {
    const p = pickOpeningPrompt(prompts, open, new Date(d * 86_400_000));
    assert.notEqual(p?.id, "draft");
  }
});

test("prompts rotate by day", () => {
  const ids = new Set(
    [0, 1].map((d) => pickOpeningPrompt(prompts, open, new Date(d * 86_400_000))?.id)
  );
  assert.deepEqual([...ids].sort(), ["a", "b"]);
});

test("spoiler-safe readers only get prompts behind their bookmark", () => {
  const safe = (n: number) => ({ currentChapterNumber: n, showAllContent: false });
  assert.equal(pickOpeningPrompt(prompts, safe(1)), null);
  assert.equal(pickOpeningPrompt(prompts, safe(5))?.id, "b");
});

test("the shipped prompt file parses and has at least one approved prompt", () => {
  const shipped = loadArchivePrompts();
  assert.ok(shipped.some((p) => p.approved));
  for (const p of shipped) {
    assert.ok(p.id && p.quote && p.question && p.label);
  }
});
