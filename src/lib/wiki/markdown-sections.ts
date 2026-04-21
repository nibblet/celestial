/**
 * Shared markdown slice helpers for wiki files (used by parser + entity-loader).
 */

export function extractSection(content: string, heading: string): string[] {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`## ${escapedHeading}\\n\\n([\\s\\S]*?)(?=\\n## |\\n---|$)`);
  const match = content.match(regex);
  if (!match) return [];
  return match[1]
    .split("\n")
    .filter((l) => l.startsWith("- ") || l.startsWith("> "))
    .map((l) => l.replace(/^[-*>]\s*/, "").replace(/^"/, "").replace(/"$/, "").trim());
}

/** Full block text after `## Heading` until next `## ` or `---` or EOF (no line filtering). */
export function extractSectionBlock(content: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`## ${escapedHeading}\\n\\n([\\s\\S]*?)(?=\\n## |\\n---|\\n<!--|$)`);
  const match = content.match(regex);
  return match?.[1]?.trim() ?? "";
}

export function extractMetadata(content: string, key: string): string {
  const regex = new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`);
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

export function stripLockedSections(
  content: string,
  currentChapterNumber: number,
  showAllContent = false
): string {
  if (showAllContent) return content;
  return content.replace(
    /<!--\s*unlock:CH(\d{2,4})\s*-->([\s\S]*?)<!--\s*\/unlock\s*-->/gi,
    (_whole, ch, body: string) => {
      const needed = parseInt(ch, 10);
      if (Number.isFinite(needed) && needed <= currentChapterNumber) {
        return body.trim();
      }
      return "";
    }
  );
}
