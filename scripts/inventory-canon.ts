/**
 * inventory-canon.ts
 *
 * Phase A of the canon ingestion pipeline. Reads every markdown file under
 * celestial_original/ and produces a structured inventory of every named
 * entity across the corpus, classified into the wiki's broadened taxonomy.
 *
 * Output: content/raw/canon_inventory.json
 *
 * Idempotency: each source chunk is hashed; a chunk whose hash is already in
 * the prior inventory output is skipped (no API call). Use --force to regen.
 *
 * CLI:
 *   npx tsx scripts/inventory-canon.ts [--dry-run] [--force] [--doc <name>]
 *
 * Taxonomy:
 *   - characters: named individuals (humans, named AIs like ALARA)
 *   - artifacts: objects with identity (ships, vaults, relics, devices)
 *   - factions: any collective — political, syndicate, civilization, ai-collective
 *   - locations: places; `parentSlug` for sub-locations (e.g. rooms in a ship)
 *   - rules: laws, protocols, parables, principles, directives
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";

(() => {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
})();

const MODEL = "claude-sonnet-4-5";
const CANON_DIR = path.join(process.cwd(), "celestial_original");
const OUT_PATH = path.join(process.cwd(), "content/raw/canon_inventory.json");

// Docs in celestial_original/ that are NOT entity-bearing canon and must not
// be run through the entity extractor. These fall into two buckets:
//
//   - World-state prose (setting snapshots) — belongs in content/wiki/rules/
//     as always-on world law, not as extracted entities. The LLM would
//     otherwise emit thin shells like "united-nations" or re-surface already-
//     canonical entities (Mars, Valkyrie-1) with prose stripped of the
//     actual setting context we care about.
//
//   - Author meta (style guides, log/template frameworks) — not in-universe
//     canon at all. Extraction just pollutes entity sources with author-facing
//     tables ("character voice qualities") and template example logs.
//
// Every entity these docs previously contributed is already present in a
// proper entity-bearing doc (Series Bible, Character Dossier, Vault Tracker,
// Ancient Lore, Valkyrie-1 Technical Brief, Interior Specifications, Visual
// & Structural Brief, Addendum Earth 2050 World Snapshot, Parable Catalog).
// See docs/canon-integrity-program.md §2.3 for the lore-vs-plot split.
const SKIP_DOCS = new Set<string>([
  "Earth 2050_ World Snapshot.md",
  "Style & Voice Guide Celestial Heritage.md",
  "Valkyrie-1 Mission Log Framework.md",
]);

// Inline approximation of tokens: ~4 chars per token. Cap a chunk at ~6K tokens
// of source material; the Series Bible (~1454 lines, ~45K chars) needs splitting.
const MAX_CHUNK_CHARS = 24_000;

type Kind = "characters" | "artifacts" | "factions" | "locations" | "rules";

interface CanonEntity {
  slug: string;
  name: string;
  aliases: string[];
  kind: Kind;
  subkind: string | null; // collectiveKind for factions, ruleKind for rules, etc.
  parentSlug: string | null;
  sourceDoc: string;
  sourceAnchor: string;
  canonicalProse: string;
  crossRefs: string[];
}

interface InventoryChunk {
  chunkId: string; // e.g. "Series Bible.md#3. Core Characters"
  sourceDoc: string;
  heading: string;
  contentHash: string;
  entities: CanonEntity[];
  model: string;
  generatedAt: string;
}

interface InventoryFile {
  schemaVersion: 1;
  generatedAt: string;
  chunks: InventoryChunk[];
}

interface Options {
  dryRun: boolean;
  force: boolean;
  onlyDoc: string | null;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const getFlag = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    onlyDoc: getFlag("--doc"),
  };
}

interface Chunk {
  sourceDoc: string;
  heading: string;
  text: string;
}

/**
 * Split a source doc into chunks. Short docs stay whole. Long docs split at
 * top-level (# or ##) headings, keeping each section whole. If any section is
 * still too big, it gets split at the next level.
 */
