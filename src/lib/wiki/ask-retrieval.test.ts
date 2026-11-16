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
          // A chapter-1 reader has met this rule, so its record is in play.
          record: [
            {
              chapterNumber: 1,
              text: "The resonance field responds to coherent intent.",
            },
          ],
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
    // Arc ledgers span the whole book, so only finished readers get them.
    readerProgress: { ...readerProgress, showAllContent: true },
  });

  assert.equal(items[0]?.kind, "character_arc");
  assert.equal(items[0]?.slug, "thane-meric");
});

test("a first name in the question brings that person's file into context", () => {
  const chapters = Array.from({ length: 12 }, (_, i) => ({
    storyId: `CH${String(i + 1).padStart(2, "0")}`,
    title: `Chapter ${i + 1}`,
    href: `/stories/CH${String(i + 1).padStart(2, "0")}`,
    summary: "Thane and Galen aboard the ship as it responds.",
    text: "Filler paragraph that is long enough to count but says little of note here.\n\nThane pressed his palm to the hull and the ship responded to him; Galen felt nothing at all.",
  }));
  const items = retrieveAskContextItems({
    message: "Why did the ship respond to Thane and not Galen?",
    intent: { kind: "thematic", confidence: 0.7 } as never,
    sources: {
      stories: chapters,
      entities: [
        { title: "Thane Meric", slug: "thane-meric", href: "/characters/thane-meric", text: "Resonant.", storyIds: [] },
        { title: "Galen Voss", slug: "galen-voss", href: "/characters/galen-voss", text: "Commander.", storyIds: [] },
      ],
      rules: [],
      arcs: [],
    },
  });
  const hrefs = items.map((i) => i.href);
  assert.ok(hrefs.includes("/characters/thane-meric"));
  assert.ok(hrefs.includes("/characters/galen-voss"));
  assert.equal(items.filter((i) => i.kind === "story").length, 6);
  const story = items.find((i) => i.kind === "story")!;
  assert.match(story.excerpt, /Passage: Thane pressed his palm/);
});

test("a mid-book reader gets a met file's record up to their bookmark, not its dossier", () => {
  const sources = {
    stories: [],
    entities: [
      {
        title: "Vault 002",
        slug: "vault-002",
        href: "/vaults/vault-002",
        text: "Dossier: in chapter 17 the vault's final secret is revealed.",
        storyIds: ["CH03", "CH04", "CH17"],
        record: [
          { chapterNumber: 3, text: "Lena descends into the vault." },
          { chapterNumber: 4, text: "ALARA awakens inside it." },
          { chapterNumber: 17, text: "Its final secret is revealed." },
        ],
      },
      {
        title: "Vault 003",
        slug: "vault-003",
        href: "/vaults/vault-003",
        text: "Later vault.",
        storyIds: ["CH09"],
        record: [{ chapterNumber: 9, text: "Activated by Evelyn." }],
      },
    ],
    rules: [],
    arcs: [],
  };
  const ask = (currentChapterNumber: number, showAllContent: boolean) =>
    retrieveAskContextItems({
      message: "What is Vault 002 and Vault 003?",
      intent: { kind: "factual", confidence: 0.8 } as never,
      readerProgress: {
        readStoryIds: [],
        currentChapter: "CH04",
        currentChapterNumber,
        showAllContent,
      },
      sources,
    });

  const mid = ask(4, false);
  assert.deepEqual(mid.map((i) => i.href), ["/vaults/vault-002"]);
  assert.match(mid[0]!.excerpt, /Chapter 3: Lena descends/);
  assert.match(mid[0]!.excerpt, /Chapter 4: ALARA awakens/);
  assert.doesNotMatch(mid[0]!.excerpt, /final secret/);

  const finished = ask(4, true);
  assert.equal(finished.length, 2);
  assert.match(finished[0]!.excerpt + finished[1]!.excerpt, /Dossier:/);
});

test("a mid-book reader gets no arcs and only a rule's record up to their bookmark", () => {
  const items = retrieveAskContextItems({
    message: "How does the weightless measure work for Jonah?",
    intent: { kind: "world_rule", confidence: 0.8 } as never,
    readerProgress: {
      readStoryIds: [],
      currentChapter: "CH04",
      currentChapterNumber: 4,
      showAllContent: false,
    },
    sources: {
      stories: [],
      entities: [],
      rules: [
        {
          title: "The Weightless Measure",
          slug: "the-weightless-measure",
          href: "/rules/the-weightless-measure",
          text: "In chapter 6 it reaches Jonah as a minor echo.",
          record: [
            { chapterNumber: 3, text: "First hinted at in the vault." },
            { chapterNumber: 6, text: "Reaches Jonah." },
          ],
        },
        {
          title: "The Weightless Later Rule",
          slug: "later",
          href: "/rules/later",
          text: "Weightless measure, later.",
          record: [{ chapterNumber: 9, text: "Weightless measure appears." }],
        },
      ],
      arcs: [
        { title: "Jonah Revas", slug: "jonah-revas", href: "/arcs/jonah-revas", text: "Jonah ends the book changed." },
      ],
    },
  });
  assert.deepEqual(items.map((i) => i.href), ["/rules/the-weightless-measure"]);
  assert.match(items[0]!.excerpt, /Chapter 3: First hinted/);
  assert.doesNotMatch(items[0]!.excerpt, /Jonah/);
});
