import test from "node:test";
import assert from "node:assert/strict";
import { parseWikiNounMarkdown } from "@/lib/wiki/entity-loader";
import { FICTION_CHARACTERS_NOUN } from "@/config/wiki-entities";

test("parseWikiNounMarkdown loads fiction Appearances with CH refs", () => {
  const md = `# Demo

**Slug:** demo-char

Inventory entry (tiers: A)

## Appearances

- Cold open (CH02).

## Additional appearances

## Note

Testing.
`;

  const row = parseWikiNounMarkdown(md, FICTION_CHARACTERS_NOUN, "demo-char.md");
  assert.ok(row);
  assert.equal(row!.wikiSource, "characters");
  assert.deepEqual(row!.memoirStoryIds, ["CH02"]);
  assert.deepEqual(row!.interviewStoryIds, []);
});
