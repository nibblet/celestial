import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Recent generations for the Visual Prompt Studio, newest first, each with
 * its prompt so the console can reopen it (re-animate, use as a keyframe
 * reference, approve) after navigating away.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("cel_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "author", "keith"].includes(profile.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 24));
  const kind = url.searchParams.get("kind");

  let query = admin
    .from("cel_visual_assets")
    .select("id, prompt_id, asset_kind, storage_path, approved, provider, provider_model, created_at")
    .neq("provider", "manual_upload")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (kind === "image" || kind === "video") query = query.eq("asset_kind", kind);
  const { data: assets, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const promptIds = Array.from(new Set((assets ?? []).map((a) => a.prompt_id as string)));
  const { data: prompts } = promptIds.length
    ? await admin
        .from("cel_visual_prompts")
        .select("id, target_kind, target_id, style_preset, prompt_json")
        .in("id", promptIds)
    : { data: [] };
  const byId = new Map((prompts ?? []).map((p) => [p.id as string, p]));

  const items = (assets ?? []).flatMap((a) => {
    const p = byId.get(a.prompt_id as string);
    if (!p) return [];
    const promptJson = (p.prompt_json ?? {}) as Record<string, unknown>;
    const { _referenceImages, ...prompt } = promptJson;
    return [
      {
        assetId: a.id as string,
        promptId: a.prompt_id as string,
        kind: a.asset_kind as "image" | "video",
        url: admin.storage.from("beyond-media").getPublicUrl(a.storage_path as string).data
          .publicUrl,
        approved: !!a.approved,
        provider: a.provider as string,
        providerModel: a.provider_model as string,
        createdAt: a.created_at as string,
        targetKind: p.target_kind as string,
        targetId: (p.target_id as string | null) ?? null,
        stylePreset: p.style_preset as string,
        prompt,
        referenceImages: Array.isArray(_referenceImages) ? _referenceImages : [],
      },
    ];
  });
  return Response.json({ items });
}
