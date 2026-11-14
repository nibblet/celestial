import "server-only";

import * as fs from "fs/promises";
import * as path from "path";

import type { VisualPrompt } from "../types";
import type { GeneratedAsset, VisualProvider } from "./types";
import { contentTypeForFile, resolveReferencePath } from "./openai-helpers";
import {
  KLING_MAX_PROMPT_CHARS,
  KLING_MAX_REFERENCES,
  RUNWAY_DEFAULT_VIDEO_MODEL,
  isKlingO3,
  klingReferencePreamble,
  runwayRatioFor,
  runwayDurationFor,
  withRestraint,
  toDataUri,
} from "./runway-helpers";

/**
 * Runway image-to-video provider (Gen-4.5 by default; Gen-4 Turbo optional).
 *
 * Runway is asynchronous: POST creates a task, then we poll until status
 * is SUCCEEDED. The provider blocks until the task completes (typical
 * 30-90s for a 5-10s clip) so the existing sync generate() interface holds.
 *
 * Required `params`:
 *   promptImageUrl  — the start frame: a Supabase public URL (a generated
 *                     still) or a /visual-references/... path (an approved
 *                     portrait, sent inline as a data URI because Runway
 *                     can't reach localhost). Identity carries from it.
 *
 * Optional:
 *   model           — defaults to RUNWAY_VIDEO_MODEL or 'gen4.5'
 *   duration        — gen4.5: 2–10s; gen4_turbo: 5 or 10s (snapped)
 *   motionText      — optional operator motion direction, overrides the
 *                     synthesized motion fields
 *   ratio           — pixel ratio: '1280:720' | '720:1280' | '1104:832' | ...
 *   seed            — integer for reproducibility
 */
function defaultModel(): string {
  return process.env.RUNWAY_VIDEO_MODEL?.trim() || RUNWAY_DEFAULT_VIDEO_MODEL;
}
const RUNWAY_VERSION = "2024-11-06";
const BASE_URL = "https://api.dev.runwayml.com/v1";
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000; // 6 minutes

export const runwayProvider: VisualProvider = {
  name: "runway",
  kind: "video",
  get defaultModel() {
    return defaultModel();
  },

  normalizeParams(params) {
    const model = (params.model as string | undefined) ?? defaultModel();
    return {
      model,
      duration: runwayDurationFor(model, Number(params.duration ?? 5)),
      // Optional operator-written motion direction; overrides the motion
      // text derived from the synthesized prompt. Part of the cache key.
      motionText:
        typeof params.motionText === "string" && params.motionText.trim()
          ? params.motionText.trim()
          : null,
      ratio: params.ratio ?? null,
      seed: params.seed ?? null,
      // promptImageUrl is part of the cache key — same prompt + same seed
      // image + same model + same params should serve the cached video.
      promptImageUrl: params.promptImageUrl ?? null,
      // Kling O3 only: character portraits sent alongside the start frame,
      // so a face revealed mid-shot is the right face. Part of the cache key.
      references: isKlingO3(model) ? normalizeReferences(params.references) : [],
      ...(typeof params.reroll === "string" ? { reroll: params.reroll } : {}),
    };
  },

  async generate(
    prompt: VisualPrompt,
    params: Record<string, unknown>,
  ): Promise<GeneratedAsset> {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) throw new Error("RUNWAY_API_KEY is not set");

    const promptImageUrl = params.promptImageUrl as string | undefined | null;
    if (!promptImageUrl) {
      throw new Error(
        "Runway provider requires params.promptImageUrl — generate or approve a still for this entity first.",
      );
    }

    const model = (params.model as string) || defaultModel();
    const duration = runwayDurationFor(model, Number(params.duration ?? 5));
    const ratio = (params.ratio as string) || runwayRatioFor(model, prompt.aspect);
    const motion =
      typeof params.motionText === "string" && params.motionText.trim()
        ? params.motionText
        : buildMotionPrompt(prompt);

    let body: Record<string, unknown>;
    if (isKlingO3(model)) {
      const refs = normalizeReferences(params.references);
      const preamble = klingReferencePreamble(refs.map((r) => r.label));
      body = {
        model,
        promptImage: [{ uri: await resolvePromptImage(promptImageUrl), position: "first" }],
        ...(refs.length
          ? {
              references: await Promise.all(
                refs.map(async (r) => ({ uri: await resolvePromptImage(r.path) })),
              ),
            }
          : {}),
        promptText: withRestraint(
          `${preamble} ${motion}`,
          KLING_MAX_PROMPT_CHARS,
        ),
        ratio,
        duration,
        audio: false,
      };
    } else {
      body = {
        promptImage: await resolvePromptImage(promptImageUrl),
        promptText: withRestraint(motion),
        model,
        ratio,
        duration,
        ...(params.seed != null ? { seed: params.seed } : {}),
      };
    }

    const createRes = await fetch(`${BASE_URL}/image_to_video`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": RUNWAY_VERSION,
      },
      body: JSON.stringify(body),
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      if (/not have enough credits/i.test(errText)) {
        throw new Error(
          "Runway API account is out of credits. Add credits in the Runway developer portal (dev.runwayml.com → Billing); Runway app subscription credits don't cover the API.",
        );
      }
      throw new Error(
        `Runway create failed (${createRes.status}): ${errText.slice(0, 500)}`,
      );
    }
    const created = (await createRes.json()) as { id?: string };
    if (!created.id) throw new Error("Runway create returned no task id");

    const taskId = created.id;
    const videoUrl = await pollUntilReady(taskId, apiKey);

    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      throw new Error(`Runway output download failed (${videoRes.status})`);
    }
    const arrayBuf = await videoRes.arrayBuffer();
    const bytes = Buffer.from(arrayBuf);
    const contentType = videoRes.headers.get("content-type") ?? "video/mp4";

    return {
      bytes,
      contentType,
      durationSec: duration,
    };
  },
};

