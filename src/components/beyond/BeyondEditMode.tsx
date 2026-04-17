"use client";

import { useEffect, useMemo, useState } from "react";
import { BeyondDraftEditor, type DraftRecord } from "./BeyondDraftEditor";
import { BeyondPeopleMode } from "./BeyondPeopleMode";

type Status = "idle" | "loading" | "error";

interface PublishedStory {
  storyId: string;
  title: string;
  volume: string;
  source: string;
  lifeStage: string;
  summary: string;
}

export function BeyondEditMode() {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [stories, setStories] = useState<PublishedStory[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [selected, setSelected] = useState<DraftRecord | null>(null);
  const [picker, setPicker] = useState<"drafts" | "published" | "biographies">("drafts");
  const [query, setQuery] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  // Warning gate: set to a story when Keith tries to open a published chapter
  // for the first time; cleared on confirm or cancel.
  const [pendingStory, setPendingStory] = useState<PublishedStory | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const [draftsRes, storiesRes] = await Promise.all([
        fetch("/api/beyond/drafts"),
        fetch("/api/beyond/published-stories"),
      ]);
      if (!draftsRes.ok) throw new Error();
      const draftsData = (await draftsRes.json()) as { drafts: DraftRecord[] };
      setDrafts(draftsData.drafts);
      if (storiesRes.ok) {
        const storiesData = (await storiesRes.json()) as {
          stories: PublishedStory[];
        };
        setStories(storiesData.stories);
      }
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const revisionByStoryId = useMemo(() => {
    const map = new Map<string, DraftRecord>();
    for (const d of drafts) {
      if (d.origin === "edit" && d.story_id) {
        map.set(d.story_id, d);
      }
    }
    return map;
  }, [drafts]);

  // ── Must be before any early return so hook count stays constant ──
  const filteredStories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter(
      (s) =>
        s.storyId.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.lifeStage.toLowerCase().includes(q)
    );
  }, [query, stories]);

  async function publishDraft(draftId: string) {
    setPublishingId(draftId);
    setPublishError(null);
    try {
      const res = await fetch(`/api/beyond/drafts/${draftId}/publish`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Publish failed");
      }
      await load();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishingId(null);
    }
  }

  async function openPublished(story: PublishedStory) {
    setPendingStory(null);
    setOpening(story.storyId);
    try {
      const res = await fetch("/api/beyond/drafts/from-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.storyId }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { draft: DraftRecord };
      setSelected(data.draft);
      await load();
    } catch {
      setStatus("error");
    } finally {
      setOpening(null);
    }
  }

  if (selected) {
    return (
      <BeyondDraftEditor
        initial={selected}
        origin="edit"
        onBack={() => {
          setSelected(null);
          load();
        }}
        onSaved={(updated) => {
          setDrafts((prev) =>
            prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
          );
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="type-display text-xl font-semibold text-ink">
            Edit a story
          </h2>
          <p className="type-ui text-sm text-ink-muted">
            Pick up a draft in progress, or open a published chapter to revise.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="type-ui text-xs text-ink-ghost transition-colors hover:text-clay"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg border border-[var(--color-border)] bg-warm-white-2 p-1">
        {(
          [
            { id: "drafts", label: `Drafts (${drafts.length})` },
            { id: "published", label: `Published Stories (${stories.length})` },
            { id: "biographies", label: "Biographies" },
          ] as { id: "drafts" | "published" | "biographies"; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPicker(tab.id)}
            className={`type-ui flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              picker === tab.id
                ? "bg-warm-white text-clay shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {picker !== "biographies" && status === "loading" && (
        <p className="type-ui text-sm text-ink-ghost">Loading…</p>
      )}
      {picker !== "biographies" && status === "error" && (
        <p className="type-ui text-sm text-red-800">
          Could not load. Try refresh.
        </p>
      )}

      {status === "idle" && picker === "drafts" && (
        <>
          {drafts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-warm-white p-6 text-center">
              <p className="type-ui text-sm text-ink-muted">
                No drafts yet. Switch to{" "}
                <span className="font-medium">Write</span> or{" "}
                <span className="font-medium">Chat</span> to start one — or pick
                a <span className="font-medium">Published chapter</span> above
                to revise.
              </p>
            </div>
          ) : (
            (() => {
              const ready = drafts.filter((d) => d.status === "approved");
              const inProgress = drafts.filter((d) => d.status === "draft");
              return (
                <div className="space-y-6">
                  {publishError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      {publishError}
                    </div>
                  )}

                  {ready.length > 0 && (
                    <section>
                      <div className="mb-2 flex items-baseline justify-between">
                        <h3 className="type-ui text-sm font-semibold text-clay">
                          ✓ Ready to publish
                          <span className="ml-2 font-normal text-ink-ghost">
                            ({ready.length})
                          </span>
                        </h3>
                        <p className="type-ui text-xs text-ink-ghost">
                          Marked ready — one click to go live
                        </p>
                      </div>
                      <ul className="space-y-2">
                        {ready.map((d) => (
                          <li
                            key={d.id}
                            className="rounded-lg border border-clay-border p-3"
                            style={{
                              backgroundColor: "rgba(184, 67, 54, 0.08)",
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => setSelected(d)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <span className="type-ui block truncate font-medium text-ink">
                                  {d.title || "Untitled"}
                                </span>
                                <p className="type-ui mt-0.5 line-clamp-1 text-xs text-ink-muted">
                                  {stripHTML(d.body || "").slice(0, 160)}
                                </p>
                                {d.updated_at && (
                                  <p className="type-ui mt-1 text-[11px] text-ink-ghost">
                                    Marked ready{" "}
                                    {new Date(d.updated_at).toLocaleString()}
                                    {d.story_id ? " · revision" : ""}
                                  </p>
                                )}
                              </button>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => publishDraft(d.id)}
                                  disabled={publishingId === d.id}
                                  className="type-ui rounded bg-clay px-3 py-1.5 text-xs font-medium text-warm-white hover:bg-clay-mid disabled:opacity-50"
                                >
                                  {publishingId === d.id
                                    ? "Publishing…"
                                    : d.story_id
                                      ? "Publish revision"
                                      : "Publish"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelected(d)}
                                  className="type-ui text-[11px] text-ink-ghost hover:text-clay"
                                >
                                  Review first
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {inProgress.length > 0 && (
                    <section>
                      {ready.length > 0 && (
                        <h3 className="type-ui mb-2 text-sm font-semibold text-ink-muted">
                          In progress
                          <span className="ml-2 font-normal text-ink-ghost">
                            ({inProgress.length})
                          </span>
                        </h3>
                      )}
                      <ul className="space-y-2">
                        {inProgress.map((d) => (
                          <li key={d.id}>
                            <button
                              type="button"
                              onClick={() => setSelected(d)}
                              className="flex w-full flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-warm-white p-3 text-left transition-colors hover:border-clay-border"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="type-ui truncate font-medium text-ink">
                                  {d.title || "Untitled"}
                                </span>
                                <span className="type-ui shrink-0 text-xs text-ink-ghost">
                                  Draft
                                  {d.origin ? ` · ${d.origin}` : ""}
                                </span>
                              </div>
                              <p className="type-ui line-clamp-2 text-xs text-ink-muted">
                                {stripHTML(d.body || "").slice(0, 180)}
                              </p>
                              {d.updated_at && (
                                <p className="type-ui text-[11px] text-ink-ghost">
                                  Updated{" "}
                                  {new Date(d.updated_at).toLocaleString()}
                                </p>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {ready.length === 0 && inProgress.length === 0 && (
                    <p className="type-ui text-sm text-ink-ghost">
                      Nothing in progress right now.
                    </p>
                  )}
                </div>
              );
            })()
          )}
        </>
      )}

      {picker === "biographies" && <BeyondPeopleMode />}

      {status === "idle" && picker === "published" && (
        <div className="space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by id, title, or life stage…"
            className="type-ui w-full rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 text-sm text-ink placeholder:text-ink-ghost"
          />

          {/* ── Warning gate ── */}
          {pendingStory && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <p className="type-ui text-sm font-medium text-amber-900">
                This is original memoir material
              </p>
              <p className="type-ui mt-1 text-xs text-amber-800">
                Creating a revision won&apos;t change the published version — it
                opens a new draft for your review. You can save, discard, or
                submit it later.
              </p>
              <p className="type-ui mt-2 text-xs font-semibold text-amber-900">
                {pendingStory.storyId} · {pendingStory.title}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openPublished(pendingStory)}
                  className="type-ui rounded bg-clay px-3 py-1.5 text-xs font-medium text-warm-white hover:bg-clay-mid"
                >
                  Yes, open for revision
                </button>
                <button
                  type="button"
                  onClick={() => setPendingStory(null)}
                  className="type-ui rounded border border-[var(--color-border)] bg-warm-white px-3 py-1.5 text-xs text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {filteredStories.length === 0 ? (
            <p className="type-ui text-sm text-ink-ghost">No matches.</p>
          ) : (
            <ul className="space-y-2">
              {filteredStories.map((s, idx) => {
                const revision = revisionByStoryId.get(s.storyId);
                const isPending = pendingStory?.storyId === s.storyId;
                return (
                  // Use idx suffix to guard against duplicate storyId in source data
                  <li key={`${s.storyId}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (revision) {
                          setSelected(revision);
                        } else {
                          // Show warning before creating a brand-new revision
                          setPendingStory(s);
                        }
                      }}
                      disabled={opening === s.storyId}
                      className={`flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors disabled:opacity-60 ${
                        isPending
                          ? "border-amber-300 bg-amber-50"
                          : "border-[var(--color-border)] bg-warm-white hover:border-clay-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="type-ui truncate font-medium text-ink">
                          <span className="mr-2 rounded bg-warm-white-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                            {s.storyId}
                          </span>
                          {s.title}
                        </span>
                        <span className="type-ui shrink-0 text-xs text-ink-ghost">
                          {opening === s.storyId
                            ? "Opening…"
                            : revision
                              ? "Revision in progress"
                              : isPending
                                ? "⚠ Confirm above"
                                : "Open to revise"}
                        </span>
                      </div>
                      {s.summary && (
                        <p className="type-ui line-clamp-2 text-xs text-ink-muted">
                          {s.summary}
                        </p>
                      )}
                      <p className="type-ui text-[11px] text-ink-ghost">
                        {s.volume} · {s.source}
                        {s.lifeStage ? ` · ${s.lifeStage}` : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function stripHTML(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
