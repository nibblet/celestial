"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Editor } from "@tiptap/react";
import { TipTapEditor, type MentionEntry } from "./TipTapEditor";
import { MediaGallery } from "./MediaGallery";
import { AIPolishPanel, type PolishSuggestion } from "./AIPolishPanel";

export interface DraftRecord {
  id: string;
  title: string;
  body: string;
  life_stage: string | null;
  year_start: number | null;
  year_end: number | null;
  themes: string[] | null;
  principles: string[] | null;
  quotes: string[] | null;
  status: "draft" | "approved" | "published";
  origin?: "chat" | "write" | "edit";
  story_id?: string | null;
  updated_at?: string;
}

interface Props {
  initial?: DraftRecord | null;
  origin: "write" | "edit";
  onSaved?: (draft: DraftRecord) => void;
  onBack?: () => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function BeyondDraftEditor({ initial, origin, onSaved, onBack }: Props) {
  const [draftId, setDraftId] = useState<string | null>(initial?.id ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [mentions, setMentions] = useState<MentionEntry[]>([]);
  const [lifeStage, setLifeStage] = useState(initial?.life_stage ?? "");
  const [yearStart, setYearStart] = useState<string>(
    initial?.year_start ? String(initial.year_start) : ""
  );
  const [yearEnd, setYearEnd] = useState<string>(
    initial?.year_end ? String(initial.year_end) : ""
  );
  const [themes, setThemes] = useState((initial?.themes ?? []).join(", "));
  const [principles, setPrinciples] = useState(
    (initial?.principles ?? []).join(", ")
  );
  const [quotes, setQuotes] = useState((initial?.quotes ?? []).join("\n"));
  const [showPreview, setShowPreview] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(
    initial?.updated_at ? new Date(initial.updated_at) : null
  );
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "submitted">(
    initial?.status && initial.status !== "draft" ? "submitted" : "idle"
  );
  const [publishState, setPublishState] = useState<
    "idle" | "publishing" | "published"
  >(initial?.status === "published" ? "published" : "idle");
  const [publishedStoryId, setPublishedStoryId] = useState<string | null>(
    initial?.status === "published" ? initial?.story_id ?? null : null
  );
  const [error, setError] = useState<string | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<PolishSuggestion | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPayload = useRef<string>("");
  const editorRef = useRef<Editor | null>(null);

  const payload = useMemo(() => {
    const split = (s: string) =>
      s
        .split(/[,\n]/)
        .map((v) => v.trim())
        .filter(Boolean);
    return {
      title,
      body,
      life_stage: lifeStage.trim() || null,
      year_start: yearStart ? Number(yearStart) : null,
      year_end: yearEnd ? Number(yearEnd) : null,
      themes: split(themes),
      principles: split(principles),
      quotes: quotes
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean),
      mentions: mentions
        .filter((m) => m.id && m.id !== "__new__")
        .map((m) => ({ id: m.id })),
    };
  }, [title, body, lifeStage, yearStart, yearEnd, themes, principles, quotes, mentions]);

  const save = useCallback(async () => {
    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedPayload.current) return;
    if (!payload.title.trim() && !payload.body.trim()) return;

    setSaveState("saving");
    setError(null);
    try {
      if (!draftId) {
        const res = await fetch("/api/beyond/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, origin }),
        });
        if (!res.ok) throw new Error("create failed");
        const data = (await res.json()) as { draft: DraftRecord };
        setDraftId(data.draft.id);
        lastSavedPayload.current = serialized;
        setSavedAt(new Date());
        setSaveState("saved");
        onSaved?.(data.draft);
      } else {
        const res = await fetch(`/api/beyond/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("update failed");
        const data = (await res.json()) as { draft: DraftRecord };
        lastSavedPayload.current = serialized;
        setSavedAt(new Date());
        setSaveState("saved");
        onSaved?.(data.draft);
      }
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }, [draftId, origin, payload, onSaved]);

  // Debounced autosave.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save();
    }, 2500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [save]);

  async function submitForReview() {
    if (!draftId) {
      await save();
    }
    const id = draftId;
    if (!id) return;
    setSubmitState("submitting");
    try {
      const res = await fetch(`/api/beyond/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, status: "approved" }),
      });
      if (!res.ok) throw new Error("submit failed");
      setSubmitState("submitted");
    } catch {
      setSubmitState("idle");
      setError("Could not submit — try again.");
    }
  }

  async function publishNow() {
    // Ensure the latest text is saved before publishing.
    if (!draftId) {
      await save();
    }
    const id = draftId;
    if (!id) return;
    setPublishState("publishing");
    setError(null);
    try {
      // Flush any pending edits first so we publish the current text.
      await save();
      const res = await fetch(`/api/beyond/drafts/${id}/publish`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        storyId?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Publish failed");
      }
      setPublishState("published");
      setPublishedStoryId(data.storyId ?? null);
      setSubmitState("submitted");
    } catch (err) {
      setPublishState("idle");
      setError(err instanceof Error ? err.message : "Publish failed");
    }
  }

  async function requestPolish() {
    setPolishing(true);
    setPolishError(null);
    setSuggestion(null);
    try {
      const res = await fetch("/api/beyond/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          life_stage: payload.life_stage,
          year_start: payload.year_start,
          year_end: payload.year_end,
          themes: payload.themes,
          principles: payload.principles,
          quotes: payload.quotes,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        suggestion?: PolishSuggestion;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Polish failed");
      }
      if (!data.suggestion) {
        throw new Error("No suggestion returned");
      }
      setSuggestion(data.suggestion);
    } catch (err) {
      setPolishError(err instanceof Error ? err.message : "Polish failed");
    } finally {
      setPolishing(false);
    }
  }

  function acceptPolishField(field: keyof PolishSuggestion) {
    if (!suggestion) return;
    const val = suggestion[field];
    switch (field) {
      case "title":
        if (typeof val === "string") setTitle(val);
        break;
      case "body":
        if (typeof val === "string") {
          setBody(val);
          editorRef.current?.commands.setContent(val);
        }
        break;
      case "life_stage":
        if (val === null || typeof val === "string") setLifeStage((val as string) || "");
        break;
      case "year_start":
        if (val === null || typeof val === "number")
          setYearStart(val == null ? "" : String(val));
        break;
      case "year_end":
        if (val === null || typeof val === "number")
          setYearEnd(val == null ? "" : String(val));
        break;
      case "themes":
        if (Array.isArray(val)) setThemes(val.join(", "));
        break;
      case "principles":
        if (Array.isArray(val)) setPrinciples(val.join(", "));
        break;
      case "quotes":
        if (Array.isArray(val)) setQuotes(val.join("\n"));
        break;
    }
    // Drop accepted field from suggestion so the UI reflects progress.
    setSuggestion((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function acceptAllPolish() {
    if (!suggestion) return;
    (Object.keys(suggestion) as (keyof PolishSuggestion)[]).forEach((k) => {
      if (k === "rationale") return;
      acceptPolishField(k);
    });
    setSuggestion(null);
  }

  const savedLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "error"
        ? "Save failed"
        : savedAt
          ? `Saved ${formatRelative(savedAt)}`
          : "Not saved yet";

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="type-ui mb-1 text-xs text-ink-ghost transition-colors hover:text-clay"
            >
              ← Back to drafts
            </button>
          )}
          <p className="type-ui text-xs uppercase tracking-wide text-ink-ghost">
            {origin === "edit" ? "Revise" : "New story"} · {savedLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="type-ui rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-1.5 text-sm text-ink-muted transition-colors hover:text-clay"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
          <button
            type="button"
            onClick={requestPolish}
            disabled={polishing || (!payload.title.trim() && !payload.body.trim())}
            className="type-ui rounded-lg border border-clay px-3 py-1.5 text-sm font-medium text-clay transition-colors hover:bg-clay hover:text-warm-white disabled:opacity-50"
            title="Light AI polish — fixes typos, suggests metadata, never rewrites your voice"
          >
            {polishing ? "Polishing…" : "✨ AI Polish"}
          </button>
          {publishState !== "published" && submitState !== "submitted" && (
            <button
              type="button"
              onClick={submitForReview}
              disabled={submitState !== "idle" || !payload.title.trim()}
              className="type-ui rounded-lg border border-clay px-3 py-1.5 text-sm font-medium text-clay transition-colors hover:bg-clay hover:text-warm-white disabled:opacity-50"
              title="Set aside as ready to publish — useful if you want to sleep on it"
            >
              {submitState === "submitting" ? "Submitting…" : "Mark ready"}
            </button>
          )}
          <button
            type="button"
            onClick={publishNow}
            disabled={
              publishState !== "idle" ||
              !payload.title.trim() ||
              !payload.body.trim()
            }
            className="type-ui rounded-lg bg-clay px-3 py-1.5 text-sm font-medium text-warm-white transition-colors hover:bg-clay-mid disabled:opacity-50"
            title={
              initial?.story_id
                ? "Publish this revision — replaces the current published version"
                : "Publish this story to the family library"
            }
          >
            {publishState === "published"
              ? "Published ✓"
              : publishState === "publishing"
                ? "Publishing…"
                : initial?.story_id
                  ? "Publish revision"
                  : "Publish"}
          </button>
        </div>
      </div>

      {publishState === "published" && publishedStoryId && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          Published as <span className="font-mono">{publishedStoryId}</span>.
          It&apos;s live in the family library. Further edits here will create a
          new revision when you publish again.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {polishError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          AI polish failed: {polishError}
        </div>
      )}

      {suggestion && (
        <AIPolishPanel
          suggestion={suggestion}
          current={{
            title,
            body,
            life_stage: lifeStage,
            year_start: yearStart,
            year_end: yearEnd,
            themes,
            principles,
            quotes,
          }}
          onAcceptField={acceptPolishField}
          onAcceptAll={acceptAllPolish}
          onReject={() => setSuggestion(null)}
        />
      )}

      {showPreview ? (
        <div className="flex-1 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-warm-white-2 p-6">
          <h1 className="mb-4 text-2xl font-semibold text-ink">
            {title || "Untitled"}
          </h1>
          <div className="prose prose-story max-w-none">
            {isHTML(body) ? (
              <div dangerouslySetInnerHTML={{ __html: body }} />
            ) : (
              <ReactMarkdown>
                {body || "_Nothing yet — switch to Edit and start writing._"}
              </ReactMarkdown>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Story title"
            className="type-ui rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 text-lg font-semibold text-ink placeholder:text-ink-ghost"
          />
          <TipTapEditor
            initialHTML={initial?.body ?? ""}
            placeholder="Write the story. Use @ to reference a person."
            onChange={(html, ms) => {
              setBody(html);
              setMentions(ms);
            }}
            onReady={(ed) => {
              editorRef.current = ed;
            }}
          />
          <div>
            <p className="type-ui mb-1 text-xs font-medium uppercase tracking-wide text-ink-ghost">
              Photos
            </p>
            <MediaGallery
              ownerType="story"
              ownerId={draftId}
              canEdit={true}
              onInsertIntoEditor={(item) => {
                const ed = editorRef.current;
                if (!ed) return;
                ed.chain()
                  .focus()
                  .setImage({
                    src: item.display_url,
                    alt: item.caption ?? "",
                  })
                  .run();
              }}
            />
          </div>
          <details className="rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2">
            <summary className="type-ui cursor-pointer text-sm font-medium text-ink">
              Metadata
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="type-ui flex flex-col gap-1 text-xs text-ink-muted">
                Life stage
                <input
                  value={lifeStage}
                  onChange={(e) => setLifeStage(e.target.value)}
                  placeholder="e.g. childhood, early career"
                  className="rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-1 text-sm text-ink"
                />
              </label>
              <div className="flex gap-2">
                <label className="type-ui flex flex-1 flex-col gap-1 text-xs text-ink-muted">
                  Year start
                  <input
                    type="number"
                    value={yearStart}
                    onChange={(e) => setYearStart(e.target.value)}
                    className="rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-1 text-sm text-ink"
                  />
                </label>
                <label className="type-ui flex flex-1 flex-col gap-1 text-xs text-ink-muted">
                  Year end
                  <input
                    type="number"
                    value={yearEnd}
                    onChange={(e) => setYearEnd(e.target.value)}
                    className="rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-1 text-sm text-ink"
                  />
                </label>
              </div>
              <label className="type-ui flex flex-col gap-1 text-xs text-ink-muted sm:col-span-2">
                Themes (comma-separated)
                <input
                  value={themes}
                  onChange={(e) => setThemes(e.target.value)}
                  className="rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-1 text-sm text-ink"
                />
              </label>
              <label className="type-ui flex flex-col gap-1 text-xs text-ink-muted sm:col-span-2">
                Principles (comma-separated)
                <input
                  value={principles}
                  onChange={(e) => setPrinciples(e.target.value)}
                  className="rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-1 text-sm text-ink"
                />
              </label>
              <label className="type-ui flex flex-col gap-1 text-xs text-ink-muted sm:col-span-2">
                Quotes (one per line)
                <textarea
                  value={quotes}
                  onChange={(e) => setQuotes(e.target.value)}
                  rows={3}
                  className="rounded border border-[var(--color-border)] bg-warm-white-2 px-2 py-1 text-sm text-ink"
                />
              </label>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function isHTML(s: string): boolean {
  return /^\s*</.test(s);
}

function formatRelative(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 5) return "just now";
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
