"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import { book } from "@/config/book";
import type { AskMessageEvidence } from "@/lib/ai/ask-evidence";
import { fileCardsFromLinks } from "@/lib/archive/file-cards";

export type ArchiveOpening = {
  label: string;
  quote: string;
  question: string;
  file?: { href: string; label: string };
  followUp?: string;
};

type AskContext = {
  wholeBook: boolean;
  through: number;
  throughTitle: string | null;
  suggestions: string[];
};

interface Message {
  role: "user" | "assistant";
  content: string;
  id?: string;
  evidence?: AskMessageEvidence | null;
}

const LINK_CLASS =
  "font-medium text-ocean underline underline-offset-2 hover:text-burgundy";

const ANSWER_MARKDOWN: Components = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  a({ href, children, node: _, ...props }) {
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className={LINK_CLASS}>
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
          className={LINK_CLASS}
          {...props}
        >
          {children}
        </a>
      );
    }
    return <span>{children}</span>;
  },
};

const META =
  "font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-ghost";

function trimParam(raw: string | null, max: number): string | undefined {
  if (!raw) return undefined;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  const trimmed = decoded.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** Keep evidence available without interrupting the conversation. */
function AnswerAttachments({ evidence }: { evidence: AskMessageEvidence }) {
  const cited = fileCardsFromLinks(evidence.linksInAnswer);
  const consulted = (evidence.retrieval?.items ?? [])
    .filter((item) => !evidence.linksInAnswer.some((link) => link.href === item.href))
    .slice(0, 6);
  if (cited.length === 0 && consulted.length === 0) return null;
  return (
    <div className="mt-3">
      {cited.length > 0 || consulted.length > 0 ? (
        <details className="text-sm text-ink-muted">
          <summary className="w-fit cursor-pointer select-none py-1 text-xs text-ink-muted hover:text-ocean">
            Sources and related files
          </summary>
          <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-warm-white/50 px-4 py-3">
            {cited.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-ink-muted">Cited in this answer</p>
                <ul className="list-none space-y-1">
                  {cited.map((card) => (
                    <li key={card.href}><Link href={card.href} className={LINK_CLASS}>{card.name}</Link></li>
                  ))}
                </ul>
              </div>
            ) : null}
            {consulted.length > 0 ? (
              <div className={cited.length > 0 ? "mt-3" : ""}>
                <p className="mb-1 text-xs font-medium text-ink-muted">Related files</p>
                <ul className="list-none space-y-1">
                  {consulted.map((source) => (
                    <li key={source.href}><Link href={source.href} className={LINK_CLASS}>{source.title}</Link></li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function GuestLimitPanel() {
  return (
    <section
      aria-label="Create a free account to keep asking"
      className="rounded-2xl border border-ocean/40 bg-warm-white p-5"
    >
      <p className={META}>
        {book.guestQuestionLimit} of {book.guestQuestionLimit} guest questions
        used
      </p>
      <h2 className="type-story-title mt-2 text-2xl">Keep the archive open</h2>
      <p className="mt-2 font-[family-name:var(--font-lora)] text-[0.9375rem] leading-relaxed text-ink-muted">
        A free account lets you keep asking and pin questions as threads. The
        files and chapter 1 stay open without one.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Link
          href="/signup?next=/"
          className="flex min-h-12 items-center justify-center rounded-lg bg-clay px-4 text-[0.9375rem] font-medium text-warm-white no-underline hover:bg-clay-mid"
        >
          Create a free account
        </Link>
        <Link
          href="/login?next=/"
          className="flex min-h-12 items-center justify-center rounded-lg border border-[var(--color-border)] px-4 text-sm text-ink no-underline hover:border-clay-border"
        >
          Sign in
        </Link>
        <Link
          href="/codex"
          className="flex min-h-11 items-center justify-center text-sm text-ink-muted underline underline-offset-2"
        >
          Keep browsing the files
        </Link>
      </div>
    </section>
  );
}

export function ArchiveConversation({
  signedIn,
  opening,
}: {
  signedIn: boolean;
  /** The archive's approved opening prompt for this visit, if any. */
  opening: ArchiveOpening | null;
}) {
  const searchParams = useSearchParams();
  const storySlug = searchParams.get("story") || undefined;
  const resumeId = searchParams.get("c") || undefined;
  const highlightId = searchParams.get("highlight") || undefined;
  const prefilledPrompt = trimParam(searchParams.get("prompt"), 600);
  const urlPassage = trimParam(searchParams.get("passage"), 1000);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [askContext, setAskContext] = useState<AskContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(Boolean(resumeId || highlightId));
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestRemaining, setGuestRemaining] = useState<number | null>(null);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const [pinState, setPinState] = useState<"idle" | "saving" | "pinned" | "failed">(
    "idle"
  );
  const [passageToSend, setPassageToSend] = useState<string | undefined>(urlPassage);
  /** True after "Answer the archive": the next message replies to the prompt. */
  const [answeringPrompt, setAnsweringPrompt] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendInFlightRef = useRef(false);
  const preloadFiredRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ask/context")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AskContext | null) => {
        if (!cancelled && data) setAskContext(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Resume a pinned thread (?c=) or the conversation behind a saved passage.
  useEffect(() => {
    if (!resumeId && !highlightId) return;
    let cancelled = false;
    (async () => {
      let convId = resumeId;
      let passage: string | undefined;
      if (!convId && highlightId) {
        const hr = await fetch(
          `/api/profile/highlights/${encodeURIComponent(highlightId)}`
        );
        if (hr.ok) {
          const body: {
            highlight?: {
              passage_text?: string;
              passage_ask_conversation_id?: string | null;
            };
          } = await hr.json();
          convId =
            searchParams.get("new") === "1"
              ? undefined
              : body.highlight?.passage_ask_conversation_id ?? undefined;
          passage = body.highlight?.passage_text?.trim().slice(0, 1000);
        }
      }
      if (convId) {
        const cr = await fetch(`/api/conversations/${encodeURIComponent(convId)}`);
        if (cr.ok && !cancelled) {
          const data: {
            conversation?: { pinned_at?: string | null };
            messages?: {
              id?: string;
              role: string;
              content: string;
              evidence?: unknown;
            }[];
          } = await cr.json();
          setMessages(
            (data.messages ?? []).map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              id: m.id,
              evidence:
                m.role === "assistant" && m.evidence && typeof m.evidence === "object"
                  ? (m.evidence as AskMessageEvidence)
                  : undefined,
            }))
          );
          setConversationId(convId);
          if (data.conversation?.pinned_at) setPinState("pinned");
          preloadFiredRef.current = true;
        }
      } else if (passage && !cancelled) {
        setPassageToSend(passage);
      }
      if (!cancelled) setResuming(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, highlightId]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const shown = (text ?? input).trim();
      if (!shown || sendInFlightRef.current) return;
      sendInFlightRef.current = true;

      // A reply to the archive's opening prompt carries the prompt with it.
      const outgoing =
        answeringPrompt && opening
          ? `The archive showed me this (${opening.label}): "${opening.quote}" and asked: "${opening.question}"\n\nMy answer: ${shown}`
          : shown;
      setAnsweringPrompt(false);

      const history = messagesRef.current
        .filter((m) => m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }));

      setInput("");
      setError(null);
      setLoading(true);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: shown },
        { role: "assistant", content: "" },
      ]);

      const dropEmptyAnswer = () =>
        setMessages((prev) =>
          prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev
        );

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: outgoing,
            conversationId,
            storySlug,
            ageMode: "adult",
            askMode: "deep",
            ...(signedIn ? {} : { history }),
            ...(highlightId ? { highlightId } : {}),
          }),
        });

        if (!res.ok) {
          let detail = "";
          let code = "";
          try {
            const errBody = (await res.json()) as { error?: string; code?: string };
            detail = errBody.error ?? "";
            code = errBody.code ?? "";
          } catch {
            /* not JSON */
          }
          if (code === "guest_limit") {
            // Their question was not answered: take it back off the page.
            setMessages((prev) => prev.slice(0, -2));
            setInput(shown);
            setGuestBlocked(true);
            return;
          }
          throw new Error(
            res.status === 429
              ? "Too many questions at once. Try again in a moment."
              : detail || "The archive could not answer just now."
          );
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("The archive could not answer just now.");
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (value) buffer += decoder.decode(value, { stream: true });
          if (done) buffer += decoder.decode();
          const lines = buffer.split("\n");
          buffer = done ? "" : lines.pop() ?? "";

          let textBatch = "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                setError(data.error);
                break;
              }
              if (data.conversationId) setConversationId(data.conversationId);
              if (typeof data.guestRemaining === "number") {
                setGuestRemaining(data.guestRemaining);
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
              if (typeof data.text === "string") textBatch += data.text;
            } catch {
              /* malformed line */
            }
          }

          if (textBatch) {
            // Immutable update: Strict Mode may run this updater twice.
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (!last || last.role !== "assistant") return prev;
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + textBatch },
              ];
            });
          }
          if (done) break;
        }
      } catch (e) {
        setError(
          e instanceof Error && e.message.trim()
            ? e.message
            : "The archive could not answer just now."
        );
        dropEmptyAnswer();
      } finally {
        sendInFlightRef.current = false;
        setLoading(false);
      }
    },
    [input, conversationId, storySlug, signedIn, highlightId, answeringPrompt, opening]
  );

  // ?prompt= fills the field; a saved passage is asked about straight away.
  useEffect(() => {
    if (prefilledPrompt && messagesRef.current.length === 0) {
      setInput((current) => current || prefilledPrompt);
    }
  }, [prefilledPrompt]);

  useEffect(() => {
    if (resuming || !passageToSend || preloadFiredRef.current) return;
    if (messagesRef.current.length > 0 || sendInFlightRef.current) return;
    preloadFiredRef.current = true;
    void sendMessage(
      `I saved this passage:\n\n"${passageToSend}"\n\nWhat is going on in this moment, and why does it matter to the story?`
    );
  }, [resuming, passageToSend, sendMessage]);

  async function pinThread() {
    if (!conversationId || pinState === "saving") return;
    setPinState("saving");
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, pinned: true }),
      });
      setPinState(res.ok ? "pinned" : "failed");
    } catch {
      setPinState("failed");
    }
  }

  const boundary =
    askContext === null
      ? null
      : askContext.wholeBook
      ? "Whole book open"
      : askContext.through === 0
      ? "Spoiler-safe"
      : `Through chapter ${askContext.through}`;

  const lastIsAnswered =
    !loading &&
    messages.length > 0 &&
    messages[messages.length - 1]!.role === "assistant" &&
    messages[messages.length - 1]!.content !== "";

  const guestLeft =
    !signedIn && guestRemaining !== null
      ? `${guestRemaining} of ${book.guestQuestionLimit} guest questions left`
      : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-content flex-col px-[var(--page-padding-x)] md:h-[calc(100dvh-4rem)]">
      <div className="flex items-center justify-between gap-3 border-b border-ocean/25 py-3">
        <h1 className="font-[family-name:var(--font-lora)] text-base font-medium text-burgundy">
          Ask {book.title}
        </h1>
        {boundary ? (
          signedIn ? (
            <Link
              href="/welcome?replay=1"
              className="inline-flex min-h-9 items-center rounded-full border border-[var(--color-border)] px-3 text-xs text-ink-muted no-underline hover:border-clay-border"
              aria-label={`${boundary}. Change how much of the book is open`}
            >
              {boundary}
            </Link>
          ) : (
            <span className="inline-flex min-h-9 items-center rounded-full border border-[var(--color-border)] px-3 text-xs text-ink-muted">
              {boundary}
            </span>
          )
        ) : null}
      </div>

      <div
        className="flex-1 space-y-5 overflow-y-auto py-5"
        aria-live="polite"
        aria-relevant="additions"
      >
        {resuming ? (
          <p className="py-12 text-center text-sm text-ink-ghost">
            Opening the record…
          </p>
        ) : null}

        {messages.length === 0 && !resuming ? (
          opening ? (
            <section aria-label="From the archive" className="space-y-4">
              <p className={META}>{opening.label}</p>
              <blockquote className="border-l-2 border-ocean pl-4 font-[family-name:var(--font-lora)] text-[1.375rem] italic leading-normal text-burgundy">
                {opening.quote}
              </blockquote>
              <p className="font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted">
                {opening.question}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAnsweringPrompt(true);
                    inputRef.current?.focus();
                  }}
                  className="flex min-h-12 items-center rounded-lg border border-[var(--color-border)] bg-warm-white px-4 text-left text-sm text-ink hover:border-ocean"
                >
                  Answer the archive
                </button>
                {opening.followUp ? (
                  <button
                    type="button"
                    onClick={() => sendMessage(opening.followUp)}
                    className="flex min-h-12 items-center rounded-lg border border-[var(--color-border)] bg-warm-white px-4 text-left text-sm text-ink hover:border-ocean"
                  >
                    Show me where this comes from
                  </button>
                ) : null}
                {opening.file ? (
                  <Link
                    href={opening.file.href}
                    className="flex min-h-12 items-center rounded-lg border border-[var(--color-border)] bg-warm-white px-4 text-sm text-ink no-underline hover:border-ocean"
                  >
                    {opening.file.label}
                  </Link>
                ) : null}
              </div>
            </section>
          ) : (
            <p className="font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted">
              What would you like to know about the story? Ask about a character,
              a moment, or something that still feels unresolved.
            </p>
          )
        ) : null}

        {messages.length === 0 && !resuming && (askContext?.suggestions.length ?? 0) > 0 ? (
          <div>
            <p className="mb-2 text-sm text-ink-muted">Or try one of these</p>
            <div className="flex flex-wrap gap-2">
              {askContext!.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  className="min-h-9 rounded-full border border-[var(--color-border)] bg-warm-white px-3 py-1.5 text-left text-[0.8125rem] text-ink-muted hover:border-ocean hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={msg.id ?? `u-${i}`} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-sm bg-clay px-4 py-2.5 text-[0.9375rem] text-warm-white">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={msg.id ?? `a-${i}`}>
              {msg.content === "" && loading ? (
                <p className="text-sm text-ink-muted animate-pulse">Looking into that…</p>
              ) : (
                <div className="prose prose-story max-w-none font-[family-name:var(--font-lora)] text-[0.975rem] leading-relaxed prose-p:my-3 prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-base prose-headings:font-semibold prose-ul:my-2 prose-li:my-1">
                  <ReactMarkdown components={ANSWER_MARKDOWN}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
              {msg.evidence ? <AnswerAttachments evidence={msg.evidence} /> : null}
            </div>
          )
        )}

        {lastIsAnswered ? (
          <div className="flex flex-wrap items-center gap-2">
            {signedIn ? (
              pinState === "pinned" ? (
                <Link
                  href="/threads"
                  className="inline-flex min-h-9 items-center rounded-full border border-ocean px-3 text-[0.8125rem] text-ocean no-underline"
                >
                  Pinned · see your threads
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={pinThread}
                  disabled={!conversationId || pinState === "saving"}
                  className="inline-flex min-h-9 items-center rounded-full border border-ocean px-3 text-[0.8125rem] text-ocean disabled:opacity-50"
                >
                  {pinState === "saving" ? "Pinning…" : "Pin as a thread"}
                </button>
              )
            ) : (
              <Link
                href="/signup?next=/"
                className="inline-flex min-h-9 items-center rounded-full border border-[var(--color-border)] px-3 text-[0.8125rem] text-ink-muted no-underline"
              >
                Create an account to pin this
              </Link>
            )}
            {pinState === "failed" ? (
              <span className="text-xs text-ink-muted">
                Could not pin this just now.
              </span>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="notice-error rounded-lg p-3 text-sm" role="alert">
            {error}
          </div>
        ) : null}

        {guestBlocked ? <GuestLimitPanel /> : null}

        <div ref={bottomRef} />
      </div>

      {guestBlocked ? null : (
        <div className="border-t border-[var(--color-border)] py-3">
          {answeringPrompt ? (
            <p className={`${META} mb-2`}>Answering the archive</p>
          ) : guestLeft ? (
            <p className={`${META} mb-2`}>{guestLeft}</p>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="flex gap-2"
          >
            <label htmlFor="archive-question" className="sr-only">
              Ask the archive
            </label>
            <input
              id="archive-question"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                answeringPrompt ? "What do you think?" : "Ask the archive…"
              }
              disabled={loading}
              autoComplete="off"
              className="min-h-12 flex-1 rounded-lg border border-ocean/40 bg-warm-white px-3 text-base text-ink placeholder:text-ink-ghost disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="min-h-12 rounded-lg bg-clay px-4 text-sm font-medium text-warm-white transition-colors hover:bg-clay-mid disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
