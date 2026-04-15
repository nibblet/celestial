const DEV_KEITH_ACCESS_EMAIL = "paul.cobb@homevestors.com";

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export function getKeithSpecialAccessEmails(): string[] {
  const configured = (process.env.KEITH_SPECIAL_EMAILS ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);

  const allowlist = new Set(configured);

  if (process.env.NODE_ENV !== "production") {
    allowlist.add(DEV_KEITH_ACCESS_EMAIL);
  }

  return [...allowlist];
}

export function isKeithSpecialAccessEmail(
  email: string | null | undefined
): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getKeithSpecialAccessEmails().includes(normalized);
}
