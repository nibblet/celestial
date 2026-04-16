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

type SaveStatus = "idle" | "visible" | "saving" | "saved" | "error";

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

  const onSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setStatus((s) => (s === "visible" ? "idle" : s));
      return;
    }
    const text = sel.toString().trim();
    if (text.length < MIN_CHARS || text.length > MAX_CHARS) {
      setStatus((s) => (s === "visible" ? "idle" : s));
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
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onSelectionChange]);

  async function save() {
    if (status !== "visible" || !selText) return;
    setStatus("saving");
    try {
      const res = await fetch(`/api/stories/${storyId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage_text: selText, story_title: storyTitle }),
      });
      setStatus(res.ok ? "saved" : "error");
      window.getSelection()?.removeAllRanges();
      timerRef.current = setTimeout(
        () => setStatus("idle"),
        res.ok ? 2000 : 2500
      );
    } catch {
      setStatus("error");
      timerRef.current = setTimeout(() => setStatus("idle"), 2500);
    }
  }

  const showBtn = status !== "idle";

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
        >
          <button
            type="button"
            onClick={save}
            disabled={status !== "visible"}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg transition-colors ${
              status === "saved"
                ? "bg-green text-warm-white"
                : status === "error"
                  ? "bg-red-500 text-white"
                  : "cursor-pointer bg-clay text-warm-white hover:bg-clay-mid disabled:opacity-50"
            }`}
          >
            {status === "saving"
              ? "Saving\u2026"
              : status === "saved"
                ? "\u2713 Saved to your passages"
                : status === "error"
                  ? "Couldn\u2019t save \u2014 try again"
                  : "Save this passage"}
          </button>
        </div>
      )}
    </article>
  );
}
