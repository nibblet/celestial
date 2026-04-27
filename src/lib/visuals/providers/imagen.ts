import "server-only";

import type { VisualPrompt, VisualAspect } from "../types";
import type { GeneratedAsset, VisualProvider } from "./types";

/**
 * Google Imagen 4 provider via the Generative Language REST API.
 *
 * Endpoint:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key={GOOGLE_GENAI_API_KEY}
 *
 * The :predict response shape is { predictions: [{ bytesBase64Encoded, mimeType }] }.
 * If Google rotates the surface (Vertex / new path), swap only this file.
 */
const DEFAULT_MODEL = "imagen-4.0-generate-001";
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;

function aspectToImagenRatio(aspect: VisualAspect): string {
  switch (aspect) {
    case "16:9":
      return "16:9";
    case "9:16":
      return "9:16";
    case "1:1":
      return "1:1";
    case "4:5":
      return "3:4"; // closest Imagen ratio
    case "3:2":
      return "4:3"; // closest Imagen ratio
    default:
      return "1:1";
  }
}

export const imagenProvider: VisualProvider = {
  name: "imagen",
  kind: "image",
  defaultModel: DEFAULT_MODEL,

  normalizeParams(params) {
    return {
      model: params.model ?? DEFAULT_MODEL,
      aspectRatio: params.aspectRatio ?? null,
      sampleCount: params.sampleCount ?? 1,
      seed: params.seed ?? null,
      personGeneration: params.personGeneration ?? "allow_adult",
    };
  },

  async generate(prompt: VisualPrompt, params: Record<string, unknown>): Promise<GeneratedAsset> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_GENAI_API_KEY is not set");
    const model = (params.model as string) ?? DEFAULT_MODEL;
    const aspectRatio = (params.aspectRatio as string) ?? aspectToImagenRatio(prompt.aspect);
    const sampleCount = (params.sampleCount as number) ?? 1;
    const personGeneration = (params.personGeneration as string) ?? "allow_adult";

    // Imagen 4 dropped negativePrompt support — negatives are folded into
    // the raw prompt itself by the synthesizer ("Avoid: …" trailer).
    const body = {
      instances: [{ prompt: prompt.raw }],
      parameters: {
        sampleCount,
        aspectRatio,
        personGeneration,
        ...(params.seed != null ? { seed: params.seed } : {}),
      },
    };

    const res = await fetch(`${ENDPOINT(model)}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Imagen request failed (${res.status}): ${errText.slice(0, 500)}`);
    }

    const json = (await res.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
    };
    const pred = json.predictions?.[0];
    if (!pred?.bytesBase64Encoded) {
      throw new Error("Imagen returned no image bytes");
    }
    const bytes = Buffer.from(pred.bytesBase64Encoded, "base64");
    return {
      bytes,
      contentType: pred.mimeType ?? "image/png",
    };
  },
};
