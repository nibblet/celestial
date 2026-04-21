import test from "node:test";
import assert from "node:assert/strict";
import {
  PERSONAS,
  getPersona,
  getPersonaLabels,
  type PersonaKey,
} from "@/lib/ai/personas";
import type { PersonaPromptArgs } from "@/lib/ai/perspectives";

const BASE_ARGS: PersonaPromptArgs = {
  ageMode: "adult",
  storyCatalog: "- CH01 — Dustfall",
  wikiSummaries: "## Index\n- Valkyrie\n- The Vault",
};

const ACTIVE_KEYS: PersonaKey[] = [
  "celestial_narrator",
  "lorekeeper",
  "archivist",
  "finder",
  "synthesizer",
];

test("every active persona has unique key, non-empty label, and a model slug", () => {
  const keys = new Set<string>();
  for (const key of ACTIVE_KEYS) {
    const p = getPersona(key);
    assert.equal(p.key, key);
    assert.ok(p.label.length > 0, `${key} has a non-empty label`);
    assert.ok(p.model.length > 0, `${key} has a model slug`);
    assert.ok(p.maxTokens > 0, `${key} has positive maxTokens`);
    keys.add(p.label);
  }
  // Labels must be distinct so the Synthesizer's "agents who analyzed" header
  // never shows duplicates.
  assert.equal(keys.size, ACTIVE_KEYS.length, "persona labels are unique");
});

test("narrator, lorekeeper, archivist, finder all embed AGE_MODE_INSTRUCTIONS and the shared content block", () => {
  for (const key of ["celestial_narrator", "lorekeeper", "archivist", "finder"] as PersonaKey[]) {
    const prompt = getPersona(key).buildSystemPrompt(BASE_ARGS);
    assert.ok(prompt.length > 200, `${key} prompt is substantive`);
    // Age-mode instructions mention the adult-mode label
    assert.match(prompt, /adult reader|multiple stories/i);
    // Shared block headers
    assert.ok(
      prompt.includes("## Story ID Catalog") && prompt.includes("## Wiki Index"),
      `${key} includes shared content block`,
    );
  }
});

test("finder prompt keeps the instructions short-and-factual and forbids editorializing", () => {
  const prompt = getPersona("finder").buildSystemPrompt(BASE_ARGS);
  assert.match(prompt, /1.4 sentences|bulleted list/i);
  assert.match(prompt, /Do NOT editorialize/i);
});

test("archivist prompt asks for cross-story pattern, not bullet principles", () => {
  const prompt = getPersona("archivist").buildSystemPrompt(BASE_ARGS);
  assert.match(prompt, /pattern across multiple stories/i);
  assert.match(prompt, /not list bullet principles/i);
});

test("synthesizer prompt lists provided persona labels and agent count", () => {
  const prompt = getPersona("synthesizer").buildSystemPrompt({
    ...BASE_ARGS,
    personaLabels: ["Celestial Narrator", "Archivist", "Lore-keeper"],
  });
  assert.match(prompt, /3 other agents have already analyzed/i);
  assert.ok(prompt.includes("Celestial Narrator"));
  assert.ok(prompt.includes("Archivist"));
  assert.ok(prompt.includes("Lore-keeper"));
});

test("synthesizer prompt degrades gracefully when personaLabels omitted", () => {
  const prompt = getPersona("synthesizer").buildSystemPrompt(BASE_ARGS);
  // Falls back to a generic "Multiple sub-agents" header; must still be valid.
  assert.match(prompt, /Multiple sub-agents|N other agents/i);
});

