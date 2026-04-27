import type { VisualPrompt } from "../types";

export type GeneratedAsset = {
  bytes: Buffer;
  contentType: string;
  width?: number;
  height?: number;
  durationSec?: number;
};

export type VisualProviderName = "imagen" | "runway" | "flux" | "ideogram" | "veo" | "kling";

export interface VisualProvider {
  name: VisualProviderName;
  kind: "image" | "video";
  defaultModel: string;
  /**
   * Normalize the params object the way the provider would actually use it,
   * so equivalent inputs produce the same params_hash.
   */
  normalizeParams(params: Record<string, unknown>): Record<string, unknown>;
  generate(
    prompt: VisualPrompt,
    params: Record<string, unknown>,
  ): Promise<GeneratedAsset>;
}
