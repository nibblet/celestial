import { createAdminClient } from "@/lib/supabase/admin";
import type { VisualTargetKind } from "@/lib/visuals/types";

export const dynamic = "force-dynamic";

const VALID_TARGET_KINDS: VisualTargetKind[] = ["entity", "story", "scene", "freeform"];

/**
 * GET /api/visuals/preferred?targetKind=entity&targetId=galen-voss&stylePreset=valkyrie_shipboard&assetKind=image
 *
 * Returns the approved asset for a (target × style) combo, falling back to
 * the most recent asset if nothing is approved yet. Public read — assets
 * are stored in the public beyond-media bucket, and this endpoint is
 * intended to serve images on entity/story pages without auth.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetKind = url.searchParams.get("targetKind") as VisualTargetKind | null;
  const targetId = url.searchParams.get("targetId");
  const stylePreset = url.searchParams.get("stylePreset");
  const assetKind = url.searchParams.get("assetKind") ?? "image";

  if (!targetKind || !VALID_TARGET_KINDS.includes(targetKind)) {
    return Response.json({ error: "targetKind required" }, { status: 400 });
  }
  if (!stylePreset) {
    return Response.json({ error: "stylePreset required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find the prompt rows for this (target × style). There may be several
  // (different aspects/intents) — we'll union their assets.
  let promptQuery = admin
    .from("cel_visual_prompts")
    .select("id")
    .eq("target_kind", targetKind)
    .eq("style_preset", stylePreset);
  if (targetKind === "freeform") {
    promptQuery = promptQuery.is("target_id", null);
  } else if (targetId) {
    promptQuery = promptQuery.eq("target_id", targetId);
  } else {
    return Response.json(
      { error: "targetId required for non-freeform" },
      { status: 400 },
    );
  }

  const { data: promptRows } = await promptQuery;
  const promptIds = (promptRows ?? []).map((r) => r.id as string);
  if (promptIds.length === 0) {
    return Response.json({ asset: null });
  }

  const { data: assets } = await admin
    .from("cel_visual_assets")
    .select("id, prompt_id, asset_kind, storage_path, approved, created_at, width, height")
    .in("prompt_id", promptIds)
    .eq("asset_kind", assetKind)
    .order("approved", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  const asset = assets?.[0];
  if (!asset) {
    return Response.json({ asset: null });
  }

  const { data: urlData } = admin.storage
    .from("beyond-media")
    .getPublicUrl(asset.storage_path as string);

  return Response.json({
    asset: {
      assetId: asset.id,
      promptId: asset.prompt_id,
      kind: asset.asset_kind,
      url: urlData.publicUrl,
      approved: asset.approved,
      width: asset.width,
      height: asset.height,
    },
  });
}
