import test from "node:test";
import assert from "node:assert/strict";
import { isPublicPath } from "@/lib/auth/public-paths";

test("home, chapter list and the free chapter are public", () => {
  assert.equal(isPublicPath("/"), true);
  assert.equal(isPublicPath("/stories"), true);
  assert.equal(isPublicPath("/stories/CH01"), true);
  assert.equal(isPublicPath("/stories/ch01/"), true);
  assert.equal(isPublicPath("/api/stories/CH01/read"), true);
});

test("later chapters, lore and Ask need an account", () => {
  assert.equal(isPublicPath("/stories/CH02"), false);
  assert.equal(isPublicPath("/stories/timeline"), false);
  assert.equal(isPublicPath("/characters"), false);
  assert.equal(isPublicPath("/ask"), false);
  assert.equal(isPublicPath("/api/ask"), false);
  assert.equal(isPublicPath("/api/stories/CH02/read"), false);
});
