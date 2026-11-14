import { test } from "node:test";
import assert from "node:assert/strict";
import * as path from "path";

import {
  contentTypeForFile,
  inputFidelityFor,
  openAiSizeFor,
  parseSize,
  resolveReferencePath,
} from "./openai-helpers";

test("gpt-image-2 gets exact aspect sizes, divisible by 16", () => {
  for (const [aspect, expected] of [
    ["4:5", "1024x1280"],
    ["16:9", "1536x864"],
    ["9:16", "864x1536"],
    ["3:2", "1536x1024"],
    ["1:1", "1024x1024"],
  ] as const) {
    const size = openAiSizeFor(aspect, "gpt-image-2");
    assert.equal(size, expected);
    const { width, height } = parseSize(size);
    assert.equal(width! % 16, 0);
    assert.equal(height! % 16, 0);
  }
});

test("older models fall back to the three standard sizes", () => {
  assert.equal(openAiSizeFor("4:5", "gpt-image-1.5"), "1024x1536");
  assert.equal(openAiSizeFor("16:9", "gpt-image-1.5"), "1536x1024");
  assert.equal(openAiSizeFor("1:1", "gpt-image-1-mini"), "1024x1024");
});

test("input_fidelity only for gpt-image-1.5", () => {
  assert.equal(inputFidelityFor("gpt-image-1.5"), "high");
  assert.equal(inputFidelityFor("gpt-image-2"), null);
  assert.equal(inputFidelityFor("gpt-image-1-mini"), null);
});

const publicDir = path.resolve("/app/public");
const supabaseUrl = "https://proj.supabase.co";

test("resolves local visual-references paths inside public/", () => {
  const r = resolveReferencePath("/visual-references/project-valkyrie-patch.png", {
    publicDir,
    supabaseUrl,
  });
  assert.deepEqual(r, {
    kind: "local",
    filePath: path.join(publicDir, "visual-references", "project-valkyrie-patch.png"),
    fileName: "project-valkyrie-patch.png",
  });
});

test("rejects traversal, other public folders and foreign hosts", () => {
  for (const bad of [
    "/visual-references/../../.env.local",
    "/visual-references/%2e%2e/%2e%2e/secret.png",
    "/images/front_view.png",
    "https://evil.example.com/x.png",
    "https://proj.supabase.co/storage/v1/object/public/../x.png",
    "/visual-references/",
  ]) {
    assert.throws(() => resolveReferencePath(bad, { publicDir, supabaseUrl }), bad);
  }
});

test("allows this project's Supabase public storage URLs", () => {
  const url = "https://proj.supabase.co/storage/v1/object/public/beyond-media/visuals/a/b.png";
  assert.deepEqual(resolveReferencePath(url, { publicDir, supabaseUrl }), {
    kind: "remote",
    url,
    fileName: "b.png",
  });
});

test("content types for supported reference formats", () => {
  assert.equal(contentTypeForFile("a.PNG"), "image/png");
  assert.equal(contentTypeForFile("a.jpeg"), "image/jpeg");
  assert.equal(contentTypeForFile("a.webp"), "image/webp");
  assert.throws(() => contentTypeForFile("a.svg"));
});
