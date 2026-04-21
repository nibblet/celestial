import test from "node:test";
import assert from "node:assert/strict";
import { getPeopleContext, buildSystemPrompt } from "@/lib/ai/prompts";

test("getPeopleContext returns empty string when no people markdown is present", () => {
  const ctx = getPeopleContext();
  assert.equal(typeof ctx, "string");
});

test("buildSystemPrompt orders major sections consistently", () => {
  const prompt = buildSystemPrompt("adult");
  const wikiIdx = prompt.indexOf("## Wiki Index");
  const principles = prompt.indexOf("## Core principles");
  const frameworks = prompt.indexOf("## Lore rules / frameworks");
  assert.ok(wikiIdx >= 0 && principles > wikiIdx && frameworks > principles);
});

test("buildSystemPrompt includes spoiler gate guidance when reader progress is provided", () => {
  const prompt = buildSystemPrompt(
    "adult",
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      readStoryIds: ["CH01", "CH02"],
      currentChapter: "CH02",
      currentChapterNumber: 2,
      showAllContent: false,
    }
  );
  assert.match(prompt, /Reader progress gate: current chapter is CH02/i);
});
