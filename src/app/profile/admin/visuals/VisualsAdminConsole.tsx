"use client";

import { useState } from "react";

type PresetOption = { key: string; label: string; brief: string };

type PromptResponse = {
  promptId: string;
  prompt: {
    subject: string;
    setting: string;
    mood: string;
    lighting: string;
    camera: string;
    styleAnchors: string[];
    negative: string[];
    aspect: string;
    intent: string;
    raw: string;
  };
  cached: boolean;
  evidence: Array<{ kind: string; title: string; score: number; slug?: string; storyId?: string }>;
  corpusVersion: string;
};

type AssetResponse = {
  assetId: string;
  url: string;
  kind: "image" | "video";
  cached: boolean;
  approved?: boolean;
};

const TARGET_KINDS = ["entity", "story", "scene", "freeform"] as const;
const ASPECTS = ["16:9", "9:16", "1:1", "4:5", "3:2"] as const;
const INTENTS = ["portrait", "establishing_shot", "scene_moment", "motion_loop"] as const;

export function VisualsAdminConsole({ presets }: { presets: PresetOption[] }) {
  const [targetKind, setTargetKind] = useState<(typeof TARGET_KINDS)[number]>("entity");
  const [targetId, setTargetId] = useState("");
  const [focus, setFocus] = useState("");
  const [stylePreset, setStylePreset] = useState(presets[0]?.key ?? "valkyrie_shipboard");
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]>("16:9");
  const [intent, setIntent] = useState<(typeof INTENTS)[number]>("establishing_shot");
  const [view, setView] = useState("");
  const [state, setState] = useState("");
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptResult, setPromptResult] = useState<PromptResponse | null>(null);
  const [assetResult, setAssetResult] = useState<AssetResponse | null>(null);
  const [approving, setApproving] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [videoResult, setVideoResult] = useState<AssetResponse | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refUploading, setRefUploading] = useState(false);
  const [refResult, setRefResult] = useState<{
    url: string;
    visionExtracted: boolean;
    identity: Record<string, unknown> | null;
  } | null>(null);

  async function handleSynthesize() {
    setBusy(true);
    setError(null);
    setAssetResult(null);
    setVideoResult(null);
    try {
      const res = await fetch("/api/visuals/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetKind,
          targetId: targetKind === "freeform" ? null : targetId.trim() || null,
          focus: focus.trim() || undefined,
          stylePreset,
          aspect,
          intent,
          view: view.trim() || undefined,
          state: state.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Synthesis failed");
      setPromptResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Synthesis failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    if (!promptResult) return;
    setBusy(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      const seedNum = seed.trim() ? Number.parseInt(seed.trim(), 10) : NaN;
      if (Number.isFinite(seedNum)) params.seed = seedNum;
      const res = await fetch("/api/visuals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: promptResult.promptId,
          provider: "imagen",
          ...(Object.keys(params).length > 0 ? { params } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setAssetResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleReferenceUpload() {
    if (!refFile) return;
    if (targetKind !== "entity" || !targetId.trim()) {
      setError("Reference upload requires targetKind=entity and a targetId.");
      return;
    }
    setRefUploading(true);
    setError(null);
    setRefResult(null);
    try {
      const fd = new FormData();
      fd.set("targetKind", "entity");
      fd.set("targetId", targetId.trim());
      fd.set("file", refFile);
      const res = await fetch("/api/visuals/reference", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reference upload failed");
      setRefResult({
        url: json.url,
        visionExtracted: !!json.visionExtracted,
        identity: json.identity ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reference upload failed");
    } finally {
      setRefUploading(false);
    }
  }

  async function handleAnimate() {
    if (!promptResult || !assetResult) return;
    setAnimating(true);
    setError(null);
    setVideoResult(null);
    try {
      const params: Record<string, unknown> = {
        promptImageUrl: assetResult.url,
        duration: 5,
      };
      const seedNum = seed.trim() ? Number.parseInt(seed.trim(), 10) : NaN;
      if (Number.isFinite(seedNum)) params.seed = seedNum;
      const res = await fetch("/api/visuals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: promptResult.promptId,
          provider: "runway",
          params,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Runway generation failed");
      setVideoResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Runway generation failed");
    } finally {
      setAnimating(false);
    }
  }

  async function handleApprove() {
    if (!assetResult) return;
    setApproving(true);
    setError(null);
    try {
      const next = !assetResult.approved;
      const res = await fetch("/api/visuals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: assetResult.assetId, approved: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Approve failed");
      setAssetResult({ ...assetResult, approved: json.approved });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
        <h2 className="type-meta mb-2 text-ink">0. Identity reference (optional)</h2>
        <p className="mb-4 max-w-prose text-xs text-ink-muted">
          Upload a reference photo or sketch for this entity to lock its canonical
          identity (face, build, signature features) before any synthesis runs.
          The vision pass extracts the fingerprint and auto-approves it, so the
          next prompt for the same <code>targetId</code> inherits these visuals
          across every style preset. Requires <strong>targetKind = entity</strong>
          and a <strong>targetId</strong> set in section 1.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setRefFile(e.target.files?.[0] ?? null)}
            className="text-sm text-ink"
          />
          <button
            onClick={handleReferenceUpload}
            disabled={!refFile || refUploading}
            className="rounded-md bg-clay px-4 py-2 text-sm font-semibold text-warm-white disabled:opacity-50"
          >
            {refUploading ? "Uploading…" : "Upload as identity reference"}
          </button>
        </div>
        {refResult && (
          <div className="mt-4">
            <img
              src={refResult.url}
              alt="Reference"
              className="max-h-[300px] w-auto rounded-md border border-[var(--color-border)]"
            />
            <p className="mt-2 text-xs text-ink-muted">
              {refResult.visionExtracted
                ? "Reference uploaded and vision fingerprint extracted. Next synthesis for this entity will use it."
                : "Reference uploaded but vision extraction failed — check server logs."}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
        <h2 className="type-meta mb-4 text-ink">1. Target & style</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Target kind">
            <select
              value={targetKind}
              onChange={(e) => setTargetKind(e.target.value as typeof targetKind)}
              className={inputCls}
            >
              {TARGET_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target id (slug or storyId)">
            <input
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder={targetKind === "entity" ? "e.g. character-slug" : "e.g. v1-c01"}
              disabled={targetKind === "freeform"}
              className={inputCls}
            />
          </Field>
          <Field label="Focus (optional)" full>
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. wide establishing shot at dusk by the river"
              className={inputCls}
            />
          </Field>
          <Field label="Style preset">
            <select
              value={stylePreset}
              onChange={(e) => setStylePreset(e.target.value)}
              className={inputCls}
            >
              {presets.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Aspect">
            <select
              value={aspect}
              onChange={(e) => setAspect(e.target.value as typeof aspect)}
              className={inputCls}
            >
              {ASPECTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Intent">
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value as typeof intent)}
              className={inputCls}
            >
              {INTENTS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>
          <Field label="View (optional, matches content/wiki/specs/<id>/views/<view>.json)">
            <input
              value={view}
              onChange={(e) => setView(e.target.value)}
              placeholder="e.g. three_quarter, orthogonal, top, side, front, ventral"
              className={inputCls}
            />
          </Field>
          <Field label="State (optional, matches content/wiki/specs/<id>/states/<state>.json)">
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. dormant, active, alignment, harmonic_jump"
              className={inputCls}
            />
          </Field>
          <Field label="Seed (optional, locks identity across re-rolls)" full>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="e.g. 42"
              className={inputCls}
            />
          </Field>
        </div>
        <button
          onClick={handleSynthesize}
          disabled={busy}
          className="mt-5 rounded-md bg-clay px-4 py-2 text-sm font-semibold text-warm-white disabled:opacity-50"
        >
          {busy ? "Working…" : "Synthesize prompt"}
        </button>
      </section>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {promptResult && (
        <section className="rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="type-meta text-ink">2. Prompt</h2>
            <span className="type-meta text-ink-ghost">
              {promptResult.cached ? "cached" : "fresh"} · corpus {promptResult.corpusVersion}
            </span>
          </div>
          <pre className="whitespace-pre-wrap rounded-md bg-warm-white-2 p-3 text-xs text-ink">
            {promptResult.prompt.raw}
          </pre>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-ink-muted">Structured fields + evidence</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-warm-white-2 p-3 text-[11px] text-ink-muted">
              {JSON.stringify({ prompt: promptResult.prompt, evidence: promptResult.evidence }, null, 2)}
            </pre>
          </details>
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="mt-4 rounded-md bg-ocean px-4 py-2 text-sm font-semibold text-warm-white disabled:opacity-50"
          >
            {busy ? "Working…" : "Generate with Imagen 4"}
          </button>
        </section>
      )}

      {assetResult && (
        <section className="rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="type-meta text-ink">3. Asset</h2>
            <span className="type-meta text-ink-ghost">
              {assetResult.cached ? "cached" : "fresh"} · {assetResult.kind}
              {assetResult.approved ? " · approved" : ""}
            </span>
          </div>
          {assetResult.kind === "image" ? (
            <img
              src={assetResult.url}
              alt="Generated"
              className="max-h-[600px] w-auto rounded-md border border-[var(--color-border)]"
            />
          ) : (
            <video src={assetResult.url} controls className="w-full rounded-md" />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={approving}
              className={`rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                assetResult.approved
                  ? "bg-clay text-warm-white"
                  : "border border-[var(--color-border)] bg-warm-white-2 text-ink hover:border-clay"
              }`}
            >
              {approving
                ? "Saving…"
                : assetResult.approved
                ? "✓ Approved (click to unapprove)"
                : "Approve as preferred"}
            </button>
            <span className="text-xs text-ink-muted">
              Approving locks identity fields (face, build, signature features) for future re-rolls of this entity, across all style presets.
            </span>
          </div>
          <p className="mt-2 break-all text-xs text-ink-muted">{assetResult.url}</p>
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <button
              onClick={handleAnimate}
              disabled={animating}
              className="rounded-md bg-ocean px-4 py-2 text-sm font-semibold text-warm-white disabled:opacity-50"
            >
              {animating ? "Animating (~60s)…" : "Animate with Runway Gen-4"}
            </button>
            <span className="ml-3 text-xs text-ink-muted">
              Uses this still as the seed frame. For richer motion direction, re-synthesize with intent=motion_loop first.
            </span>
          </div>
        </section>
      )}

      {videoResult && (
        <section className="rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="type-meta text-ink">4. Video</h2>
            <span className="type-meta text-ink-ghost">
              {videoResult.cached ? "cached" : "fresh"} · {videoResult.kind}
            </span>
          </div>
          <video
            src={videoResult.url}
            controls
            autoPlay
            loop
            muted
            className="w-full rounded-md border border-[var(--color-border)]"
          />
          <p className="mt-2 break-all text-xs text-ink-muted">{videoResult.url}</p>
        </section>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-[var(--color-border)] bg-warm-white px-3 py-2 text-sm text-ink focus:border-ocean focus:outline-none";

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="type-meta mb-1 block text-ink-ghost">{label}</span>
      {children}
    </label>
  );
}
