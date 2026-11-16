import type { Metadata } from "next";
import {
  CODEX_KINDS,
  getCodexEntries,
  isCodexEntryVisible,
  type CodexKind,
} from "@/lib/wiki/codex";
import {
  getLastChapterNumber,
  getReaderProgress,
} from "@/lib/progress/reader-progress";
import { CodexClient } from "./CodexClient";

export const metadata: Metadata = {
  title: "Codex",
  description: "Characters, factions, places and rules — up to your bookmark.",
};

export default async function CodexPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ type }, progress] = await Promise.all([
    searchParams,
    getReaderProgress(),
  ]);
  const all = getCodexEntries();
  const visible = all
    .filter((e) => isCodexEntryVisible(e, progress))
    .sort((a, b) => a.name.localeCompare(b.name));
  const initialKind = CODEX_KINDS.some((k) => k.kind === type)
    ? (type as CodexKind)
    : "all";

  return (
    <CodexClient
      entries={visible}
      hiddenCount={all.length - visible.length}
      kinds={CODEX_KINDS}
      initialKind={initialKind}
      currentChapterNumber={progress.currentChapterNumber}
      lastChapterNumber={getLastChapterNumber()}
      showAllContent={progress.showAllContent}
    />
  );
}
