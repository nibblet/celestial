import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { resolveWikiSlug } from "@/lib/wiki/slug-resolver";

const WIKI = path.join(process.cwd(), "content/wiki");

test("content/wiki/vaults contains all 10 canonical vaults", () => {
  const files = fs
    .readdirSync(path.join(WIKI, "vaults"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
  for (const slug of [
    "giza-vault",
    "vault-002",
    "vault-003",
    "vault-004",
    "vault-005",
    "vault-006",
    "vault-007",
    "vault-008",
    "vault-009",
    "vault-010",
  ]) {
    assert.ok(files.includes(slug), `missing canonical vault: ${slug}`);
  }
});

test("no vault-kind pages leak into content/wiki/artifacts", () => {
  const artifactFiles = fs
    .readdirSync(path.join(WIKI, "artifacts"))
    .filter((f) => f.endsWith(".md"));
  for (const f of artifactFiles) {
    const body = fs.readFileSync(path.join(WIKI, "artifacts", f), "utf-8");
    assert.doesNotMatch(
      body,
      /kind="vaults"/,
      `${f} still declares kind="vaults" in canon dossier`,
    );
    assert.doesNotMatch(
      body,
      /\*\*Content type:\*\*\s*vault/i,
      `${f} still declares Content type: vault in Lore metadata`,
    );
  }
});

test("martian-resonance-vault alias resolves to vault-002", () => {
  const resolved = resolveWikiSlug("martian-resonance-vault");
  assert.ok(resolved);
  assert.equal(resolved!.slug, "vault-002");
  assert.equal(resolved!.kind, "vaults");
  assert.equal(resolved!.href, "/vaults/vault-002");
});

test("every location has Superset: or is on root allow-list", () => {
  const ROOTS = new Set(["mars", "earth", "orbital-habitat-ix"]);
  const files = fs
    .readdirSync(path.join(WIKI, "locations"))
    .filter((f) => f.endsWith(".md"));
  for (const f of files) {
    const slug = f.replace(/\.md$/, "");
    const body = fs.readFileSync(path.join(WIKI, "locations", f), "utf-8");
    if (ROOTS.has(slug)) continue;
    assert.match(
      body,
      /^\*\*Superset:\*\*/m,
      `${f} is missing **Superset:** in Lore metadata`,
    );
  }
});

test("all parables carry Status in Lore metadata", () => {
  const files = fs
    .readdirSync(path.join(WIKI, "rules"))
    .filter((f) => f.endsWith(".md"));
  for (const f of files) {
    const body = fs.readFileSync(path.join(WIKI, "rules", f), "utf-8");
    const isParable =
      /kind="rules"\s+subkind="parable"/.test(body) ||
      /\*\*Subkind:\*\*\s*parable/i.test(body);
    if (!isParable) continue;
    assert.match(
      body,
      /^\*\*Status:\*\*/m,
      `${f} is flagged as parable but missing **Status:**`,
    );
  }
});
