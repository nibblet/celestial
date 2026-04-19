"use client";

import { useAgeMode } from "@/hooks/useAgeMode";
import { ReadBadge } from "@/components/story/ReadBadge";

type Props = { className?: string };

/** Read pill copy that is a bit warmer in young-reader mode (IDEA-014 Phase 3). */
export function ReadBadgeAgeAware({ className }: Props) {
  const { ageMode } = useAgeMode();
  const label = ageMode === "young_reader" ? "Read it!" : "Read";
  return <ReadBadge label={label} className={className} />;
}
