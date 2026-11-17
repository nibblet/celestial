/**
 * Picks one still image per entity for list thumbnails. Pure, so it can be
 * tested without a database; `listEntityThumbnails` feeds it.
 */

export type ThumbnailPromptRow = {
  id: string;
  target_id: string;
  style_preset: string;
};

export type ThumbnailAssetRow = {
  prompt_id: string;
  storage_path: string;
  created_at: string;
};

/**
 * Entity slug → storage path of its thumbnail. A reference upload wins, as it
 * does on the entity's own page; otherwise the newest image. Callers pass only
 * images that are approved or reference uploads.
 */
export function pickThumbnailPaths(
  prompts: ThumbnailPromptRow[],
  assets: ThumbnailAssetRow[],
): Map<string, string> {
  const promptById = new Map(prompts.map((p) => [p.id, p]));
  const best = new Map<string, { path: string; ref: boolean; at: string }>();
  for (const asset of assets) {
    const prompt = promptById.get(asset.prompt_id);
    if (!prompt) continue;
    const candidate = {
      path: asset.storage_path,
      ref: prompt.style_preset === "reference_upload",
      at: asset.created_at,
    };
    const current = best.get(prompt.target_id);
    const better =
      !current ||
      (candidate.ref !== current.ref
        ? candidate.ref
        : candidate.at > current.at);
    if (better) best.set(prompt.target_id, candidate);
  }
  return new Map([...best].map(([slug, b]) => [slug, b.path]));
}
