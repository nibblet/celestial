/**
 * merge-canon-inventory.ts
 *
 * Phase B of canon ingestion. Reads content/raw/canon_inventory.json (raw
 * per-chunk entities from Phase A) and produces a deduped, merged set of
 * canonical entities ready for auto-seeding wiki files.
 *
 * Deterministic: no API calls. Rules:
 *   - Group by slug.
 *   - Kind: look up hard overrides first, then majority vote across sources.
 *   - Aliases + crossRefs: union (case-insensitive dedup; preserves first-seen).
 *   - parentSlug: most common non-null value; null only if all sources say null.
 *   - subkind: most common non-null value per resolved kind.
 *   - primaryProse: longest canonicalProse across sources.
 *   - sources[]: every (sourceDoc, sourceAnchor, canonicalProse) mention kept.
 *
 * Output: content/raw/canon_entities.json
 *
 * CLI:
 *   npx tsx scripts/merge-canon-inventory.ts [--dry-run]
 */

import * as fs from "fs";
import * as path from "path";

const IN_PATH = path.join(process.cwd(), "content/raw/canon_inventory.json");
const OUT_PATH = path.join(process.cwd(), "content/raw/canon_entities.json");

type Kind = "characters" | "artifacts" | "factions" | "locations" | "rules";

// Hard kind overrides. Slugs listed here are forced to the specified kind
// regardless of what Phase A chose. Add entries when review surfaces a miss.
const KIND_OVERRIDES: Record<string, Kind> = {
  sensorium: "locations",
  "resonant-pad": "locations",
  coherence: "rules",
};

// Alias → canonical slug. Entries here collapse synonym slugs (e.g. first-name
// variants, title-prefixed variants) into their canonical form before grouping.
// Add entries when review surfaces new duplicates. Ambiguous merges are NOT
// listed here — those get flagged in the single-source report instead.
const SLUG_ALIASES: Record<string, string> = {
  // characters
  galen: "galen-voss",
  aven: "aven-voss",
  thane: "thane-meric",
  evelyn: "evelyn-tran",
  "dr-evelyn-tran": "evelyn-tran",
  "dr-jonah-revas": "jonah-revas",
  lena: "lena-osei",
  "dr-lena-osei": "lena-osei",
  "major-marco-ruiz": "marco-ruiz",
  ruiz: "marco-ruiz",
  "jaxon-reyes": "jax-reyes",

  // factions — Ancients = Resonant (same civilization, internal vs retrospective label).
  resonant: "the-ancients",
  "resonant-civilization": "the-ancients",
  "the-resonant": "the-ancients",

  // artifacts
  "the-ship": "valkyrie-1",

  // locations
  "central-command-dome": "command-dome",
  "specimen-storage": "specimen-lockers",
  giza: "giza-plateau",
  "vault-annex": "vault-interface-annex",
};

// Slugs to drop from the merged output. Use for non-canonical constructs,
// interpretive labels, and category slugs that shouldn't exist as first-class
// entities (the instances are what matter, not the category name).
const SLUG_BLACKLIST = new Set<string>([
  // "The Coherence" is not a canonical faction; coherence is a rule, not an org.
  "the-coherence",
  // Vault category/mode labels. Vaults adapt per-interaction, so categorizing
  // by mode is interpretive. Only individual vaults (vault-002, etc.) and the
  // Giza vault remain; all are tagged subkind:vault via SUBKIND_OVERRIDES.
  "biotech-vaults",
  "echo-vaults",
  "silence-vaults",
  "threshold-vaults",
  "legacy-vaults",
  "vault-network",
  "the-vault-network",
  // Mentioned in canon as parable-adjacent, not a character entity.
  "messianic-figure",
]);

// Explicit parent-slug overrides applied after merge. Use when the inventory
// pass missed a hierarchy the taxonomy requires.
const PARENT_OVERRIDES: Record<string, string> = {
  "great-pyramid": "giza-plateau",
  "resonant-pad": "valkyrie-1",
  "witness-circle": "valkyrie-1",
  "zone-theta": "mars",
};