function chunkDoc(sourceDoc: string, raw: string): Chunk[] {
  if (raw.length <= MAX_CHUNK_CHARS) {
    return [{ sourceDoc, heading: "(whole)", text: raw }];
  }

  const splitAt = (text: string, re: RegExp): Chunk[] => {
    const parts: { heading: string; text: string }[] = [];
    const lines = text.split("\n");
    let current: { heading: string; text: string } | null = null;
    for (const line of lines) {
      if (re.test(line)) {
        if (current) parts.push(current);
        current = { heading: line.replace(/^#+\s*/, "").trim(), text: line + "\n" };
      } else if (current) {
        current.text += line + "\n";
      } else {
        current = { heading: "(preamble)", text: line + "\n" };
      }
    }
    if (current) parts.push(current);
    return parts.map((p) => ({ sourceDoc, heading: p.heading, text: p.text }));
  };

  const chunks = splitAt(raw, /^#\s+/);
  // Further split any chunk still over the cap by H2.
  const out: Chunk[] = [];
  for (const c of chunks) {
    if (c.text.length <= MAX_CHUNK_CHARS) {
      out.push(c);
      continue;
    }
    const sub = splitAt(c.text, /^##\s+/).map((s) => ({
      ...s,
      heading: `${c.heading} › ${s.heading}`,
    }));
    for (const s of sub) {
      if (s.text.length <= MAX_CHUNK_CHARS) {
        out.push(s);
      } else {
        // Give up gracefully: hard-slice.
        let i = 0;
        while (i < s.text.length) {
          out.push({
            sourceDoc,
            heading: `${s.heading} [${Math.floor(i / MAX_CHUNK_CHARS) + 1}]`,
            text: s.text.slice(i, i + MAX_CHUNK_CHARS),
          });
          i += MAX_CHUNK_CHARS;
        }
      }
    }
  }
  return out;
}

function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
}

function loadPriorInventory(): InventoryFile | null {
  if (!fs.existsSync(OUT_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")) as InventoryFile;
  } catch {
    return null;
  }
}

function systemPrompt(): string {
  return `You are cataloging canonical lore for the Celestial Heritage series wiki. You will receive one chunk of a source document. Enumerate EVERY named entity in the chunk and classify each using this taxonomy:

**kinds:**
- **characters** — individual named beings. Includes humans AND named AIs (e.g. ALARA is a character; treat her as a character). Only NAMED individuals; skip unnamed ones.
- **artifacts** — objects with identity: ships, vaults, relics, devices, specific pieces of technology. Each vault is its own artifact.
- **factions** — any collective group. Set subkind to one of: "political" (governing bodies), "syndicate" (criminal/commercial orgs), "civilization" (ancient peoples), "ai-collective" (group AIs like The Watchers).
- **locations** — places (planets, sites, rooms, decks). For sub-locations inside a larger place (e.g. a room inside a ship), set parentSlug to the parent's slug. Each distinct vault is an ARTIFACT not a location; the physical site where a vault is buried may be its own location.
- **rules** — laws, protocols, parables, principles, directives. Set subkind to one of: "protocol" (operational procedure), "parable" (philosophical/moral teaching), "principle" (core tenet), "directive" (command/order, e.g. "Directive 14").

**slug rules:**
- lowercase, hyphenated, ASCII only
- use the most common name (e.g. "valkyrie-1", "the-ancients", "alara")
- strip leading "the-" ONLY if the entity is typically referenced without it

**output contract:**
Respond with a SINGLE JSON object, no prose, no code fences:
{ "entities": [ { ... }, { ... } ] }

Each entity has this exact shape:
{
  "slug": string,
  "name": string (canonical display name),
  "aliases": string[] (other names/forms used in the chunk),
  "kind": "characters" | "artifacts" | "factions" | "locations" | "rules",
  "subkind": string | null,
  "parentSlug": string | null (for sub-locations; null otherwise),
  "sourceAnchor": string (the nearest heading the entity is described under),
  "canonicalProse": string (verbatim or near-verbatim quote/summary from the chunk that defines this entity, max ~400 words),
  "crossRefs": string[] (slugs of OTHER entities this one relates to, if clear from the text)
}

**rules for inclusion:**
- Skip minor mentions that don't describe the entity. Include only entities the chunk actually defines or substantively describes.
- If the same entity is described in multiple chunks, that's fine — merge happens later.
- Do NOT invent entities not in the chunk. Do NOT invent cross-refs.
- If the chunk has no classifiable entities, return { "entities": [] }.`;
}

function userPrompt(chunk: Chunk): string {
  return `Source document: **${chunk.sourceDoc}**
Section: **${chunk.heading}**

---

${chunk.text}`;
}

function parseJson(text: string): CanonEntity[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model response");
  }
  const parsed = JSON.parse(candidate.slice(start, end + 1));
  const entities = Array.isArray(parsed.entities) ? parsed.entities : [];
  return entities.map((e: Record<string, unknown>) => ({
    slug: String(e.slug ?? "").trim(),
    name: String(e.name ?? "").trim(),
    aliases: Array.isArray(e.aliases) ? e.aliases.map(String) : [],
    kind: String(e.kind ?? "") as Kind,
    subkind: e.subkind == null ? null : String(e.subkind),
    parentSlug: e.parentSlug == null ? null : String(e.parentSlug),
    sourceDoc: "", // filled by caller
    sourceAnchor: String(e.sourceAnchor ?? "").trim(),
    canonicalProse: String(e.canonicalProse ?? "").trim(),
    crossRefs: Array.isArray(e.crossRefs) ? e.crossRefs.map(String) : [],
  }));
}

