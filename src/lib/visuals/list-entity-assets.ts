import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type EntityVisualAsset = {
  assetId: string;
  promptId: string;
  kind: "image" | "video";
  url: string;
  approved: boolean;
  isReference: boolean;
  stylePreset: string;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  createdAt: string;
};

/**
 * Fetch every approved or reference-uploaded asset for an entity slug.
 *
 * Sort order:
 *   1. Reference uploads first (canonical identity source).
 *   2. Then approved assets, newest first.
 *
 * Used by entity pages (characters, artifacts, locations, factions, vaults)
 * to render an in-narrative gallery alongside the wiki dossier.
 */
export async function listEntityVisuals(
  entitySlug: string,
): Promise<EntityVisualAsset[]> {
  const admin = createAdminClient();

  const { data: prompts } = await admin
    .from("cel_visual_prompts")
    .select("id, style_preset")
    .eq("target_kind", "entity")
    .eq("target_id", entitySlug);

  const promptRows = prompts ?? [];
  if (promptRows.length === 0) return [];

  const promptIdToPreset = new Map<string, string>(
    promptRows.map((r) => [r.id as string, r.style_preset as string]),
  );

  const { data: assets } = await admin
    .from("cel_visual_assets")
    .select(
      "id, prompt_id, asset_kind, storage_path, approved, provider, width, height, duration_sec, created_at",
    )
    .in("prompt_id", Array.from(promptIdToPreset.keys()))
    .or("approved.eq.true,provider.eq.manual_upload")
    .order("created_at", { ascending: false });

  const rows = assets ?? [];
  if (rows.length === 0) return [];

  return rows
    .map((row) => {
      const stylePreset = promptIdToPreset.get(row.prompt_id as string) ?? "";
      const isReference = stylePreset === "reference_upload";
      const { data: urlData } = admin.storage
        .from("beyond-media")
        .getPublicUrl(row.storage_path as string);
      return {
        assetId: row.id as string,
        promptId: row.prompt_id as string,
        kind: row.asset_kind as "image" | "video",
        url: urlData.publicUrl,
        approved: !!row.approved,
        isReference,
        stylePreset,
        width: row.width as number | null,
        height: row.height as number | null,
        durationSec: row.duration_sec as number | null,
        createdAt: row.created_at as string,
      };
    })
    .sort((a, b) => {
      // Reference uploads first, then newest approved.
      if (a.isReference !== b.isReference) return a.isReference ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}