// Force a subkind on these slugs regardless of what Phase A inferred. Use for
// canonical classifications that need UI grouping (e.g. all vaults share a
// subkind so the wiki can render a "Vaults" section).
const SUBKIND_OVERRIDES: Record<string, string> = {
  "vault-002": "vault",
  "vault-003": "vault",
  "vault-006": "vault",
  "giza-vault": "vault",
};

// Force a display name. Use when longest-name merge picks a less canonical form
// (e.g. "Resonant civilization" over "The Ancients").
const NAME_OVERRIDES: Record<string, string> = {
  "the-ancients": "The Ancients",
  "command-dome": "Command Dome",
};

interface RawEntity {
  slug: string;
  name: string;
  aliases: string[];
  kind: Kind;
  subkind: string | null;
  parentSlug: string | null;
  sourceDoc: string;
  sourceAnchor: string;
  canonicalProse: string;
  crossRefs: string[];
}

interface RawChunk {
  chunkId: string;
  sourceDoc: string;
  heading: string;
  contentHash: string;
  entities: RawEntity[];
  model: string;
  generatedAt: string;
}

interface RawInventory {
  schemaVersion: number;
  generatedAt: string;
  chunks: RawChunk[];
}

interface MergedSource {
  sourceDoc: string;
  sourceAnchor: string;
  canonicalProse: string;
}

interface MergedEntity {
  slug: string;
  name: string;
  kind: Kind;
  subkind: string | null;
  parentSlug: string | null;
  aliases: string[];
  crossRefs: string[];
  primaryProse: string;
  sources: MergedSource[];
  mentions: number;
}

interface KindConflict {
  slug: string;
  candidates: Record<Kind, number>;
  resolvedTo: Kind;
  reason: "override" | "majority" | "tiebreak-first-seen";
}

interface MergedOutput {
  schemaVersion: 1;
  generatedAt: string;
  stats: {
    totalRawMentions: number;
    uniqueSlugs: number;
    byKind: Record<Kind, number>;
    singleSourceEntities: number;
  };
  kindConflicts: KindConflict[];
  entities: MergedEntity[];
}

function dryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function load(): RawInventory {
  if (!fs.existsSync(IN_PATH)) {
    console.error(`Not found: ${IN_PATH}. Run inventory-canon.ts first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(IN_PATH, "utf-8")) as RawInventory;
}

function canonicalizeAlias(a: string): string {
  return a.trim().toLowerCase();
}

function mergeStringList(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const v of values) {
    const trimmed = v.trim();
    if (!trimmed) continue;
    const key = canonicalizeAlias(trimmed);
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return [...seen.values()];
}

function mostCommonNonNull<T>(values: (T | null)[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) {
    if (v == null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: T | null = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

function resolveKind(
  slug: string,
  raws: RawEntity[]
): { kind: Kind; conflict: KindConflict | null } {
  const counts: Record<Kind, number> = {
    characters: 0,
    artifacts: 0,
    factions: 0,
    locations: 0,
    rules: 0,
  };
  for (const r of raws) {
    if (counts[r.kind] !== undefined) counts[r.kind]++;
  }
  const candidateKinds = (Object.keys(counts) as Kind[]).filter((k) => counts[k] > 0);

  if (KIND_OVERRIDES[slug]) {
    const forced = KIND_OVERRIDES[slug];
    if (candidateKinds.length > 1 || candidateKinds[0] !== forced) {
      return {
        kind: forced,
        conflict: { slug, candidates: counts, resolvedTo: forced, reason: "override" },
      };
    }
    return { kind: forced, conflict: null };
  }

  if (candidateKinds.length === 1) {
    return { kind: candidateKinds[0], conflict: null };
  }

  // Multiple candidates: majority vote, first-seen as tiebreak.
  let winner: Kind = candidateKinds[0];
  let winnerCount = counts[winner];
  for (const k of candidateKinds) {
    if (counts[k] > winnerCount) {
      winner = k;
      winnerCount = counts[k];
    }
  }
  const tied = candidateKinds.filter((k) => counts[k] === winnerCount);
  const reason: KindConflict["reason"] =
    tied.length > 1 ? "tiebreak-first-seen" : "majority";
  // On tie, use order of first appearance in raws.
  if (tied.length > 1) {
    for (const r of raws) {
      if (tied.includes(r.kind)) {
        winner = r.kind;
        break;
      }
    }
  }
  return {
    kind: winner,
    conflict: { slug, candidates: counts, resolvedTo: winner, reason },
  };
}

function pickDisplayName(raws: RawEntity[]): string {
  // Prefer the longest non-empty name (usually the canonical form).
  const names = raws.map((r) => r.name.trim()).filter(Boolean);
  if (names.length === 0) return raws[0]?.slug ?? "";
  names.sort((a, b) => b.length - a.length);
  return names[0];
}

/**
 * Build a richer primary paragraph by concatenating every distinct source
 * excerpt. Dedupes excerpts that are already substantially contained inside
 * another (substring or high token overlap). This is the main lever that
 * makes the web's CanonDossierCard surface content from multiple briefs,
 * not just the single longest chunk.
 */
function mergeProse(sources: MergedSource[]): string {
  const excerpts = sources
    .map((s) => s.canonicalProse.trim())
    .filter(Boolean);
  if (excerpts.length === 0) return "";
  // Sort longest-first so shorter fragments are measured against already-kept longer ones.
  const ordered = [...excerpts].sort((a, b) => b.length - a.length);
  const kept: string[] = [];
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const tokens = (s: string) => new Set(norm(s).split(" ").filter((t) => t.length >= 4));
  for (const e of ordered) {
    const en = norm(e);
    let skip = false;
    for (const k of kept) {
      const kn = norm(k);
      if (kn.includes(en)) {
        skip = true;
        break;
      }
      // Token-overlap containment: if 80%+ of e's distinctive tokens are in k, drop e.
      const et = tokens(e);
      if (et.size === 0) continue;
      const kt = tokens(k);
      let overlap = 0;
      for (const t of et) if (kt.has(t)) overlap++;
      if (overlap / et.size >= 0.8) {
        skip = true;
        break;
      }
    }
    if (!skip) kept.push(e);
  }
  // Restore original source order for readability (matches Canon sources list).
  const originalOrder = excerpts.filter((e) => kept.includes(e));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of originalOrder) {
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out.join("\n\n");
}

function mergeSlug(slug: string, raws: RawEntity[]): { entity: MergedEntity; conflict: KindConflict | null } {
  const { kind, conflict } = resolveKind(slug, raws);

  // When kind is overridden, DO NOT drop raws from the "losing" kinds. The
  // whole point of an override is that the LLM mistagged them — we still want
  // their source material (name, aliases, crossRefs, canonicalProse) to flow
  // through into the merged entity. We only suppress their subkind votes so
  // an artifact-flavored subkind doesn't bleed onto a location.
  //
  // For non-override resolutions, keep the old behavior (prefer aligned raws
  // so minority-kind noise doesn't pollute the merged record).
  const isOverride = conflict?.reason === "override";
  const aligned = raws.filter((r) => r.kind === kind);
  const source = isOverride ? raws : aligned.length > 0 ? aligned : raws;
  const subkindSource = aligned.length > 0 ? aligned : raws;

  const subkind = mostCommonNonNull<string>(subkindSource.map((r) => r.subkind));
  const parentSlug = mostCommonNonNull<string>(source.map((r) => r.parentSlug));

  const aliases = mergeStringList([
    ...source.flatMap((r) => r.aliases),
    ...source.map((r) => r.name).filter((n) => n && n !== pickDisplayName(source)),
  ]);

  const crossRefs = mergeStringList(source.flatMap((r) => r.crossRefs));

  // Dedupe sources by (doc + anchor + prose) so identical LLM re-extractions
  // don't stack in the dossier.
  const sourceKey = new Set<string>();
  const sources: MergedSource[] = [];
  for (const r of source) {
    const key = `${r.sourceDoc}\u0001${r.sourceAnchor}\u0001${r.canonicalProse}`;
    if (sourceKey.has(key)) continue;
    sourceKey.add(key);
    sources.push({
      sourceDoc: r.sourceDoc,
      sourceAnchor: r.sourceAnchor,
      canonicalProse: r.canonicalProse,
    });
  }

  const primaryProse = mergeProse(sources);

  return {
    entity: {
      slug,
      name: pickDisplayName(source),
      kind,
      subkind,
      parentSlug,
      aliases,
      crossRefs,
      primaryProse,
      sources,
      mentions: raws.length,
    },
    conflict,
  };
}

function main() {
  const inv = load();
  const allRaw = inv.chunks.flatMap((c) => c.entities);

  const aliasesApplied: Record<string, string> = {};
  const blacklisted: string[] = [];
  const bySlug = new Map<string, RawEntity[]>();
  for (const e of allRaw) {
    if (!e.slug) continue;
    if (SLUG_BLACKLIST.has(e.slug)) {
      blacklisted.push(e.slug);
      continue;
    }
    const canonical = SLUG_ALIASES[e.slug] ?? e.slug;
    if (canonical !== e.slug) {
      aliasesApplied[e.slug] = canonical;
      // Preserve the original form as an alias so the display layer can
      // still resolve references written against the old slug.
      e.aliases = [...e.aliases, e.name, e.slug];
      e.slug = canonical;
    }
    if (!bySlug.has(e.slug)) bySlug.set(e.slug, []);
    bySlug.get(e.slug)!.push(e);
  }

  const resolveCrossRef = (ref: string): string | null => {
    if (!ref) return null;
    if (SLUG_BLACKLIST.has(ref)) return null;
    return SLUG_ALIASES[ref] ?? ref;
  };

  const merged: MergedEntity[] = [];
  const conflicts: KindConflict[] = [];
  for (const [slug, raws] of bySlug) {
    const { entity, conflict } = mergeSlug(slug, raws);
    entity.crossRefs = mergeStringList(
      entity.crossRefs
        .map(resolveCrossRef)
        .filter((r): r is string => r != null && r !== entity.slug)
    );
    if (PARENT_OVERRIDES[entity.slug]) {
      entity.parentSlug = PARENT_OVERRIDES[entity.slug];
    }
    if (SUBKIND_OVERRIDES[entity.slug]) {
      entity.subkind = SUBKIND_OVERRIDES[entity.slug];
    }
    if (NAME_OVERRIDES[entity.slug]) {
      entity.name = NAME_OVERRIDES[entity.slug];
    }
    merged.push(entity);
    if (conflict) conflicts.push(conflict);
  }

  merged.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.slug.localeCompare(b.slug);
  });

  const byKind: Record<Kind, number> = {
    characters: 0,
    artifacts: 0,
    factions: 0,
    locations: 0,
    rules: 0,
  };
  for (const e of merged) byKind[e.kind]++;

  const singleSourceEntities = merged.filter((e) => e.sources.length === 1).length;

  const output: MergedOutput = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    stats: {
      totalRawMentions: allRaw.length,
      uniqueSlugs: merged.length,
      byKind,
      singleSourceEntities,
    },
    kindConflicts: conflicts,
    entities: merged,
  };

  console.log("Canon merge");
  console.log(`  total raw mentions: ${allRaw.length}`);
  console.log(`  blacklisted:        ${blacklisted.length} (${[...new Set(blacklisted)].join(", ") || "—"})`);
  console.log(`  aliases applied:    ${Object.keys(aliasesApplied).length}`);
  for (const [from, to] of Object.entries(aliasesApplied)) {
    console.log(`    ${from.padEnd(28)} → ${to}`);
  }
  console.log(`  unique entities:    ${merged.length}`);
  for (const k of Object.keys(byKind) as Kind[]) {
    console.log(`    ${k.padEnd(12)} ${byKind[k]}`);
  }
  console.log(`  single-source:      ${singleSourceEntities}`);
  console.log(`  kind conflicts:     ${conflicts.length}`);
  for (const c of conflicts) {
    const dist = (Object.entries(c.candidates) as [Kind, number][])
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k}=${n}`)
      .join(", ");
    console.log(`    ${c.slug.padEnd(24)} → ${c.resolvedTo.padEnd(10)} (${c.reason}; ${dist})`);
  }

  if (!dryRun()) {
    fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n");
    console.log(`\n  → ${OUT_PATH}`);
  } else {
    console.log("\n(dry-run; not written)");
  }
}

main();
