import { createHash } from "node:crypto";

export type ReflectionInputs = {
  readCount: number;
  savedCount: number;
  askedCount: number;
};

export type CachedReflection = {
  reflectionText: string;
  generatedAt: Date;
  inputSignature: string;
  modelSlug: string;
};

export type RegenerateDecision = "none" | "use-cache" | "generate";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const READ_TRIGGER = 3;
const SAVED_TRIGGER = 1;
const ASKED_TRIGGER = 1;

/**
 * Input signature format: "<read>.<saved>.<asked>:<sha256-prefix>"
 * - Prefix preserves counts for delta comparison on read.
 * - Hash suffix protects against hand-edits and lets us version the format later.
 */
export function computeInputSignature(inputs: ReflectionInputs): string {
  const prefix = `${inputs.readCount}.${inputs.savedCount}.${inputs.askedCount}`;
  const hash = createHash("sha256").update(prefix).digest("hex").slice(0, 16);
  return `${prefix}:${hash}`;
}

function decodeSignature(sig: string): ReflectionInputs | null {
  const [prefix] = sig.split(":");
  const parts = prefix?.split(".") ?? [];
  if (parts.length !== 3) return null;
  const [r, s, a] = parts.map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(r) || !Number.isFinite(s) || !Number.isFinite(a)) return null;
  return { readCount: r, savedCount: s, askedCount: a };
}

/**
 * Decide whether to (re)generate the reflection, use the cached one, or show nothing.
 * - "none":       user has no reading activity yet
 * - "use-cache":  cached row is still fresh enough
 * - "generate":   triggers met AND cooldown elapsed (or no cache exists)
 */
export function shouldRegenerateReflection(args: {
  inputs: ReflectionInputs;
  cached: CachedReflection | null;
  now: Date;
}): RegenerateDecision {
  const { inputs, cached, now } = args;

  if (inputs.readCount === 0) return "none";
  if (!cached) return "generate";

  const cooldownElapsed =
    now.getTime() - cached.generatedAt.getTime() >= COOLDOWN_MS;

  const decoded = decodeSignature(cached.inputSignature);
  if (!decoded) return cooldownElapsed ? "generate" : "use-cache";

  const readDelta = inputs.readCount - decoded.readCount;
  const savedDelta = inputs.savedCount - decoded.savedCount;
  const askedDelta = inputs.askedCount - decoded.askedCount;

  const triggersMet =
    readDelta >= READ_TRIGGER ||
    savedDelta >= SAVED_TRIGGER ||
    askedDelta >= ASKED_TRIGGER;

  if (!cooldownElapsed) return "use-cache";
  if (!triggersMet) return "use-cache";
  return "generate";
}
