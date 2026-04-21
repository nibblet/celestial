import Anthropic from "@anthropic-ai/sdk";
import { requireAuthor } from "@/lib/auth/require-author";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildUserPrompt,
  extractJSON,
  type PolishRequestBody,
} from "@/lib/ai/polish-helpers";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are a gentle editor helping polish a contributed story for this book companion archive. Preserve the author's voice: plain, warm, and direct unless the draft clearly wants something else. Your job:

1. Lightly polish the BODY — fix typos, smooth awkward phrasing, correct obvious grammar — WITHOUT changing the voice, facts, or structure. Never invent new content. Never add paragraphs of your own.
2. Suggest a title if the current one is empty or clearly a placeholder.
3. Populate missing metadata (life_stage, year_start, year_end, themes, principles, quotes) ONLY if the body clearly supports it. Leave fields alone if unsure.
   - life_stage: one of "childhood", "youth", "early career", "family years", "later career", "elder years" — pick the closest match or leave blank.
   - year_start / year_end: only if the body mentions specific years.
   - themes: 1–4 short lowercase phrases (e.g. "resilience", "family", "first job")
   - principles: 1–3 short value statements the narrator is living out in the story
   - quotes: up to 3 short verbatim lines from the body worth pulling out
4. Include a brief one-sentence "rationale" explaining what you changed.

Return STRICT JSON matching this TypeScript type — no markdown fences, no prose outside the JSON:

{
  "title"?: string,
  "body"?: string,
  "life_stage"?: string | null,
  "year_start"?: number | null,
  "year_end"?: number | null,
  "themes"?: string[],
  "principles"?: string[],
  "quotes"?: string[],
  "rationale"?: string
}

Only include fields you actually want to suggest changing. If the body is already clean, omit "body". If no metadata is confidently inferable, omit those keys.`;

export async function POST(request: Request) {
  const gate = await requireAuthor();
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const rateLimit = checkRateLimit(`${gate.user!.id}:polish`, 10, 60_000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Please wait a moment before polishing again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    );
  }

  const body = (await request.json().catch(() => null)) as PolishRequestBody | null;
  if (!body || typeof body.body !== "string" || typeof body.title !== "string") {
    return Response.json(
      { error: "title and body are required" },
      { status: 400 }
    );
  }

  if (!body.body.trim() && !body.title.trim()) {
    return Response.json(
      { error: "Nothing to polish yet — write something first." },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "AI polish is not configured on this environment." },
      { status: 503 }
    );
  }

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(body) }],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json(
        { error: "Empty response from polish model." },
        { status: 502 }
      );
    }

    const suggestion = extractJSON(textBlock.text);
    if (!suggestion) {
      return Response.json(
        { error: "Could not parse polish response.", raw: textBlock.text },
        { status: 502 }
      );
    }

    return Response.json({ suggestion });
  } catch (err) {
    console.error("Polish route failed:", err);
    return Response.json(
      { error: "Polish service unavailable." },
      { status: 502 }
    );
  }
}
