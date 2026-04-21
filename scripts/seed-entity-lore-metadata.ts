/**
 * Idempotent: inserts `## Lore metadata` before `## Note` when missing.
 * Derives **Chapter refs** from CH## tokens in the file body.
 *
 *   npx tsx scripts/seed-entity-lore-metadata.ts
 */

import * as fs from "fs";
import * as path from "path";
import type { WikiEntityKind } from "@/lib/wiki/lore-provenance";
import { WIKI_LORE_METADATA_HEADING } from "@/lib/wiki/lore-provenance";

const WIKI = path.join(process.cwd(), "content/wiki");

const SCANS: { subdir: string; kind: WikiEntityKind }[] = [
  { subdir: "characters", kind: "character" },
  { subdir: "artifacts", kind: "artifact" },
  { subdir: "locations", kind: "location" },
  { subdir: "factions", kind: "faction" },
  { subdir: "rules", kind: "rule" },
];

const BY_KIND: Record<
  WikiEntityKind,
  {
    sourceType: string;
    canonStatus: string;
    visibilityPolicy: string;
    sourceDocument: string;
    sourcePath: string;
  }
> = {
  character: {
    sourceType: "foundational_dossier",
    canonStatus: "adjacent",
    visibilityPolicy: "always_visible",
    sourceDocument: "Celestial Heritage — Character Dossier",
    sourcePath: "celestial_original/Celestial Heritage_ Character Dossier.docx",
  },
  artifact: {
    sourceType: "technical_brief",
    canonStatus: "adjacent",
    visibilityPolicy: "always_visible",
    sourceDocument: "Celestial Heritage — vessel & artifact specifications",
    sourcePath: "celestial_original/Valkyrie-1 Technical Brief.docx",
  },
  location: {
    sourceType: "series_bible",
    canonStatus: "adjacent",
    visibilityPolicy: "always_visible",
    sourceDocument: "Celestial Heritage Series Bible",
    sourcePath: "celestial_original/Celestial Heritage Series Bible.docx",
  },
  faction: {
    sourceType: "series_bible",
    canonStatus: "adjacent",
    visibilityPolicy: "always_visible",
    sourceDocument: "Celestial Heritage Series Bible",
    sourcePath: "celestial_original/Celestial Heritage Series Bible.docx",
  },
  rule: {
    sourceType: "series_bible",
    canonStatus: "adjacent",
    visibilityPolicy: "always_visible",
    sourceDocument: "Celestial Heritage Series Bible — inferred rule",
    sourcePath: "celestial_original/Celestial Heritage Series Bible.docx",
  },
};

function extractChapterRefs(body: string): string[] {
  const seen = new Map<string, string>();
  const re = /\b(CH)(\d{1,4})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const num = parseInt(m[2], 10);
    if (!Number.isFinite(num)) continue;
    seen.set(`CH${String(num).padStart(2, "0")}`, "");
  }
  return [...seen.keys()].sort((a, b) => {
    const na = parseInt(a.slice(2), 10);
    const nb = parseInt(b.slice(2), 10);
    return na - nb;
  });
}

function buildBlock(kind: WikiEntityKind, chapterRefs: string[]): string {
  const d = BY_KIND[kind];
  const refsLine =
    chapterRefs.length > 0
      ? `**Chapter refs:** ${chapterRefs.join(", ")}\n`
      : "";
  return `
## ${WIKI_LORE_METADATA_HEADING}

**Content type:** ${kind}
**Source type:** ${d.sourceType}
**Canon status:** ${d.canonStatus}
**Visibility policy:** ${d.visibilityPolicy}
**Source document:** ${d.sourceDocument}
**Source path:** ${d.sourcePath}
**Extractor version:** seed-entity-lore-metadata/1
${refsLine}

`.trimStart();
}

function main() {
  let updated = 0;
  let skipped = 0;

  for (const { subdir, kind } of SCANS) {
    const dir = path.join(WIKI, subdir);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const fp = path.join(dir, file);
      let body = fs.readFileSync(fp, "utf-8");

      if (body.includes(`## ${WIKI_LORE_METADATA_HEADING}`)) {
        skipped++;
        continue;
      }

      const refs = extractChapterRefs(body);
      const block = buildBlock(kind, refs);

      const marker = "## Note";
      const idx = body.indexOf(marker);
      if (idx === -1) {
        console.warn(`Skipping ${fp}: no "${marker}" anchor`);
        skipped++;
        continue;
      }

      body =
        body.slice(0, idx).trimEnd() +
        "\n\n" +
        block +
        "\n" +
        body.slice(idx);

      fs.writeFileSync(fp, body, "utf-8");
      updated++;
      console.log(`✓ ${path.relative(process.cwd(), fp)}`);
    }
  }

  console.log(`Done. Updated ${updated} files, skipped ${skipped} (already had lore or no ## Note).`);
}

main();
