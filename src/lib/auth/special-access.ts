function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

/** Dev fallback only when `AUTHOR_SPECIAL_EMAILS` is unset (see `.env.local`). */
const DEV_AUTHOR_ACCESS_EMAIL = "dev-author@localhost.local";

export function getAuthorSpecialAccessEmails(): string[] {
  const raw =
    process.env.AUTHOR_SPECIAL_EMAILS ?? process.env.KEITH_SPECIAL_EMAILS ?? "";
  const configured = raw
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);

  const allowlist = new Set(configured);

  if (process.env.NODE_ENV !== "production") {
    allowlist.add(DEV_AUTHOR_ACCESS_EMAIL);
  }

  return [...allowlist];
}

export function isAuthorSpecialAccessEmail(
  email: string | null | undefined
): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getAuthorSpecialAccessEmails().includes(normalized);
}

/** Email allowlist OR role `author` on sb_profiles grants publisher-style access. */
export function hasAuthorSpecialAccess(
  email: string | null | undefined,
  role: string | null | undefined
): boolean {
  return role === "author" || isAuthorSpecialAccessEmail(email);
}
