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
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { listEntityThumbnails } from "@/lib/visuals/list-entity-thumbnails";
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
  const [{ type }, progress, thumbnails, { isAuthorSpecialAccess }] =
    await Promise.all([
      searchParams,
      getReaderProgress(),
      listEntityThumbnails(),
      getAuthenticatedProfileContext(),
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
      thumbnails={thumbnails}
      isAuthor={isAuthorSpecialAccess}
      hiddenCount={all.length - visible.length}
      kinds={CODEX_KINDS}
      initialKind={initialKind}
      currentChapterNumber={progress.currentChapterNumber}
      lastChapterNumber={getLastChapterNumber()}
      showAllContent={progress.showAllContent}
    />
  );
}
