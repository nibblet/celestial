import "server-only";

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

import type {
  ComposedSpec,
  SpecCompositionRequest,
  SpecLayer,
} from "./types";

const SPECS_ROOT = path.join(process.cwd(), "content/wiki/specs");
const DEFAULT_VIEW = "three_quarter";

/**
 * Load and compose all spec layers for an entity. Returns null when no
 * specs exist for the entity, so the synthesizer can fall back to its
 * legacy corpus-only behavior with no regression.
 */
export function composeEntitySpec(
  request: SpecCompositionRequest,
): ComposedSpec | null {
  const dir = path.join(SPECS_ROOT, request.entitySlug);
  if (!fs.existsSync(dir)) return null;

  const layers: { name: string; path: string; data: SpecLayer }[] = [];

  // 1. master.json
  const masterPath = path.join(dir, "master.json");
  if (fs.existsSync(masterPath)) {
    layers.push({ name: "master", path: masterPath, data: readJson(masterPath) });
  }

  // 2. views/{view}.json
  const viewName = request.view ?? DEFAULT_VIEW;
  const viewPath = path.join(dir, "views", `${viewName}.json`);
  if (fs.existsSync(viewPath)) {
    layers.push({
      name: `view:${viewName}`,
      path: viewPath,
      data: readJson(viewPath),
    });
  }

  // 3. states/{state}.json
  if (request.state) {
    const statePath = path.join(dir, "states", `${request.state}.json`);
    if (fs.existsSync(statePath)) {
      layers.push({
        name: `state:${request.state}`,
        path: statePath,
        data: readJson(statePath),
      });
    }
  }

  // 4. features/*.json — inject every feature for the entity. Filtering by
  // keyword can be added later if token usage becomes a concern.
  const featuresDir = path.join(dir, "features");
  if (fs.existsSync(featuresDir)) {
    const featureFiles = fs
      .readdirSync(featuresDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    for (const file of featureFiles) {
      const featurePath = path.join(featuresDir, file);
      layers.push({
        name: `feature:${path.basename(file, ".json")}`,
        path: featurePath,
        data: readJson(featurePath),
      });
    }
  }

  if (layers.length === 0) return null;

  // Merge: later layers override earlier ones at the top level.
  // `avoid` arrays are concatenated, never replaced.
  const merged: SpecLayer = {};
  const avoid: string[] = [];
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer.data)) {
      if (key === "avoid" && Array.isArray(value)) {
        avoid.push(...(value as string[]));
        continue;
      }
      // Nested `render_style.avoid` is a common authoring pattern in the
      // user-supplied JSONs; surface those into the avoid bucket too.
      if (
        key === "render_style" &&
        value &&
        typeof value === "object" &&
        Array.isArray((value as SpecLayer).avoid)
      ) {
        avoid.push(...((value as SpecLayer).avoid as string[]));
      }
      // Same pattern for shared_rules.avoid (orthogonal-views shape).
      if (
        key === "shared_rules" &&
        value &&
        typeof value === "object" &&
        Array.isArray((value as SpecLayer).avoid)
      ) {
        avoid.push(...((value as SpecLayer).avoid as string[]));
      }
      merged[key] = value;
    }
  }

  // Dedupe + preserve order on avoid.
  const seen = new Set<string>();
  const dedupedAvoid: string[] = [];
  for (const a of avoid) {
    const norm = a.trim().toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    dedupedAvoid.push(a);
  }

  return {
    entitySlug: request.entitySlug,
    layers: layers.map((l) => ({ name: l.name, path: l.path })),
    merged,
    avoid: dedupedAvoid,
    hash: hashSpec(layers.map((l) => l.data), dedupedAvoid),
  };
}

function readJson(filePath: string): SpecLayer {
  try {
    const text = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(text) as SpecLayer;
  } catch (err) {
    throw new Error(
      `Failed to parse spec ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function hashSpec(layers: SpecLayer[], avoid: string[]): string {
  const payload = JSON.stringify({ layers, avoid });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/**
 * Render the composed spec as a plain-text block the synthesizer hands
 * verbatim to the visual_director persona. Each top-level field becomes
 * an indented bullet group; nested objects are flattened to dotted keys.
 */
export function renderSpecForPrompt(spec: ComposedSpec): string {
  const lines: string[] = [
    "# Visual Spec — CANON OVERRIDE",
    "Transcribe these field values verbatim into identity_anchors and the raw prompt.",
    "Do NOT paraphrase. Do NOT add architectural details that contradict these fields.",
    "If anything in your default guidance conflicts with the spec, the spec wins.",
    "",
    `Entity: ${spec.entitySlug}`,
    `Layers applied: ${spec.layers.map((l) => l.name).join(", ")}`,
    "",
  ];
  for (const [key, value] of Object.entries(spec.merged)) {
    if (key === "avoid") continue; // emitted separately at the bottom
    lines.push(`## ${key}`);
    lines.push(...renderValue(value, "  "));
    lines.push("");
  }
  if (spec.avoid.length > 0) {
    lines.push("## avoid (merge into negative prompt array)");
    for (const a of spec.avoid) {
      lines.push(`  - ${a}`);
    }
  }
  return lines.join("\n");
}

function renderValue(value: unknown, indent: string): string[] {
  if (value === null || value === undefined) return [`${indent}(none)`];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [`${indent}${value}`];
  }
  if (Array.isArray(value)) {
    return value.map((item) => `${indent}- ${formatScalar(item)}`);
  }
  if (typeof value === "object") {
    const out: string[] = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean"
      ) {
        out.push(`${indent}${k}: ${v}`);
      } else if (Array.isArray(v)) {
        out.push(`${indent}${k}:`);
        for (const item of v) out.push(`${indent}  - ${formatScalar(item)}`);
      } else if (v && typeof v === "object") {
        out.push(`${indent}${k}:`);
        out.push(...renderValue(v, `${indent}  `));
      }
    }
    return out;
  }
  return [`${indent}${String(value)}`];
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
