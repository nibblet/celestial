"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StoryMarkdown } from "@/components/story/StoryMarkdown";

interface StoryBodyWithHighlightingProps {
  storyId: string;
  storyTitle: string;
  fullText: string;
}

const MIN_CHARS = 10;
const MAX_CHARS = 1000;
// Corrections can be as short as a single garbled word
const MIN_CORRECTION_CHARS = 3;

type SaveStatus = "idle" | "visible" | "saving" | "saved" | "reporting" | "reported" | "error";

export function StoryBodyWithHighlighting({
  storyId,
  storyTitle,
  fullText,
}: StoryBodyWithHighlightingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [selText, setSelText] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const onSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    // Don't clobber an in-flight or completed action
    if (
      !sel ||
      sel.isCollapsed ||
      status === "saving" ||
      status === "reporting" ||
      status === "saved" ||
      status === "reported"
    ) {
      if ((!sel || sel.isCollapsed) && status === "visible") {
        setStatus("idle");
      }
      return;
    }

    const text = sel.toString().trim();
    // Need at least MIN_CORRECTION_CHARS to show any button;
    // "Save passage" button only appears if >= MIN_CHARS.
    if (text.length < MIN_CORRECTION_CHARS || text.length > MAX_CHARS) {
      if (status === "visible") setStatus("idle");
      return;
    }
    if (!containerRef.current) return;
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setSelText(text);
    setPos({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top - 8,
    });
    setStatus("visible");
  }, [status]);

  useEffect(() => {
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      clearTimer();
    };
  }, [onSelectionChange]);

  async function savePassage() {
    if (status !== "visible" || selText.length < MIN_CHARS) return;
    setStatus("saving");
    clearTimer();
    try {
      const res = await fetch(`/api/stories/${storyId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage_text: selText, story_title: storyTitle }),
      });
      setStatus(res.ok ? "saved" : "error");
      window.getSelection()?.removeAllRanges();
      timerRef.current = setTimeout(() => setStatus("idle"), res.ok ? 2000 : 2500);
    } catch {
      setStatus("error");
      timerRef.current = setTimeout(() => setStatus("idle"), 2500);
    }
  }

  async function reportError() {
    if (status !== "visible" || selText.length < MIN_CORRECTION_CHARS) return;
    setStatus("reporting");
    clearTimer();
    try {
      const res = await fetch(`/api/stories/${storyId}/corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage_text: selText, story_title: storyTitle }),
      });
      setStatus(res.ok ? "reported" : "error");
      window.getSelection()?.removeAllRanges();
      timerRef.current = setTimeout(() => setStatus("idle"), res.ok ? 2500 : 2500);
    } catch {
      setStatus("error");
      timerRef.current = setTimeout(() => setStatus("idle"), 2500);
    }
  }

  const showBtn = status !== "idle";
  const isBusy = status === "saving" || status === "reporting";
  const canSavePassage = selText.length >= MIN_CHARS;

  return (
    <article className="story-body relative">
      <div
        ref={containerRef}
        className="prose prose-story prose-lg max-w-none pb-8"
      >
        <StoryMarkdown content={fullText} />
      </div>

      {showBtn && (
        <div
          style={{
            position: "absolute",
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            transform: "translate(-50%, -100%)",
            zIndex: 50,
          }}
          className="flex flex-col items-center gap-1"
        >
          {/* ── Primary: Save passage ── */}
          {status === "saved" ? (
            <span className="whitespace-nowrap rounded-full bg-green px-3 py-1.5 text-xs font-semibold text-warm-white shadow-lg">
              ✓ Saved to your passages
            </span>
          ) : status === "reported" ? (
            <span className="whitespace-nowrap rounded-full bg-clay px-3 py-1.5 text-xs font-semibold text-warm-white shadow-lg">
              ✓ Error reported — thanks
            </span>
          ) : status === "error" ? (
            <span className="whitespace-nowrap rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
              Couldn&apos;t save — try again
            </span>
          ) : (
            <>
              {canSavePassage && (
                <button
                  type="button"
                  onClick={savePassage}
                  disabled={isBusy}
                  className="whitespace-nowrap rounded-full bg-clay px-3 py-1.5 text-xs font-semibold text-warm-white shadow-lg transition-colors hover:bg-clay-mid disabled:opacity-50"
                >
                  {status === "saving" ? "Saving\u2026" : "Save this passage"}
                </button>
              )}

              {/* ── Secondary: Report error — deliberately smaller & muted ── */}
              <button
                type="button"
                onClick={reportError}
                disabled={isBusy}
                className="whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium text-ink-ghost transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                {status === "reporting" ? "Reporting\u2026" : "⚠ Report error"}
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
