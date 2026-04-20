/**
 * Phase 5 — Scan wiki entities for `## Lore metadata` blocks and emit an inventory JSON.
 * Repeatable pipeline step (no network). Run after editing entity markdown.
 *
 *   npx tsx scripts/ingest-foundational-lore.ts
 *
 * Outputs: content/raw/lore_inventory.json
 * Exit 1 if duplicate aliases map to different slugs.
 */

import * as fs from "fs";
import * as path from "path";
import type { WikiEntityKind } from "@/lib/wiki/lore-provenance";
import { parseWikiEntityLoreSection } from "@/lib/wiki/lore-provenance";
import type { CharacterDossier } from "@/lib/wiki/entity-dossier";
import { parseCharacterDossierSection } from "@/lib/wiki/entity-dossier";

const WIKI = path.join(process.cwd(), "content/wiki");
const OUT = path.join(process.cwd(), "content/raw/lore_inventory.json");

const SCANS: { subdir: string; kind: WikiEntityKind }[] = [
  { subdir: "characters", kind: "character" },
  { subdir: "artifacts", kind: "artifact" },
  { subdir: "locations", kind: "location" },
  { subdir: "factions", kind: "faction" },
  { subdir: "rules", kind: "rule" },
];

function main() {
  const rows: Array<{
    slug: string;
    wikiPath: string;
    wikiEntityKind: WikiEntityKind;
    lore: ReturnType<typeof parseWikiEntityLoreSection>;
    dossier?: CharacterDossier;
  }> = [];

  const aliasToSlug = new Map<string, string>();

  for (const { subdir, kind } of SCANS) {
    const dir = path.join(WIKI, subdir);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const wikiPath = `content/wiki/${subdir}/${file}`;
      const content = fs.readFileSync(path.join(dir, file), "utf-8");
      const slug = file.replace(/\.md$/, "");
      const lore = parseWikiEntityLoreSection(content, { wikiEntityKind: kind });
      const dossier =
        kind === "character"
          ? parseCharacterDossierSection(content).dossier
          : undefined;
      rows.push({ slug, wikiPath, wikiEntityKind: kind, lore, dossier });

      if (lore?.aliases?.length) {
        for (const alias of lore.aliases) {
          const prev = aliasToSlug.get(alias);
          if (prev !== undefined && prev !== slug) {
            console.error(
              `Duplicate lore alias "${alias}" → "${prev}" and "${slug}"`
            );
            process.exit(1);
          }
          aliasToSlug.set(alias, slug);
        }
      }
    }
  }

  const withLore = rows.filter((r) => r.lore !== undefined).length;
  const withDossier = rows.filter(
    (r) => r.wikiEntityKind === "character" && r.dossier !== undefined
  ).length;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        extractorVersion: "ingest-foundational-lore/1",
        entityCount: rows.length,
        withLoreSectionParsed: withLore,
        withDossierParsed: withDossier,
        entities: rows,
      },
      null,
      2
    )
  );

  console.log(`✅ Lore inventory → ${OUT}`);
  console.log(
    `   ${rows.length} wiki files, ${withLore} with lore, ${withDossier} with dossier`
  );
}

main();
