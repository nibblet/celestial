/**
 * Turns the links inside an archive answer into the file cards shown beneath
 * it. Pure and client-safe: it reads only the link list.
 */
export interface FileCard {
  href: string;
  name: string;
  kind: string;
}

const KIND_LABELS: Record<string, string> = {
  characters: "Personnel file",
  locations: "Site file",
  vaults: "Vault file",
  artifacts: "Artifact file",
  factions: "Faction file",
  rules: "Principle",
  stories: "Chapter",
  "mission-logs": "Log",
};

export function fileCardsFromLinks(
  links: ReadonlyArray<{ href: string; text: string }>,
  max = 4
): FileCard[] {
  const seen = new Set<string>();
  const cards: FileCard[] = [];
  for (const link of links) {
    const path = link.href.split(/[?#]/)[0]!.replace(/\/+$/, "");
    const m = path.match(/^\/([a-z-]+)\/([^/]+)$/);
    if (!m) continue;
    const kind = KIND_LABELS[m[1]!];
    if (!kind || seen.has(path)) continue;
    seen.add(path);
    cards.push({ href: path, name: link.text.trim() || m[2]!, kind });
    if (cards.length >= max) break;
  }
  return cards;
}
