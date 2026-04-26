import * as fs from "fs";
import * as path from "path";
import { extractMetadata, extractSectionBlock } from "@/lib/wiki/markdown-sections";

const CHARACTER_ARCS_DIR = path.join(
  process.cwd(),
  "content/wiki/arcs/characters",
);

export interface CharacterArcLedger {
  slug: string;
  title: string;
  character: string;
  scope: string;
  canonRank: string;
  reviewStatus: string;
  markdown: string;
  startingState: string;
  unresolvedTensions: string;
  futureQuestions: string;
  askGuidance: string;
}

function titleFromMarkdown(content: string): string {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/i, "");
}

export function parseCharacterArcMarkdown(
  content: string,
  filename: string,
): CharacterArcLedger | null {
  const title = titleFromMarkdown(content);
  const slug = extractMetadata(content, "Slug") || slugFromFilename(filename);
  const character = extractMetadata(content, "Character");

  if (!title || !slug || !character) return null;

  return {
    slug,
    title,
    character,
    scope: extractMetadata(content, "Scope"),
    canonRank: extractMetadata(content, "Canon rank"),
    reviewStatus: extractMetadata(content, "Review status"),
    markdown: content,
    startingState: extractSectionBlock(content, "Starting State"),
    unresolvedTensions: extractSectionBlock(content, "Unresolved Tensions"),
    futureQuestions: extractSectionBlock(content, "Future Questions"),
    askGuidance: extractSectionBlock(content, "ASK Guidance"),
  };
}

function parseCharacterArcFile(filename: string): CharacterArcLedger | null {
  const fullPath = path.join(CHARACTER_ARCS_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;
  return parseCharacterArcMarkdown(fs.readFileSync(fullPath, "utf-8"), filename);
}

export function getAllCharacterArcs(): CharacterArcLedger[] {
  if (!fs.existsSync(CHARACTER_ARCS_DIR)) return [];

  return fs
    .readdirSync(CHARACTER_ARCS_DIR)
    .filter((filename) => filename.endsWith(".md"))
    .filter((filename) => !filename.startsWith("_"))
    .map((filename) => parseCharacterArcFile(filename))
    .filter(Boolean)
    .sort((a, b) => a!.character.localeCompare(b!.character)) as CharacterArcLedger[];
}

export function getCharacterArcBySlug(slug: string): CharacterArcLedger | null {
  if (slug.startsWith("_")) return null;
  return getAllCharacterArcs().find((arc) => arc.slug === slug) ?? null;
}
