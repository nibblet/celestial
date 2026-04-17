import test from "node:test";
import assert from "node:assert/strict";
import { buildUserPrompt, extractJSON } from "@/lib/ai/polish-helpers";

test("buildUserPrompt emits all labeled fields including empty placeholders", () => {
  const prompt = buildUserPrompt({ title: "", body: "" });
  assert.match(prompt, /TITLE: \(empty\)/);
  assert.match(prompt, /LIFE_STAGE: \(empty\)/);
  assert.match(prompt, /YEAR_START: \(empty\)/);
  assert.match(prompt, /THEMES: \(empty\)/);
  assert.match(prompt, /PRINCIPLES: \(empty\)/);
  assert.match(prompt, /QUOTES: \(empty\)/);
  assert.match(prompt, /BODY .+preserve tags/);
});

test("buildUserPrompt serializes arrays with commas and pipes", () => {
  const prompt = buildUserPrompt({
    title: "First job",
    body: "<p>I was 17.</p>",
    themes: ["first job", "resilience"],
    quotes: ["It was cold.", "I kept going."],
  });
  assert.match(prompt, /THEMES: first job, resilience/);
  assert.match(prompt, /QUOTES: It was cold\. \| I kept going\./);
});

test("extractJSON parses a clean JSON object", () => {
  const got = extractJSON('{"title":"Polished","rationale":"ok"}');
  assert.deepEqual(got, { title: "Polished", rationale: "ok" });
});

test("extractJSON strips markdown code fences", () => {
  const got = extractJSON('```json\n{"title":"Polished"}\n```');
  assert.deepEqual(got, { title: "Polished" });
});

test("extractJSON tolerates a bare ```-fence without language tag", () => {
  const got = extractJSON('```\n{"body":"x"}\n```');
  assert.deepEqual(got, { body: "x" });
});

test("extractJSON recovers a JSON block embedded in prose", () => {
  const got = extractJSON(
    'Sure, here is the suggestion:\n{"title":"Lake Trip","themes":["family"]}\nHope that helps.'
  );
  assert.deepEqual(got, { title: "Lake Trip", themes: ["family"] });
});

test("extractJSON returns null when no JSON is present", () => {
  assert.equal(extractJSON("I could not produce JSON for you."), null);
});

test("extractJSON returns null for malformed JSON with no recoverable block", () => {
  assert.equal(extractJSON("{not valid"), null);
});
