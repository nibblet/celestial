"use client";

import { useEffect, useState } from "react";
import type { ReferenceImage } from "@/lib/visuals/specs/references";

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
  referenceImages?: ReferenceImage[];
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

type RecentItem = {
  assetId: string;
  promptId: string;
  kind: "image" | "video";
  url: string;
  approved: boolean;
  provider: string;
  providerModel: string;
  createdAt: string;
  targetKind: string;
  targetId: string | null;
  prompt: PromptResponse["prompt"];
  referenceImages: ReferenceImage[];
};

/** Studio state survives navigating away (per browser). */
const STORAGE_KEY = "celestial.visualsStudio.v1";

const TARGET_KINDS = ["entity", "story", "scene", "freeform"] as const;
const ASPECTS = ["16:9", "9:16", "1:1", "4:5", "3:2", "2:3"] as const; // 2:3 = book cover
const INTENTS = ["portrait", "establishing_shot", "scene_moment", "motion_loop"] as const;
type VideoModel =
  | "gen4.5"
  | "gen4_turbo"
  | "klingO3_standard"
  | "klingO3_pro"
  | "veo3.1"
  | "seedance2_5"
  | "kling_4";
const VIDEO_MODELS: Array<{ key: VideoModel; label: string; short: string; durations: number[] }> = [
  { key: "gen4.5", label: "Gen-4.5 (best, ~$0.12/s)", short: "Gen-4.5", durations: [3, 5, 8, 10] },
  { key: "gen4_turbo", label: "Gen-4 Turbo (fast, ~$0.05/s)", short: "Gen-4 Turbo", durations: [5, 10] },
  {
    key: "klingO3_standard",
    label: "Kling O3 Standard + face refs, experimental (720p, ~$0.13/s)",
    short: "Kling O3",
    durations: [3, 5, 8, 10, 15],
  },
  {
    key: "klingO3_pro",
    label: "Kling O3 Pro + face refs, experimental (1080p, ~$0.17/s)",
    short: "Kling O3 Pro",
    durations: [3, 5, 8, 10, 15],
  },
  // Other labs' models through the same Runway key. All 1080p, start + end frames.
  { key: "veo3.1", label: "Veo 3.1 (Google): photoreal, 1080p, end frame", short: "Veo 3.1", durations: [4, 6, 8] },
  {
    key: "seedance2_5",
    label: "Seedance 2.5 (ByteDance): top-ranked i2v, 1080p, end frame",
    short: "Seedance 2.5",
    durations: [4, 5, 6, 8, 10, 15],
  },
  {
    key: "kling_4",
    label: "Kling 4: people in motion, 1080p, face refs, end frame",
    short: "Kling 4",
    durations: [3, 5, 8, 10, 15],
  },
];
/** Models that take character portraits as references. */
const isKling = (m: VideoModel) => m.startsWith("klingO3") || m === "kling_4";
/** Models that take an end frame (Gen-4 models take a start frame only). */
const takesEndFrame = (m: VideoModel) => !m.startsWith("gen4");

const IMAGE_PROVIDERS = [
  { key: "openai", label: "OpenAI GPT Image (attaches references)" },
  { key: "imagen", label: "Google Nano Banana 2.1 (text only)" },
] as const;

const OPENAI_IMAGE_MODELS = [
  { key: "gpt-image-2", label: "gpt-image-2" },
  { key: "gpt-image-2.5-sunburst", label: "gpt-image-2.5-sunburst" },
] as const;