test("shared block renders open narrative threads when provided", () => {
  const prompt = getPersona("archivist").buildSystemPrompt({
    ...BASE_ARGS,
    openThreads: [
      {
        title: "Why is the Vault listening?",
        question: "The text keeps returning to this without resolving it.",
        openedInChapterId: "CH01",
        resolved: false,
      },
      {
        title: "Resolved mystery",
        question: "already closed",
        openedInChapterId: "CH02",
        resolved: true,
      },
    ],
  });
  assert.match(prompt, /## Open Narrative Threads/);
  assert.ok(prompt.includes("Why is the Vault listening?"));
  // Resolved threads must be filtered out — only unresolved threads are
  // surfaced as active context.
  assert.ok(!prompt.includes("Resolved mystery"));
});

test("shared block renders chapter scenes when storySlug + chapterScenes are provided", () => {
  const prompt = getPersona("celestial_narrator").buildSystemPrompt({
    ...BASE_ARGS,
    storySlug: "CH01",
    chapterScenes: [
      {
        orderIndex: 1,
        slug: "scene-scene-1-waking-dust",
        title: "Waking Dust",
        goal: "Find the resonance source.",
      },
      {
        orderIndex: 2,
        slug: "scene-scene-2-the-quiet-weight",
        title: "The Quiet Weight",
      },
    ],
  });
  assert.match(prompt, /## Scenes in this chapter \(CH01\)/);
  assert.ok(prompt.includes("scene-scene-1-waking-dust"));
  assert.ok(prompt.includes("Waking Dust"));
  assert.ok(prompt.includes("goal: Find the resonance source"));
  // Scenes without annotations should still render.
  assert.ok(prompt.includes("The Quiet Weight"));
});

test("shared block skips chapter scenes when storySlug is absent", () => {
  // Scenes only make sense in the context of a specific chapter. Without
  // a storySlug we don't have a valid chapter header to attach them to,
  // so they must be silently skipped rather than rendered against "()".
  const prompt = getPersona("celestial_narrator").buildSystemPrompt({
    ...BASE_ARGS,
    chapterScenes: [
      {
        orderIndex: 1,
        slug: "scene-anything",
        title: "Anything",
      },
    ],
  });
  assert.ok(!prompt.includes("## Scenes in this chapter"));
});

test("shared block renders beats with act + beatType + chapter suffix", () => {
  const prompt = getPersona("celestial_narrator").buildSystemPrompt({
    ...BASE_ARGS,
    beats: [
      {
        act: 1,
        title: "A silence that listens back",
        whyItMatters: "Seeds the series' core question.",
        beatType: "opening",
        chapterId: "CH01",
      },
      {
        act: 2,
        title: "Directive 14 is read aloud",
        whyItMatters: "Abstract unease becomes a specific legal instrument.",
        beatType: "midpoint",
        chapterId: null,
      },
    ],
  });
  assert.match(prompt, /## Journey Beats/);
  // Act + beatType prefix, chapter suffix, whyItMatters payload
  assert.ok(
    prompt.includes(
      "**[Act 1 · opening] A silence that listens back** (CH01) — Seeds the series' core question.",
    ),
  );
  // No chapter suffix when chapterId is null
  assert.ok(
    prompt.includes(
      "**[Act 2 · midpoint] Directive 14 is read aloud** — Abstract unease becomes a specific legal instrument.",
    ),
  );
});

test("editor persona is an explicit not-implemented placeholder", () => {
  const editor = getPersona("editor");
  assert.match(editor.label, /not implemented/i);
  assert.throws(
    () => editor.buildSystemPrompt(BASE_ARGS),
    /not implemented/i,
  );
});

test("getPersonaLabels returns labels in the order requested", () => {
  const labels = getPersonaLabels([
    "celestial_narrator",
    "archivist",
    "lorekeeper",
  ]);
  assert.deepEqual(labels, ["Celestial Narrator", "Archivist", "Lore-keeper"]);
});

test("PERSONAS is exhaustive over PersonaKey union", () => {
  // If a new key is added to the union without a registry entry, this will
  // drop below the expected count.
  const keys = Object.keys(PERSONAS) as PersonaKey[];
  assert.equal(keys.length, 6, "registry has 5 active personas + 1 editor placeholder");
});
