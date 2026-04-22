import test from "node:test";
import assert from "node:assert/strict";
import {
  diffCanonSnapshots,
  isBlocking,
  type CanonSnapshot,
  type EntitySnapshot,
} from "@/lib/wiki/continuity-diff";

// ── Fixtures ─────────────────────────────────────────────────────────

function entity(overrides: Partial<EntitySnapshot> = {}): EntitySnapshot {
  return {
    canonicalSlug: overrides.canonicalSlug ?? "slug",
    kind: overrides.kind ?? "characters",
    parentSlug: overrides.parentSlug ?? null,
    aliases: overrides.aliases ?? [],
    lastSeenIn: overrides.lastSeenIn ?? [],
  };
}

function snapshot(partial: {
  entities?: Record<string, EntitySnapshot>;
  chapters?: Record<string, { themes: string[] }>;
}): CanonSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: "2026-04-21T00:00:00.000Z",
    entities: partial.entities ?? {},
    chapters: partial.chapters ?? {},
  };
}

// ── first run ────────────────────────────────────────────────────────

test("first run (no previous snapshot) returns no contradictions", () => {
  const current = snapshot({
    entities: {
      alara: entity({ canonicalSlug: "alara", aliases: ["Alara"] }),
    },
  });
  assert.deepEqual(diffCanonSnapshots(null, current), []);
});

test("purely additive changes produce no contradictions", () => {
  const prev = snapshot({
    entities: { alara: entity({ canonicalSlug: "alara" }) },
  });
  const curr = snapshot({
    entities: {
      alara: entity({ canonicalSlug: "alara" }),
      evelyn: entity({ canonicalSlug: "evelyn", kind: "characters" }),
    },
  });
  assert.deepEqual(diffCanonSnapshots(prev, curr), []);
});

// ── alias_moved ──────────────────────────────────────────────────────

test("alias that jumps from one entity to another is flagged", () => {
  const prev = snapshot({
    entities: {
      "rigel-ascendant": entity({
        canonicalSlug: "rigel-ascendant",
        aliases: ["CNV-014-A", "Rigel Ascendant"],
      }),
      valkyrie: entity({ canonicalSlug: "valkyrie", aliases: ["Valkyrie-1"] }),
    },
  });
  const curr = snapshot({
    entities: {
      "rigel-ascendant": entity({
        canonicalSlug: "rigel-ascendant",
        aliases: ["Rigel Ascendant"],
      }),
      valkyrie: entity({
        canonicalSlug: "valkyrie",
        aliases: ["Valkyrie-1", "CNV-014-A"],
      }),
    },
  });
  const diffs = diffCanonSnapshots(prev, curr);
  assert.equal(diffs.length, 1);
  assert.deepEqual(diffs[0], {
    kind: "alias_moved",
    alias: "cnv-014-a",
    fromSlug: "rigel-ascendant",
    toSlug: "valkyrie",
  });
  assert.equal(isBlocking(diffs[0]!), true);
});

test("alias case changes alone are not reported as moved", () => {
  const prev = snapshot({
    entities: {
      alara: entity({ canonicalSlug: "alara", aliases: ["Alara"] }),
    },
  });
  const curr = snapshot({
    entities: {
      alara: entity({ canonicalSlug: "alara", aliases: ["ALARA"] }),
    },
  });
  assert.deepEqual(diffCanonSnapshots(prev, curr), []);
});

// ── entity_vanished ──────────────────────────────────────────────────

test("entity present before but missing now is flagged", () => {
  const prev = snapshot({
    entities: {
      alara: entity({ canonicalSlug: "alara" }),
      "ghost-entity": entity({ canonicalSlug: "ghost-entity" }),
    },
  });
  const curr = snapshot({
    entities: { alara: entity({ canonicalSlug: "alara" }) },
  });
  const diffs = diffCanonSnapshots(prev, curr);
  assert.equal(diffs.length, 1);
  assert.deepEqual(diffs[0], { kind: "entity_vanished", slug: "ghost-entity" });
  assert.equal(isBlocking(diffs[0]!), false);
});