/**
 * Runway image-to-video promptText has a 1000-char cap and is meant to
 * describe MOTION — the seed image already carries scene + identity, so
 * re-describing them wastes the budget and dilutes the motion signal.
 *
 * Priority order:
 *   1. Explicit motion fields (subjectMotion + cameraMotion) — populated
 *      when the prompt was synthesized with intent=motion_loop.
 *   2. Fallback: mood + colorArc + a generic "subtle ambient movement" cue.
 *
 * Capped at 990 chars with a hard truncate at the last sentence boundary.
 */
function buildMotionPrompt(prompt: VisualPrompt): string {
  const RUNWAY_MAX = 990;
  const parts: string[] = [];

  if (prompt.subjectMotion) parts.push(`Subject motion: ${prompt.subjectMotion}`);
  if (prompt.cameraMotion) parts.push(`Camera motion: ${prompt.cameraMotion}`);
  if (prompt.colorArc) parts.push(`Color: ${prompt.colorArc}`);
  if (prompt.audio) parts.push(`Audio: ${prompt.audio}`);

  if (parts.length === 0) {
    // No motion fields populated — synthesize a minimal motion cue from mood
    // + lighting so Runway has something to drive animation choices.
    if (prompt.mood) parts.push(`Mood: ${prompt.mood}`);
    parts.push(
      "Subtle ambient motion: gentle parallax drift, breathing scale, atmospheric particulate, micro-movement on lit surfaces. Hold the composition; no cuts.",
    );
  }

  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= RUNWAY_MAX) return text;
  // Truncate at the last full sentence within the cap.
  const truncated = text.slice(0, RUNWAY_MAX);
  const lastStop = Math.max(truncated.lastIndexOf(". "), truncated.lastIndexOf("; "));
  return lastStop > 200 ? truncated.slice(0, lastStop + 1) : truncated;
}

/**
 * Runway fetches promptImage itself, so it must be a public HTTPS URL or a
 * data URI. Approved reference portraits live in /public/visual-references
 * and are served from the operator's localhost, which Runway can't reach —
 * send those inline as a data URI. Supabase public URLs pass through.
 */
async function resolvePromptImage(ref: string): Promise<string> {
  if (ref.startsWith("data:")) return ref;
  const resolved = resolveReferencePath(ref, {
    publicDir: path.join(process.cwd(), "public"),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  if (resolved.kind === "remote") return resolved.url;
  const bytes = await fs.readFile(resolved.filePath);
  return toDataUri(bytes, contentTypeForFile(resolved.fileName));
}

async function pollUntilReady(taskId: string, apiKey: string): Promise<string> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": RUNWAY_VERSION,
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Runway poll failed (${res.status}): ${errText.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      status?: string;
      output?: string[];
      failure?: string;
      failureCode?: string;
    };
    if (json.status === "SUCCEEDED" && json.output?.[0]) {
      return json.output[0];
    }
    if (json.status === "FAILED" || json.status === "CANCELLED") {
      throw new Error(
        `Runway task ${json.status}: ${json.failureCode ?? "unknown"} ${json.failure ?? ""}`,
      );
    }
    // PENDING / RUNNING / THROTTLED — keep polling.
  }
  throw new Error(`Runway task ${taskId} timed out after ${POLL_TIMEOUT_MS}ms`);
}

type VideoReference = { path: string; label: string };

/** Validate {path,label}[] from params; cap so start frame + refs <= 7. */
function normalizeReferences(raw: unknown): VideoReference[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is VideoReference =>
        !!r &&
        typeof r === "object" &&
        typeof (r as VideoReference).path === "string" &&
        typeof (r as VideoReference).label === "string",
    )
    .map((r) => ({ path: r.path.trim(), label: r.label.trim().slice(0, 80) }))
    .filter((r) => r.path && r.label)
    .slice(0, KLING_MAX_REFERENCES);
}
