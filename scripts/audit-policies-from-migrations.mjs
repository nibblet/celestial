#!/usr/bin/env node
/**
 * Static audit of migration SQL:
 * 1) Lists CREATE POLICY targets (sb_* vs cel_*) declared explicitly in files.
 * 2) Flags migrations >= 024 that attach policies to sb_* without mirroring cel_* in the same file/pair (incremental drift risk).
 *
 * Live Postgres comparison: run scripts/audit-sb-cel-rls.sql (needs DATABASE_URL / psql).
 *
 * Usage: node scripts/audit-policies-from-migrations.mjs
 */

import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve("supabase/migrations");

/** @param {string} file */
function migrationNum(file) {
  const m = /^(\d+)_/.exec(file);
  return m ? parseInt(m[1], 10) : -1;
}

/** @returns {Array<{ file: string; table: string; policyName: string }>} */
function policiesInFile(file, text) {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const re =
    /create\s+policy\s+(?:"([^"]+)"|(\w+))\s+on\s+public\.(\w+)/gi;
  const out = [];
  let m;
  while ((m = re.exec(stripped)) !== null) {
    out.push({
      file,
      policyName: m[1] || m[2],
      table: m[3],
    });
  }
  return out;
}

function main() {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

  /** @type {Map<string, { sb: Set<string>; cel: Set<string> }>} */
  const byMigration = new Map();

  const sbTables = new Set();
  const celTables = new Set();

  for (const file of files.sort()) {
    const text = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const policies = policiesInFile(file, text);
    const entry = { sb: new Set(), cel: new Set() };
    for (const p of policies) {
      if (p.table.startsWith("sb_")) {
        entry.sb.add(p.table);
        sbTables.add(p.table);
      }
      if (p.table.startsWith("cel_")) {
        entry.cel.add(p.table);
        celTables.add(p.table);
      }
    }
    if (entry.sb.size || entry.cel.size) byMigration.set(file, entry);
  }

  console.log(
    "=== A) Explicit CREATE POLICY in migrations (sb_* vs cel_* tables) ===\n",
  );
  console.log(`Tables with sb_* policies declared in SQL files: ${sbTables.size}`);
  console.log([...sbTables].sort().join(", "));
  console.log("");
  console.log(`Tables with cel_* policies declared in SQL files: ${celTables.size}`);
  console.log([...celTables].sort().join(", "));
  console.log(
    "\n(Most cel_* policies come from cloning sb_* at migration 023, not from duplicate CREATE POLICY lines.)\n",
  );

  console.log(
    "=== B) Migrations >= 024: sb_* policy introduced without cel_* peer in SAME file ===\n",
  );

  let driftCandidates = 0;
  for (const file of [...files].sort()) {
    const n = migrationNum(file);
    if (n < 24) continue;
    const text = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const policies = policiesInFile(file, text);
    const sbPol = policies.filter((p) => p.table.startsWith("sb_"));
    const celTablesInFile = new Set(
      policies.filter((p) => p.table.startsWith("cel_")).map((p) => p.table),
    );
    for (const p of sbPol) {
      const expectedCel = p.table.replace(/^sb_/, "cel_");
      if (!celTablesInFile.has(expectedCel)) {
        driftCandidates++;
        console.log(
          `  ${file}: policy "${p.policyName}" on ${p.table} — no CREATE POLICY on ${expectedCel} in this file`,
        );
      }
    }
  }

  if (driftCandidates === 0) {
    console.log("  (none)\n");
  } else {
    console.log(
      `\nReview each line: intentional (legacy sb only) or missing cel_* mirror.\n`,
    );
  }

  console.log(
    "=== Next step: compare live pg_policies ===\n\n  psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f scripts/audit-sb-cel-rls.sql\n\nUse the Supabase Dashboard → Database → Connection string (direct) if needed.",
  );
}

main();
