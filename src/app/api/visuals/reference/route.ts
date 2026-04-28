import * as crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractAndPersistVision } from "@/lib/visuals/extract-vision";
import type { VisualTargetKind } from "@/lib/visuals/types";

export const dynamic = "force-dynamic";

const BUCKET_ID = "beyond-media";
/** Internal sentinel — keeps reference uploads out of the user-facing
 *  style-preset picker but still flows through the cel_visual_prompts table
 *  so the existing continuity lookup ({@link fetchIdentityContinuity})
 *  finds them with no special-case code. */
const REFERENCE_STYLE_PRESET = "reference_upload";
const VALID_TARGET_KINDS: VisualTargetKind[] = ["entity"];
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 15 * 1024 * 1024;

async function requireKeith() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 } as const;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("cel_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "author"].includes(profile.role)) {
    return { error: "Forbidden" as const, status: 403 } as const;
  }
  return { userId: user.id } as const;
}

/**
 * POST /api/visuals/reference
 *
 * Multipart form: { targetKind: 'entity', targetId: <slug>, file: <image> }
 *
 * Uploads a user-supplied reference image, runs vision extraction on it,
 * and stores it as an auto-approved asset under a synthetic
 * 'reference_upload' prompt. The next synthesis for the same entity will
 * pick up the identity fingerprint via the existing continuity path.
 */
export async function POST(request: Request) {
  const auth = await requireKeith();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const form = await request.formData();
  const targetKind = String(form.get("targetKind") ?? "") as VisualTargetKind;
  const targetId = String(form.get("targetId") ?? "").trim();
  const file = form.get("file");

  if (!VALID_TARGET_KINDS.includes(targetKind)) {
    return Response.json(
      { error: "Reference uploads currently support targetKind=entity only" },
      { status: 400 },
    );
  }
  if (!targetId) {
    return Response.json({ error: "targetId required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return Response.json({ error: "file required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: `Unsupported image type: ${file.type}` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File too large (15 MB max)" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = extensionFor(file.type);
  const admin = createAdminClient();

  // Reuse a single 'reference_upload' prompt row per entity so multiple
  // refs (e.g. front + side photos) live under one logical prompt.
  const seedHash = `reference_upload:${targetKind}:${targetId}`;
  const { data: existingPrompt } = await admin
    .from("cel_visual_prompts")
    .select("id")
    .eq("seed_hash", seedHash)
    .maybeSingle();

  let promptId = existingPrompt?.id as string | undefined;
  if (!promptId) {
    const { data: inserted, error: promptErr } = await admin
      .from("cel_visual_prompts")
      .insert({
        target_kind: targetKind,
        target_id: targetId,
        style_preset: REFERENCE_STYLE_PRESET,
        seed_hash: seedHash,
        prompt_json: {
          subject: "(reference upload — identity source only, not a generation prompt)",
          identityAnchors: [],
          setting: "",
          mood: "",
          lighting: "",
          camera: "",
          cameraMotion: "",
          subjectMotion: "",
          colorArc: "",
          audio: "",
          styleAnchors: [],
          negative: [],
          aspect: "1:1",
          intent: "portrait",
          raw: "(reference upload)",
        },
        evidence_refs: [],
        synth_model: "manual_upload",
        synth_prompt_version: "ref-v1",
        corpus_version: "ref",
        created_by: auth.userId ?? null,
      })
      .select("id")
      .single();
    if (promptErr || !inserted) {
      return Response.json(
        { error: `Reference prompt insert failed: ${promptErr?.message ?? "unknown"}` },
        { status: 500 },
      );
    }
    promptId = inserted.id as string;
  }

  const assetId = crypto.randomUUID();
  const storagePath = `visuals/reference/${targetId}/${assetId}.${ext}`;
  const { error: uploadErr } = await admin.storage
    .from(BUCKET_ID)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (uploadErr) {
    return Response.json(
      { error: `Storage upload failed: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  const paramsHash = crypto
    .createHash("sha256")
    .update(`reference|${assetId}`)
    .digest("hex");

  const { data: assetRow, error: assetErr } = await admin
    .from("cel_visual_assets")
    .insert({
      id: assetId,
      prompt_id: promptId,
      asset_kind: "image",
      provider: "manual_upload",
      provider_model: "reference",
      provider_params_hash: paramsHash,
      provider_params: {},
      storage_path: storagePath,
      byte_size: bytes.byteLength,
      content_type: file.type,
      approved: true,
      created_by: auth.userId ?? null,
    })
    .select("id")
    .single();
  if (assetErr || !assetRow) {
    return Response.json(
      { error: `Reference asset insert failed: ${assetErr?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  const description = await extractAndPersistVision({
    assetId,
    imageBytes: bytes,
    contentType: file.type,
    userId: auth.userId,
  });

  const { data: urlData } = admin.storage.from(BUCKET_ID).getPublicUrl(storagePath);

  return Response.json({
    assetId,
    promptId,
    url: urlData.publicUrl,
    approved: true,
    visionExtracted: !!description,
    identity: description?.identity ?? null,
  });
}

function extensionFor(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}
