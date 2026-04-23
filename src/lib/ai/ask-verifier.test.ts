import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyAskAnswer,
  getAskVerifierStrictnessFromEnv,
} from "./ask-verifier";

test("off-chapter entity links produce a warn issue when storySlug is set", async () => {
  const prev = process.env.ASK_VERIFIER_STRICTNESS;
  process.env.ASK_VERIFIER_STRICTNESS = "warn";
  try {
    // CH01's tagged vocabulary does not include `/factions/the-watchers`.
    // The page exists (so no unknown_wiki_link), but the chapter never tagged
    // it — that is exactly the off_chapter_entity_link signal.
    const r = await verifyAskAnswer({
      userQuestion: "Who is watching?",
      assistantText: "See [The Watchers](/factions/the-watchers).",
      linksInAnswer: [
        { href: "/factions/the-watchers", text: "The Watchers" },
      ],
      storySlug: "CH01-dustfall",
    });
    const codes = r.issues.map((i) => i.code);
    assert.ok(
      codes.includes("off_chapter_entity_link"),
      `expected off_chapter_entity_link in ${JSON.stringify(codes)}`,
    );
    assert.ok(
      !codes.includes("unknown_wiki_link"),
      "valid wiki page should not emit unknown_wiki_link",
    );
  } finally {
    if (prev === undefined) delete process.env.ASK_VERIFIER_STRICTNESS;
    else process.env.ASK_VERIFIER_STRICTNESS = prev;
  }
});

test("on-chapter entity links do NOT emit off_chapter_entity_link", async () => {
  const prev = process.env.ASK_VERIFIER_STRICTNESS;
  process.env.ASK_VERIFIER_STRICTNESS = "warn";
  try {
    // CH01 is tagged with galen-voss (lead) and project-valkyrie (faction).
    const r = await verifyAskAnswer({
      userQuestion: "Who commands the dig?",
      assistantText:
        "[Galen Voss](/characters/galen-voss) leads [Project Valkyrie](/factions/project-valkyrie).",
      linksInAnswer: [
        { href: "/characters/galen-voss", text: "Galen Voss" },
        { href: "/factions/project-valkyrie", text: "Project Valkyrie" },
      ],
      storySlug: "CH01-dustfall",
    });
    const codes = r.issues.map((i) => i.code);
    assert.ok(
      !codes.includes("off_chapter_entity_link"),
      `unexpected off_chapter_entity_link: ${JSON.stringify(codes)}`,
    );
  } finally {
    if (prev === undefined) delete process.env.ASK_VERIFIER_STRICTNESS;
    else process.env.ASK_VERIFIER_STRICTNESS = prev;
  }
});

test("when strictness is off, verifier returns empty issues", async () => {
  const prev = process.env.ASK_VERIFIER_STRICTNESS;
  process.env.ASK_VERIFIER_STRICTNESS = "off";
  try {
    assert.equal(getAskVerifierStrictnessFromEnv(), "off");
    const r = await verifyAskAnswer({
      userQuestion: "Who is Galen?",
      assistantText: "Galen appears in chapter one.",
      linksInAnswer: [],
    });
    assert.equal(r.strictness, "off");
    assert.equal(r.issues.length, 0);
  } finally {
    if (prev === undefined) delete process.env.ASK_VERIFIER_STRICTNESS;
    else process.env.ASK_VERIFIER_STRICTNESS = prev;
  }
});
