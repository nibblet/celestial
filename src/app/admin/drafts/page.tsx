"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { getContributionLabel } from "@/lib/tell/contribution";

interface Draft {
  id: string;
  session_id: string | null;
  title: string;
  body: string;
  life_stage: string | null;
  year_start: number | null;
  year_end: number | null;
  themes: string[];
  principles: string[];
  quotes: string[];
  status: string;
  story_id: string | null;
  origin: "chat" | "write" | "edit" | null;
  created_at: string;
  volume: string;
  contribution_mode: "tell" | "beyond";
  contributor: { display_name: string } | null;
}

export default function AdminDraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/drafts");
      if (res.status === 403) {
        setError("Admin access required.");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to load drafts");
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch {
      setError("Failed to load drafts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  async function publishDraft(draftId: string) {
    setPublishing(draftId);
    try {
      const res = await fetch("/api/admin/drafts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      await loadDrafts();
    } catch {
      setError("Failed to publish draft.");
    } finally {
      setPublishing(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-8">
        <p className="text-sm text-ink-ghost">Loading drafts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-8">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6">
      <h1 className="type-page-title text-2xl mb-1">Story Drafts</h1>
      <p className="type-ui text-ink-muted text-sm mb-6">
        Review and publish both family Tell submissions and Keith Beyond drafts.
      </p>

      {drafts.length === 0 && (
        <p className="text-sm text-ink-ghost">No drafts yet.</p>
      )}

      <div className="space-y-4">
        {drafts.map((d) => (
          <div
            key={d.id}
            className="rounded-lg border border-[var(--color-border)] bg-warm-white p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-ink">{d.title}</h3>
                <p className="type-ui text-xs text-ink-muted mt-0.5">
                  By {d.contributor?.display_name || "Unknown"} &middot;{" "}
                  {new Date(d.created_at).toLocaleDateString()} &middot;{" "}
                  <span
                    className={
                      d.status === "published"
                        ? "text-green-700"
                        : d.status === "approved"
                          ? "text-blue-700"
                          : "text-clay"
                    }
                  >
                    {d.status}
                  </span>
                  {d.story_id && (
                    <span className="ml-1 text-ink-ghost">({d.story_id})</span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-burgundy-light px-2 py-0.5 text-[0.625rem] font-medium text-burgundy">
                    {getContributionLabel(d.contribution_mode)}
                  </span>
                  <span className="rounded-full bg-ocean-pale px-2 py-0.5 text-[0.625rem] font-medium text-ocean">
                    {d.volume}
                  </span>
                  {d.origin && (
                    <span className="rounded-full bg-clay/10 px-2 py-0.5 text-[0.625rem] font-medium text-clay">
                      {d.origin === "edit" && d.story_id
                        ? `revision of ${d.story_id}`
                        : d.origin}
                    </span>
                  )}
                </div>
                {d.themes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {d.themes.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-clay/10 px-2 py-0.5 text-[0.625rem] text-clay"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() =>
                    setExpanded(expanded === d.id ? null : d.id)
                  }
                  className="type-ui text-xs text-ink-muted hover:text-ink"
                >
                  {expanded === d.id ? "Collapse" : "Preview"}
                </button>
                {(d.status === "draft" || d.status === "approved") && (
                  <button
                    onClick={() => publishDraft(d.id)}
                    disabled={publishing === d.id}
                    className="type-ui rounded bg-clay px-3 py-1 text-xs font-medium text-warm-white hover:bg-clay-mid disabled:opacity-50"
                    title={d.status === "approved" ? "Publish this approved revision" : "Publish this draft"}
                  >
                    {publishing === d.id
                      ? "Publishing..."
                      : d.status === "approved"
                        ? "Publish revision"
                        : "Publish"}
                  </button>
                )}
              </div>
            </div>

            {expanded === d.id && (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <div className="prose prose-story prose-sm max-w-none">
                  {isHTML(d.body) ? (
                    <div dangerouslySetInnerHTML={{ __html: d.body }} />
                  ) : (
                    <ReactMarkdown>{d.body}</ReactMarkdown>
                  )}
                </div>
                {d.principles.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-ink-muted mb-1">
                      Principles
                    </p>
                    <ul className="list-disc list-inside text-xs text-ink-muted space-y-0.5">
                      {d.principles.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {d.quotes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-ink-muted mb-1">
                      Quotes
                    </p>
                    {d.quotes.map((q, i) => (
                      <blockquote
                        key={i}
                        className="border-l-2 border-clay pl-3 text-xs italic text-ink-muted my-1"
                      >
                        {q}
                      </blockquote>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function isHTML(s: string): boolean {
  return /^\s*</.test(s);
}
