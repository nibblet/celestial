/**
 * Guardrails against the two regression classes we've seen from the ingestion
 * pipeline drifting away from the runtime wiki layout:
 *
 *   1. A slug living in two wiki directories (e.g. a vault shadowed as an
 *      artifact) — the seeder used to re-create artifact duplicates every run
 *      because it didn't know `vaults` was a first-class kind.
 *   2. A character's `Inventory entry (tiers: X)` line being unreachable by
 *      `entity-loader.parseNounCommon` — we had a 1200-char scan cap that
 *      broke once the canon dossier block grew past it, so every tier-A lead
 *      silently fell into the "Also listed here" fallback bucket.
 *
 * These are deterministic filesystem assertions — no network, no side effects.
 */

import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";

const WIKI_DIR = path.join(process.cwd(), "content/wiki");

const KIND_DIRS = [
  "artifacts",
  "characters",
  "factions",
  "locations",
  "people",
  "rules",
  "vaults",
];

function readKindSlugs(kind: string): string[] {
  const dir = path.join(WIKI_DIR, kind);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

test("wiki: no slug lives in two canon kind directories", () => {
  const ownerByslug = new Map<string, string>();
  const collisions: string[] = [];
  for (const kind of KIND_DIRS) {
    for (const slug of readKindSlugs(kind)) {
      const prior = ownerByslug.get(slug);
      if (prior && prior !== "people") {
        // `people` is the legacy shadow of `characters` — the loader already
        // resolves that collision by preferring characters/. Everything else
        // is a genuine duplicate that will confuse hub pages.
        collisions.push(`${slug}: ${prior} vs ${kind}`);
      } else {
        ownerByslug.set(slug, kind);
      }
    }
  }
  assert.deepEqual(
    collisions,
    [],
    `Duplicate slugs across wiki directories:\n  ${collisions.join("\n  ")}`,
  );
});

test("wiki: every character file has a reachable `Inventory entry (tiers: X)` line", () => {
  const dir = path.join(WIKI_DIR, "characters");
  if (!fs.existsSync(dir)) return;
  const failures: string[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    // Must match using the same regex entity-loader uses (anchored on the
    // "Inventory entry (tiers:" literal so canon-prose words like "tiers:"
    // don't accidentally satisfy it).
    const m = content.match(/Inventory entry\s*\(tiers:\s*([A-D,\s]+)\)/);
    if (!m) {
      failures.push(`${file}: no "Inventory entry (tiers: X)" line`);
      continue;
    }
    const tiers = m[1]!
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    for (const t of tiers) {
      if (!/^[A-D]$/.test(t)) {
        failures.push(`${file}: invalid tier "${t}"`);
      }
    }
  }
  assert.deepEqual(
    failures,
    [],
    `Characters missing a valid tier line:\n  ${failures.join("\n  ")}`,
  );
});

test("wiki: location `Superset:` line matches canon `parent` when canon has one", () => {
  const CANON_PATH = path.join(process.cwd(), "content/raw/canon_entities.json");
  if (!fs.existsSync(CANON_PATH)) return;
  const canon = JSON.parse(fs.readFileSync(CANON_PATH, "utf-8")) as {
    entities: Array<{ slug: string; kind: string; parentSlug: string | null }>;
  };
  const parentBySlug = new Map<string, string>();
  const kindBySlug = new Map<string, string>();
  for (const e of canon.entities) {
    kindBySlug.set(e.slug, e.kind);
    if (e.parentSlug) parentBySlug.set(e.slug, e.parentSlug);
  }

  const locDir = path.join(WIKI_DIR, "locations");
  if (!fs.existsSync(locDir)) return;
  const mismatches: string[] = [];

  for (const file of fs.readdirSync(locDir).filter((f) => f.endsWith(".md"))) {
    const slug = file.replace(/\.md$/, "");
    const canonParent = parentBySlug.get(slug);
    if (!canonParent) continue;

    const raw = fs.readFileSync(path.join(locDir, file), "utf-8");
    const m = raw.match(/\*\*Superset:\*\*\s*\[\[(?:([a-z]+):)?([a-z0-9-]+)\]\]/);
    if (!m) {
      mismatches.push(`${slug}: canon parent="${canonParent}" but no **Superset:** line`);
      continue;
    }
    const supersetSlug = m[2]!;
    if (supersetSlug !== canonParent) {
      mismatches.push(
        `${slug}: **Superset:** → ${supersetSlug} but canon parent="${canonParent}"`,
      );
      continue;
    }

    // Type prefix (when present) should match the parent's canon kind (singular
    // — e.g. `location:mars`, `artifact:valkyrie-1`).
    const typePrefix = m[1];
    if (typePrefix) {
      const parentKind = kindBySlug.get(canonParent);
      if (parentKind) {
        const singular: Record<string, string> = {
          artifacts: "artifact",
          characters: "character",
          factions: "faction",
          locations: "location",
          rules: "rule",
          vaults: "vault",
        };
        const expectedPrefix = singular[parentKind];
        if (expectedPrefix && typePrefix !== expectedPrefix) {
          mismatches.push(
            `${slug}: **Superset:** type "${typePrefix}:" but parent ${canonParent} is kind "${parentKind}" (expected "${expectedPrefix}:")`,
          );
        }
      }
    }
  }

  assert.deepEqual(
    mismatches,
    [],
    `Location Superset lines drift from canon parent:\n  ${mismatches.join("\n  ")}`,
  );
});

test("wiki: every canon-seeded slug lives in the directory its canon kind names", () => {
  const CANON_PATH = path.join(process.cwd(), "content/raw/canon_entities.json");
  if (!fs.existsSync(CANON_PATH)) return;
  const canon = JSON.parse(fs.readFileSync(CANON_PATH, "utf-8")) as {
    entities: Array<{ slug: string; kind: string }>;
  };
  const misplaced: string[] = [];
  const missing: string[] = [];
  for (const e of canon.entities) {
    const expected = path.join(WIKI_DIR, e.kind, `${e.slug}.md`);
    if (fs.existsSync(expected)) continue;

    // Either the file isn't on disk at all, or it's in a different dir (which
    // is the exact symptom of an ingestion/runtime taxonomy mismatch).
    let foundIn: string | null = null;
    for (const k of KIND_DIRS) {
      if (k === e.kind) continue;
      if (fs.existsSync(path.join(WIKI_DIR, k, `${e.slug}.md`))) {
        foundIn = k;
        break;
      }
    }
    if (foundIn) misplaced.push(`${e.slug}: canon kind="${e.kind}" but file lives in /${foundIn}/`);
    else missing.push(`${e.slug}: expected at /${e.kind}/${e.slug}.md`);
  }
  assert.deepEqual(
    misplaced,
    [],
    `Canon kind does not match wiki directory:\n  ${misplaced.join("\n  ")}`,
  );
  assert.deepEqual(
    missing,
    [],
    `Canon entities without a wiki file:\n  ${missing.join("\n  ")}`,
  );
});
