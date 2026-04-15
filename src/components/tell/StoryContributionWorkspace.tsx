"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ContributionMode } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PendingSession {
  id: string;
  preview: string;
  updatedAt: string;
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

type WorkspaceContent = {
  badge: string;
  title: string;
  subtitle: string;
  emptyPrompt: string;
  inputPlaceholder: string;
  composeCta: string;
  reviewTitle: string;
  reviewSubtitle: string;
  submittedTitle: string;
  submittedBody: string;
  resumeTitle: string;
  suggestions: string[];
};

const workspaceContent: Record<ContributionMode, WorkspaceContent> = {
  tell: {
    badge: "Family memories",
    title: "Tell a Story",
    subtitle: "Share a short memory or family story for the library.",
    emptyPrompt: "What memory would you like to preserve?",
    inputPlaceholder: "Share a memory about Keith or your family...",
    composeCta: "Write up this memory",
    reviewTitle: "Review Your Memory",
    reviewSubtitle:
      "Make any edits you want, then submit it for review and publishing.",
    submittedTitle: "Memory submitted!",
    submittedBody:
      "Your story has been saved for review. Once approved, it will appear in the library.",
    resumeTitle: "Continue your memory",
    suggestions: [
      "I want to share a memory about Keith",
      "There's a short family story I want to save",
      "I have a moment from my own life that belongs here",
    ],
  },
  beyond: {
    badge: "Volume 2",
    title: "Beyond",
    subtitle:
      "Continue Keith's untold stories and shape the next volume of the library.",
    emptyPrompt: "Which untold Keith story should we work on today?",
    inputPlaceholder: "Start with the moment, season, or lesson you want to capture...",
    composeCta: "Draft the next Beyond story",
    reviewTitle: "Review the Beyond Draft",
    reviewSubtitle:
      "Refine the draft, preserve the voice, and submit it into the publishing flow.",
    submittedTitle: "Beyond draft submitted!",
    submittedBody:
      "This untold story is now in the review queue and ready for the next step into the library.",
    resumeTitle: "Continue an untold story",
    suggestions: [
      "I want to tell a story that never made it into the memoir",
      "There's a leadership moment I want to expand in more detail",
      "Let's capture a story from later life that the family should know",
    ],
  },
};

