import "server-only";

import * as fs from "fs/promises";
import * as path from "path";

import type { VisualPrompt } from "../types";
import type { GeneratedAsset, VisualProvider } from "./types";
import {
  MAX_REFERENCE_IMAGES,
  OPENAI_DEFAULT_IMAGE_MODEL,
  contentTypeForFile,
  inputFidelityFor,
  openAiSizeFor,
  parseSize,
  resolveReferencePath,
} from "./openai-helpers";

/**
 * OpenAI GPT Image provider.
 *
 * - No reference images → POST /v1/images/generations (JSON).
 * - With reference images → POST /v1/images/edits (multipart, `image[]`
 *   repeated, up to 16). This is how the spec's identity portrait and the
 *   PROJECT VALKYRIE patch reach the model.
 *
 * GPT image models always return base64 (`data[0].b64_json`).
 *
 * Env:
 *   OPENAI_API_KEY      required
 *   OPENAI_IMAGE_MODEL  optional, defaults to gpt-image-2
 *
 * Params (all optional):
 *   model, size, quality ('low' | 'medium' | 'high', default 'high'),
 *   referenceImages (string[] of /visual-references/... paths or this
 *   project's Supabase public URLs; part of the cache key).
 */
const API_BASE = "https://api.openai.com/v1";

function defaultModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || OPENAI_DEFAULT_IMAGE_MODEL;
}

export const openaiProvider: VisualProvider = {
  name: "openai",
  kind: "image",
  get defaultModel() {
    return defaultModel();
  },

  normalizeParams(params) {
    const refs = Array.isArray(params.referenceImages)
      ? (params.referenceImages as unknown[]).filter(
          (r): r is string => typeof r === "string" && r.trim() !== "",
        )
      : [];
    return {
      model: params.model ?? defaultModel(),
      size: params.size ?? null,
      quality: params.quality ?? "high",
      referenceImages: refs,
    };
  },

  async generate(prompt: VisualPrompt, params: Record<string, unknown>): Promise<GeneratedAsset> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    const model = (params.model as string) || defaultModel();
    const size = (params.size as string) || openAiSizeFor(prompt.aspect, model);
    const quality = (params.quality as string) || "high";
    const refs = (params.referenceImages as string[] | undefined) ?? [];
    if (refs.length > MAX_REFERENCE_IMAGES) {
      throw new Error(`OpenAI accepts at most ${MAX_REFERENCE_IMAGES} reference images`);
    }

    let res: Response;
    if (refs.length === 0) {
      res = await fetch(`${API_BASE}/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: prompt.raw,
          size,
          quality,
          n: 1,
          output_format: "png",
        }),
      });
    } else {
      const form = new FormData();
      form.set("model", model);
      form.set("prompt", prompt.raw);
      form.set("size", size);
      form.set("quality", quality);
      form.set("n", "1");
      form.set("output_format", "png");
      const fidelity = inputFidelityFor(model);
      if (fidelity) form.set("input_fidelity", fidelity);
      for (const ref of refs) {
        const { bytes, fileName, contentType } = await loadReference(ref);
        form.append("image[]", new Blob([new Uint8Array(bytes)], { type: contentType }), fileName);
      }
      res = await fetch(`${API_BASE}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI image request failed (${res.status}): ${errText.slice(0, 500)}`);
    }

    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string }>;
      size?: string;
    };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI returned no image bytes");

    return {
      bytes: Buffer.from(b64, "base64"),
      contentType: "image/png",
      ...parseSize(json.size ?? size),
    };
  },
};

async function loadReference(
  ref: string,
): Promise<{ bytes: Buffer; fileName: string; contentType: string }> {
  const resolved = resolveReferencePath(ref, {
    publicDir: path.join(process.cwd(), "public"),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  const contentType = contentTypeForFile(resolved.fileName);
  if (resolved.kind === "local") {
    const bytes = await fs.readFile(resolved.filePath);
    return { bytes, fileName: resolved.fileName, contentType };
  }
  const res = await fetch(resolved.url);
  if (!res.ok) throw new Error(`Couldn't fetch reference ${ref} (${res.status})`);
  return { bytes: Buffer.from(await res.arrayBuffer()), fileName: resolved.fileName, contentType };
}