export function VisualsAdminConsole({ presets }: { presets: PresetOption[] }) {
  const [targetKind, setTargetKind] = useState<(typeof TARGET_KINDS)[number]>("entity");
  const [targetId, setTargetId] = useState("");
  const [focus, setFocus] = useState("");
  const [stylePreset, setStylePreset] = useState(presets[0]?.key ?? "valkyrie_shipboard");
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]>("16:9");
  const [intent, setIntent] = useState<(typeof INTENTS)[number]>("establishing_shot");
  const [view, setView] = useState("");
  const [state, setState] = useState("");
  const [castText, setCastText] = useState("");
  // Operator-picked reference images (e.g. keyframe partners), sent with
  // the next prompt so the generator keeps the same room and framing.
  const [extraRefs, setExtraRefs] = useState<Array<{ path: string; label: string }>>([]);
  const [extraRefUrl, setExtraRefUrl] = useState("");
  const [endFrame, setEndFrame] = useState("");
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptResult, setPromptResult] = useState<PromptResponse | null>(null);
  const [assetResult, setAssetResult] = useState<AssetResponse | null>(null);
  const [approving, setApproving] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [videoResult, setVideoResult] = useState<AssetResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [imageProvider, setImageProvider] =
    useState<(typeof IMAGE_PROVIDERS)[number]["key"]>("openai");
  const [openaiModel, setOpenaiModel] =
    useState<(typeof OPENAI_IMAGE_MODELS)[number]["key"]>("gpt-image-2.5-sunburst");
  const [attachRefs, setAttachRefs] = useState(true);
  const [specRefs, setSpecRefs] = useState<ReferenceImage[]>([]);
  const [specRefsStatus, setSpecRefsStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [startFrame, setStartFrame] = useState("");
  const [videoModel, setVideoModel] = useState<VideoModel>("gen4.5");
  const [sendFaceRefs, setSendFaceRefs] = useState(true);
  const [spectacle, setSpectacle] = useState(false);
  const [videoDuration, setVideoDuration] = useState(5);
  const [motionText, setMotionText] = useState("");
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refUploading, setRefUploading] = useState(false);
  const [refResult, setRefResult] = useState<{
    url: string;
    visionExtracted: boolean;
    identity: Record<string, unknown> | null;
  } | null>(null);

  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [recentStatus, setRecentStatus] = useState<"idle" | "loading" | "error">("idle");
  const [restored, setRestored] = useState(false);
  const [recentLimit, setRecentLimit] = useState(24);
  const [recentKind, setRecentKind] = useState<"all" | "image" | "video">("all");
  const [recentQuery, setRecentQuery] = useState("");

  async function loadRecent(limit = recentLimit, kind = recentKind) {
    setRecentStatus("loading");
    try {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (kind !== "all") qs.set("kind", kind);
      const res = await fetch(`/api/visuals/recent?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setRecent(json.items ?? []);
      setRecentStatus("idle");
    } catch {
      setRecentStatus("error");
    }
  }

  // Restore the last session's studio state once, after mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const v = JSON.parse(raw) as Record<string, unknown>;
        const str = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : undefined);
        if (str("targetKind")) setTargetKind(str("targetKind") as (typeof TARGET_KINDS)[number]);
        if (str("targetId") !== undefined) setTargetId(str("targetId")!);
        if (str("focus") !== undefined) setFocus(str("focus")!);
        if (str("stylePreset")) setStylePreset(str("stylePreset")!);
        if (str("aspect")) setAspect(str("aspect") as (typeof ASPECTS)[number]);
        if (str("intent")) setIntent(str("intent") as (typeof INTENTS)[number]);
        if (str("view") !== undefined) setView(str("view")!);
        if (str("state") !== undefined) setState(str("state")!);
        if (str("castText") !== undefined) setCastText(str("castText")!);
        if (str("startFrame") !== undefined) setStartFrame(str("startFrame")!);
        if (str("endFrame") !== undefined) setEndFrame(str("endFrame")!);
        if (str("motionText") !== undefined) setMotionText(str("motionText")!);
        if (str("videoModel")) setVideoModel(str("videoModel") as VideoModel);
        if (typeof v.videoDuration === "number") setVideoDuration(v.videoDuration);
        if (typeof v.spectacle === "boolean") setSpectacle(v.spectacle);
        if (Array.isArray(v.extraRefs)) setExtraRefs(v.extraRefs as typeof extraRefs);
        if (v.promptResult) setPromptResult(v.promptResult as PromptResponse);
        if (v.assetResult) setAssetResult(v.assetResult as AssetResponse);
        if (v.videoResult) setVideoResult(v.videoResult as AssetResponse);
      }
    } catch {
      // Corrupt or blocked storage: start fresh.
    }
    setRestored(true);
    void loadRecent();
    // Runs once on mount; later loads are triggered by the controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          targetKind, targetId, focus, stylePreset, aspect, intent, view, state, castText,
          startFrame, endFrame, motionText, videoModel, videoDuration, spectacle, extraRefs,
          promptResult, assetResult, videoResult,
        }),
      );
    } catch {
      // Storage full or blocked; the Recent strip still has everything.
    }
  }, [
    restored, targetKind, targetId, focus, stylePreset, aspect, intent, view, state, castText,
    startFrame, endFrame, motionText, videoModel, videoDuration, spectacle, extraRefs,
    promptResult, assetResult, videoResult,
  ]);

  function openRecent(item: RecentItem) {
    setError(null);
    setPromptResult({
      promptId: item.promptId,
      prompt: item.prompt,
      cached: true,
      referenceImages: item.referenceImages,
      evidence: [],
      corpusVersion: "",
    });
    if (TARGET_KINDS.includes(item.targetKind as (typeof TARGET_KINDS)[number])) {
      setTargetKind(item.targetKind as (typeof TARGET_KINDS)[number]);
    }
    setTargetId(item.targetId ?? "");
    const asset = { assetId: item.assetId, url: item.url, kind: item.kind, cached: true, approved: item.approved };
    if (item.kind === "image") {
      setAssetResult(asset);
      setVideoResult(null);
      setStartFrame(item.url);
    } else {
      setVideoResult(asset);
    }
    setEndFrame("");
  }

  function addExtraRef(path: string) {
    setExtraRefs((refs) =>
      refs.some((r) => r.path === path) || refs.length >= 4
        ? refs
        : [...refs, { path, label: `Keyframe ${refs.length + 1}` }],
    );
  }

  useEffect(() => {
    if (targetKind !== "entity" || !targetId.trim()) {
      setSpecRefs([]);
      setSpecRefsStatus("idle");
      return;
    }
    const slug = targetId.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSpecRefsStatus("loading");
      try {
        const qs = new URLSearchParams({ targetId: slug });
        if (view.trim()) qs.set("view", view.trim());
        if (state.trim()) qs.set("state", state.trim());
        if (castText.trim()) qs.set("cast", castText.trim());
        const res = await fetch(`/api/visuals/references?${qs}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load references");
        setSpecRefs(json.referenceImages ?? []);
        setSpecRefsStatus("ready");
      } catch (err) {
        if (controller.signal.aborted) return;
        setSpecRefs([]);
        setSpecRefsStatus("ready");
        console.warn("[visuals] reference preview", err);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [targetKind, targetId, view, state, castText]);

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
          cast: castText.trim() || undefined,
          extraReferences: extraRefs.length ? extraRefs : undefined,
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

  async function handleCopyPrompt() {
    if (!promptResult) return;
    try {
      await navigator.clipboard.writeText(promptResult.prompt.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to the clipboard. Select the prompt text and copy it manually.");
    }
  }

  function handleDownloadReferences() {
    for (const ref of promptResult?.referenceImages ?? []) {
      const a = document.createElement("a");
      a.href = ref.path;
      a.download = ref.path.split("/").pop() ?? "reference.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  async function handleGenerate(opts?: { force?: boolean }) {
    if (!promptResult) return;
    setBusy(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      if (imageProvider === "imagen") {
        // Nano Banana accepts seed in our normalizeParams cache key only.
        const seedNum = seed.trim() ? Number.parseInt(seed.trim(), 10) : NaN;
        if (Number.isFinite(seedNum)) params.seed = seedNum;
      }
      if (imageProvider === "openai") {
        params.model = openaiModel;
      }
      const refs = promptResult.referenceImages ?? specRefs;
      if (imageProvider === "openai" && attachRefs && refs.length > 0) {
        params.referenceImages = refs.map((r) => r.path);
      }
      const res = await fetch("/api/visuals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: promptResult.promptId,
          provider: imageProvider,
          force: !!opts?.force,
          ...(Object.keys(params).length > 0 ? { params } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setAssetResult(json);
      void loadRecent();
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

  // Start-frame choices: the still just generated (if any), then the
  // spec's identity/resemblance portraits (approved looks).
  const startFrameOptions: Array<{ value: string; label: string }> = [
    ...(assetResult?.kind === "image"
      ? [{ value: assetResult.url, label: "The still generated above" }]
      : []),
    ...(promptResult?.referenceImages ?? [])
      .filter((r) => r.role === "identity" || r.role === "resemblance")
      .map((r) => ({ value: r.path, label: r.label })),
  ];
  for (const r of extraRefs) {
    if (!startFrameOptions.some((o) => o.value === r.path)) {
      startFrameOptions.push({ value: r.path, label: r.label });
    }
  }
  const effectiveStartFrame = startFrame || startFrameOptions[0]?.value || "";
  const endFrameAllowed = takesEndFrame(videoModel);
  // Kling O3 can carry identity portraits next to the start frame so a face
  // revealed mid-shot stays on-model (start frame + up to 6 refs).
  const faceRefs = (promptResult?.referenceImages ?? [])
    .filter((r) => r.role === "identity" && r.path !== effectiveStartFrame)
    .slice(0, 6);

  async function handleAnimate() {
    if (!promptResult || !effectiveStartFrame) return;
    setAnimating(true);
    setError(null);
    setVideoResult(null);
    try {
      const params: Record<string, unknown> = {
        promptImageUrl: effectiveStartFrame,
        model: videoModel,
        duration: videoDuration,
      };
      if (motionText.trim()) params.motionText = motionText.trim();
      if (spectacle) params.restraint = false;
      if (endFrame && endFrameAllowed && endFrame !== effectiveStartFrame) {
        params.endFrameUrl = endFrame;
      }
      if (isKling(videoModel) && sendFaceRefs && faceRefs.length > 0) {
        params.references = faceRefs.map((r) => ({ path: r.path, label: r.label }));
      }
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
      void loadRecent();
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

  const q = recentQuery.trim().toLowerCase();
  const filteredRecent = q
    ? recent.filter((item) =>
        [item.targetId ?? "", item.targetKind, JSON.stringify(item.prompt)].join(" ").toLowerCase().includes(q),
      )
    : recent;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="type-meta text-ink">Recent generations</h2>
          <button
            type="button"
            onClick={() => void loadRecent()}
            className="text-xs text-ink-muted hover:text-ink"
          >
            {recentStatus === "loading" ? "Loading…" : "Refresh"}
          </button>
        </div>
        <p className="mb-3 max-w-prose text-xs text-ink-muted">
          Every still and clip is saved. <strong>Open</strong> loads one back into the studio
          (its prompt, so you can animate or approve it); <strong>+ Ref</strong> adds a still to the
          extra references, where it also becomes a start or end frame option.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={recentQuery}
            onChange={(e) => {
              setRecentQuery(e.target.value);
              // Searching looks through everything, not just the newest few.
              if (e.target.value.trim() && recentLimit < 200) {
                setRecentLimit(200);
                void loadRecent(200);
              }
            }}
            placeholder="Search: target, character or prompt words (e.g. thane, hull)"
            className="min-w-[16rem] flex-1 rounded-md border border-[var(--color-border)] bg-warm-white px-2 py-1 text-xs text-ink"
          />
          <select
            value={recentKind}
            onChange={(e) => {
              const k = e.target.value as typeof recentKind;
              setRecentKind(k);
              void loadRecent(recentLimit, k);
            }}
            className="rounded-md border border-[var(--color-border)] bg-warm-white px-2 py-1 text-xs text-ink"
          >
            <option value="all">Stills and clips</option>
            <option value="image">Stills only</option>
            <option value="video">Clips only</option>
          </select>
        </div>
        {recentStatus === "error" && (
          <p className="text-xs text-red-700">Couldn&apos;t load recent generations.</p>
        )}
        {recentQuery.trim() && filteredRecent.length === 0 && recentStatus !== "loading" && (
          <p className="text-xs text-ink-muted">Nothing matches &ldquo;{recentQuery.trim()}&rdquo;.</p>
        )}
        {filteredRecent.length > 0 && (
          <ul className="flex gap-3 overflow-x-auto pb-2">
            {filteredRecent.map((item) => {
              const isOpen =
                item.assetId === assetResult?.assetId || item.assetId === videoResult?.assetId;
              const isRef = extraRefs.some((r) => r.path === item.url);
              return (
                <li
                  key={item.assetId}
                  className={`w-40 shrink-0 rounded-md border p-1.5 ${isOpen ? "border-clay" : "border-[var(--color-border)]"}`}
                >
                  {item.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" className="h-24 w-full rounded object-cover" />
                  ) : (
                    <video src={item.url} muted preload="metadata" className="h-24 w-full rounded object-cover" />
                  )}
                  <div className="mt-1 truncate text-[11px] font-semibold text-ink" title={item.targetId ?? item.targetKind}>
                    {item.targetId ?? item.targetKind}
                    {item.approved ? " ✓" : ""}
                  </div>
                  <div className="text-[10px] text-ink-ghost">
                    {item.kind} · {new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => openRecent(item)}
                      className="flex-1 rounded border border-[var(--color-border)] px-1 py-0.5 text-[11px] font-semibold text-ink hover:border-clay"
                    >
                      Open
                    </button>
                    {item.kind === "image" && (
                      <button
                        type="button"
                        disabled={isRef || extraRefs.length >= 4}
                        onClick={() => addExtraRef(item.url)}
                        className="flex-1 rounded border border-[var(--color-border)] px-1 py-0.5 text-[11px] font-semibold text-ink hover:border-clay disabled:opacity-50"
                      >
                        {isRef ? "✓ Ref" : "+ Ref"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!recentQuery.trim() && recent.length >= recentLimit && recentLimit < 200 && (
          <button
            type="button"
            onClick={() => {
              const next = Math.min(200, recentLimit + 24);
              setRecentLimit(next);
              void loadRecent(next);
            }}
            className="mt-1 text-xs font-semibold text-ink-muted hover:text-ink"
          >
            Show older generations →
          </button>
        )}
      </section>

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
          <Field label="Characters in shot (optional: slug:state, comma-separated)">
            <input
              value={castText}
              onChange={(e) => setCastText(e.target.value)}
              placeholder="e.g. galen-voss:mars_surface, aven-voss:mars_surface"
              className={inputCls}
            />
          </Field>
          <Field label="Extra reference images (keyframes: same room and camera, change only what Focus says)">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={extraRefUrl}
                  onChange={(e) => setExtraRefUrl(e.target.value)}
                  placeholder="Paste an image URL, or use the button under a generated still"
                  className={inputCls}
                />
                <button
                  type="button"
                  disabled={!extraRefUrl.trim() || extraRefs.length >= 4}
                  onClick={() => {
                    const path = extraRefUrl.trim();
                    setExtraRefs((refs) =>
                      refs.some((r) => r.path === path)
                        ? refs
                        : [...refs, { path, label: `Keyframe ${refs.length + 1}` }],
                    );
                    setExtraRefUrl("");
                  }}
                  className="rounded-md border border-[var(--color-border)] px-3 text-xs font-semibold text-ink disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {extraRefs.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {extraRefs.map((r) => (
                    <li key={r.path} className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] p-1 pr-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.path} alt={r.label} className="h-10 w-14 rounded object-cover" />
                      <span className="text-[11px] text-ink">{r.label}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${r.label}`}
                        onClick={() => setExtraRefs((refs) => refs.filter((x) => x.path !== r.path))}
                        className="text-xs text-ink-muted hover:text-ink"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>
          <Field label="Seed (optional, locks identity across re-rolls)">
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="e.g. 42"
              className={inputCls}
            />
          </Field>
          <Field label="Image generator">
            <select
              value={imageProvider}
              onChange={(e) =>
                setImageProvider(e.target.value as (typeof IMAGE_PROVIDERS)[number]["key"])
              }
              className={inputCls}
            >
              {IMAGE_PROVIDERS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          {imageProvider === "openai" && (
            <Field label="OpenAI image model">
              <select
                value={openaiModel}
                onChange={(e) =>
                  setOpenaiModel(e.target.value as (typeof OPENAI_IMAGE_MODELS)[number]["key"])
                }
                className={inputCls}
              >
                {OPENAI_IMAGE_MODELS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {targetKind === "entity" && targetId.trim() && (
          <div className="mt-5 border-t border-[var(--color-border)] pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="type-meta text-ink">Spec reference photos</h3>
              {imageProvider === "openai" && specRefs.length > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={attachRefs}
                    onChange={(e) => setAttachRefs(e.target.checked)}
                  />
                  Attach on generate ({specRefs.length})
                </label>
              )}
            </div>
            {imageProvider === "openai" && !attachRefs && specRefs.length > 0 && (
              <p className="mt-2 text-[11px] text-ink-muted">
                Images won&apos;t be sent, but the prompt text still names them. To drop an item
                entirely, remove it from the spec&apos;s reference_images.
              </p>
            )}
            {specRefsStatus === "loading" && (
              <p className="mt-2 text-xs text-ink-ghost">Loading references…</p>
            )}
            {specRefsStatus === "ready" && specRefs.length === 0 && (
              <p className="mt-2 text-xs text-ink-ghost">
                No <code>reference_images</code> in specs for <code>{targetId.trim()}</code>.
              </p>
            )}
            {specRefs.length > 0 && (
              <ReferenceThumbs refs={specRefs} />
            )}
          </div>
        )}

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
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-ink"
            >
              {copied ? "Copied ✓" : "Copy prompt"}
            </button>
            {(promptResult.referenceImages?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={handleDownloadReferences}
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-ink"
              >
                Download all references ({promptResult.referenceImages!.length})
              </button>
            )}
          </div>
          {(promptResult.referenceImages?.length ?? 0) > 0 ? (
            <div className="mt-4">
              <h3 className="type-meta text-ink">Attach these reference images</h3>
              <p className="mt-1 text-xs text-ink-muted">
                From the spec. OpenAI can attach them automatically; or download for ChatGPT /
                Gemini / Grok. Use the identity image as Runway&apos;s start frame.
              </p>
              <ReferenceThumbs refs={promptResult.referenceImages!} />
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-ghost">No reference images in this spec.</p>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-ink-muted">Structured fields + evidence</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-warm-white-2 p-3 text-[11px] text-ink-muted">
              {JSON.stringify({ prompt: promptResult.prompt, evidence: promptResult.evidence }, null, 2)}
            </pre>
          </details>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs text-ink-muted">
              Generator:{" "}
              <strong className="text-ink">
                {imageProvider === "openai" ? `OpenAI · ${openaiModel}` : "Nano Banana 2.1"}
              </strong>
              {imageProvider === "openai" &&
              attachRefs &&
              (promptResult.referenceImages?.length ?? 0) > 0
                ? ` · attaching ${promptResult.referenceImages!.length} ref(s)`
                : ""}
            </span>
            {imageProvider === "openai" &&
              !attachRefs &&
              (promptResult.referenceImages?.length ?? 0) > 0 && (
                <span className="text-[11px] text-ink-muted">
                  Images won&apos;t be sent, but the prompt text still names them. To drop an item
                  entirely, remove it from the spec&apos;s reference_images.
                </span>
              )}
            <button
              onClick={() => handleGenerate()}
              disabled={busy}
              className="rounded-md bg-ocean px-4 py-2 text-sm font-semibold text-warm-white disabled:opacity-50"
            >
              {busy
                ? "Working…"
                : imageProvider === "openai"
                  ? "Generate with OpenAI"
                  : "Generate with Nano Banana"}
            </button>
            <button
              type="button"
              onClick={() => handleGenerate({ force: true })}
              disabled={busy}
              className="rounded-md border border-[var(--color-border)] bg-warm-white-2 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
              title="Ignore the asset cache and call the image provider again"
            >
              {busy ? "Working…" : "Regenerate (ignore cache)"}
            </button>
          </div>
        </section>
      )}

      {assetResult && (
        <section className="rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="type-meta text-ink">3. Asset</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-meta text-ink-ghost">
                {assetResult.cached ? "cached" : "fresh"} · {assetResult.kind}
                {assetResult.approved ? " · approved" : ""}
              </span>
              <button
                type="button"
                onClick={() => handleGenerate({ force: true })}
                disabled={busy}
                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink disabled:opacity-50"
              >
                Regenerate
              </button>
            </div>
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
            {assetResult.kind === "image" && (
              <button
                type="button"
                onClick={() => addExtraRef(assetResult.url)}
                className="rounded-md border border-[var(--color-border)] bg-warm-white-2 px-4 py-2 text-sm font-semibold text-ink hover:border-clay"
              >
                {extraRefs.some((r) => r.path === assetResult.url)
                  ? "✓ Added as reference"
                  : "Use as reference for the next prompt"}
              </button>
            )}
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
        </section>
      )}

      {promptResult && (
        <section className="rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
          <h2 className="type-meta text-ink">4. Animate with Runway</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Image-to-video from a start frame. Identity comes from the frame; the motion text below
            (or the prompt&apos;s motion fields, if you synthesized with intent=motion_loop) drives
            the movement.
          </p>
          {startFrameOptions.length === 0 ? (
            <p className="mt-3 text-xs text-ink-ghost">
              No start frame yet: generate a still above, or add an identity portrait to the spec.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-[auto,1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={effectiveStartFrame}
                alt="Start frame"
                className="h-40 w-32 rounded-md border border-[var(--color-border)] object-cover"
              />
              <div className="flex flex-col gap-2">
                <label className="text-xs text-ink-muted">
                  Start frame
                  <select
                    value={effectiveStartFrame}
                    onChange={(e) => setStartFrame(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-warm-white px-2 py-1.5 text-sm text-ink"
                  >
                    {startFrameOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-ink-muted">
                  End frame (optional; the clip animates from start to end)
                  <select
                    value={endFrameAllowed ? endFrame : ""}
                    disabled={!endFrameAllowed}
                    onChange={(e) => setEndFrame(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-warm-white px-2 py-1.5 text-sm text-ink disabled:opacity-50"
                  >
                    <option value="">{endFrameAllowed ? "None" : "Not on Gen-4 models"}</option>
                    {startFrameOptions
                      .filter((o) => o.value !== effectiveStartFrame)
                      .map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-3">
                  <label className="text-xs text-ink-muted">
                    Model
                    <select
                      value={videoModel}
                      onChange={(e) => {
                        const m = e.target.value as VideoModel;
                        setVideoModel(m);
                        const allowed = VIDEO_MODELS.find((v) => v.key === m)!.durations;
                        if (!allowed.includes(videoDuration)) setVideoDuration(5);
                      }}
                      className="mt-1 block rounded-md border border-[var(--color-border)] bg-warm-white px-2 py-1.5 text-sm text-ink"
                    >
                      {VIDEO_MODELS.map((v) => (
                        <option key={v.key} value={v.key}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-ink-muted">
                    Seconds
                    <select
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(Number(e.target.value))}
                      className="mt-1 block rounded-md border border-[var(--color-border)] bg-warm-white px-2 py-1.5 text-sm text-ink"
                    >
                      {VIDEO_MODELS.find((v) => v.key === videoModel)!.durations.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={spectacle}
                    onChange={(e) => setSpectacle(e.target.checked)}
                  />
                  Spectacle shot: skip the restraint line (jumps, transformations, big light changes)
                </label>
                {isKling(videoModel) && (
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <input
                      type="checkbox"
                      checked={sendFaceRefs}
                      onChange={(e) => setSendFaceRefs(e.target.checked)}
                      disabled={faceRefs.length === 0}
                    />
                    {faceRefs.length > 0
                      ? `Send ${faceRefs.length} character portrait${faceRefs.length === 1 ? "" : "s"} as face references (${faceRefs.map((r) => r.label).join(", ")})`
                      : "No character portraits in this prompt's references (add Characters in shot)"}
                  </label>
                )}
                <label className="text-xs text-ink-muted">
                  Motion direction (optional, max ~1000 chars)
                  <textarea
                    value={motionText}
                    onChange={(e) => setMotionText(e.target.value)}
                    rows={3}
                    maxLength={990}
                    placeholder="e.g. Slow push-in. He breathes, eyes shifting slightly toward the stars off-frame; faint violet light drifts across the wall behind him. No cuts, no speech."
                    className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-warm-white px-2 py-1.5 text-sm text-ink"
                  />
                </label>
              </div>
            </div>
          )}
          <button
            onClick={handleAnimate}
            disabled={animating || !effectiveStartFrame}
            className="mt-4 rounded-md bg-ocean px-4 py-2 text-sm font-semibold text-warm-white disabled:opacity-50"
          >
            {animating
              ? "Animating (~1–3 min)…"
              : `Animate with ${VIDEO_MODELS.find((v) => v.key === videoModel)!.short}`}
          </button>
          {error && (
            <p className="mt-3 whitespace-pre-wrap break-words rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800">
              {error}
            </p>
          )}
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

function ReferenceThumbs({ refs }: { refs: ReferenceImage[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-3">
      {refs.map((ref) => (
        <li key={ref.path} className="w-36">
          <a href={ref.path} download title={`Download ${ref.label}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ref.path}
              alt={ref.label}
              className="h-36 w-36 rounded-md border border-[var(--color-border)] object-cover"
            />
          </a>
          <div className="mt-1 text-[11px] font-semibold text-ink">{ref.label}</div>
          <div className="text-[11px] uppercase tracking-wide text-ink-ghost">{ref.role}</div>
          {ref.instruction && (
            <div className="text-[11px] text-ink-muted">{ref.instruction}</div>
          )}
        </li>
      ))}
    </ul>
  );
}
