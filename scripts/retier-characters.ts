/**
 * Recompute `Inventory entry (tiers: X)` for each character markdown file
 * from brain_lab/out/entities/entities.json chapter appearance counts,
 * with overrides from content/wiki/characters/tiers.override.yaml.
 *
 * Tiers:
 *   A — >= 7 chapter appearances (Leads / POV)
 *   B — 3-6                       (Recurring)
 *   C — 1-2                       (Named)
 *   D — 0 (or override only)      (Historical / offscreen / background)
 *
 *   node --import tsx scripts/retier-characters.ts
 *
 * Idempotent — running twice leaves files unchanged.
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const CHAR_DIR = path.join(ROOT, "content/wiki/characters");
const ENTITIES = path.join(ROOT, "brain_lab/out/entities/entities.json");
const OVERRIDES = path.join(CHAR_DIR, "tiers.override.yaml");

type Tier = "A" | "B" | "C" | "D";

function tierFromCount(n: number): Tier {
  if (n >= 7) return "A";
  if (n >= 3) return "B";
  if (n >= 1) return "C";
  return "D";
}

function loadOverrides(): Record<string, Tier> {
  if (!fs.existsSync(OVERRIDES)) return {};
  const raw = fs.readFileSync(OVERRIDES, "utf-8");
  const out: Record<string, Tier> = {};
  const lines = raw.split("\n");
  let inOverrides = false;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+#.*$/, "").trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith("#")) continue;
    if (/^overrides:\s*$/.test(line)) {
      inOverrides = true;
      continue;
    }
    if (inOverrides && /^\S/.test(line)) {
      inOverrides = false;
    }
    if (!inOverrides) continue;
    const m = line.match(/^\s{2,}([a-z0-9-]+):\s*([A-D])\b/);
    if (m) out[m[1]!] = m[2]! as Tier;
  }
  return out;
}

function loadCounts(): Record<string, number> {
  const raw = fs.readFileSync(ENTITIES, "utf-8");
  const j = JSON.parse(raw) as {
    entities: Array<{ type: string; slug: string; story_ids?: string[] }>;
  };
  const out: Record<string, number> = {};
  for (const e of j.entities) {
    if (e.type !== "character") continue;
    out[e.slug] = new Set(e.story_ids ?? []).size;
  }
  return out;
}

function patchTiers(content: string, tier: Tier): string {
  const inventoryRe = /(Inventory entry \(tiers:\s*)([^)]+)(\))/;
  if (inventoryRe.test(content)) {
    return content.replace(inventoryRe, `$1${tier}$3`);
  }
  const slugRe = /(\*\*Slug:\*\*\s*[^\n]+\n)/;
  if (slugRe.test(content)) {
    return content.replace(slugRe, `$1Inventory entry (tiers: ${tier})\n`);
  }
  return `Inventory entry (tiers: ${tier})\n${content}`;
}

function main() {
  const overrides = loadOverrides();
  const counts = loadCounts();
  let touched = 0;
  for (const file of fs.readdirSync(CHAR_DIR)) {
    if (!file.endsWith(".md")) continue;
    const slug = file.replace(/\.md$/, "");
    const tier: Tier =
      overrides[slug] ?? tierFromCount(counts[slug] ?? 0);
    const abs = path.join(CHAR_DIR, file);
    const before = fs.readFileSync(abs, "utf-8");
    const after = patchTiers(before, tier);
    if (after !== before) {
      fs.writeFileSync(abs, after, "utf-8");
      touched++;
      console.log(
        `${slug}: tier ${tier} (override=${overrides[slug] ?? "-"} appearances=${counts[slug] ?? 0})`,
      );
    } else {
      console.log(
        `${slug}: tier ${tier} unchanged (appearances=${counts[slug] ?? 0})`,
      );
    }
  }
  console.log(`\ndone (${touched} files updated)`);
}

main();
