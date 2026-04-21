import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { orchestrateAsk } from "@/lib/ai/orchestrator";
import { checkRateLimit } from "@/lib/rate-limit";
import type { AgeMode } from "@/types";
import { getReaderProgress } from "@/lib/progress/reader-progress";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(user.id, 20, 60_000);
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error:
          "Too many questions! Take a breath and try again in a moment.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    );
  }

  const body = await request.json();
  const {
    message,
    conversationId,
    storySlug,
    journeySlug,
    ageMode = "adult",
    highlightId,
  } = body as {
    message: string;
    conversationId?: string;
    storySlug?: string;
    journeySlug?: string;
    ageMode?: AgeMode;
    /** When set, successful responses link this saved passage to the conversation. */
    highlightId?: string;
  };

  if (!message || typeof message !== "string" || message.length > 2000) {
    return Response.json({ error: "Invalid message" }, { status: 400 });
  }

  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    const { data: conv, error } = await supabase
      .from("sb_conversations")
      .insert({
        user_id: user.id,
        age_mode: ageMode,
        title: message.slice(0, 60),
      })
      .select("id")
      .single();

    if (error || !conv) {
      return Response.json({ error: "Failed to create conversation" }, { status: 500 });
    }
    convId = conv.id;
  }

  const { data: savedUserMsg, error: userMsgError } = await supabase
    .from("sb_messages")
    .insert({
      conversation_id: convId,
      role: "user",
      content: message,
    })
    .select("id")
    .single();

  if (userMsgError || !savedUserMsg) {
    return Response.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }

  const userMessageId = savedUserMsg.id;

  // Load conversation history
  const { data: history } = await supabase
    .from("sb_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(20);

  // Build messages for Claude
  const messages: { role: "user" | "assistant"; content: string }[] = (
    history || []
  ).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Orchestrate response (simple or deep path based on question type)
  const readerProgress = await getReaderProgress();
  const { stream: textStream } = await orchestrateAsk({
    anthropic,
    supabase,
    userId: user.id,
    conversationId: convId,
    message,
    messages,
    ageMode: ageMode as AgeMode,
    storySlug,
    journeySlug,
    readerProgress,
  });

  // Create a streaming response
  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of textStream) {
          fullResponse += text;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text, conversationId: convId })}\n\n`)
          );
        }

        // Save assistant response
        await supabase.from("sb_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: fullResponse,
        });

        if (
          highlightId &&
          typeof highlightId === "string" &&
          highlightId.length <= 80
        ) {
          await supabase
            .from("sb_story_highlights")
            .update({ passage_ask_conversation_id: convId })
            .eq("id", highlightId)
            .eq("user_id", user.id);
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`)
        );
        controller.close();
      } catch (err) {
        if (!fullResponse) {
          await supabase.from("sb_messages").delete().eq("id", userMessageId);
        }
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errorMessage })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
