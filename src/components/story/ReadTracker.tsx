"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Marks a chapter as finished when the reader reaches the end of its text —
 * not when the page opens. Finishing a chapter moves the bookmark, which is
 * what unlocks the next chapter and this chapter's lore.
 */
export function ReadTracker({ storyId }: { storyId: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    firedRef.current = false;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (firedRef.current || !entries.some((e) => e.isIntersecting)) return;
        firedRef.current = true;
        observer.disconnect();
        fetch(`/api/stories/${storyId}/read`, {
          method: "POST",
          cache: "no-store",
        })
          .then(() => router.refresh())
          .catch(() => {
            // Reading should never fail because tracking did.
          });
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [storyId, router]);

  return <div ref={sentinelRef} aria-hidden className="h-px w-full" />;
}
