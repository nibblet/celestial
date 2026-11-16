/** Counts the questions a visitor has put to the archive without an account. */
export const GUEST_ASK_COOKIE = "celestial_guest_asks";

export function guestQuestionsUsed(cookieValue: string | undefined): number {
  const n = Number.parseInt(cookieValue ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

type Turn = { role: "user" | "assistant"; content: string };

/**
 * Guest conversations are not stored, so the page sends the earlier turns
 * back with each question. Keep only well-formed, short, recent turns.
 */
export function sanitizeGuestHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  const turns: Turn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string" || !content.trim()) continue;
    turns.push({ role, content: content.slice(0, 4000) });
  }
  const recent = turns.slice(-6);
  // The model needs the history to open on a reader turn.
  while (recent.length > 0 && recent[0]!.role !== "user") recent.shift();
  return recent;
}
