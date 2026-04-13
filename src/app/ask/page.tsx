"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAgeMode } from "@/hooks/useAgeMode";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8 text-stone-400 text-sm">Loading...</div>}>
      <AskPageContent />
    </Suspense>
  );
}

function AskPageContent() {
  const searchParams = useSearchParams();
  const storySlug = searchParams.get("story") || undefined;
  const { ageMode } = useAgeMode();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput("");
    setError(null);
    setLoading(true);

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder for assistant response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          conversationId,
          storySlug,
          ageMode,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No stream available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = JSON.parse(line.slice(6));

          if (data.error) {
            setError(data.error);
            break;
          }

          if (data.conversationId && !conversationId) {
            setConversationId(data.conversationId);
          }

          if (data.text) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                last.content += data.text;
              }
              return updated;
            });
          }
        }
      }
    } catch {
      setError(
        "Ask Keith is temporarily unavailable. Try browsing stories by topic in the meantime."
      );
      // Remove empty assistant placeholder
      setMessages((prev) => {
        if (prev[prev.length - 1]?.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-stone-200">
        <h1 className="text-xl font-serif font-bold text-stone-800">
          Ask Keith
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Ask questions about Keith&apos;s stories and life lessons
          {storySlug && (
            <span className="text-amber-700"> &middot; Reading {storySlug}</span>
          )}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-400 text-sm mb-4">
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
                  onClick={() => sendMessage(suggestion)}
                  className="px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-full text-stone-600 hover:border-amber-300 hover:text-amber-700 transition-colors"
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
                  ? "bg-amber-700 text-white"
                  : "bg-white border border-stone-200 text-stone-700"
              }`}
            >
              {msg.content.split("\n").map((line, j) =>
                line.trim() ? <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p> : null
              )}
              {msg.role === "assistant" && msg.content === "" && loading && (
                <span className="text-stone-400 animate-pulse">Thinking...</span>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
            {error}
            <Link
              href="/themes"
              className="block mt-1 text-red-800 underline text-xs"
            >
              Browse stories by topic instead
            </Link>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-stone-200 bg-white">
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
            className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
