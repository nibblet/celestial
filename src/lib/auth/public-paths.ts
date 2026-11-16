import { book } from "@/config/book";

/** Archive files anyone can open: the codex and its entry pages. */
const PUBLIC_FILE_ROOTS = [
  "/codex",
  "/characters",
  "/locations",
  "/factions",
  "/artifacts",
  "/vaults",
  "/rules",
];

/** Endpoints the guest conversation needs. `/api/ask` enforces its own limit. */
const PUBLIC_API_PATHS = ["/api/ask", "/api/ask/context", "/api/reader/progress"];

/**
 * Pages a visitor can open without an account: the archive conversation, the
 * files, the table of contents and the free chapters. Reading past the free
 * chapters, logs, threads and the profile ask them to sign in.
 */
export function isPublicPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/" || path === "/stories" || path === "/ask") return true;
  if (PUBLIC_API_PATHS.includes(path)) return true;
  if (PUBLIC_FILE_ROOTS.some((root) => path === root || path.startsWith(`${root}/`))) {
    return true;
  }
  const chapter = path.match(/^\/stories\/([^/]+)$/);
  if (chapter) {
    const id = decodeURIComponent(chapter[1]!).toUpperCase();
    return book.freeChapterIds.includes(id);
  }
  // Read tracking for free chapters sets the guest bookmark cookie.
  const read = path.match(/^\/api\/stories\/([^/]+)\/read$/);
  if (read) {
    const id = decodeURIComponent(read[1]!).toUpperCase();
    return book.freeChapterIds.includes(id);
  }
  return false;
}

export function isFreeChapter(storyId: string): boolean {
  return book.freeChapterIds.includes(storyId.toUpperCase());
}