export function StoryContributionWorkspace({
  contributionMode,
}: {
  contributionMode: ContributionMode;
}) {
  const content = workspaceContent[contributionMode];
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
  const [submitting, setSubmitting] = useState(false);
  const [pendingSessions, setPendingSessions] = useState<PendingSession[]>([]);
  const [sessionsChecked, setSessionsChecked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendInFlightRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function checkSessions() {
      try {
        const res = await fetch(`/api/tell/sessions?mode=${contributionMode}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          sessions?: PendingSession[];
        };
        setPendingSessions(data.sessions || []);
      } catch {
        // Keep the empty state if pending sessions fail to load.
      } finally {
        setSessionsChecked(true);
      }
    }

    checkSessions();
  }, [contributionMode]);

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || sendInFlightRef.current) return;
    sendInFlightRef.current = true;

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
        body: JSON.stringify({ message: messageText, sessionId, contributionMode }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("That workspace is not available for this account.");
        }
        if (res.status === 429) {
          throw new Error("Take a breath and try again in a moment.");
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
            if (data.sessionId && !sessionId) {
              setSessionId(data.sessionId);
            }
            if (typeof data.text === "string" && data.text.length > 0) {
              sseTextBatch += data.text;
            }
          } catch {
            // Skip malformed SSE lines.
          }
        }

        if (sseTextBatch) {
          // Immutable update: Strict Mode may run this updater twice with the same `prev`;
          // in-place mutation would append the chunk twice ("ThatThat's…").
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
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
        body: JSON.stringify({ sessionId, contributionMode }),
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
      setError("Failed to compose the draft. Please try again.");
      setViewMode("chat");
    } finally {
      setDraftLoading(false);
    }
  }

  async function resumeSession(id: string) {
    setError(null);
    const res = await fetch(`/api/tell/sessions/${id}?mode=${contributionMode}`);
    if (!res.ok) {
      setError("Could not resume that draft. Please start a new one.");
      return;
    }

    const data = (await res.json()) as { messages?: Message[] };
    setSessionId(id);
    setMessages(data.messages || []);
    setPendingSessions([]);
  }

  function backToChat() {
    setViewMode("chat");
    setDraft(null);
  }

  async function submitDraft() {
    if (!draft || submitting) return;
    setSubmitting(true);
    try {
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
    } finally {
      setSubmitting(false);
    }
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

  if (viewMode === "drafting") {
    return (
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-content flex-col items-center justify-center px-[var(--page-padding-x)] md:h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">&#9997;&#65039;</div>
          <h2 className="type-page-title mb-2 text-xl">
            Building the draft...
          </h2>
          <p className="type-ui text-sm text-ink-muted">
            The conversation is being shaped into a story draft for the library.
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === "review" && draft) {
    if (submitted) {
      return (
        <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-content flex-col items-center justify-center px-[var(--page-padding-x)] md:h-[calc(100vh-4rem)]">
          <div className="max-w-lg text-center">
            <div className="mb-4 text-4xl">&#10024;</div>
            <h2 className="type-page-title mb-2 text-xl">
              {content.submittedTitle}
            </h2>
            <p className="type-ui mb-6 text-sm text-ink-muted">
              &ldquo;{editTitle}&rdquo; has been saved. {content.submittedBody}
            </p>
            <button
              onClick={startNew}
              className="type-ui rounded-lg bg-clay px-6 py-2.5 font-medium text-warm-white transition-colors hover:bg-clay-mid"
            >
              Start Another One
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

        <h1 className="type-page-title mb-1 text-2xl">{content.reviewTitle}</h1>
        <p className="type-ui mb-6 text-sm text-ink-muted">
          {content.reviewSubtitle}
        </p>

        <div className="space-y-4">
          <div>
            <label className="type-ui mb-1 block text-xs font-medium text-ink-muted">
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
            <label className="type-ui mb-1 block text-xs font-medium text-ink-muted">
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
              <label className="type-ui mb-1 block text-xs font-medium text-ink-muted">
                Themes
              </label>
              <div className="flex flex-wrap gap-1.5">
                {draft.themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full bg-clay/10 px-2.5 py-0.5 text-xs text-clay"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {draft.principles.length > 0 && (
            <div>
              <label className="type-ui mb-1 block text-xs font-medium text-ink-muted">
                Lessons
              </label>
              <ul className="list-disc list-inside space-y-1 text-sm text-ink-muted">
                {draft.principles.map((principle, index) => (
                  <li key={index}>{principle}</li>
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
              disabled={submitting}
              className="type-ui rounded-lg bg-clay px-6 py-2.5 font-medium text-warm-white transition-colors hover:bg-clay-mid disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Story"}
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

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-content flex-col px-[var(--page-padding-x)] md:h-[calc(100vh-4rem)]">
      <div className="border-b border-[var(--color-border)] py-4">
        <p className="type-era-label mb-2 text-ink-ghost">{content.badge}</p>
        <h1 className="type-page-title text-2xl">{content.title}</h1>
        <p className="type-ui mt-1 text-ink-ghost">{content.subtitle}</p>
      </div>

      <div
        className="flex-1 space-y-4 overflow-y-auto py-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="py-12 text-center">
            {sessionsChecked && pendingSessions.length > 0 && (
              <div className="mx-auto mb-6 max-w-xl rounded-lg border border-clay-border bg-gold-pale/40 p-4 text-left">
                <p className="type-ui mb-2 text-sm font-medium text-ink">
                  {content.resumeTitle}
                </p>
                <div className="space-y-2">
                  {pendingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <p className="type-ui flex-1 truncate text-sm text-ink-muted">
                        &ldquo;{session.preview}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() => resumeSession(session.id)}
                        className="type-ui shrink-0 rounded-lg bg-clay px-3 py-1.5 text-sm font-medium text-warm-white transition-colors hover:bg-clay-mid"
                      >
                        Continue
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPendingSessions([])}
                  className="type-ui mt-3 text-xs text-ink-ghost transition-colors hover:text-ink"
                >
                  Start a new one instead
                </button>
              </div>
            )}
            <p className="mb-4 text-sm text-ink-muted">{content.emptyPrompt}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {content.suggestions.map((suggestion) => (
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

        {messages.map((msg, index) => (
          <div
            key={index}
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
                  .map((line, lineIndex) =>
                    line.trim() ? (
                      <p key={lineIndex} className={lineIndex > 0 ? "mt-2" : ""}>
                        {line}
                      </p>
                    ) : null
                  )
              )}
              {msg.role === "assistant" && msg.content === "" && loading && (
                <span className="animate-pulse text-ink-ghost">Listening...</span>
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
              {content.composeCta}
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
            placeholder={content.inputPlaceholder}
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