const VALID_KINDS: Kind[] = ["characters", "artifacts", "factions", "locations", "rules"];

function validateEntity(e: CanonEntity): string | null {
  if (!e.slug) return "missing slug";
  if (!/^[a-z0-9][a-z0-9-]*$/.test(e.slug)) return `invalid slug: "${e.slug}"`;
  if (!e.name) return "missing name";
  if (!VALID_KINDS.includes(e.kind)) return `invalid kind: "${e.kind}"`;
  return null;
}

async function inventoryChunk(
  client: Anthropic,
  chunk: Chunk
): Promise<CanonEntity[]> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: systemPrompt(),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt(chunk) }],
  });
  const textBlock = res.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in model response");
  }
  const entities = parseJson(textBlock.text).map((e) => ({
    ...e,
    sourceDoc: chunk.sourceDoc,
  }));
  return entities;
}

async function main() {
  const opts = parseArgs();

  const files = fs
    .readdirSync(CANON_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => !SKIP_DOCS.has(f))
    .filter((f) => !opts.onlyDoc || f === opts.onlyDoc);

  const skipped = [...SKIP_DOCS].filter((f) =>
    fs.existsSync(path.join(CANON_DIR, f))
  );
  if (skipped.length > 0) {
    console.log(`→ skipping non-entity docs: ${skipped.join(", ")}`);
  }

  if (files.length === 0) {
    console.error(`No canon .md files found (onlyDoc=${opts.onlyDoc ?? "*"})`);
    process.exit(1);
  }

  const prior = opts.force ? null : loadPriorInventory();
  const priorByHash = new Map<string, InventoryChunk>();
  if (prior) {
    for (const c of prior.chunks) priorByHash.set(c.contentHash, c);
  }

  const allChunks: Chunk[] = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(CANON_DIR, f), "utf-8");
    allChunks.push(...chunkDoc(f, raw));
  }

  console.log(`→ ${files.length} canon docs, ${allChunks.length} chunks\n`);

  const client = opts.dryRun
    ? null
    : (() => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          console.error("ANTHROPIC_API_KEY missing.");
          process.exit(1);
        }
        return new Anthropic({ apiKey });
      })();

  const outChunks: InventoryChunk[] = [];
  const totals = { reused: 0, generated: 0, skipped: 0, entities: 0, errors: 0 };

  for (const chunk of allChunks) {
    const hash = hashContent(chunk.text);
    const chunkId = `${chunk.sourceDoc}#${chunk.heading}`;
    const prev = priorByHash.get(hash);
    if (prev && !opts.force) {
      outChunks.push(prev);
      totals.reused++;
      totals.entities += prev.entities.length;
      console.log(`  ⏭  ${chunkId} (${prev.entities.length} cached)`);
      continue;
    }

    if (opts.dryRun) {
      console.log(`  ── DRY: ${chunkId} (${chunk.text.length} chars)`);
      totals.skipped++;
      continue;
    }

    if (!client) throw new Error("client not init");

    try {
      const entities = await inventoryChunk(client, chunk);
      const valid: CanonEntity[] = [];
      for (const e of entities) {
        const err = validateEntity(e);
        if (err) {
          console.warn(`    ⚠  ${chunkId} / ${e.slug || "?"}: ${err}`);
          totals.errors++;
          continue;
        }
        valid.push(e);
      }
      outChunks.push({
        chunkId,
        sourceDoc: chunk.sourceDoc,
        heading: chunk.heading,
        contentHash: hash,
        entities: valid,
        model: MODEL,
        generatedAt: new Date().toISOString(),
      });
      totals.generated++;
      totals.entities += valid.length;
      console.log(`  ✓ ${chunkId} (${valid.length} entities)`);
    } catch (err) {
      totals.errors++;
      console.error(
        `  ⚠  ${chunkId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (!opts.dryRun) {
    const outDir = path.dirname(OUT_PATH);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const output: InventoryFile = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      chunks: outChunks,
    };
    fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n");
  }

  console.log("\nCanon inventory");
  console.log(`  ✓ generated: ${totals.generated}`);
  console.log(`  ⏭  reused:    ${totals.reused}`);
  if (opts.dryRun) console.log(`  (dry)       ${totals.skipped}`);
  console.log(`  Σ entities: ${totals.entities}`);
  if (totals.errors > 0) console.log(`  ⚠  errors:   ${totals.errors}`);
  if (!opts.dryRun) console.log(`  → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
