"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { formatEstimatedListenLabel } from "@/lib/story-audio";

type PlaybackState = "idle" | "playing" | "paused" | "ended";

interface StoryAudioControlsProps {
  title: string;
  fullText: string;
  wordCount: number;
}

export function StoryAudioControls({
  title,
  fullText,
  wordCount,
}: StoryAudioControlsProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const statusId = useId();
  const hasSpeechSupport = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false
  );

  const listenLabel = useMemo(
    () => formatEstimatedListenLabel(wordCount),
    [wordCount]
  );

  useEffect(() => {
    if (!hasSpeechSupport) return;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [hasSpeechSupport]);

  const isUnsupported = !hasSpeechSupport;
  const isPlaying = playbackState === "playing";
  const isPaused = playbackState === "paused";
  const canStop = isPlaying || isPaused;

  function buildNarrationText() {
    const cleanBody = fullText.replace(/\s+/g, " ").trim();
    return `${title}. ${cleanBody}`;
  }

  function attachUtteranceLifecycle(utterance: SpeechSynthesisUtterance) {
    utterance.onstart = () => setPlaybackState("playing");
    utterance.onpause = () => setPlaybackState("paused");
    utterance.onresume = () => setPlaybackState("playing");
    utterance.onend = () => {
      utteranceRef.current = null;
      setPlaybackState("ended");
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setPlaybackState("idle");
    };
  }

  function handleListen() {
    if (!hasSpeechSupport) return;

    const narration = buildNarrationText();
    if (!narration) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(narration);
    utteranceRef.current = utterance;
    attachUtteranceLifecycle(utterance);
    window.speechSynthesis.speak(utterance);
  }

  function handlePauseResume() {
    if (!hasSpeechSupport) return;
    if (isPlaying) {
      window.speechSynthesis.pause();
      return;
    }
    if (isPaused) {
      window.speechSynthesis.resume();
    }
  }

  function handleStop() {
    if (!hasSpeechSupport) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setPlaybackState("idle");
  }

  function getStatusMessage() {
    switch (playbackState) {
      case "playing":
        return "Playing narration";
      case "paused":
        return "Narration paused";
      case "ended":
        return "Narration finished";
      default:
        if (isUnsupported) {
          return "Listening isn't available in this browser.";
        }
        return "Ready to listen";
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-clay-border bg-ocean-pale/55 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="type-meta mb-1 text-ocean">Listen To This Story</p>
          <p className="type-ui text-ink">{listenLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleListen}
            disabled={isUnsupported}
            className="rounded-lg bg-ocean px-4 py-2 text-sm font-medium text-warm-white transition-colors hover:bg-[#3f6e8a] disabled:cursor-not-allowed disabled:bg-ink-ghost"
          >
            {isPlaying || isPaused ? "Play Again" : "Click Here to Listen"}
          </button>
          <button
            type="button"
            onClick={handlePauseResume}
            disabled={isUnsupported || (!isPlaying && !isPaused)}
            className="rounded-lg border border-[var(--color-border-strong)] bg-warm-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-clay-border disabled:cursor-not-allowed disabled:text-ink-ghost"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={handleStop}
            disabled={isUnsupported || !canStop}
            className="rounded-lg border border-[var(--color-border-strong)] bg-warm-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-clay-border disabled:cursor-not-allowed disabled:text-ink-ghost"
          >
            Stop
          </button>
        </div>
      </div>

      <p
        id={statusId}
        aria-live="polite"
        className="mt-3 font-[family-name:var(--font-lora)] text-sm text-ink-muted"
      >
        {getStatusMessage()}
      </p>
    </section>
  );
}
