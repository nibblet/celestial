import fs from "node:fs";
import path from "node:path";
import type { ReaderProgress } from "@/lib/progress/reader-progress";

/**
 * Opening prompts the archive leads with. They live in
 * `content/archive-prompts.json`; the author approves each one by setting
 * `approved: true`. Nothing unapproved is ever returned.
 */
export interface ArchivePrompt {
  id: string;
  approved: boolean;
  /** Last chapter a spoiler-safe reader must have finished to see this. */
  afterChapter: number;
  label: string;
  quote: string;
  question: string;
  file?: { href: string; label: string };
  /** Question sent to the archive when the reader asks where this comes from. */
  followUp?: string;
}

const PROMPTS_PATH = path.join(process.cwd(), "content/archive-prompts.json");

export function loadArchivePrompts(): ArchivePrompt[] {
  try {
    const raw = JSON.parse(fs.readFileSync(PROMPTS_PATH, "utf-8")) as {
      prompts?: ArchivePrompt[];
    };
    return Array.isArray(raw.prompts) ? raw.prompts : [];
  } catch {
    return [];
  }
}

/**
 * The prompt for this visit: approved, safe for the reader's place in the
 * book, and rotating daily so a returning reader meets something different.
 */
export function pickOpeningPrompt(
  prompts: ArchivePrompt[],
  progress: Pick<ReaderProgress, "currentChapterNumber" | "showAllContent">,
  now: Date = new Date()
): ArchivePrompt | null {
  const eligible = prompts.filter(
    (p) =>
      p.approved === true &&
      (progress.showAllContent || p.afterChapter <= progress.currentChapterNumber)
  );
  if (eligible.length === 0) return null;
  const day = Math.floor(now.getTime() / 86_400_000);
  return eligible[day % eligible.length]!;
}
