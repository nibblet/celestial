/**
 * seed-canon-entities.ts
 *
 * Phase C of canon ingestion. Reads content/raw/canon_entities.json (merged,
 * deduped entities) and writes one markdown file per entity under
 * content/wiki/<kind>/<slug>.md.
 *
 * Idempotency model:
 *   - A bounded <!-- canon:dossier --> ... <!-- canon:end --> block carries
 *     all canonical data. Re-runs rewrite this block only.
 *   - Content outside the block (existing narrative, AI enrichment markers,
 *     Appearances lists, Lore metadata) is NEVER touched.
 *   - New files get a minimal scaffold (title, slug, canon block, stub
 *     sections for Appearances + Lore metadata). Existing files get only
 *     the canon block upserted.
 *
 * CLI:
 *   npx tsx scripts/seed-canon-entities.ts [--dry-run] [--kind <k>] [--slug <s>]
 */

import * as fs from "fs";
import * as path from "path";

const IN_PATH = path.join(process.cwd(), "content/raw/canon_entities.json");
const WIKI_DIR = path.join(process.cwd(), "content/wiki");

type Kind = "characters" | "artifacts" | "factions" | "locations" | "rules";
const ALL_KINDS: Kind[] = ["characters", "artifacts", "factions", "locations", "rules"];

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

interface MergedOutput {
  schemaVersion: 1;
  generatedAt: string;
  entities: MergedEntity[];
}

interface Options {
  dryRun: boolean;
  kind: Kind | null;
  slug: string | null;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const get = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };
  const kind = get("--kind");
  if (kind && !ALL_KINDS.includes(kind as Kind)) {
    console.error(`--kind must be one of ${ALL_KINDS.join(", ")}`);
    process.exit(1);
  }
  return {
    dryRun: args.includes("--dry-run"),
    kind: (kind as Kind) ?? null,
    slug: get("--slug"),
  };
}

function load(): MergedOutput {
  if (!fs.existsSync(IN_PATH)) {
    console.error(`Not found: ${IN_PATH}. Run merge-canon-inventory.ts first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(IN_PATH, "utf-8")) as MergedOutput;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/\n/g, " ");
}

function renderCanonBlock(e: MergedEntity, generated: string): string {
  const attrs = [
    `slug="${escapeAttr(e.slug)}"`,
    `kind="${e.kind}"`,
    `subkind="${e.subkind ? escapeAttr(e.subkind) : ""}"`,
    `parent="${e.parentSlug ? escapeAttr(e.parentSlug) : ""}"`,
    `generated="${generated}"`,
    `mentions="${e.mentions}"`,
  ].join(" ");

  const lines: string[] = [];
  lines.push(`<!-- canon:dossier ${attrs} -->`);
  lines.push(`## Canon Dossier`);
  lines.push("");
  if (e.aliases.length > 0) {
    lines.push(`**Aliases:** ${e.aliases.join(", ")}`);
    lines.push("");
  }
  if (e.parentSlug) {
    lines.push(`**Parent:** [[${e.parentSlug}]]`);
    lines.push("");
  }
  if (e.primaryProse) {
    lines.push(e.primaryProse.trim());
    lines.push("");
  }
  if (e.crossRefs.length > 0) {
    lines.push(`### Related`);
    lines.push(e.crossRefs.map((r) => `- [[${r}]]`).join("\n"));
    lines.push("");
  }
  if (e.sources.length > 0) {
    lines.push(`### Canon sources`);
    for (const s of e.sources) {
      lines.push(`- **${s.sourceDoc}** › ${s.sourceAnchor}`);
    }
    lines.push("");
  }
  lines.push(`<!-- canon:end -->`);
  return lines.join("\n");
}

function buildNewFile(e: MergedEntity, generated: string): string {
  const kindSingular: Record<Kind, string> = {
    characters: "character",
    artifacts: "artifact",
    factions: "faction",
    locations: "location",
    rules: "rule",
  };

  const lines: string[] = [];
  lines.push(`# ${e.name}`);
  lines.push(`**Slug:** ${e.slug}`);
  lines.push("");
  lines.push(renderCanonBlock(e, generated));
  lines.push("");
  lines.push(`## Appearances`);
  lines.push(`_(auto-generated; review and expand.)_`);
  lines.push("");
  lines.push(`## Lore metadata`);
  lines.push("");
  lines.push(`**Content type:** ${kindSingular[e.kind]}`);
  if (e.subkind) lines.push(`**Subkind:** ${e.subkind}`);
  if (e.parentSlug) lines.push(`**Parent slug:** ${e.parentSlug}`);
  lines.push(`**Source type:** canon_inventory`);
  lines.push(`**Canon status:** canonical`);
  lines.push(`**Visibility policy:** always_visible`);
  if (e.sources.length > 0) {
    lines.push(`**Source document:** ${e.sources[0].sourceDoc}`);
  }
  lines.push(`**Extractor version:** seed-canon-entities/1`);
  lines.push("");
  return lines.join("\n");
}

function upsertCanonBlock(raw: string, newBlock: string): string {
  const re = /<!--\s*canon:dossier[\s\S]*?<!--\s*canon:end\s*-->/;
  if (re.test(raw)) {
    return raw.replace(re, newBlock);
  }
  // Insert after the slug line (or after the H1 if no slug found).
  const slugMatch = raw.match(/(^\*\*Slug:\*\*.*$)/m);
  if (slugMatch) {
    return raw.replace(slugMatch[0], `${slugMatch[0]}\n\n${newBlock}`);
  }
  const h1Match = raw.match(/(^#\s+.*$)/m);
  if (h1Match) {
    return raw.replace(h1Match[0], `${h1Match[0]}\n\n${newBlock}`);
  }
  return `${newBlock}\n\n${raw}`;
}

function main() {
  const opts = parseArgs();
  const { entities } = load();
  const generated = new Date().toISOString().slice(0, 10);

  const targets = entities.filter((e) => {
    if (opts.kind && e.kind !== opts.kind) return false;
    if (opts.slug && e.slug !== opts.slug) return false;
    return true;
  });

  if (targets.length === 0) {
    console.error("No entities matched filters.");
    process.exit(1);
  }

  const totals = { created: 0, updated: 0, unchanged: 0 };

  for (const e of targets) {
    const dir = path.join(WIKI_DIR, e.kind);
    if (!fs.existsSync(dir)) {
      if (!opts.dryRun) fs.mkdirSync(dir, { recursive: true });
    }
    const filepath = path.join(dir, `${e.slug}.md`);
    const exists = fs.existsSync(filepath);

    const canonBlock = renderCanonBlock(e, generated);
    const nextContent = exists
      ? upsertCanonBlock(fs.readFileSync(filepath, "utf-8"), canonBlock)
      : buildNewFile(e, generated);

    const action = exists
      ? nextContent === fs.readFileSync(filepath, "utf-8")
        ? "unchanged"
        : "updated"
      : "created";

    if (action === "created") totals.created++;
    else if (action === "updated") totals.updated++;
    else totals.unchanged++;

    const marker =
      action === "created" ? "✓ new" : action === "updated" ? "↻ upd" : "· no-op";
    console.log(`  ${marker.padEnd(7)} ${e.kind}/${e.slug}.md`);

    if (!opts.dryRun && action !== "unchanged") {
      fs.writeFileSync(filepath, nextContent);
    }
  }

  console.log(`\nCanon seed`);
  console.log(`  created:   ${totals.created}`);
  console.log(`  updated:   ${totals.updated}`);
  console.log(`  unchanged: ${totals.unchanged}`);
  if (opts.dryRun) console.log(`  (dry-run; no files written)`);
}

main();
