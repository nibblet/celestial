import test from "node:test";
import assert from "node:assert/strict";
import { fileCardsFromLinks } from "@/lib/archive/file-cards";

test("links to files become labelled cards, deduped and capped", () => {
  const cards = fileCardsFromLinks(
    [
      { href: "/characters/thane-meric", text: "Thane Meric" },
      { href: "/characters/thane-meric/", text: "Thane" },
      { href: "/locations/zone-theta#top", text: "Zone Theta" },
      { href: "/stories/CH01", text: "Dustfall" },
      { href: "/profile", text: "your profile" },
      { href: "/codex", text: "the codex" },
      { href: "/vaults/vault-002", text: "Vault 002" },
      { href: "/factions/sovrin", text: "SOVRIN" },
    ],
    4
  );
  assert.deepEqual(cards, [
    { href: "/characters/thane-meric", name: "Thane Meric", kind: "Personnel file" },
    { href: "/locations/zone-theta", name: "Zone Theta", kind: "Site file" },
    { href: "/stories/CH01", name: "Dustfall", kind: "Chapter" },
    { href: "/vaults/vault-002", name: "Vault 002", kind: "Vault file" },
  ]);
});

test("no links, no cards", () => {
  assert.deepEqual(fileCardsFromLinks([]), []);
});