// ── relation_flipped ─────────────────────────────────────────────────

test("kind change emits a relation_flipped contradiction", () => {
  const prev = snapshot({
    entities: {
      sensorium: entity({ canonicalSlug: "sensorium", kind: "artifacts" }),
    },
  });
  const curr = snapshot({
    entities: {
      sensorium: entity({ canonicalSlug: "sensorium", kind: "locations" }),
    },
  });
  const diffs = diffCanonSnapshots(prev, curr);
  assert.equal(diffs.length, 1);
  assert.deepEqual(diffs[0], {
    kind: "relation_flipped",
    subject: "sensorium",
    predicate: "kind",
    before: "artifacts",
    after: "locations",
  });
  assert.equal(isBlocking(diffs[0]!), true);
});

test("parentSlug change emits a relation_flipped contradiction", () => {
  const prev = snapshot({
    entities: {
      "harmonic-drive": entity({
        canonicalSlug: "harmonic-drive",
        parentSlug: "valkyrie",
      }),
    },
  });
  const curr = snapshot({
    entities: {
      "harmonic-drive": entity({
        canonicalSlug: "harmonic-drive",
        parentSlug: "rigel-ascendant",
      }),
    },
  });
  const diffs = diffCanonSnapshots(prev, curr);
  assert.equal(diffs.length, 1);
  assert.deepEqual(diffs[0], {
    kind: "relation_flipped",
    subject: "harmonic-drive",
    predicate: "parentSlug",
    before: "valkyrie",
    after: "rigel-ascendant",
  });
});

// ── chapter_theme_changed ────────────────────────────────────────────

test("chapter whose themes list was reordered or edited is flagged", () => {
  const prev = snapshot({
    chapters: {
      CH01: { themes: ["awakening", "loss"] },
    },
  });
  const curr = snapshot({
    chapters: {
      CH01: { themes: ["loss", "awakening"] },
    },
  });
  const diffs = diffCanonSnapshots(prev, curr);
  assert.equal(diffs.length, 1);
  assert.deepEqual(diffs[0], {
    kind: "chapter_theme_changed",
    storyId: "CH01",
    before: ["awakening", "loss"],
    after: ["loss", "awakening"],
  });
  assert.equal(isBlocking(diffs[0]!), false);
});

test("chapter whose themes didn't change is not flagged", () => {
  const prev = snapshot({
    chapters: { CH01: { themes: ["awakening"] } },
  });
  const curr = snapshot({
    chapters: { CH01: { themes: ["awakening"] } },
  });
  assert.deepEqual(diffCanonSnapshots(prev, curr), []);
});

// ── mixed scenario ───────────────────────────────────────────────────

test("multiple contradiction kinds surface together, grouped by variant", () => {
  const prev = snapshot({
    entities: {
      alara: entity({ canonicalSlug: "alara", aliases: ["A.L.A.R.A."] }),
      doomed: entity({ canonicalSlug: "doomed" }),
      sensorium: entity({ canonicalSlug: "sensorium", kind: "artifacts" }),
    },
    chapters: { CH01: { themes: ["awakening"] } },
  });
  const curr = snapshot({
    entities: {
      alara: entity({ canonicalSlug: "alara" }),
      "new-claim": entity({
        canonicalSlug: "new-claim",
        aliases: ["A.L.A.R.A."],
      }),
      sensorium: entity({ canonicalSlug: "sensorium", kind: "locations" }),
    },
    chapters: { CH01: { themes: ["awakening", "loss"] } },
  });
  const diffs = diffCanonSnapshots(prev, curr);
  const kinds = diffs.map((d) => d.kind);
  assert.deepEqual(kinds, [
    "alias_moved",
    "entity_vanished",
    "relation_flipped",
    "chapter_theme_changed",
  ]);
});
