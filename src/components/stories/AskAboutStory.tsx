"use client";

import { useState } from "react";
import type { ChapterQuestionCategory } from "@/types";

type CategoryChoice = {
  id: ChapterQuestionCategory;
  label: string;
};

const CATEGORIES: CategoryChoice[] = [
  { id: "person", label: "A person" },
  { id: "place", label: "A place" },
  { id: "object", label: "Something in the story" },
  { id: "timeline", label: "When it happened" },
  { id: "other", label: "Something else" },
];

type Status = "idle" | "expanded" | "sending" | "sent" | "error";

export function AskAboutStory({ storyId }: { storyId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [category, setCategory] = useState<ChapterQuestionCategory | null>(
    null
  );
  const [question, setQuestion] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || status === "sending") return;
    setStatus("sending");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/stories/${storyId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          category,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(data.error || "Could not send your question.");
        setStatus("error");
        return;
      }

      setStatus("sent");
      setQuestion("");
      setCategory(null);
    } catch {
      setErrorMessage("Could not send your question.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-8 rounded-xl border border-clay-border bg-gold-pale/40 p-5">
        <p className="type-meta mb-1 text-clay">Note sent</p>
        <p className="font-[family-name:var(--font-lora)] text-sm text-ink-muted">
          Keith will see it. When he answers, it&apos;ll appear here for other
          readers too.
        </p>
        <button
          type="button"
          onClick={() => setStatus("expanded")}
          className="type-ui mt-3 text-sm text-clay hover:text-clay-mid"
        >
          Ask another
        </button>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
        <h2 className="type-meta mb-1 text-ink">A note for Keith</h2>
        <p className="mb-3 font-[family-name:var(--font-lora)] text-sm text-ink-muted">
          Something in this story you want to know more about? Send Keith a
          private note. When he answers, it&apos;ll show here for other readers
          too.
        </p>
        <button
          type="button"
          onClick={() => setStatus("expanded")}
          className="type-ui rounded-full border border-clay bg-warm-white px-4 py-1.5 text-sm font-medium text-clay transition-colors hover:bg-clay hover:text-warm-white"
        >
          Write to Keith
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-xl border border-clay-border bg-warm-white p-5"
    >
      <h2 className="type-meta mb-1 text-ink">Write to Keith</h2>
      <p className="mb-4 font-[family-name:var(--font-lora)] text-sm text-ink-muted">
        What&apos;s the question about? (optional)
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(active ? null : c.id)}
              className={`type-ui rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-clay bg-clay text-warm-white"
                  : "border-[var(--color-border)] bg-warm-white text-ink-muted hover:border-clay-border hover:text-clay"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="What do you want to know?"
        rows={3}
        maxLength={1000}
        className="type-ui mb-3 w-full rounded-lg border border-[var(--color-border)] bg-warm-white-2 px-3 py-2 text-ink placeholder:text-ink-ghost"
        disabled={status === "sending"}
      />
      {errorMessage && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "sending" || !question.trim()}
          className="type-ui rounded-lg bg-clay px-4 py-2 text-sm font-medium text-warm-white transition-colors hover:bg-clay-mid disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "sending" ? "Sending..." : "Send to Keith"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setErrorMessage(null);
          }}
          className="type-ui rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
