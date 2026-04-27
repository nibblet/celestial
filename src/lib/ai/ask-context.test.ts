import test from "node:test";
import assert from "node:assert/strict";
import {
  ASK_CONTEXT_PACK_SCHEMA_VERSION,
  createAskContextPack,
  renderAskContextPack,
  type AskContextItem,
} from "./ask-context";

const ITEMS: AskContextItem[] = [
  {
    kind: "story",
    title: "Dustfall",
    href: "/stories/CH01",
    canonRank: "chapter_text",
    excerpt: "The first signal arrives as dust begins to move against the wind.",
    score: 12,
    storyId: "CH01",
  },
  {
    kind: "character_arc",
    title: "Thane Meric",
    href: "/arcs/thane-meric",
    canonRank: "derived_inference",
    excerpt: "ASK Guidance: Treat Thane's loyalty as pressure, not certainty.",
    score: 9,
    slug: "thane-meric",
  },
  {
    kind: "rule",
    title: "Resonance Field",
    href: "/rules/resonance-field",
    canonRank: "wiki_canon",
    excerpt: "The field responds to coherent intent and rejects coercion.",
    score: 11,
    slug: "resonance-field",
  },
];

test("createAskContextPack sorts items and records confidence/budget", () => {
  const pack = createAskContextPack({
    message: "How does resonance affect Thane?",
    intent: {
      kind: "character_arc",
      confidence: 0.82,
      reason: "asks how a character changes",
    },
    items: ITEMS,
    mode: "deep",
    maxItems: 2,
    maxChars: 240,
  });

  assert.equal(pack.schemaVersion, ASK_CONTEXT_PACK_SCHEMA_VERSION);
  assert.equal(pack.intent.kind, "character_arc");
  assert.equal(pack.items.length, 2);
  assert.deepEqual(
    pack.items.map((item) => item.title),
    ["Dustfall", "Resonance Field"],
  );
  assert.equal(pack.confidence, 1);
  assert.ok(pack.budget.actualChars <= 240);
});

test("renderAskContextPack labels canon rank and preserves citations", () => {
  const pack = createAskContextPack({
    message: "How does resonance affect Thane?",
    intent: {
      kind: "character_arc",
      confidence: 0.82,
      reason: "asks how a character changes",
    },
    items: ITEMS.slice(0, 1),
    mode: "fast",
  });

  const rendered = renderAskContextPack(pack);

  assert.match(rendered, /Ask Context Pack/);
  assert.match(rendered, /Intent: character_arc/);
  assert.match(rendered, /Canon rank: chapter_text/);
  assert.match(rendered, /\[Dustfall\]\(\/stories\/CH01\)/);
});
