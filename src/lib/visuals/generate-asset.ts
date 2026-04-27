import "server-only";

import * as crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "./providers";
import { providerParamsHash } from "./hash";
import { extractAndPersistVision } from "./extract-vision";
import type { VisualPrompt } from "./types";
import type { VisualProviderName } from "./providers/types";

const BUCKET_ID = "beyond-media";

export type GenerateAssetInput = {
  promptId: string;
  prompt: VisualPrompt;
  provider: VisualProviderName;
  providerModel?: string;
  params?: Record<string, unknown>;
  userId?: string | null;
};

export type GenerateAssetResult = {
  assetId: string;
  url: string;
  kind: "image" | "video";
  cached: boolean;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
};

export async function getOrGenerateAsset(
  input: GenerateAssetInput,
): Promise<GenerateAssetResult> {
  const provider = getProvider(input.provider);
  const providerModel = input.providerModel ?? provider.defaultModel;
  const normalizedParams = provider.normalizeParams({
    ...(input.params ?? {}),
    model: providerModel,
  });
  const paramsHash = providerParamsHash(normalizedParams);

  const admin = createAdminClient();

  // Cache lookup: same prompt + provider + model + params → same row.
  const { data: existing } = await admin
    .from("cel_visual_assets")
    .select(
      "id, asset_kind, storage_path, width, height, duration_sec",
    )
    .eq("prompt_id", input.promptId)
    .eq("provider", input.provider)
    .eq("provider_model", providerModel)
    .eq("provider_params_hash", paramsHash)
    .maybeSingle();

  if (existing) {
    return {
      assetId: existing.id as string,
      url: publicUrlFor(existing.storage_path as string),
      kind: existing.asset_kind as "image" | "video",
      cached: true,
      width: (existing.width as number | null) ?? null,
      height: (existing.height as number | null) ?? null,
      durationSec: (existing.duration_sec as number | null) ?? null,
    };
  }

  // Generate.
  const generated = await provider.generate(input.prompt, normalizedParams);
  const assetId = crypto.randomUUID();
  const ext = extensionFor(generated.contentType);
  const storagePath = `visuals/${input.promptId}/${assetId}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET_ID)
    .upload(storagePath, generated.bytes, {
      contentType: generated.contentType,
      upsert: false,
    });
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: inserted, error } = await admin
    .from("cel_visual_assets")
    .insert({
      id: assetId,
      prompt_id: input.promptId,
      asset_kind: provider.kind,
      provider: input.provider,
      provider_model: providerModel,
      provider_params_hash: paramsHash,
      provider_params: normalizedParams,
      storage_path: storagePath,
      width: generated.width ?? null,
      height: generated.height ?? null,
      duration_sec: generated.durationSec ?? null,
      byte_size: generated.bytes.byteLength,
      content_type: generated.contentType,
      created_by: input.userId ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(`cel_visual_assets insert failed: ${error?.message ?? "unknown"}`);
  }

  // Vision continuity pass — only for images, fail-open. Blocks the response
  // ~3-5s but the caller is already waiting on Imagen and the description
  // must exist before the user clicks Approve.
  if (provider.kind === "image") {
    await extractAndPersistVision({
      assetId,
      imageBytes: generated.bytes,
      contentType: generated.contentType,
      userId: input.userId,
    });
  }

  return {
    assetId,
    url: publicUrlFor(storagePath),
    kind: provider.kind,
    cached: false,
    width: generated.width ?? null,
    height: generated.height ?? null,
    durationSec: generated.durationSec ?? null,
  };
}

function publicUrlFor(storagePath: string): string {
  const admin = createAdminClient();
  const { data } = admin.storage.from(BUCKET_ID).getPublicUrl(storagePath);
  return data.publicUrl;
}

function extensionFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("webm")) return "webm";
  return "bin";
}
