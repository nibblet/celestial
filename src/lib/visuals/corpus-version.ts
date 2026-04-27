import "server-only";

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

/**
 * Hash of the wiki corpus state. Used as part of a visual prompt's seed_hash
 * so that edits to the underlying lore invalidate cached prompts cleanly.
 *
 * Strategy: walk content/wiki/ recursively, hash filename + mtime + size.
 * We don't read file bodies — mtime+size catches every meaningful edit at
 * a fraction of the cost. Computed once per process and memoized.
 */

const WIKI_DIR = path.join(process.cwd(), "content/wiki");

let cached: string | null = null;

export function getCorpusVersion(): string {
  if (cached) return cached;
  const hasher = crypto.createHash("sha256");
  walk(WIKI_DIR, hasher);
  cached = hasher.digest("hex").slice(0, 16);
  return cached;
}

function walk(dir: string, hasher: crypto.Hash): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, hasher);
    } else if (entry.isFile()) {
      const stat = fs.statSync(full);
      hasher.update(`${full}|${stat.mtimeMs}|${stat.size}\n`);
    }
  }
}
