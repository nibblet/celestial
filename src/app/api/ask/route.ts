import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import type { AgeMode } from "@/types";

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

  const body = await request.json();
  const { message, conversationId, storySlug, ageMode = "adult" } = body as {
    message: string;
    conversationId?: string;
    storySlug?: string;
    ageMode?: AgeMode;
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

  // Save user message
  await supabase.from("sb_messages").insert({
    conversation_id: convId,
    role: "user",
    content: message,
  });

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

  // Build system prompt
  const systemPrompt = buildSystemPrompt(ageMode as AgeMode, storySlug);

  // Stream response from Claude
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  // Create a streaming response
  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text, conversationId: convId })}\n\n`)
            );
          }
        }

        // Save assistant response
        await supabase.from("sb_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: fullResponse,
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`)
        );
        controller.close();
      } catch (err) {
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
