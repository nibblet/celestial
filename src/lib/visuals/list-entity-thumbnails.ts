import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  pickThumbnailPaths,
  type ThumbnailAssetRow,
  type ThumbnailPromptRow,
} from "./thumbnails";

/**
 * Entity slug → public URL of one still image, for the Codex list. Uses the
 * same rule as entity pages: approved images and reference uploads only.
 * Returns an empty map on any failure so the list still renders.
 */
export async function listEntityThumbnails(): Promise<Record<string, string>> {
  try {
    const admin = createAdminClient();
    const { data: prompts } = await admin
      .from("cel_visual_prompts")
      .select("id, target_id, style_preset")
      .eq("target_kind", "entity");
    const promptRows = (prompts ?? []) as ThumbnailPromptRow[];
    if (promptRows.length === 0) return {};

    const { data: assets } = await admin
      .from("cel_visual_assets")
      .select("prompt_id, storage_path, created_at")
      .eq("asset_kind", "image")
      .in(
        "prompt_id",
        promptRows.map((p) => p.id),
      )
      .or("approved.eq.true,provider.eq.manual_upload");

    const out: Record<string, string> = {};
    const picked = pickThumbnailPaths(
      promptRows,
      (assets ?? []) as ThumbnailAssetRow[],
    );
    for (const [slug, path] of picked) {
      // Resized by Supabase storage: the originals run to about 2 MB each.
      out[slug] = admin.storage.from("beyond-media").getPublicUrl(path, {
        transform: { width: 144, height: 144, resize: "cover", quality: 70 },
      }).data.publicUrl;
    }
    return out;
  } catch (err) {
    console.error("[codex] thumbnails unavailable", err);
    return {};
  }
}
