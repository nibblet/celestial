import type { AskReaderMode } from "./ask-evidence";
import type { AskIntent } from "./ask-intent";
import type { CanonSourceRank } from "@/lib/wiki/corpus";

export const ASK_CONTEXT_PACK_SCHEMA_VERSION = 1;

export type AskContextItemKind =
  | "story"
  | "entity"
  | "rule"
  | "character_arc"
  | "scene"
  | "open_thread"
  | "journey_beat"
  | "wiki_document";

export type AskContextItem = {
  kind: AskContextItemKind;
  title: string;
  href: string;
  canonRank: CanonSourceRank;
  excerpt: string;
  score: number;
  storyId?: string;
  slug?: string;
};

export type AskContextPack = {
  schemaVersion: typeof ASK_CONTEXT_PACK_SCHEMA_VERSION;
  message: string;
  intent: AskIntent;
  mode: AskReaderMode;
  items: AskContextItem[];
  confidence: number;
  budget: {
    maxItems: number;
    maxChars: number;
    actualChars: number;
  };
  gaps: string[];
  derivedInsights: string[];
};

export type CreateAskContextPackInput = {
  message: string;
  intent: AskIntent;
  items: AskContextItem[];
  mode: AskReaderMode;
  maxItems?: number;
  maxChars?: number;
  gaps?: string[];
  derivedInsights?: string[];
};

function estimateItemChars(item: AskContextItem): number {
  return item.title.length + item.href.length + item.excerpt.length + 20;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createAskContextPack(
  input: CreateAskContextPackInput,
): AskContextPack {
  const maxItems = input.maxItems ?? (input.mode === "fast" ? 5 : 10);
  const maxChars = input.maxChars ?? (input.mode === "fast" ? 4_000 : 9_000);
  const sortedItems = [...input.items].sort((a, b) => b.score - a.score);
  const items: AskContextItem[] = [];
  let actualChars = 0;

  for (const item of sortedItems) {
    if (items.length >= maxItems) break;
    const itemChars = estimateItemChars(item);
    if (items.length > 0 && actualChars + itemChars > maxChars) break;
    items.push(item);
    actualChars += itemChars;
  }

  const scoreConfidence = Math.min(
    1,
    items.reduce((sum, item) => sum + item.score, 0) / 20,
  );
  const confidence = clamp(
    items.length === 0
      ? 0
      : input.intent.confidence >= 0.8 && scoreConfidence === 1
        ? 1
        : input.intent.confidence * 0.6 + scoreConfidence * 0.4,
    0,
    1,
  );

  return {
    schemaVersion: ASK_CONTEXT_PACK_SCHEMA_VERSION,
    message: input.message,
    intent: input.intent,
    mode: input.mode,
    items,
    confidence,
    budget: {
      maxItems,
      maxChars,
      actualChars,
    },
    gaps: input.gaps ?? [],
    derivedInsights: input.derivedInsights ?? [],
  };
}

export function renderAskContextPack(pack: AskContextPack): string {
  const lines = [
    "## Ask Context Pack",
    `Intent: ${pack.intent.kind} (${pack.intent.reason})`,
    `Retrieval confidence: ${pack.confidence.toFixed(2)}`,
    "",
  ];

  if (pack.items.length === 0) {
    lines.push("No matching context items were retrieved.");
  } else {
    pack.items.forEach((item, index) => {
      lines.push(
        `### ${index + 1}. [${item.title}](${item.href})`,
        `Kind: ${item.kind}`,
        `Canon rank: ${item.canonRank}`,
        `Score: ${item.score.toFixed(2)}`,
        item.excerpt,
        "",
      );
    });
  }

  if (pack.gaps.length > 0) {
    lines.push("## Gaps", ...pack.gaps.map((gap) => `- ${gap}`), "");
  }
  if (pack.derivedInsights.length > 0) {
    lines.push(
      "## Derived Insights",
      ...pack.derivedInsights.map((insight) => `- ${insight}`),
      "",
    );
  }

  return lines.join("\n").trim();
}
