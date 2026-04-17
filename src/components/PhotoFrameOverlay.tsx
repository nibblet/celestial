"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FramePhoto } from "@/lib/wiki/frame-photos";

const ADVANCE_MS = 8000;
const FADE_MS = 1200;
const PAUSE_MS = 30000;

type Props = {
  photos: FramePhoto[];
  onClose: () => void;
};

export function PhotoFrameOverlay({ photos, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});

    const onFsChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) document.exitFullscreen?.();
    };
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Preload next image
  useEffect(() => {
    const next = photos[(index + 1) % photos.length];
    const img = new Image();
    img.src = next.src;
  }, [index, photos]);

  const advance = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setIndex((i) => (i + 1) % photos.length);
      setVisible(true);
    }, FADE_MS);
  }, [photos.length]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(advance, ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [advance, paused]);

  const handlePhotoClick = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    setPaused(true);
    pauseTimerRef.current = setTimeout(() => setPaused(false), PAUSE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  const photo = photos[index];

  return (
    <div
      className="group fixed inset-0 z-[200] flex cursor-pointer items-center justify-center bg-black"
      onClick={handlePhotoClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={photo.src}
        src={photo.src}
        alt={photo.alt}
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
        className="max-h-screen max-w-full object-contain"
      />

      {/* Caption */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
        className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-8 pt-16 text-center"
      >
        <p className="font-[family-name:var(--font-lora)] text-lg font-medium text-white/90">
          {photo.caption}
        </p>
        <p className="mt-1 font-[family-name:var(--font-inter)] text-xs font-medium uppercase tracking-widest text-white/50">
          {photo.era}
        </p>
      </div>

      {/* Photo counter — top left, hover-reveal */}
      <div className="absolute left-5 top-5 rounded-full bg-black/40 px-3 py-1.5 font-[family-name:var(--font-inter)] text-xs font-medium text-white/60 opacity-0 transition-opacity duration-300 [.group:hover_&]:opacity-100">
        {index + 1} / {photos.length}
      </div>

      {/* Pause indicator */}
      {paused && (
        <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1.5 font-[family-name:var(--font-inter)] text-xs font-medium text-white/50">
          Paused
        </div>
      )}

      {/* Close button — top right, hover-reveal */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Exit photo frame"
        className="absolute right-5 top-5 rounded-full bg-black/40 px-3 py-1.5 font-[family-name:var(--font-inter)] text-xs font-medium text-white/60 opacity-0 transition-opacity duration-300 hover:bg-black/60 hover:text-white [.group:hover_&]:opacity-100"
      >
        × Close
      </button>
    </div>
  );
}
