import test from "node:test";
import assert from "node:assert/strict";
import { pickThumbnailPaths } from "./thumbnails";

const prompts = [
  { id: "p1", target_id: "galen-voss", style_preset: "intimate_crew" },
  { id: "p2", target_id: "galen-voss", style_preset: "reference_upload" },
  { id: "p3", target_id: "vault-002", style_preset: "vault_threshold" },
];

test("a reference upload wins over a newer generated image", () => {
  const picked = pickThumbnailPaths(prompts, [
    { prompt_id: "p1", storage_path: "new.png", created_at: "2026-05-02" },
    { prompt_id: "p2", storage_path: "ref.png", created_at: "2026-01-01" },
  ]);
  assert.equal(picked.get("galen-voss"), "ref.png");
});

test("without a reference, the newest image is used", () => {
  const picked = pickThumbnailPaths(prompts, [
    { prompt_id: "p3", storage_path: "old.png", created_at: "2026-01-01" },
    { prompt_id: "p3", storage_path: "new.png", created_at: "2026-03-01" },
  ]);
  assert.equal(picked.get("vault-002"), "new.png");
});

test("entities without images, and assets without a prompt, are left out", () => {
  const picked = pickThumbnailPaths(prompts, [
    { prompt_id: "gone", storage_path: "x.png", created_at: "2026-01-01" },
  ]);
  assert.equal(picked.size, 0);
});
