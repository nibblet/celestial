"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAgeMode } from "@/hooks/useAgeMode";
import { book } from "@/config/book";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import type {
  AskMessageEvidence,
  AskReaderMode,
} from "@/lib/ai/ask-evidence";

/** Readers get one answer mode; the Deep/Fast switch was implementation detail. */
const ASK_MODE: AskReaderMode = "deep";

type AskContext = {
  wholeBook: boolean;
  through: number;
  throughTitle: string | null;
  suggestions: string[];
};

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
  /** Present for assistant rows when sourced from API or Ask SSE */
  id?: string;
  evidence?: AskMessageEvidence | null;
}

function AskSourcesDisclosure({
  evidence,
}: {
  evidence: AskMessageEvidence;
}) {
  const personas = evidence.route.personas.join(", ");
  return (
    <details className="mt-2 rounded-lg border border-[var(--color-border)] bg-warm-white-2/80 px-3 py-2 text-xs text-ink-muted open:bg-warm-white-2">
      <summary className="cursor-pointer select-none font-medium text-ink hover:text-clay">
        Sources
      </summary>
      <div className="mt-2 space-y-3 border-t border-[var(--color-border)] pt-2">
        {(evidence.askModeRequested ?? evidence.askModeApplied) && (
          <div>
            <p className="type-meta mb-1 text-[10px] uppercase tracking-wide text-ink-ghost">
              Answer mode
            </p>
            <p className="text-ink">
              Requested:{" "}
              <span className="font-medium capitalize">
                {evidence.askModeRequested ?? "—"}
              </span>
              {" · "}
              Applied:{" "}
              <span className="font-medium capitalize">
                {evidence.askModeApplied ?? "—"}
              </span>
            </p>
            {evidence.askModeNote ? (
              <p className="mt-1 text-ink-muted">{evidence.askModeNote}</p>
            ) : null}
          </div>
        )}
        <div>
          <p className="type-meta mb-1 text-[10px] uppercase tracking-wide text-ink-ghost">
            Retrieval path
          </p>
          <p className="text-ink">
            <span className="font-medium capitalize">{evidence.modeUsed}</span>
            {" · "}
            {personas}
            {!evidence.deepAskOperational && (
              <span className="block text-ink-muted">
                Multi-persona routing was off for this deployment (
                <code className="rounded bg-gold-pale/40 px-1">ENABLE_DEEP_ASK</code>
                ).
              </span>
            )}
          </p>
          <p className="mt-1 text-ink-muted">{evidence.route.reason}</p>
        </div>
        <div>
          <p className="type-meta mb-1 text-[10px] uppercase tracking-wide text-ink-ghost">
            Context included
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-ink">
            {evidence.contextSources.map((s) => (
              <li key={`${s.kind}-${s.ref ?? ""}-${s.label}`}>{s.label}</li>
            ))}
          </ul>
        </div>
        {evidence.responseSuperseded ? (
          <div className="notice-warn rounded-md px-2 py-1.5">
            This reply was replaced by a safe fallback after verification flagged
            broken or policy-breaking citations.
          </div>
        ) : null}
        {evidence.verification && evidence.verification.issues.length > 0 ? (
          <div>
            <p className="type-meta mb-1 text-[10px] uppercase tracking-wide text-ink-ghost">
              Verification ({evidence.verification.strictness})
            </p>
            <ul className="space-y-1">
              {evidence.verification.issues.map((issue, idx) => (
                <li
                  key={`${issue.code}-${idx}`}
                  className={
                    issue.severity === "error"
                      ? "text-[#f6c7bd]"
                      : "text-ink-muted"
                  }
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {evidence.linksInAnswer.length > 0 ? (
          <div>
            <p className="type-meta mb-1 text-[10px] uppercase tracking-wide text-ink-ghost">
              Links in this answer
            </p>
            <ul className="space-y-1">
              {evidence.linksInAnswer.map((l) => (
                <li key={`${l.href}-${l.text}`}>
                  <Link
                    href={l.href}
                    className="font-medium text-clay underline underline-offset-2 hover:text-clay-mid"
                  >
                    {l.text}
                  </Link>
                  <span className="text-ink-ghost"> · {l.href}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
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

function getPreloadPassage(raw: string | null): string | undefined {
  if (raw === null || raw === "") return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const trimmed = decoded.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 1000);
}

function getPreloadPrompt(raw: string | null): string | undefined {
  if (raw === null || raw === "") return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const trimmed = decoded.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 600);
}

function AskPageContent() {
  const searchParams = useSearchParams();
  const storySlug = searchParams.get("story") || undefined;
  const journeySlug = searchParams.get("journey") || undefined;
  const prefilledPrompt = getPreloadPrompt(searchParams.get("prompt"));
  const highlightIdFromUrl = searchParams.get("highlight") || undefined;
  const startFreshFromHighlight = searchParams.get("new") === "1";
  const urlPassage = getPreloadPassage(searchParams.get("passage"));
  const { ageMode } = useAgeMode();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const askMode = ASK_MODE;
  const [askContext, setAskContext] = useState<AskContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Passage text from DB when opened via ?highlight= (avoids huge URLs). */
  const [passageFromHighlight, setPassageFromHighlight] = useState<
    string | undefined
  >(undefined);
  /** When opening a highlight: fetch metadata and either resume or prep preload. */
  const [highlightHydration, setHighlightHydration] = useState<
    "ready" | "loading"
  >(() => (searchParams.get("highlight") ? "loading" : "ready"));
  const [contextStoryTitle, setContextStoryTitle] = useState<string | null>(
    null
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  /** Synchronous guard — `loading` state is stale until re-render, so double-submit can otherwise run two streams into one assistant bubble. */
  const sendInFlightRef = useRef(false);
  /** Prevents double auto-send from React Strict Mode when preloading a passage from the URL. */
  const preloadFiredRef = useRef(false);
  /** Prevents repeated prompt prefill from URL search params. */
  const promptHydratedRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ask/context")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AskContext | null) => {
        if (!cancelled && data) setAskContext(data);
      })
      .catch(() => {
        /* the boundary line is informative; Ask still works without it */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!highlightIdFromUrl) {
      setHighlightHydration("ready");
      setPassageFromHighlight(undefined);
      return;
    }

    let cancelled = false;
    setHighlightHydration("loading");
    setMessages([]);
    setConversationId(null);
    setPassageFromHighlight(undefined);
    preloadFiredRef.current = false;

    (async () => {
      const hr = await fetch(
        `/api/profile/highlights/${encodeURIComponent(highlightIdFromUrl)}`
      );
      if (!hr.ok || cancelled) {
        if (!cancelled) setHighlightHydration("ready");
        return;
      }
      const body: {
        highlight?: {
          passage_text?: string;
          passage_ask_conversation_id?: string | null;
        };
      } = await hr.json();
      const h = body.highlight;
      if (!h || cancelled) {
        if (!cancelled) setHighlightHydration("ready");
        return;
      }

      if (!startFreshFromHighlight && h.passage_ask_conversation_id) {
        const cr = await fetch(
          `/api/conversations/${encodeURIComponent(h.passage_ask_conversation_id)}`
        );
        if (cr.ok && !cancelled) {
          const cd: {
            messages?: {
              role: string;
              content: string;
              id?: string;
              evidence?: unknown;
            }[];
          } = await cr.json();
          const msgs: Message[] = (cd.messages ?? []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            id: typeof m.id === "string" ? m.id : undefined,
            evidence:
              m.role === "assistant" &&
              m.evidence &&
              typeof m.evidence === "object"
                ? (m.evidence as AskMessageEvidence)
                : undefined,
          }));
          setMessages(msgs);
          setConversationId(h.passage_ask_conversation_id);
          preloadFiredRef.current = true;
          setHighlightHydration("ready");
          return;
        }
      }

      const raw =
        typeof h.passage_text === "string" ? h.passage_text.trim() : "";
      setPassageFromHighlight(raw ? raw.slice(0, 1000) : undefined);
      if (!cancelled) setHighlightHydration("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [highlightIdFromUrl, startFreshFromHighlight]);

  useEffect(() => {
    if (!storySlug) {
      setContextStoryTitle(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/stories/${encodeURIComponent(storySlug)}/meta`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { title?: string } | null) => {
        if (!cancelled && d?.title) setContextStoryTitle(d.title);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storySlug]);

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
          askMode,
          ...(highlightIdFromUrl
            ? { highlightId: highlightIdFromUrl }
            : {}),
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(
            "Too many questions! Please wait a moment before asking again."
          );
        }
        let serverDetail = "";
        try {
          const errBody = (await res.json()) as { error?: string };
          if (typeof errBody?.error === "string") serverDetail = errBody.error;
        } catch {
          /* not JSON */
        }
        throw new Error(
          serverDetail ||
            "The Ask service returned an error before streaming started."
        );
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

            if (data.done === true && data.evidence) {
              const replacement =
                typeof data.replacementContent === "string"
                  ? data.replacementContent
                  : undefined;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== "assistant") return prev;
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    content: replacement ?? last.content,
                    evidence: data.evidence as AskMessageEvidence,
                  },
                ];
              });
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
    } catch (e) {
      const msg =
        e instanceof Error && e.message?.trim()
          ? e.message
          : "The reading companion is temporarily unavailable. Try browsing stories by theme in the meantime.";
      setError(msg);
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
  }, [
    input,
    conversationId,
    storySlug,
    journeySlug,
    ageMode,
    highlightIdFromUrl,
    askMode,
  ]);

  const effectivePreloadPassage = urlPassage ?? passageFromHighlight;

  useEffect(() => {
    if (!prefilledPrompt) {
      promptHydratedRef.current = null;
      return;
    }
    if (
      promptHydratedRef.current === prefilledPrompt ||
      messages.length > 0 ||
      sendInFlightRef.current ||
      input.trim().length > 0
    ) {
      return;
    }
    promptHydratedRef.current = prefilledPrompt;
    setInput(prefilledPrompt);
  }, [prefilledPrompt, messages.length, input]);

  useEffect(() => {
    if (highlightHydration !== "ready") return;
    if (
      !effectivePreloadPassage ||
      messages.length > 0 ||
      preloadFiredRef.current ||
      sendInFlightRef.current
    ) {
      return;
    }
    preloadFiredRef.current = true;
    const prompt =
      ageMode === "young_reader"
        ? `I really liked this part:\n\n"${effectivePreloadPassage}"\n\nCan you tell me more about it?`
        : `I saved this passage:\n\n"${effectivePreloadPassage}"\n\nWhat is going on in this moment, and why does it matter to the story so far?`;
    void sendMessage(prompt);
  }, [
    highlightHydration,
    effectivePreloadPassage,
    messages.length,
    ageMode,
    sendMessage,
  ]);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-content flex-col px-[var(--page-padding-x)] md:h-[calc(100vh-4rem)]">
      <div className="border-b border-[var(--color-border)] py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="type-page-title text-2xl">Ask about {book.title}</h1>
            <p className="type-ui mt-1 text-ink-ghost">
              {askContext === null
                ? "Answers stop at your bookmark."
                : askContext.wholeBook
                ? "Answering from the whole book."
                : askContext.through === 0
                ? "You haven't finished a chapter yet, so answers stay spoiler-free."
                : `Answering through ${askContext.throughTitle ?? `chapter ${askContext.through}`}. Nothing later is revealed.`}
              {askContext && !askContext.wholeBook && (
                <>
                  {" "}
                  <Link
                    href="/welcome?replay=1"
                    className="text-burgundy underline underline-offset-2"
                  >
                    Move my bookmark
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {storySlug && (
        <div className="border-b border-[var(--color-border)] bg-gold-pale/30 py-3">
          <p className="type-meta text-ink">Chapter</p>
          <p className="mt-1 font-[family-name:var(--font-lora)] text-sm text-ink">
            Asking about:{" "}
            <Link
              href={`/stories/${encodeURIComponent(storySlug)}`}
              className="font-medium text-clay underline underline-offset-2 hover:text-clay-mid"
            >
              {contextStoryTitle ?? storySlug}
            </Link>
          </p>
        </div>
      )}

      {!storySlug && prefilledPrompt && messages.length === 0 && (
        <div className="border-b border-[var(--color-border)] bg-gold-pale/30 py-3">
          <p className="type-meta text-ink">Principle prompt loaded</p>
          <p className="mt-1 font-[family-name:var(--font-lora)] text-sm text-ink">
            We loaded a suggested question into Ask. You can edit it before you
            send.
          </p>
        </div>
      )}

      <div
        className="flex-1 space-y-4 overflow-y-auto py-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {highlightIdFromUrl && highlightHydration === "loading" && (
          <div className="py-12 text-center text-sm text-ink-ghost">
            Loading your saved passage…
          </div>
        )}

        {messages.length === 0 &&
          !(highlightIdFromUrl && highlightHydration === "loading") && (
          <div className="py-12 text-center">
            <p className="mb-4 text-sm text-ink-muted">
              What would you like to know about {book.title}?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {(askContext?.suggestions ?? []).map((suggestion) => (
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
            key={msg.id ?? `${msg.role}-${i}-${msg.content.slice(0, 24)}`}
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
                <>
                  <div className="prose prose-story prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-sm prose-headings:font-semibold prose-ul:my-1 prose-li:my-0">
                    <ReactMarkdown components={ASSISTANT_MARKDOWN_COMPONENTS}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  {msg.evidence ? (
                    <AskSourcesDisclosure evidence={msg.evidence} />
                  ) : null}
                </>
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
          <div className="notice-error rounded-lg p-3 text-sm">
            {error}
            <Link
              href="/stories"
              className="mt-1 block text-xs underline"
            >
              Back to the chapters
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
            placeholder={`Ask about ${book.title}...`}
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
