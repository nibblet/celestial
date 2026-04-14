"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAgeMode } from "@/hooks/useAgeMode";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";

const ASSISTANT_MARKDOWN_COMPONENTS: Components = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  a({ href, children, node: _, ...props }) {
    if (href?.startsWith("/")) {
      return (
        <Link
          href={href}
          className="font-medium text-clay underline underline-offset-2 hover:text-clay-mid"
        >
          {children}
        </Link>
      );
    }
    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-clay underline underline-offset-2 hover:text-clay-mid"
          {...props}
        >
          {children}
        </a>
      );
    }
    return <span>{children}</span>;
  },
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-8 text-sm text-ink-ghost">
          Loading...
        </div>
      }
    >
      <AskPageContent />
    </Suspense>
  );
}

function AskPageContent() {
  const searchParams = useSearchParams();
  const storySlug = searchParams.get("story") || undefined;
  const journeySlug = searchParams.get("journey") || undefined;
  const { ageMode } = useAgeMode();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  /** Synchronous guard — `loading` state is stale until re-render, so double-submit can otherwise run two streams into one assistant bubble. */
  const sendInFlightRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || sendInFlightRef.current) return;
    sendInFlightRef.current = true;

    setInput("");
    setError(null);
    setLoading(true);

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          conversationId,
          storySlug,
          journeySlug,
          ageMode,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(
            "Too many questions! Please wait a moment before asking again."
          );
        }
        throw new Error("Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No stream available");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }
        if (done) {
          buffer += decoder.decode();
        }

        const lines = buffer.split("\n");
        buffer = done ? "" : (lines.pop() ?? "");

        let sseTextBatch = "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.error) {
              setError(data.error);
              break;
            }

            if (data.conversationId && !conversationId) {
              setConversationId(data.conversationId);
            }

            if (typeof data.text === "string" && data.text.length > 0) {
              sseTextBatch += data.text;
            }
          } catch {
            // Malformed SSE line — skip
          }
        }

        if (sseTextBatch) {
          // Must be immutable: React Strict Mode (Next.js dev) may invoke this updater twice
          // with the same `prev`; in-place mutation would append the chunk twice ("InIn…").
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== "assistant") return prev;
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + sseTextBatch },
            ];
          });
        }

        if (done) break;
      }
    } catch {
      setError(
        "Ask Keith is temporarily unavailable. Try browsing stories by topic in the meantime."
      );
      setMessages((prev) => {
        if (prev[prev.length - 1]?.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      sendInFlightRef.current = false;
      setLoading(false);
    }
  }, [input, conversationId, storySlug, journeySlug, ageMode]);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-content flex-col px-[var(--page-padding-x)] md:h-[calc(100vh-4rem)]">
      <div className="border-b border-[var(--color-border)] py-4">
        <h1 className="type-page-title text-2xl">Ask Keith</h1>
        <p className="type-ui mt-1 text-ink-ghost">
          Ask questions about Keith&apos;s stories and life lessons
          {storySlug && (
            <span className="text-clay"> &middot; Reading {storySlug}</span>
          )}
          {journeySlug && !storySlug && (
            <span className="text-clay">
              {" "}
              &middot; Journey: {journeySlug.replace(/-/g, " ")}
            </span>
          )}
        </p>
      </div>

      <div
        className="flex-1 space-y-4 overflow-y-auto py-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="py-12 text-center">
            <p className="mb-4 text-sm text-ink-muted">
              What would you like to know about Keith&apos;s stories?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "What shaped Keith's leadership style?",
                "Tell me about Keith's early career",
                "What did Keith learn from his father?",
                "What are the most important lessons?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  className="type-ui rounded-full border border-[var(--color-border)] bg-warm-white px-3 py-1.5 text-ink-muted transition-colors hover:border-clay-border hover:text-clay"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-clay text-warm-white"
                  : "border border-[var(--color-border)] bg-warm-white text-ink"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-story prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-sm prose-headings:font-semibold prose-ul:my-1 prose-li:my-0">
                  <ReactMarkdown components={ASSISTANT_MARKDOWN_COMPONENTS}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
                  .split("\n")
                  .map((line, j) =>
                    line.trim() ? (
                      <p key={j} className={j > 0 ? "mt-2" : ""}>
                        {line}
                      </p>
                    ) : null
                  )
              )}
              {msg.role === "assistant" && msg.content === "" && loading && (
                <span className="text-ink-ghost animate-pulse">Thinking...</span>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
            <Link
              href="/themes"
              className="mt-1 block text-xs text-red-900 underline"
            >
              Browse stories by topic instead
            </Link>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--color-border)] bg-warm-white py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Keith's stories..."
            disabled={loading}
            className="type-ui flex-1 rounded-lg border border-[var(--color-border)] bg-warm-white-2 px-3 py-2 text-ink placeholder:text-ink-ghost disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="type-ui rounded-lg bg-clay px-4 py-2 font-medium text-warm-white transition-colors hover:bg-clay-mid disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
