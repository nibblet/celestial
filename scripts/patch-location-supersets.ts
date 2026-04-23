/**
 * One-shot: annotate every content/wiki/locations/*.md with a `**Superset:**`
 * line in Lore metadata, unless the file is on the root allow-list or already
 * has one. Idempotent — rerunning is a no-op.
 *
 *   node --import tsx scripts/patch-location-supersets.ts
 */

import * as fs from "fs";
import * as path from "path";

const LOC_DIR = path.join(process.cwd(), "content/wiki/locations");

const ROOT_SLUGS = new Set(["mars", "earth", "orbital-habitat-ix"]);

const SUPERSET_BY_SLUG: Record<string, string> = {
  "command-dome": "[[artifact:valkyrie-1]]",
  "observation-deck": "[[artifact:valkyrie-1]]",
  sensorium: "[[artifact:valkyrie-1]]",
  "translation-bay": "[[artifact:valkyrie-1]]",
  "resonant-pad": "[[artifact:valkyrie-1]]",
  "zone-theta": "[[location:mars]]",
  "mess-commons": "[[artifact:valkyrie-1]]",
  "med-module": "[[artifact:valkyrie-1]]",
  "living-quarters": "[[artifact:valkyrie-1]]",
  "systems-nexus": "[[artifact:valkyrie-1]]",
  "specimen-lockers": "[[artifact:valkyrie-1]]",
  "witness-circle": "[[artifact:valkyrie-1]]",
  "blind-zones": "[[artifact:valkyrie-1]]",
  "triad-chamber": "[[artifact:valkyrie-1]]",
  "vault-interface-annex": "[[artifact:valkyrie-1]]",
  "south-trench": "[[location:mars]]",
  "subsurface-vault": "[[location:mars]]",
  "giza-plateau": "[[location:earth]]",
  "great-pyramid": "[[location:giza-plateau]]",
};

let touched = 0;

for (const file of fs.readdirSync(LOC_DIR)) {
  if (!file.endsWith(".md")) continue;
  const slug = file.replace(/\.md$/, "");
  const abs = path.join(LOC_DIR, file);
  const raw = fs.readFileSync(abs, "utf-8");

  if (ROOT_SLUGS.has(slug)) continue;
  if (/^\*\*Superset:\*\*/m.test(raw)) continue;

  const target = SUPERSET_BY_SLUG[slug];
  if (!target) {
    console.warn(`skip: ${file} has no mapping`);
    continue;
  }

  const loreHeader = "\n## Lore metadata\n";
  const idx = raw.indexOf(loreHeader);
  if (idx < 0) {
    console.warn(`skip: ${file} has no Lore metadata section`);
    continue;
  }
  const beforeBlock = raw.slice(0, idx + loreHeader.length);
  const rest = raw.slice(idx + loreHeader.length);

  const blockEnd = rest.search(/\n## /);
  const block = blockEnd === -1 ? rest : rest.slice(0, blockEnd);
  const after = blockEnd === -1 ? "" : rest.slice(blockEnd);

  const ctMatch = block.match(/\*\*Content type:\*\*\s*.+\n/);
  let newBlock: string;
  if (ctMatch) {
    const insertAt = ctMatch.index! + ctMatch[0].length;
    newBlock =
      block.slice(0, insertAt) +
      `**Superset:** ${target}\n` +
      block.slice(insertAt);
  } else {
    newBlock = `\n**Superset:** ${target}\n` + block;
  }

  fs.writeFileSync(abs, beforeBlock + newBlock + after, "utf-8");
  touched++;
  console.log(`patched: ${file} -> ${target}`);
}

console.log(`done (${touched} files)`);
