"use client";

import { useEffect, useState } from "react";
import { book } from "@/config/book";

export function HomeHero() {
  const [parallaxY, setParallaxY] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    queueMicrotask(() => setReduceMotion(mq.matches));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const onScroll = () => setParallaxY(window.scrollY * 0.25);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduceMotion]);

  return (
    <section className="relative flex min-h-[75vh] flex-col justify-center overflow-hidden md:min-h-[85vh]">
      <div className="absolute inset-0 bg-[#2c1810]">
        <div
          className="absolute inset-0 bg-cover bg-[center_30%] bg-no-repeat will-change-transform"
          style={{
            transform: reduceMotion ? undefined : `translateY(${parallaxY}px)`,
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[rgba(44,28,16,0.88)] via-[rgba(44,28,16,0.42)] to-[rgba(44,28,16,0.12)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(165deg,#5c3d2e_0%,#8b4513_25%,#3d6b35_55%,#d4a843_88%,#f0e8d5_100%)] opacity-[0.85] mix-blend-multiply"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto max-w-wide px-[var(--page-padding-x)] pb-16 pt-20 text-center md:pb-20 md:pt-24">
        <p className="type-era-label mb-4 text-[rgba(240,232,213,0.65)]">
          Interactive companion
        </p>
        <h1 className="mb-5 font-[family-name:var(--font-playfair)] text-[clamp(3rem,6vw,5.5rem)] font-bold leading-[1.05] tracking-tight text-[#f0e8d5]">
          {book.title}
        </h1>
        <p className="type-body mx-auto mb-10 max-w-[520px] text-pretty italic !text-[rgba(240,232,213,0.65)]">
          {book.tagline}
        </p>
      </div>

      <div
        className="hero-scroll-cue type-meta absolute bottom-8 left-1/2 flex flex-col items-center gap-2 text-[rgba(240,232,213,0.45)]"
        aria-hidden
      >
        <span>Scroll</span>
        <span className="text-lg leading-none">↓</span>
      </div>
    </section>
  );
}
