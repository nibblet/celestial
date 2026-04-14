import * as fs from "fs";
import * as path from "path";

const WIKI_DIR = path.join(process.cwd(), "content/wiki");

export interface WikiStory {
  storyId: string;
  volume: string;
  slug: string;
  title: string;
  summary: string;
  lifeStage: string;
  themes: string[];
  wordCount: number;
  fullText: string;
  principles: string[];
  heuristics: string[];
  quotes: string[];
  relatedStoryIds: string[];
  bestUsedWhen: string[];
  timelineEvents: string[];
}

export interface WikiTheme {
  slug: string;
  name: string;
  storyCount: number;
  principles: { text: string; storyId: string }[];
  storyIds: string[];
  stories: { storyId: string; title: string; summary: string }[];
  quotes: { text: string; title: string }[];
}

export interface WikiTimelineEvent {
  year: number;
  event: string;
  organization: string;
  location: string;
  storyRef: string;
  /** Path under public/, e.g. /timeline/usm.jpg */
  illustration?: string;
}

function readWikiFile(relativePath: string): string {
  const fullPath = path.join(WIKI_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf-8");
}

function extractSection(content: string, heading: string): string[] {
  const regex = new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |\\n---|$)`);
  const match = content.match(regex);
  if (!match) return [];
  return match[1]
    .split("\n")
    .filter((l) => l.startsWith("- ") || l.startsWith("> "))
    .map((l) => l.replace(/^[-*>]\s*/, "").replace(/^"/, "").replace(/"$/, "").trim());
}

function extractMetadata(content: string, key: string): string {
  const regex = new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`);
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

// --- Public API ---

export function getAllStories(): WikiStory[] {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getStoryFromFile(f))
    .filter(Boolean)
    .sort((a, b) => a!.storyId.localeCompare(b!.storyId)) as WikiStory[];
}

function getStoryFromFile(filename: string): WikiStory | null {
  const content = readWikiFile(`stories/${filename}`);
  if (!content) return null;

  const storyIdMatch = content.match(/\*\*Story ID:\*\*\s*(P\d+_S\d+)/);
  if (!storyIdMatch) return null;

  const titleMatch = content.match(/^# (.+)/m);
  const summaryMatch = content.match(/^> (.+)/m);

  const fullTextMatch = content.match(/## Full Text\n\n([\s\S]*?)(?=\n## )/);

  const slug = filename.replace(/\.md$/, "").replace(/^P\d+_S\d+-/, "");

  const volume = storyIdMatch[1].match(/^(P\d+)/)?.[1] || "P1";

  return {
    storyId: storyIdMatch[1],
    volume,
    slug,
    title: titleMatch?.[1] || "",
    summary: summaryMatch?.[1] || "",
    lifeStage: extractMetadata(content, "Life Stage"),
    themes: extractMetadata(content, "Themes")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    wordCount: parseInt(extractMetadata(content, "Word Count")) || 0,
    fullText: fullTextMatch?.[1]?.trim() || "",
    principles: extractSection(content, "What This Story Shows"),
    heuristics: extractSection(content, "If You're Thinking About\\.\\.\\."),
    quotes: extractSection(content, "Key Quotes"),
    relatedStoryIds: extractSection(content, "Related Stories").map(
      (l) => l.match(/\[\[(P\d+_S\d+)\]\]/)?.[1] || ""
    ).filter(Boolean),
    bestUsedWhen: extractSection(content, "Best Used When Someone Asks About"),
    timelineEvents: extractSection(content, "Timeline"),
  };
}

export function getStoryBySlug(slug: string): WikiStory | null {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return null;

  const file = fs.readdirSync(dir).find((f) => f.includes(slug) && f.endsWith(".md"));
  if (!file) return null;

  return getStoryFromFile(file);
}

export function getStoryById(storyId: string): WikiStory | null {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return null;

  const file = fs.readdirSync(dir).find((f) => f.startsWith(storyId) && f.endsWith(".md"));
  if (!file) return null;

  return getStoryFromFile(file);
}

export function getAllThemes(): WikiTheme[] {
  const dir = path.join(WIKI_DIR, "themes");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getThemeFromFile(f))
    .filter(Boolean)
    .sort((a, b) => b!.storyCount - a!.storyCount) as WikiTheme[];
}

function getThemeFromFile(filename: string): WikiTheme | null {
  const content = readWikiFile(`themes/${filename}`);
  if (!content) return null;

  const titleMatch = content.match(/^# (.+)/m);
  const countMatch = content.match(/\*\*(\d+) stories\*\*/);

  const slug = filename.replace(/\.md$/, "");
  const name = titleMatch?.[1] || slug;

  // Parse stories section
  const storiesRaw = extractSection(content, "Stories");
  const stories = storiesRaw.map((line) => {
    const idMatch = line.match(/\[\[(P\d+_S\d+)\]\]\s*(.+?)(?:\s*—\s*(.+))?$/);
    return {
      storyId: idMatch?.[1] || "",
      title: idMatch?.[2] || "",
      summary: idMatch?.[3] || "",
    };
  }).filter((s) => s.storyId);

  // Parse principles
  const principlesRaw = extractSection(content, "Principles");
  const principles = principlesRaw.map((line) => {
    const match = line.match(/(.+?)\s*_\((P\d+_S\d+)\)_/);
    return { text: match?.[1]?.trim() || line, storyId: match?.[2] || "" };
  });

  // Parse quotes
  const quotesRaw = extractSection(content, "Selected Quotes");
  const quotes = quotesRaw.map((line) => {
    const match = line.match(/"(.+?)"\s*—\s*_(.+?)_/);
    return { text: match?.[1] || line, title: match?.[2] || "" };
  });

  return {
    slug,
    name,
    storyCount: parseInt(countMatch?.[1] || "0") || stories.length,
    principles,
    storyIds: stories.map((s) => s.storyId),
    stories,
    quotes,
  };
}

export function getThemeBySlug(slug: string): WikiTheme | null {
  const dir = path.join(WIKI_DIR, "themes");
  const filepath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;
  return getThemeFromFile(`${slug}.md`);
}

export function getTimeline(): WikiTimelineEvent[] {
  const content = readWikiFile("timeline/career-timeline.md");
  if (!content) return [];

  const events: WikiTimelineEvent[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(
      /- \*\*(\d{4})\*\* — (.+?)(?:\s*\((.+?)\))?(?:,\s*(.+?))?\s*—\s*\[\[(P\d+_S\d+)\]\]\s*(?:\|\s*(.+))?/
    );
    if (match) {
      events.push({
        year: parseInt(match[1]),
        event: match[2].trim(),
        organization: match[3] || "",
        location: match[4] || "",
        storyRef: match[5],
        illustration: match[6]?.trim() || undefined,
      });
    }
  }

  return events;
}

export function getWikiSummaries(): string {
  return readWikiFile("index.md");
}
