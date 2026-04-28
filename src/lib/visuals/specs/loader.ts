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
const MAX_INHERITANCE_DEPTH = 6;

type RawLayer = { name: string; path: string; data: SpecLayer };

/**
 * Load and compose all spec layers for an entity, including inherited
 * layers from any parent_entity declared in the entity's master.json.
 *
 * Inheritance order (each layer overrides earlier ones for shared top-
 * level keys; `avoid` arrays compound):
 *
 *   parent.master      → parent.features → parent.state[name]      →
 *   child.master       → child.features  → child.view[name]        →
 *   child.state[name]
 *
 * Parent's view is intentionally NOT inherited — views are per-entity
 * camera/composition choices and don't transfer up the hierarchy.
 * Parent's state IS inherited because narrative harmonic states (Valkyrie's
 * dormant / active / alignment / etc.) apply to interior shots within the
 * same entity tree.
 *
 * Returns null when no specs exist for the entity.
 */
export function composeEntitySpec(
  request: SpecCompositionRequest,
): ComposedSpec | null {
  const visited = new Set<string>();
  const layers: RawLayer[] = [];
  collectLayers(request, layers, visited, 0);
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
      if (
        key === "render_style" &&
        value &&
        typeof value === "object" &&
        Array.isArray((value as SpecLayer).avoid)
      ) {
        avoid.push(...((value as SpecLayer).avoid as string[]));
      }
      if (
        key === "shared_rules" &&
        value &&
        typeof value === "object" &&
        Array.isArray((value as SpecLayer).avoid)
      ) {
        avoid.push(...((value as SpecLayer).avoid as string[]));
      }
      // parent_entity is metadata; don't inject into merged spec.
      if (key === "parent_entity") continue;
      merged[key] = value;
    }
  }

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

/**
 * Walk the parent chain (depth-limited, cycle-protected) and append each
 * entity's layers in inheritance order. Parent layers come first; the
 * leaf request's layers come last so it has the highest precedence.
 */
function collectLayers(
  request: SpecCompositionRequest,
  out: RawLayer[],
  visited: Set<string>,
  depth: number,
): void {
  if (depth > MAX_INHERITANCE_DEPTH) {
    console.warn(
      `[visuals/specs] inheritance depth exceeded for ${request.entitySlug}`,
    );
    return;
  }
  if (visited.has(request.entitySlug)) {
    console.warn(
      `[visuals/specs] cycle detected including ${request.entitySlug}`,
    );
    return;
  }
  visited.add(request.entitySlug);

  const dir = path.join(SPECS_ROOT, request.entitySlug);
  if (!fs.existsSync(dir)) return;

  const masterPath = path.join(dir, "master.json");
  let master: SpecLayer | null = null;
  if (fs.existsSync(masterPath)) {
    master = readJson(masterPath);
  }

  // 0. Recursively pull parent layers FIRST so child can override.
  if (master && typeof master.parent_entity === "string" && master.parent_entity) {
    collectLayers(
      {
        entitySlug: master.parent_entity,
        // Parent's view is NOT inherited. Parent's state IS inherited.
        view: undefined,
        state: request.state,
      },
      out,
      visited,
      depth + 1,
    );
  }

  // 1. master
  if (master) {
    out.push({
      name: depth === 0 ? "master" : `${request.entitySlug}:master`,
      path: masterPath,
      data: master,
    });
  }

  // 2. features/*.json
  const featuresDir = path.join(dir, "features");
  if (fs.existsSync(featuresDir)) {
    const featureFiles = fs
      .readdirSync(featuresDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    for (const file of featureFiles) {
      const featurePath = path.join(featuresDir, file);
      out.push({
        name:
          depth === 0
            ? `feature:${path.basename(file, ".json")}`
            : `${request.entitySlug}:feature:${path.basename(file, ".json")}`,
        path: featurePath,
        data: readJson(featurePath),
      });
    }
  }

  // 3. views/{view}.json — only for the leaf entity (depth === 0).
  if (depth === 0) {
    const viewName = request.view ?? DEFAULT_VIEW;
    const viewPath = path.join(dir, "views", `${viewName}.json`);
    if (fs.existsSync(viewPath)) {
      out.push({
        name: `view:${viewName}`,
        path: viewPath,
        data: readJson(viewPath),
      });
    }
  }

  // 4. states/{state}.json — composed LAST per scope. Parent's state
  // composes before child's full chain, so a child's state file (if it
  // exists with the same name) overrides the parent's state.
  if (request.state) {
    const statePath = path.join(dir, "states", `${request.state}.json`);
    if (fs.existsSync(statePath)) {
      out.push({
        name:
          depth === 0
            ? `state:${request.state}`
            : `${request.entitySlug}:state:${request.state}`,
        path: statePath,
        data: readJson(statePath),
      });
    }
  }
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
    if (key === "avoid") continue;
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
