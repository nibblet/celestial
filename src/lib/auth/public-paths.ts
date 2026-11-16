import { book } from "@/config/book";

/**
 * Pages a visitor can open without an account: the home page, the table of
 * contents, and the free chapters. Everything else asks them to sign in.
 */
export function isPublicPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/" || path === "/stories") return true;
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
