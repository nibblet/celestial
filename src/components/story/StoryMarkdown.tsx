"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { PersonLink } from "@/components/people/PersonLink";

type LightboxImage = {
  src: string;
  alt: string;
};

export function StoryMarkdown({ content }: { content: string }) {
  const [activeImage, setActiveImage] = useState<LightboxImage | null>(null);
  const [showActualSize, setShowActualSize] = useState(false);

  useEffect(() => {
    if (!activeImage) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImage(null);
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [activeImage]);

  return (
    <>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (typeof href === "string" && href.startsWith("/people/")) {
              const slug = href.slice("/people/".length).replace(/\/$/, "");
              return <PersonLink slug={slug}>{children}</PersonLink>;
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => {
            if (!src || typeof src !== "string") return null;
            const imageAlt = alt || "Story image";
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={imageAlt}
                loading="lazy"
                role="button"
                tabIndex={0}
                onClick={() => setActiveImage({ src, alt: imageAlt })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveImage({ src, alt: imageAlt });
                  }
                }}
                className="cursor-zoom-in"
                aria-label={`Open image: ${imageAlt}`}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {activeImage && (
        <div
          className="not-prose fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setActiveImage(null);
            setShowActualSize(false);
          }}
        >
          <div
            className="relative w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowActualSize((prev) => !prev)}
                className="rounded bg-black/70 px-2 py-1 text-sm font-medium text-white hover:bg-black/85"
              >
                {showActualSize ? "Fit to Screen" : "Actual Size"}
              </button>
              <a
                href={activeImage.src}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-black/70 px-2 py-1 text-sm font-medium text-white hover:bg-black/85"
              >
                Open Original
              </a>
              <button
                type="button"
                onClick={() => {
                  setActiveImage(null);
                  setShowActualSize(false);
                }}
                className="rounded bg-black/70 px-2 py-1 text-sm font-medium text-white hover:bg-black/85"
                aria-label="Close image"
              >
                Close
              </button>
            </div>
            <div className="max-h-[88vh] overflow-auto rounded-lg bg-black/30 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                className={
                  showActualSize
                    ? "m-0 block h-auto max-h-none w-auto max-w-none rounded-lg object-contain"
                    : "m-0 block h-auto max-h-[86vh] w-full rounded-lg object-contain"
                }
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
