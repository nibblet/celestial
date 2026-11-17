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

test("the archive conversation and its files are public", () => {
  assert.equal(isPublicPath("/ask"), true);
  assert.equal(isPublicPath("/api/ask"), true);
  assert.equal(isPublicPath("/api/ask/context"), true);
  assert.equal(isPublicPath("/codex"), true);
  assert.equal(isPublicPath("/characters/galen-voss"), true);
  assert.equal(isPublicPath("/vaults/vault-002/"), true);
});

test("later chapters, logs, threads and the profile need an account", () => {
  assert.equal(isPublicPath("/stories/CH02"), false);
  assert.equal(isPublicPath("/stories/timeline"), false);
  assert.equal(isPublicPath("/mission-logs"), false);
  assert.equal(isPublicPath("/threads"), false);
  assert.equal(isPublicPath("/api/threads"), false);
  assert.equal(isPublicPath("/profile"), false);
  assert.equal(isPublicPath("/charactersx"), false);
  assert.equal(isPublicPath("/api/stories/CH02/read"), false);
});
