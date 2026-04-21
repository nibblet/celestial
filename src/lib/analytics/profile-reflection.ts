import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

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

export const REFLECTION_MODEL = "claude-sonnet-4-20250514";
const REFLECTION_MAX_TOKENS = 160;
import { book } from "@/config/book";

const REFLECTION_TIMEOUT_MS = 4000;

export type ReflectionCorpus = {
  reads: { title: string; themes: string[]; principles: string[] }[];
  savedPassages: { storyTitle: string; text: string }[];
  askedQuestions: string[];
};

const SYSTEM_PROMPT = `You are a warm, observant narrator writing a single reflective sentence (or two short sentences) about what a reader seems to be drawn to in "${book.title}" based on their activity in this companion app.

Rules:
- Voice: second person ("your reading keeps returning to…"). Never first person. Do not quote long passages verbatim.
- Tone: observational and warm, not prescriptive. Never tell them what to do.
- Length: 25–45 words total. Plain prose only. No lists, no markdown, no emojis.
- Never invent facts. If the signal is thin, say something honest and small.
- Reference what they seem drawn to: themes, principles, or the character of the passages they've saved. You may allude to questions they've asked as signs of curiosity.
- Never include the user's name. Write about the reader's tastes and questions — not about the author as a biographical subject.

Output: just the reflection text. No preamble, no quotes around it.`;

export function buildReflectionPrompt(corpus: ReflectionCorpus): string {
  const themeCounts = new Map<string, number>();
  const principleCounts = new Map<string, number>();
  for (const r of corpus.reads) {
    for (const t of r.themes) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
    for (const p of r.principles) principleCounts.set(p, (principleCounts.get(p) ?? 0) + 1);
  }

  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => `${name} (${count})`);

  const topPrinciples = [...principleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([text]) => `- ${text}`);

  const savedCapped = corpus.savedPassages.slice(-20);

  const lines: string[] = [];
  lines.push(`STORIES_READ: ${corpus.reads.length}`);
  lines.push(`TOP_THEMES: ${topThemes.join(", ") || "(none)"}`);
  lines.push(`TOP_PRINCIPLES:`);
  lines.push(topPrinciples.length ? topPrinciples.join("\n") : "(none)");
  lines.push(`SAVED_PASSAGES (${savedCapped.length}):`);
  if (savedCapped.length === 0) lines.push("(none)");
  for (const p of savedCapped) lines.push(`- from "${p.storyTitle}": ${p.text}`);
  lines.push(`QUESTIONS_ASKED:`);
  if (corpus.askedQuestions.length === 0) lines.push("(none)");
  for (const q of corpus.askedQuestions) lines.push(`- ${q}`);

  return lines.join("\n");
}

export type GeneratedReflection = {
  text: string;
  modelSlug: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
};

export async function generateReflection(
  corpus: ReflectionCorpus,
  anthropic: Anthropic
): Promise<GeneratedReflection | null> {
  const userPrompt = buildReflectionPrompt(corpus);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFLECTION_TIMEOUT_MS);

  const startedAt = Date.now();
  try {
    const response = await anthropic.messages.create(
      {
        model: REFLECTION_MODEL,
        max_tokens: REFLECTION_MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: controller.signal }
    );

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) return null;
    return {
      text,
      modelSlug: REFLECTION_MODEL,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
