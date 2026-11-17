import * as crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STYLE_PRESETS } from "@/lib/visuals/style-presets";

export const dynamic = "force-dynamic";

const BUCKET_ID = "beyond-media";
const TYPES: Record<string, { kind: "image" | "video"; ext: string }> = {
  "image/png": { kind: "image", ext: "png" },
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/webp": { kind: "image", ext: "webp" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/quicktime": { kind: "video", ext: "mov" },
  "video/webm": { kind: "video", ext: "webm" },
};
const MAX_BYTES = 80 * 1024 * 1024;

async function requireAuthor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 } as const;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("cel_profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "author", "keith"].includes(profile.role)) {
    return { error: "Forbidden" as const, status: 403 } as const;
  }
  return { userId: user.id } as const;
}

/**
 * POST /api/visuals/import
 *
 * Multipart form: { targetId: <entity slug>, file: <image or video>,
 *                   stylePreset?: <preset key>, model?: <generator name> }
 *
 * Adds an image or clip made outside the studio (another tool, the cloud
 * session, the Runway app) to an entity's page gallery as an approved asset.
 * Unlike /api/visuals/reference it does NOT become an identity source.
 */
export async function POST(request: Request) {
  const auth = await requireAuthor();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const form = await request.formData();
  const targetId = String(form.get("targetId") ?? "").trim();
  const file = form.get("file");
  const presetRaw = String(form.get("stylePreset") ?? "photoreal_documentary");
  const stylePreset = presetRaw in STYLE_PRESETS ? presetRaw : "photoreal_documentary";
  const model = String(form.get("model") ?? "").trim().slice(0, 60) || "imported";

  if (!/^[a-z0-9][a-z0-9-]*$/.test(targetId)) {
    return Response.json({ error: "targetId must be an entity slug, e.g. thane-meric" }, { status: 400 });
  }
  if (!(file instanceof File)) return Response.json({ error: "file required" }, { status: 400 });
  const type = TYPES[file.type];
  if (!type) return Response.json({ error: `Unsupported file type: ${file.type || "unknown"}` }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File too large (80 MB max)" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();

  // One synthetic prompt row per entity + preset holds its imports.
  const seedHash = `import:entity:${targetId}:${stylePreset}`;
  const { data: existing } = await admin.from("cel_visual_prompts").select("id").eq("seed_hash", seedHash).maybeSingle();
  let promptId = existing?.id as string | undefined;
  if (!promptId) {
    const { data: inserted, error } = await admin
      .from("cel_visual_prompts")
      .insert({
        target_kind: "entity",
        target_id: targetId,
        style_preset: stylePreset,
        seed_hash: seedHash,
        prompt_json: {
          subject: "(imported asset: made outside the studio)",
          identityAnchors: [],
          setting: "",
          mood: "",
          lighting: "",
          camera: "",
          styleAnchors: [],
          negative: [],
          aspect: "16:9",
          intent: "scene_moment",
          raw: "(imported)",
        },
        evidence_refs: [],
        synth_model: "import",
        synth_prompt_version: "import-v1",
        corpus_version: "import",
        created_by: auth.userId,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      return Response.json({ error: `Prompt insert failed: ${error?.message ?? "unknown"}` }, { status: 500 });
    }
    promptId = inserted.id as string;
  }

  const assetId = crypto.randomUUID();
  const storagePath = `visuals/${promptId}/${assetId}.${type.ext}`;
  const { error: uploadErr } = await admin.storage
    .from(BUCKET_ID)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (uploadErr) return Response.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });

  const { error: assetErr } = await admin.from("cel_visual_assets").insert({
    id: assetId,
    prompt_id: promptId,
    asset_kind: type.kind,
    provider: "import",
    provider_model: model,
    provider_params_hash: crypto.createHash("sha256").update(`import|${assetId}`).digest("hex"),
    provider_params: { fileName: file.name.slice(0, 200) },
    storage_path: storagePath,
    byte_size: bytes.byteLength,
    content_type: file.type,
    approved: true,
    created_by: auth.userId,
  });
  if (assetErr) return Response.json({ error: `Asset insert failed: ${assetErr.message}` }, { status: 500 });

  const { data: urlData } = admin.storage.from(BUCKET_ID).getPublicUrl(storagePath);
  return Response.json({ assetId, promptId, kind: type.kind, url: urlData.publicUrl, approved: true });
}
