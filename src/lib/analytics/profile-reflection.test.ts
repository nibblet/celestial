import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReflectionPrompt,
  computeInputSignature,
  shouldRegenerateReflection,
  type ReflectionInputs,
  type CachedReflection,
} from "@/lib/analytics/profile-reflection";

test("computeInputSignature is stable for identical inputs", () => {
  const a = computeInputSignature({ readCount: 3, savedCount: 1, askedCount: 0 });
  const b = computeInputSignature({ readCount: 3, savedCount: 1, askedCount: 0 });
  assert.equal(a, b);
});

test("computeInputSignature differs when counts differ", () => {
  const a = computeInputSignature({ readCount: 3, savedCount: 1, askedCount: 0 });
  const b = computeInputSignature({ readCount: 4, savedCount: 1, askedCount: 0 });
  assert.notEqual(a, b);
});

test("shouldRegenerate returns 'none' when user has read 0 stories", () => {
  const got = shouldRegenerateReflection({
    inputs: { readCount: 0, savedCount: 0, askedCount: 0 },
    cached: null,
    now: new Date("2026-04-18T12:00:00Z"),
  });
  assert.equal(got, "none");
});

test("shouldRegenerate returns 'generate' on first-time (read>=1, no cache)", () => {
  const got = shouldRegenerateReflection({
    inputs: { readCount: 1, savedCount: 0, askedCount: 0 },
    cached: null,
    now: new Date("2026-04-18T12:00:00Z"),
  });
  assert.equal(got, "generate");
});

test("shouldRegenerate returns 'use-cache' when inputs unchanged", () => {
  const inputs: ReflectionInputs = { readCount: 3, savedCount: 1, askedCount: 0 };
  const cached: CachedReflection = {
    reflectionText: "Sample",
    generatedAt: new Date("2026-04-17T12:00:00Z"),
    inputSignature: computeInputSignature(inputs),
    modelSlug: "claude-sonnet-4-20250514",
  };
  const got = shouldRegenerateReflection({
    inputs,
    cached,
    now: new Date("2026-04-18T13:00:00Z"),
  });
  assert.equal(got, "use-cache");
});

test("shouldRegenerate returns 'use-cache' when cooldown not elapsed even if inputs moved", () => {
  const oldInputs: ReflectionInputs = { readCount: 3, savedCount: 1, askedCount: 0 };
  const cached: CachedReflection = {
    reflectionText: "Sample",
    generatedAt: new Date("2026-04-18T00:00:00Z"),
    inputSignature: computeInputSignature(oldInputs),
    modelSlug: "claude-sonnet-4-20250514",
  };
  const got = shouldRegenerateReflection({
    inputs: { readCount: 6, savedCount: 1, askedCount: 0 },
    cached,
    now: new Date("2026-04-18T10:00:00Z"),
  });
  assert.equal(got, "use-cache");
});

test("shouldRegenerate returns 'generate' when +3 reads and cooldown elapsed", () => {
  const oldInputs: ReflectionInputs = { readCount: 3, savedCount: 1, askedCount: 0 };
  const cached: CachedReflection = {
    reflectionText: "Sample",
    generatedAt: new Date("2026-04-17T00:00:00Z"),
    inputSignature: computeInputSignature(oldInputs),
    modelSlug: "claude-sonnet-4-20250514",
  };
  const got = shouldRegenerateReflection({
    inputs: { readCount: 6, savedCount: 1, askedCount: 0 },
    cached,
    now: new Date("2026-04-18T12:00:00Z"),
  });
  assert.equal(got, "generate");
});

test("shouldRegenerate returns 'generate' when +1 saved passage and cooldown elapsed", () => {
  const oldInputs: ReflectionInputs = { readCount: 3, savedCount: 1, askedCount: 0 };
  const cached: CachedReflection = {
    reflectionText: "Sample",
    generatedAt: new Date("2026-04-17T00:00:00Z"),
    inputSignature: computeInputSignature(oldInputs),
    modelSlug: "claude-sonnet-4-20250514",
  };
  const got = shouldRegenerateReflection({
    inputs: { readCount: 3, savedCount: 2, askedCount: 0 },
    cached,
    now: new Date("2026-04-18T12:00:00Z"),
  });
  assert.equal(got, "generate");
});

test("shouldRegenerate returns 'use-cache' for tiny read growth below threshold", () => {
  const oldInputs: ReflectionInputs = { readCount: 3, savedCount: 1, askedCount: 0 };
  const cached: CachedReflection = {
    reflectionText: "Sample",
    generatedAt: new Date("2026-04-17T00:00:00Z"),
    inputSignature: computeInputSignature(oldInputs),
    modelSlug: "claude-sonnet-4-20250514",
  };
  const got = shouldRegenerateReflection({
    inputs: { readCount: 4, savedCount: 1, askedCount: 0 },
    cached,
    now: new Date("2026-04-18T12:00:00Z"),
  });
  assert.equal(got, "use-cache");
});

test("buildReflectionPrompt includes themes, principles, and saved passages", () => {
  const prompt = buildReflectionPrompt({
    reads: [
      { title: "A Towhead from the Red Clay Hills", themes: ["Identity"], principles: ["Small communities matter."] },
      { title: "A Very Busy Teenager", themes: ["Identity", "Gratitude"], principles: ["Adversity builds skills."] },
    ],
    savedPassages: [
      { storyTitle: "A Very Busy Teenager", text: "The four years of high school..." },
    ],
    askedQuestions: ["do you have any red clay left?"],
  });
  assert.match(prompt, /Identity/);
  assert.match(prompt, /Small communities matter\./);
  assert.match(prompt, /The four years of high school/);
  assert.match(prompt, /do you have any red clay left\?/);
});

test("buildReflectionPrompt caps saved passages to 20", () => {
  const savedPassages = Array.from({ length: 30 }, (_, i) => ({
    storyTitle: "Story " + i,
    text: "passage-marker-" + i,
  }));
  const prompt = buildReflectionPrompt({
    reads: [{ title: "x", themes: [], principles: [] }],
    savedPassages,
    askedQuestions: [],
  });
  assert.match(prompt, /passage-marker-29/);
  assert.match(prompt, /passage-marker-10/);
  assert.doesNotMatch(prompt, /passage-marker-9\b/);
});
