import "server-only";

import type { VisualPrompt, VisualAspect } from "../types";
import type { GeneratedAsset, VisualProvider } from "./types";

/**
 * Runway Gen-4 Turbo provider — image-to-video.
 *
 * Runway is asynchronous: POST creates a task, then we poll until status
 * is SUCCEEDED. The provider blocks until the task completes (typical
 * 30-90s for a 5-10s clip) so the existing sync generate() interface holds.
 *
 * Required `params`:
 *   promptImageUrl  — public URL of the seed image. We pass the URL of the
 *                     approved still for the same entity, so the rendered
 *                     identity stays locked into the video.
 *
 * Optional:
 *   model           — defaults to 'gen4_turbo'
 *   duration        — 5 or 10 seconds (Runway constraint)
 *   ratio           — pixel ratio: '1280:720' | '720:1280' | '1104:832' | ...
 *   seed            — integer for reproducibility
 */
const DEFAULT_MODEL = "gen4_turbo";
const RUNWAY_VERSION = "2024-11-06";
const BASE_URL = "https://api.dev.runwayml.com/v1";
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 6 * 60 * 1000; // 6 minutes

function aspectToRunwayRatio(aspect: VisualAspect): string {
  switch (aspect) {
    case "16:9":
      return "1280:720";
    case "9:16":
      return "720:1280";
    case "1:1":
      return "960:960";
    case "4:5":
      return "832:1104";
    case "3:2":
      return "1104:832";
    default:
      return "1280:720";
  }
}

export const runwayProvider: VisualProvider = {
  name: "runway",
  kind: "video",
  defaultModel: DEFAULT_MODEL,

  normalizeParams(params) {
    return {
      model: params.model ?? DEFAULT_MODEL,
      duration: params.duration ?? 5,
      ratio: params.ratio ?? null,
      seed: params.seed ?? null,
      // promptImageUrl is part of the cache key — same prompt + same seed
      // image + same model + same params should serve the cached video.
      promptImageUrl: params.promptImageUrl ?? null,
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

    const model = (params.model as string) ?? DEFAULT_MODEL;
    const duration = (params.duration as number) ?? 5;
    const ratio = (params.ratio as string) ?? aspectToRunwayRatio(prompt.aspect);

    const body: Record<string, unknown> = {
      promptImage: promptImageUrl,
      promptText: buildMotionPrompt(prompt),
      model,
      ratio,
      duration,
      ...(params.seed != null ? { seed: params.seed } : {}),
    };

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
