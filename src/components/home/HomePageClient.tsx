"use client";

import { book } from "@/config/book";
import Link from "next/link";
import { useState } from "react";
import { HomeHero } from "@/components/home/HomeHero";
import { AgeModeSwitcher } from "@/components/layout/AgeModeSwitcher";
import { Reveal } from "@/components/ui/Reveal";
import { PhotoFrameOverlay } from "@/components/PhotoFrameOverlay";
import { framePhotos } from "@/lib/wiki/frame-photos";

const navCards = () => [
  {
    href: "/stories/CH01",
    title: "Start Reading",
    description: `Begin at Chapter 1 and unlock the companion as you progress.`,
  },
  {
    href: "/principles",
    title: "Explore Principles",
    description:
      "Follow recurring ideas in the fiction, then trace how they surface across themes and arcs.",
  },
  {
    href: "/ask",
    title: "Ask a Question",
    description: `Ask the companion about ${book.shortName}. Answers stay grounded in curated story text.`,
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
          <h2 className="type-page-title mb-3 text-balance">{book.title}</h2>
          <p className="type-ui mx-auto max-w-md text-ink-muted">{book.tagline}</p>
        </Reveal>

        <div className="mb-10 hidden justify-center md:flex">
          <AgeModeSwitcher />
        </div>

        <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {navCards().map((card) => (
            <Reveal key={card.href}>
              <Link
                href={card.href}
                className="sci-panel sci-card-link group block h-full p-6"
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
              className="sci-panel sci-card-link group block h-full w-full p-6 text-left opacity-80 hover:opacity-100"
            >
              <h3 className="type-story-title mb-2 transition-colors group-hover:text-burgundy">
                Photo Frame
              </h3>
              <p className="font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
                When illustration assets exist, browse them fullscreen here.
              </p>
            </button>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
