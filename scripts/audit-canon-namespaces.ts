/**
 * Fails when canon-seeded wiki entities drift out of their intended namespace:
 *   - Any file with `kind="vaults"` or `subkind="vault"` must live under `content/wiki/vaults/`.
 *   - Any `content/wiki/locations/*.md` must either set `**Superset:** [[…]]` or
 *     live on the root allow-list (planets/habitat).
 *   - Any rule file flagged `subkind="parable"` must declare `**Status:**`.
 *
 *   node --import tsx scripts/audit-canon-namespaces.ts
 */

import * as fs from "fs";
import * as path from "path";

const WIKI = path.join(process.cwd(), "content/wiki");

const LOCATION_ROOT_ALLOWLIST = new Set<string>([
  "mars",
  "earth",
  "orbital-habitat-ix",
]);

interface Failure {
  file: string;
  reason: string;
}

function readAllMd(subdir: string): string[] {
  const dir = path.join(WIKI, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(subdir, f));
}

function loadAttr(body: string, attr: string): string | null {
  const dossierMatch = body.match(/<!--\s*canon:dossier\s+([^>]*?)-->/);
  if (!dossierMatch) return null;
  const attrs = dossierMatch[1]!;
  const m = attrs.match(new RegExp(`${attr}="([^"]*)"`));
  return m ? m[1]! : null;
}

function metaLine(body: string, label: string): string | null {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, "i");
  const m = body.match(re);
  return m ? m[1]!.trim() : null;
}

const failures: Failure[] = [];

for (const subdir of [
  "characters",
  "artifacts",
  "vaults",
  "locations",
  "factions",
  "rules",
]) {
  for (const rel of readAllMd(subdir)) {
    const abs = path.join(WIKI, rel);
    const body = fs.readFileSync(abs, "utf-8");
    const kindAttr = loadAttr(body, "kind");
    const subkindAttr = loadAttr(body, "subkind");
    const contentTypeLore = metaLine(body, "Content type");
    const subkindLore = metaLine(body, "Subkind");

    const isVault =
      kindAttr === "vaults" ||
      subkindAttr === "vault" ||
      contentTypeLore?.toLowerCase() === "vault" ||
      subkindLore?.toLowerCase() === "vault";

    if (isVault && subdir !== "vaults") {
      failures.push({
        file: rel,
        reason: `vault-kind entity outside content/wiki/vaults/`,
      });
    }

    if (subdir === "locations") {
      const slug = path.basename(rel, ".md");
      const superset = metaLine(body, "Superset");
      if (!superset && !LOCATION_ROOT_ALLOWLIST.has(slug)) {
        failures.push({
          file: rel,
          reason: `location missing Superset and not on root allow-list`,
        });
      }
    }

    if (subdir === "rules") {
      const isParable =
        subkindAttr === "parable" || subkindLore?.toLowerCase() === "parable";
      if (isParable && !metaLine(body, "Status")) {
        failures.push({
          file: rel,
          reason: `parable missing **Status:** in Lore metadata`,
        });
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`\nCanon namespace audit found ${failures.length} issue(s):`);
  for (const f of failures) {
    console.error(`  - ${f.file}: ${f.reason}`);
  }
  process.exitCode = 1;
} else {
  console.log("Canon namespace audit: OK");
}
