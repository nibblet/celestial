"use client";

import Link from "next/link";
import { useState } from "react";
import { HomeHero } from "@/components/home/HomeHero";
import { AgeModeSwitcher } from "@/components/layout/AgeModeSwitcher";
import { Reveal } from "@/components/ui/Reveal";
import { PhotoFrameOverlay } from "@/components/PhotoFrameOverlay";
import { framePhotos } from "@/lib/wiki/frame-photos";

const navCards = [
  {
    href: "/stories",
    title: "Read a Story",
    description:
      "Browse Keith's stories — from growing up in Mississippi to leading national organizations.",
  },
  {
    href: "/principles",
    title: "Explore Principles",
    description:
      "Follow the core principles shaping Keith's decisions, then trace how they show up across stories and themes.",
  },
  {
    href: "/ask",
    title: "Ask a Question",
    description:
      "Ask questions about Keith's stories. You'll get answers drawn from Keith's stories, life, career, and family memories.",
  },
];

export function HomePageClient() {
  const [photoFrame, setPhotoFrame] = useState(false);

  return (
    <div className="pb-12">
      {photoFrame && (
        <PhotoFrameOverlay
          photos={framePhotos}
          onClose={() => setPhotoFrame(false)}
        />
      )}

      <HomeHero />

      <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-12 md:py-16">
        <Reveal className="mb-10 text-center">
          <h2 className="type-page-title mb-3 text-balance">
            The Keith Cobb Story Library
          </h2>
          <p className="type-ui mx-auto max-w-md text-ink-muted">
            A family library built from Keith&apos;s memoir and conversations.
          </p>
        </Reveal>

        <div className="mb-10 hidden justify-center md:flex">
          <AgeModeSwitcher />
        </div>

        <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {navCards.map((card) => (
            <Reveal key={card.href}>
              <Link
                href={card.href}
                className="group block h-full rounded-xl border border-[var(--color-border)] bg-warm-white p-6 shadow-none transition-[transform,box-shadow,border-color] duration-[var(--duration-slow)] ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-clay-border hover:shadow-[0_12px_40px_rgba(44,28,16,0.08)]"
              >
                <h3 className="type-story-title mb-2 transition-colors group-hover:text-burgundy">
                  {card.title}
                </h3>
                <p className="font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
                  {card.description}
                </p>
              </Link>
            </Reveal>
          ))}

          <Reveal>
            <button
              type="button"
              onClick={() => setPhotoFrame(true)}
              className="group block h-full w-full rounded-xl border border-[var(--color-border)] bg-warm-white p-6 text-left shadow-none transition-[transform,box-shadow,border-color] duration-[var(--duration-slow)] ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-clay-border hover:shadow-[0_12px_40px_rgba(44,28,16,0.08)] opacity-80 hover:opacity-100"
            >
              <h3 className="type-story-title mb-2 transition-colors group-hover:text-burgundy">
                Photo Frame
              </h3>
              <p className="font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
                Browse all memoir photos in a quiet, fullscreen slideshow — perfect for a family gathering.
              </p>
            </button>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
