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
