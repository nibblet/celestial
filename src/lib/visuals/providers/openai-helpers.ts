import * as path from "path";

import type { VisualAspect } from "../types";

/**
 * Pure helpers for the OpenAI image provider, kept free of `server-only`
 * so they can be unit-tested.
 */

export const OPENAI_DEFAULT_IMAGE_MODEL = "gpt-image-2";

/** Public URL prefix whose files may be attached as references. */
export const LOCAL_REFERENCE_PREFIX = "/visual-references/";

/** OpenAI accepts up to 16 input images per edit. */
export const MAX_REFERENCE_IMAGES = 16;

/**
 * Pixel size for an aspect ratio.
 *
 * gpt-image-2 and the 2.5 family accept arbitrary WIDTHxHEIGHT (both
 * divisible by 16, ratio within 1:3–3:1), so we can honour 4:5 and 16:9
 * exactly. Older models only take the three standard sizes, so fall back
 * to the closest of those.
 */
export function openAiSizeFor(aspect: VisualAspect, model: string): string {
  const flexible = /^gpt-image-2/.test(model);
  if (flexible) {
    switch (aspect) {
      case "16:9":
        return "1536x864";
      case "9:16":
        return "864x1536";
      case "4:5":
        return "1024x1280";
      case "3:2":
        return "1536x1024";
      case "2:3":
        return "1024x1536";
      case "1:1":
      default:
        return "1024x1024";
    }
  }
  switch (aspect) {
    case "16:9":
    case "3:2":
      return "1536x1024";
    case "9:16":
    case "4:5":
    case "2:3":
      return "1024x1536";
    case "1:1":
    default:
      return "1024x1024";
  }
}

/**
 * input_fidelity is only accepted by some models (gpt-image-1.5 takes
 * high/low; the gpt-image-2 docs say to omit it). Return the value to send,
 * or null to leave the field out.
 */
export function inputFidelityFor(model: string): "high" | null {
  return /^gpt-image-1\.5/.test(model) ? "high" : null;
}

export type ResolvedReference =
  | { kind: "local"; filePath: string; fileName: string }
  | { kind: "remote"; url: string; fileName: string };

/**
 * Validate a reference path and resolve where to read it from.
 *
 * Allowed:
 *   - "/visual-references/<file>" → read from <publicDir>/visual-references
 *   - a public object URL in this project's Supabase storage
 * Anything else (other hosts, traversal, other public folders) is rejected
 * so a crafted request can't make the server read arbitrary files or URLs.
 */
export function resolveReferencePath(
  ref: string,
  opts: { publicDir: string; supabaseUrl?: string },
): ResolvedReference {
  const trimmed = ref.trim();
  if (trimmed.startsWith(LOCAL_REFERENCE_PREFIX)) {
    const rel = decodeURIComponent(trimmed.slice(1)); // drop leading "/"
    const allowedRoot = path.resolve(opts.publicDir, "visual-references");
    const filePath = path.resolve(opts.publicDir, rel);
    if (!filePath.startsWith(allowedRoot + path.sep)) {
      throw new Error(`Reference path escapes visual-references: ${ref}`);
    }
    return { kind: "local", filePath, fileName: path.basename(filePath) };
  }
  if (opts.supabaseUrl) {
    const storagePrefix = `${opts.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/`;
    if (trimmed.startsWith(storagePrefix) && !trimmed.includes("..")) {
      return {
        kind: "remote",
        url: trimmed,
        fileName: trimmed.split("/").pop()?.split("?")[0] || "reference.png",
      };
    }
  }
  throw new Error(`Reference not allowed: ${ref}`);
}

export function contentTypeForFile(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  throw new Error(`Unsupported reference format (png, webp or jpg only): ${fileName}`);
}

/** Read "1024x1280" into numbers for the asset row. */
export function parseSize(size: string): { width?: number; height?: number } {
  const m = /^(\d+)x(\d+)$/.exec(size);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : {};
}
