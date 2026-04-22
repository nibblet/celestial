/**
 * Beyond session-wrap generator.
 *
 * Produces the short "here's where you left off" summary rendered at
 * the top of /beyond. Works off three signals the Beyond surface
 * already writes to Supabase:
 *
 *   - sb_story_sessions.updated_at   → most recent session Keith touched
 *   - sb_story_drafts.status='draft' → open work-in-progress
 *   - sb_story_messages.created_at   → most recent conversational activity
 *
 * The signature is deterministic over those three signals, so re-renders
 * that observe the same activity reuse the cached summary (see
 * src/lib/ai/reflections.ts). Any new session / new draft / new message
 * bumps the signature and triggers a fresh generation.
 */

import { createHash } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Signature ──────────────────────────────────────────────────────

export type SessionWrapSignatureInputs = {
  lastSessionId: string | null;
  draftCount: number;
  latestMessageTimestamp: string | null;
};

/**
 * sha256("session_wrap:" + lastSessionId + ":" + draftCount + ":" +
 * latestMessageTimestamp).slice(0, 16).
 *
 * Null fields are serialised as the literal string "null" so they
 * collide deterministically — a brand-new user with no sessions or
 * messages gets a stable signature and caches hit on immediate reload.
 */
export function computeSessionWrapSignature(
  inputs: SessionWrapSignatureInputs,
): string {
  const payload = [
    "session_wrap",
    inputs.lastSessionId ?? "null",
    String(inputs.draftCount),
    inputs.latestMessageTimestamp ?? "null",
  ].join(":");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

// ── Input gathering ────────────────────────────────────────────────

export type SessionRow = {
  id: string;
  title: string | null;
  updated_at: string;
  contribution_mode: string | null;
};

export type DraftRow = {
  id: string;
  title: string | null;
  status: string;
  updated_at: string;
};

export type MessageRow = {
  role: string;
  content: string;
  created_at: string;
};

export type SessionWrapInputs = {
  sessions: SessionRow[];
  drafts: DraftRow[];
  recentMessages: MessageRow[];
  /** Derived — passed straight into the signature. */
  lastSessionId: string | null;
  draftCount: number;
  latestMessageTimestamp: string | null;
};

const SESSIONS_LIMIT = 3;
const RECENT_MESSAGES_LIMIT = 8;

export async function gatherSessionWrapInputs(
  supabase: SupabaseClient,
  userId: string,
): Promise<SessionWrapInputs> {
  const [sessionsRes, draftsRes] = await Promise.all([
    supabase
      .from("sb_story_sessions")
      .select("id, title, updated_at, contribution_mode")
      .eq("contributor_id", userId)
      .eq("contribution_mode", "beyond")
      .order("updated_at", { ascending: false })
      .limit(SESSIONS_LIMIT),
    supabase
      .from("sb_story_drafts")
      .select("id, title, status, updated_at")
      .eq("contributor_id", userId)
      .eq("contribution_mode", "beyond")
      .eq("status", "draft")
      .order("updated_at", { ascending: false }),
  ]);

  const sessions = (sessionsRes.data ?? []) as SessionRow[];
  const drafts = (draftsRes.data ?? []) as DraftRow[];

  let recentMessages: MessageRow[] = [];
  let latestMessageTimestamp: string | null = null;
  const lastSessionId = sessions[0]?.id ?? null;
  if (lastSessionId) {
    const { data: msgRows } = await supabase
      .from("sb_story_messages")
      .select("role, content, created_at")
      .eq("session_id", lastSessionId)
      .order("created_at", { ascending: false })
      .limit(RECENT_MESSAGES_LIMIT);
    recentMessages = ((msgRows ?? []) as MessageRow[]).reverse();
    latestMessageTimestamp = recentMessages[recentMessages.length - 1]?.created_at ?? null;
  }

  return {
    sessions,
    drafts,
    recentMessages,
    lastSessionId,
    draftCount: drafts.length,
    latestMessageTimestamp,
  };
}

// ── Prompt ─────────────────────────────────────────────────────────

const WRAP_MODEL = "claude-sonnet-4-20250514";
const WRAP_MAX_TOKENS = 260;
const WRAP_TIMEOUT_MS = 5000;

const SYSTEM_PROMPT = `You are a calm, observational collaborator welcoming Keith back to Beyond, a private authoring space for the Celestial series.

You will receive a structured activity log (recent sessions, open drafts, last few messages in the most recent session). Write a short, warm "here's where you left off" card.

Rules:
- Voice: second person ("you were just working on…"). Never first person.
- Tone: quiet, observational, a gentle nudge forward. Not prescriptive.
- Length: 40–80 words total. Plain prose only. No headings, no lists, no markdown, no emojis.
- Name the most recent draft by title when there is one. Otherwise describe the conversational thread.
- If there are multiple open drafts, acknowledge the count in a single clause (e.g. "three drafts still waiting").
- Never invent content. If the signal is thin, say something honest and brief.

Output: just the reflection text. No preamble, no quotes around it.`;

function formatSummary(inputs: SessionWrapInputs): string {
  const lines: string[] = [];
  lines.push(`OPEN_DRAFTS: ${inputs.drafts.length}`);
  if (inputs.drafts.length > 0) {
    for (const d of inputs.drafts.slice(0, 5)) {
      lines.push(`- "${d.title ?? "Untitled"}" (updated ${d.updated_at})`);
    }
  }
  lines.push("");
  lines.push(`RECENT_SESSIONS: ${inputs.sessions.length}`);
  for (const s of inputs.sessions) {
    lines.push(`- ${s.id} "${s.title ?? "(untitled)"}" (updated ${s.updated_at})`);
  }
  lines.push("");
  lines.push(`LATEST_CONVERSATION (${inputs.recentMessages.length} messages):`);
  if (inputs.recentMessages.length === 0) {
    lines.push("(no recent messages)");
  }
  for (const m of inputs.recentMessages) {
    // Trim each message to keep prompt sizes bounded.
    const snippet = m.content.replace(/\s+/g, " ").slice(0, 400);
    lines.push(`- [${m.role}] ${snippet}`);
  }
  return lines.join("\n");
}

// ── Generator ──────────────────────────────────────────────────────

export type GeneratedSessionWrap = {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
};

export async function generateSessionWrap(args: {
  inputs: SessionWrapInputs;
  anthropic: Anthropic;
}): Promise<GeneratedSessionWrap> {
  const userPrompt = formatSummary(args.inputs);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WRAP_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await args.anthropic.messages.create(
      {
        model: WRAP_MODEL,
        max_tokens: WRAP_MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      },
      { signal: controller.signal },
    );

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return {
      text: text || "Welcome back.",
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const SESSION_WRAP_MODEL = WRAP_MODEL;
