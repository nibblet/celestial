import test from "node:test";
import assert from "node:assert/strict";
import {
  CANON_SOURCE_RANK,
  canonAuthorityOrder,
  compareCanonAuthority,
} from "./corpus";

test("canon rank order matches chapter_text > wiki_canon > derived_inference", () => {
  assert.deepEqual([...CANON_SOURCE_RANK], [
    "chapter_text",
    "wiki_canon",
    "derived_inference",
  ]);
  assert.ok(canonAuthorityOrder("chapter_text") < canonAuthorityOrder("wiki_canon"));
  assert.ok(compareCanonAuthority("chapter_text", "wiki_canon") < 0);
});
