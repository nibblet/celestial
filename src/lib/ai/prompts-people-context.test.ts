import test from "node:test";
import assert from "node:assert/strict";
import { getPeopleContext, buildSystemPrompt } from "@/lib/ai/prompts";

test("getPeopleContext includes Key People heading and age-mode adaptation hint", () => {
  const ctx = getPeopleContext();
  assert.match(ctx, /^## Key People in Keith's Life/m);
  assert.match(ctx, /young_reader:/);
  assert.match(ctx, /teen:/);
  assert.match(ctx, /adult:/);
});

test("getPeopleContext includes Tier A drafted bios (Bayne Cobb facts)", () => {
  const ctx = getPeopleContext();
  assert.match(ctx, /1916/);
  assert.match(ctx, /Bayne Cobb/);
});

test("buildSystemPrompt embeds people context after wiki index material", () => {
  const prompt = buildSystemPrompt("adult");
  const wikiIdx = prompt.indexOf("## Wiki Index");
  const keyPeople = prompt.indexOf("## Key People in Keith's Life");
  const principles = prompt.indexOf("## Keith's 12 Core Principles");
  const frameworks = prompt.indexOf("## Decision Frameworks");
  assert.ok(wikiIdx >= 0 && principles > wikiIdx && frameworks > principles);
  if (keyPeople >= 0) {
    assert.ok(principles > keyPeople);
  }
});
