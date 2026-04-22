import test from "node:test";
import assert from "node:assert/strict";
import { parseWikiEntityLoreSection } from "@/lib/wiki/lore-provenance";

test("parses Lore metadata section with dossier provenance", () => {
  const md = `
# Test

## Lore metadata

**Content type:** character  
**Source type:** foundational_dossier  
**Canon status:** adjacent  
**Visibility policy:** always_visible  
**Source document:** Example Dossier.docx  
**Source path:** celestial_original/example.docx  
**Chapter refs:** CH01, ch03  
**Aliases:** commander-alpha, alpha-commander  

## Appearances
`;

  const lore = parseWikiEntityLoreSection(md, { wikiEntityKind: "character" });
  assert.ok(lore);
  assert.equal(lore!.sourceType, "foundational_dossier");
  assert.equal(lore!.canonStatus, "adjacent");
  assert.equal(lore!.provenance.sourceDocument, "Example Dossier.docx");
  assert.deepEqual(lore!.chapterRefs, ["CH01", "CH03"]);
  assert.ok(lore!.aliases.includes("commander-alpha"));
});

test("accepts canon_inventory source_type and canonical status alias", () => {
  const md = `
# Vault Two
## Lore metadata
**Content type:** vault
**Source type:** canon_inventory
**Canon status:** canonical
**Visibility policy:** always_visible
**Source document:** Vault Encounter Tracker v2
**Superset:** [[location:mars]]
**Status:** cataloged
**Subkind:** site
`;
  const lore = parseWikiEntityLoreSection(md, { wikiEntityKind: "vault" });
  assert.ok(lore);
  assert.equal(lore!.sourceType, "canon_inventory");
  assert.equal(lore!.canonStatus, "canon");
  assert.equal(lore!.status, "cataloged");
  assert.equal(lore!.subkind, "site");
  assert.deepEqual(lore!.superset, { type: "location", slug: "mars" });
});

test("parses typed superset for artifact ship", () => {
  const md = `
## Lore metadata
**Content type:** location
**Source type:** canon_inventory
**Canon status:** canonical
**Visibility policy:** always_visible
**Source document:** Series Bible
**Superset:** [[artifact:valkyrie-1]]
`;
  const lore = parseWikiEntityLoreSection(md, { wikiEntityKind: "location" });
  assert.ok(lore);
  assert.deepEqual(lore!.superset, { type: "artifact", slug: "valkyrie-1" });
});

test("returns undefined without Source document", () => {
  const md = `
## Lore metadata
**Source type:** foundational_dossier
`;
  assert.equal(
    parseWikiEntityLoreSection(md, { wikiEntityKind: "artifact" }),
    undefined
  );
});
