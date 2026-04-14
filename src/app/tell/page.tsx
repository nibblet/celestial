"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface StoryDraft {
  draftId: string;
  title: string;
  body: string;
  lifeStage: string | null;
  yearStart: number | null;
  yearEnd: number | null;
  themes: string[];
  principles: string[];
  quotes: string[];
}

type ViewMode = "chat" | "drafting" | "review";

export default function TellPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
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
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/tell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, sessionId }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Take a breath — try again in a moment.");
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

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              setError(data.error);
              break;
            }
            if (data.sessionId && !sessionId) {
              setSessionId(data.sessionId);
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
          } catch {
            // Malformed SSE line — skip
          }
        }

        if (done) break;
      }
    } catch {
      setError("Something went wrong. Please try again.");
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

  async function composeDraft() {
    if (!sessionId || draftLoading) return;
    setDraftLoading(true);
    setViewMode("drafting");
    setError(null);

    try {
      const res = await fetch("/api/tell/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        throw new Error("Failed to compose draft");
      }

      const data: StoryDraft = await res.json();
      setDraft(data);
      setEditTitle(data.title);
      setEditBody(data.body);
      setViewMode("review");
    } catch {
      setError("Failed to compose the story draft. Please try again.");
      setViewMode("chat");
    } finally {
      setDraftLoading(false);
    }
  }

  function backToChat() {
    setViewMode("chat");
    setDraft(null);
  }

  async function submitDraft() {
    if (!draft) return;
    const hasEdits = editTitle !== draft.title || editBody !== draft.body;
    if (hasEdits) {
      const res = await fetch("/api/tell/draft/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.draftId,
          title: editTitle,
          body: editBody,
        }),
      });

      if (!res.ok) {
        setError("Failed to save your edits. Please try again.");
        return;
      }
    }

    setSubmitted(true);
  }

  function startNew() {
    setMessages([]);
    setInput("");
    setSessionId(null);
    setViewMode("chat");
    setDraft(null);
    setSubmitted(false);
    setEditTitle("");
    setEditBody("");
    setError(null);
  }

  // ---- Drafting/Loading View ----
  if (viewMode === "drafting") {
    return (
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-content flex-col items-center justify-center px-[var(--page-padding-x)] md:h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">&#9997;&#65039;</div>
          <h2 className="type-page-title text-xl mb-2">
            Composing your story...
          </h2>
          <p className="type-ui text-ink-muted text-sm">
            The AI is weaving your conversation into a story draft.
          </p>
        </div>
      </div>
    );
  }

  // ---- Review View ----
  if (viewMode === "review" && draft) {
    if (submitted) {
      return (
        <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-content flex-col items-center justify-center px-[var(--page-padding-x)] md:h-[calc(100vh-4rem)]">
          <div className="max-w-lg text-center">
            <div className="mb-4 text-4xl">&#10024;</div>
            <h2 className="type-page-title text-xl mb-2">
              Story submitted!
            </h2>
            <p className="type-ui text-ink-muted text-sm mb-6">
              &ldquo;{editTitle}&rdquo; has been saved and is waiting for
              review. It will appear in the library once approved.
            </p>
            <button
              onClick={startNew}
              className="type-ui rounded-lg bg-clay px-6 py-2.5 font-medium text-warm-white transition-colors hover:bg-clay-mid"
            >
              Tell Another Story
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6">
        <div className="mb-6">
          <button
            onClick={backToChat}
            className="type-ui text-sm text-ink-muted hover:text-ink"
          >
            &larr; Back to conversation
          </button>
        </div>

        <h1 className="type-page-title text-2xl mb-1">Review Your Story</h1>
        <p className="type-ui text-ink-muted text-sm mb-6">
          Edit the title and text below, then submit when you&apos;re happy
          with it.
        </p>

        <div className="space-y-4">
          <div>
            <label className="type-ui text-xs font-medium text-ink-muted block mb-1">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="type-ui w-full rounded-lg border border-[var(--color-border)] bg-warm-white-2 px-3 py-2 text-ink"
            />
          </div>

          <div>
            <label className="type-ui text-xs font-medium text-ink-muted block mb-1">
              Story
            </label>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={12}
              className="type-ui w-full rounded-lg border border-[var(--color-border)] bg-warm-white-2 px-3 py-2 text-ink leading-relaxed"
            />
          </div>

          {draft.themes.length > 0 && (
            <div>
              <label className="type-ui text-xs font-medium text-ink-muted block mb-1">
                Themes
              </label>
              <div className="flex flex-wrap gap-1.5">
                {draft.themes.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-clay/10 px-2.5 py-0.5 text-xs text-clay"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {draft.principles.length > 0 && (
            <div>
              <label className="type-ui text-xs font-medium text-ink-muted block mb-1">
                Lessons
              </label>
              <ul className="list-disc list-inside text-sm text-ink-muted space-y-1">
                {draft.principles.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={submitDraft}
              className="type-ui rounded-lg bg-clay px-6 py-2.5 font-medium text-warm-white transition-colors hover:bg-clay-mid"
            >
              Submit Story
            </button>
            <button
              onClick={backToChat}
              className="type-ui rounded-lg border border-[var(--color-border)] px-6 py-2.5 font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Keep Talking
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Chat View (default) ----
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-content flex-col px-[var(--page-padding-x)] md:h-[calc(100vh-4rem)]">
      <div className="border-b border-[var(--color-border)] py-4">
        <h1 className="type-page-title text-2xl">Tell a Story</h1>
        <p className="type-ui mt-1 text-ink-ghost">
          Share a story to add to the family library
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
              What story would you like to share?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "I want to share a memory about Keith",
                "I have a story from my own life",
                "There's a family story I want to preserve",
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
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
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
                <span className="text-ink-ghost animate-pulse">
                  Listening...
                </span>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--color-border)] bg-warm-white py-3">
        {messages.length >= 6 && (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              onClick={composeDraft}
              disabled={draftLoading || loading}
              className="type-ui rounded-full border border-clay bg-warm-white px-4 py-1.5 text-sm font-medium text-clay transition-colors hover:bg-clay hover:text-warm-white disabled:opacity-50"
            >
              Write it up for the library
            </button>
          </div>
        )}
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
            placeholder="Share your story..."
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
