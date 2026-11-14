import "server-only";

import type { VisualPrompt, VisualAspect } from "../types";
import type { GeneratedAsset, VisualProvider } from "./types";

/**
 * Image provider registered as `imagen` for admin/API compatibility.
 *
 * Google shut down all Imagen models (2026-08-17). This file now calls
 * Gemini Nano Banana 2.1 — the recommended replacement for
 * `imagen-4.0-generate-001` — via generateContent + IMAGE modality.
 *
 * Endpoint:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=…
 *
 * Response parts carry inlineData { mimeType, data } (base64).
 */
const DEFAULT_MODEL = "gemini-nano-banana-2.1";
/** HIGH matches Google's mapping from imagen-4.0-generate-001 quality tier. */
const DEFAULT_THINKING_LEVEL = "high";
const DEFAULT_IMAGE_SIZE = "2K";

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function aspectToImageRatio(aspect: VisualAspect): string {
  switch (aspect) {
    case "16:9":
      return "16:9";
    case "9:16":
      return "9:16";
    case "1:1":
      return "1:1";
    case "4:5":
      return "4:5";
    case "3:2":
      return "3:2";
    default:
      return "1:1";
  }
}

type GenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
        inline_data?: { mime_type?: string; data?: string };
      }>;
    };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string };
};

function extractInlineImage(json: GenerateContentResponse): {
  data: string;
  mimeType: string;
} | null {
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType ?? "image/png",
      };
    }
    // Some responses use snake_case.
    if (part.inline_data?.data) {
      return {
        data: part.inline_data.data,
        mimeType: part.inline_data.mime_type ?? "image/png",
      };
    }
  }
  return null;
}

export const imagenProvider: VisualProvider = {
  name: "imagen",
  kind: "image",
  defaultModel: DEFAULT_MODEL,

  normalizeParams(params) {
    return {
      model: params.model ?? DEFAULT_MODEL,
      aspectRatio: params.aspectRatio ?? null,
      imageSize: params.imageSize ?? DEFAULT_IMAGE_SIZE,
      thinkingLevel: params.thinkingLevel ?? DEFAULT_THINKING_LEVEL,
      seed: params.seed ?? null,
      // Cache-bust token from force regenerate — not sent to the API.
      ...(typeof params.reroll === "string" ? { reroll: params.reroll } : {}),
    };
  },

  async generate(prompt: VisualPrompt, params: Record<string, unknown>): Promise<GeneratedAsset> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_GENAI_API_KEY is not set");

    const model = (params.model as string) ?? DEFAULT_MODEL;
    const aspectRatio = (params.aspectRatio as string) ?? aspectToImageRatio(prompt.aspect);
    const imageSize = (params.imageSize as string) ?? DEFAULT_IMAGE_SIZE;
    const thinkingLevel = (params.thinkingLevel as string) ?? DEFAULT_THINKING_LEVEL;

    // Negatives stay in the raw prompt trailer ("Avoid: …") — Nano Banana
    // has no separate negativePrompt field (same as late Imagen 4).
    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt.raw }],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio,
          imageSize,
        },
        thinkingConfig: {
          thinkingLevel,
        },
        // Seed is kept in normalizeParams for cache partitioning when set in
        // admin, but Nano Banana does not document a seed field — omit from body.
      },
    };

    const res = await fetch(`${ENDPOINT(model)}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Nano Banana request failed (${res.status}): ${errText.slice(0, 500)}`);
    }

    const json = (await res.json()) as GenerateContentResponse;
    if (json.error?.message) {
      throw new Error(`Nano Banana error: ${json.error.message}`);
    }

    const finishReason = json.candidates?.[0]?.finishReason;
    const image = extractInlineImage(json);
    if (!image) {
      throw new Error(
        `Nano Banana returned no image bytes${finishReason ? ` (finishReason=${finishReason})` : ""}`,
      );
    }

    return {
      bytes: Buffer.from(image.data, "base64"),
      contentType: image.mimeType,
    };
  },
};
