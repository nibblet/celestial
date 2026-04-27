import test from "node:test";
import assert from "node:assert/strict";
import { retrieveAskContextItems } from "./ask-retrieval";

const readerProgress = {
  readStoryIds: ["CH01"],
  currentChapter: "CH01",
  currentChapterNumber: 1,
  showAllContent: false,
};

test("retrieveAskContextItems boosts exact world-rule matches", () => {
  const items = retrieveAskContextItems({
    message: "How does resonance field work?",
    intent: {
      kind: "world_rule",
      confidence: 0.8,
      reason: "world mechanic",
    },
    sources: {
      stories: [
        {
          storyId: "CH01",
          title: "Dustfall",
          href: "/stories/CH01",
          summary: "The crew notices dust moving in strange resonant patterns.",
          text: "Dust moves against the wind near the Vault.",
        },
      ],
      rules: [
        {
          title: "Resonance Field",
          slug: "resonance-field",
          href: "/rules/resonance-field",
          text: "The resonance field responds to coherent intent.",
        },
      ],
    },
    readerProgress,
  });

  assert.equal(items[0]?.kind, "rule");
  assert.equal(items[0]?.title, "Resonance Field");
  assert.ok((items[0]?.score ?? 0) > (items[1]?.score ?? 0));
});

test("retrieveAskContextItems filters future chapter stories", () => {
  const items = retrieveAskContextItems({
    message: "What happens with the Giza pulse?",
    intent: {
      kind: "future_speculation",
      confidence: 0.8,
      reason: "future",
    },
    sources: {
      stories: [
        {
          storyId: "CH16",
          title: "The Giza Pulse",
          href: "/stories/CH16",
          summary: "Future chapter summary.",
          text: "Future chapter text.",
        },
      ],
    },
    readerProgress,
  });

  assert.equal(items.length, 0);
});

test("retrieveAskContextItems boosts character arc ledgers for arc intent", () => {
  const items = retrieveAskContextItems({
    message: "How is Thane Meric changing?",
    intent: {
      kind: "character_arc",
      confidence: 0.9,
      reason: "character change",
    },
    sources: {
      entities: [
        {
          title: "Thane Meric",
          slug: "thane-meric",
          href: "/characters/thane-meric",
          text: "Thane is a commander under pressure.",
          storyIds: ["CH01"],
        },
      ],
      arcs: [
        {
          title: "Thane Meric",
          slug: "thane-meric",
          href: "/arcs/thane-meric",
          text: "ASK Guidance: Treat Thane's loyalty as a pressure point.",
        },
      ],
    },
    readerProgress,
  });

  assert.equal(items[0]?.kind, "character_arc");
  assert.equal(items[0]?.slug, "thane-meric");
});
