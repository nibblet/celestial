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
      <div className="absolute inset-0 bg-[#0d141c]">
        <div
          className="absolute inset-0 bg-cover bg-[center_30%] bg-no-repeat will-change-transform"
          style={{
            transform: reduceMotion ? undefined : `translateY(${parallaxY}px)`,
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(127,231,225,0.22),transparent_18%),radial-gradient(circle_at_22%_9%,rgba(168,242,240,0.12),transparent_2px),radial-gradient(circle_at_72%_16%,rgba(168,242,240,0.16),transparent_1px),radial-gradient(circle_at_87%_26%,rgba(242,238,228,0.12),transparent_1px),linear-gradient(180deg,rgba(7,11,17,0.98)_0%,rgba(13,24,32,0.9)_42%,rgba(67,43,31,0.7)_76%,rgba(13,20,28,0.96)_100%)]"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 h-2/5 bg-[radial-gradient(ellipse_at_50%_100%,rgba(209,115,69,0.46),transparent_64%),linear-gradient(180deg,transparent,rgba(79,35,24,0.72))]"
          aria-hidden
        />
        <div
          className="absolute left-1/2 top-[18%] h-40 w-40 -translate-x-1/2 rounded-full border border-[rgba(168,242,240,0.14)] shadow-[0_0_80px_rgba(127,231,225,0.24)] md:h-56 md:w-56"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto max-w-wide px-[var(--page-padding-x)] pb-16 pt-20 text-center md:pb-20 md:pt-24">
        <p className="type-era-label mb-4 text-[rgba(242,238,228,0.65)]">
          Interactive companion
        </p>
        <h1 className="mb-5 font-[family-name:var(--font-playfair)] text-[clamp(3rem,6vw,5.5rem)] font-bold leading-[1.05] tracking-tight text-[#f2eee4]">
          {book.title}
        </h1>
        <p className="type-body mx-auto mb-10 max-w-[520px] text-pretty italic !text-[rgba(242,238,228,0.65)]">
          {book.tagline}
        </p>
      </div>

      <div
        className="hero-scroll-cue type-meta absolute bottom-8 left-1/2 flex flex-col items-center gap-2 text-[rgba(242,238,228,0.45)]"
        aria-hidden
      >
        <span>Scroll</span>
        <span className="text-lg leading-none">↓</span>
      </div>
    </section>
  );
}
