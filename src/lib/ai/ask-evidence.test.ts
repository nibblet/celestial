import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdownInternalLinks, buildAskMessageEvidence } from "./ask-evidence";
import type { PersonaRoute } from "./router";
import type { PersonaPromptArgs } from "./personas";

test("parseMarkdownInternalLinks collects in-app links and strips hashes", () => {
  const md = `See [CH01](/stories/ch01#scene) and [again](/stories/ch01#x). [ext](https://a.com).`;
  assert.deepEqual(parseMarkdownInternalLinks(md), [
    { href: "/stories/ch01", text: "CH01" },
    { href: "/stories/ch01", text: "again" },
  ]);
});

test("buildAskMessageEvidence includes context flags and route", () => {
  const args = {
    ageMode: "adult",
    storySlug: "ch01",
    wikiSummaries: "x",
    storyCatalog: "y",
    characterCanonContextIncluded: true,
    characterArcContextIncluded: true,
  } as PersonaPromptArgs;
  const route: PersonaRoute = {
    personas: ["finder"],
    depth: "simple",
    reason: "test",
  };
    const ev = buildAskMessageEvidence(args, route, "[t](/principles/x)", {
      deepAskOperational: true,
      askModeRequested: "deep",
      askModeApplied: "fast",
    });
  assert.ok(ev.contextSources.map((s) => s.kind).includes("wiki_summaries"));
  assert.ok(ev.contextSources.map((s) => s.kind).includes("chapter_scenes"));
  assert.ok(ev.contextSources.map((s) => s.kind).includes("character_canon"));
  assert.ok(
    ev.contextSources.map((s) => s.kind).includes("character_arc_ledgers"),
  );
  assert.deepEqual(ev.linksInAnswer, [{ href: "/principles/x", text: "t" }]);
  assert.deepEqual(ev.route.personas, ["finder"]);
});

test("buildAskMessageEvidence exposes context-pack retrieval details", () => {
  const args = {
    ageMode: "adult",
    askContextPack: {
      schemaVersion: 1,
      message: "How does resonance work?",
      mode: "deep",
      intent: {
        kind: "world_rule",
        confidence: 0.72,
        reason: "world mechanic",
      },
      confidence: 0.91,
      budget: { maxItems: 10, maxChars: 9000, actualChars: 300 },
      gaps: ["One mechanism is still unresolved."],
      derivedInsights: [],
      items: [
        {
          kind: "rule",
          title: "Resonance Field",
          href: "/rules/resonance-field",
          canonRank: "wiki_canon",
          excerpt: "The field responds to coherent intent.",
          score: 13,
          slug: "resonance-field",
        },
      ],
    },
  } as PersonaPromptArgs;
  const route: PersonaRoute = {
    personas: ["ask_answerer"],
    depth: "deep",
    reason: "wiki-first",
  };

  const ev = buildAskMessageEvidence(args, route, "[r](/rules/resonance-field)", {
    deepAskOperational: true,
    askModeRequested: "deep",
    askModeApplied: "deep",
  });

  assert.equal(ev.retrieval?.intent, "world_rule");
  assert.equal(ev.retrieval?.confidence, 0.91);
  assert.equal(ev.retrieval?.items[0]?.title, "Resonance Field");
  assert.equal(ev.retrieval?.items[0]?.canonRank, "wiki_canon");
  assert.deepEqual(ev.retrieval?.gaps, ["One mechanism is still unresolved."]);
  assert.ok(ev.contextSources.map((s) => s.kind).includes("ask_context_pack"));
});
