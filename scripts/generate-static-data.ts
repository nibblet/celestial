/**
 * generate-static-data.ts
 *
 * Reads wiki files and generates a JSON file that client components
 * can import directly. Run after compile-wiki.ts.
 *
 * Run: npx tsx scripts/generate-static-data.ts
 */

import * as fs from "fs";
import * as path from "path";
import {
  enrichLegacyStorySource,
  normalizeChapterThemes,
} from "../src/lib/wiki/taxonomy";

const WIKI = path.join(process.cwd(), "content/wiki");
const OUT = path.join(process.cwd(), "src/lib/wiki/static-data.ts");

type StorySource = "memoir" | "interview" | "family";

interface StoryCard {
  storyId: string;
  slug: string;
  title: string;
  summary: string;
  source: StorySource;
  sourceDetail: string;
  lifeStage: string;
  themes: string[];
  wordCount: number;
  principles: string[];
  contentType: ReturnType<typeof enrichLegacyStorySource>["contentType"];
  sourceType: ReturnType<typeof enrichLegacyStorySource>["sourceType"];
  canonStatus: ReturnType<typeof enrichLegacyStorySource>["canonStatus"];
  visibilityPolicy: ReturnType<typeof enrichLegacyStorySource>["visibilityPolicy"];
}

interface ThemeCard {
  slug: string;
  name: string;
  storyCount: number;
  storyIds: string[];
}

type PersonTier = "A" | "B" | "C" | "D";

interface PersonCard {
  slug: string;
  name: string;
  tiers: PersonTier[];
  memoirStoryIds: string[];
  interviewStoryIds: string[];
  storyCount: number;
  note: string;
}

type TimelineSource = "memoir" | "public_record" | "interview";

interface TimelineEvent {
  year: number;
  event: string;
  organization: string;
  location: string;
  storyRef: string;
  illustration?: string;
  source: TimelineSource;
  sourceDetail?: string;
}

/** Matches memoir/interview IDs and fiction chapter refs (CH01…) — keep in sync with `src/lib/wiki/story-ids.ts`. */
const STORY_ID_PAT = "(?:P\\d+|IV)_S\\d+|CH\\d{2,4}";

function chapterSortKey(storyId: string): string {
  const chapter = storyId.match(/^CH(\d{2,4})$/i);
  if (chapter) return `1_${String(parseInt(chapter[1], 10)).padStart(4, "0")}`;
  const memoir = storyId.match(/^P(\d+)_S(\d+)$/i);
  if (memoir) {
    return `2_${String(parseInt(memoir[1], 10)).padStart(3, "0")}_${String(parseInt(memoir[2], 10)).padStart(4, "0")}`;
  }
  const iv = storyId.match(/^IV_S(\d+)$/i);
  if (iv) return `3_${String(parseInt(iv[1], 10)).padStart(4, "0")}`;
  return `9_${storyId}`;
}

function deriveSource(storyId: string): StorySource {
  if (storyId.startsWith("IV_")) return "interview";
  if (storyId.startsWith("P1_")) return "memoir";
  return "family";
}

function extractMetadata(content: string, key: string): string {
  const regex = new RegExp(`\\*\\*${key}:\\*\\*[ \\t]*(.+)`);
  return content.match(regex)?.[1]?.trim() || "";
}

function extractSection(content: string, heading: string): string[] {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`## ${escapedHeading}\\n\\n([\\s\\S]*?)(?=\\n## |\\n---|$)`);
  const match = content.match(regex);
  if (!match) return [];
  return match[1]
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-\s*/, "").trim());
}

function main() {
  // Stories
  const storiesDir = path.join(WIKI, "stories");
  const storyIdRe = new RegExp(`\\*\\*Story ID:\\*\\*\\s*(${STORY_ID_PAT})`);
  const slugStripRe = new RegExp(`^${STORY_ID_PAT}-`);

  const stories: StoryCard[] = fs.existsSync(storiesDir)
    ? fs
    .readdirSync(storiesDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const content = fs.readFileSync(path.join(storiesDir, f), "utf-8");
      const storyIdMatch = content.match(storyIdRe);
      if (!storyIdMatch) return null;

      const titleMatch = content.match(/^# (.+)/m);
      const summaryMatch = content.match(/^> (.+)/m);
      const slug = f.replace(/\.md$/, "").replace(slugStripRe, "");
      const source = deriveSource(storyIdMatch[1]);
      const sid = storyIdMatch[1];
      const rawThemes = extractMetadata(content, "Themes")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const themes = normalizeChapterThemes(sid, rawThemes);
      const contract = enrichLegacyStorySource(sid, source);

      return {
        storyId: sid,
        slug,
        title: titleMatch?.[1] || "",
        summary: summaryMatch?.[1] || "",
        source,
        sourceDetail: extractMetadata(content, "Source"),
        lifeStage: extractMetadata(content, "Life Stage"),
        themes,
        wordCount: parseInt(extractMetadata(content, "Word Count")) || 0,
        principles: extractSection(content, "What This Story Shows"),
        volume: sid.match(/^(P\d+|IV)/)?.[1] || "P1",
        ...contract,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      chapterSortKey(a!.storyId).localeCompare(chapterSortKey(b!.storyId))
    ) as StoryCard[]
    : [];

  // Themes
  const themesDir = path.join(WIKI, "themes");
  const themes: ThemeCard[] = fs.existsSync(themesDir)
    ? fs
    .readdirSync(themesDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const content = fs.readFileSync(path.join(themesDir, f), "utf-8");
      const titleMatch = content.match(/^# (.+)/m);
      const countMatch = content.match(/\*\*(\d+) stories\*\*/);
      const slug = f.replace(/\.md$/, "");

      const storiesSection = extractSection(content, "Stories");
      const storyIdExtract = new RegExp(`\\[\\[(${STORY_ID_PAT})\\]\\]`);
      const storyIds = storiesSection
        .map((l) => l.match(storyIdExtract)?.[1])
        .filter(Boolean) as string[];

      return {
        slug,
        name: titleMatch?.[1] || slug,
        storyCount: parseInt(countMatch?.[1] || "0") || storyIds.length,
        storyIds,
      };
    })
    .sort((a, b) => b.storyCount - a.storyCount)
    : [];

  function buildPersonCards(
    dirPath: string,
    memoirHeading: string,
    interviewHeading: string
  ): PersonCard[] {
    if (!fs.existsSync(dirPath)) return [];
    return fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const content = fs.readFileSync(path.join(dirPath, f), "utf-8");
        const nameMatch = content.match(/^# (.+)/m);
        const slugMatch = content.match(/\*\*Slug:\*\*\s*(.+)/);
        const tiersMatch = content.match(/tiers:\s*([A-D,\s]+)\)/);
        const memoirHeadingEscaped = memoirHeading.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        const interviewHeadingEscaped = interviewHeading.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        const memoirSection = content.match(
          new RegExp(
            `## ${memoirHeadingEscaped}\\n\\n([\\s\\S]*?)(?=\\n## |\\n---|\\n<!--|$)`
          )
        );
        const interviewSection = content.match(
          new RegExp(
            `## ${interviewHeadingEscaped}\\n\\n([\\s\\S]*?)(?=\\n## |\\n---|\\n<!--|$)`
          )
        );
        const noteSection = content.match(
          /## Note\n\n([\s\S]*?)(?=\n## |\n---|\n<!--|$)/
        );

        const extractIds = (block: string | undefined): string[] => {
          if (!block) return [];
          const ids: string[] = [];
          let m: RegExpExecArray | null;
          const re = new RegExp(`\\((${STORY_ID_PAT})\\)`, "g");
          while ((m = re.exec(block)) !== null) ids.push(m[1]!);
          return ids;
        };

        const slug = slugMatch?.[1]?.trim() || f.replace(/\.md$/, "");
        const tiers = (tiersMatch?.[1] || "")
          .split(",")
          .map((t) => t.trim())
          .filter((t): t is PersonTier => /^[A-D]$/.test(t));
        const memoirStoryIds = extractIds(memoirSection?.[1]);
        const interviewStoryIds = extractIds(interviewSection?.[1]);

        return {
          slug,
          name: nameMatch?.[1]?.trim() || slug,
          tiers,
          memoirStoryIds,
          interviewStoryIds,
          storyCount: memoirStoryIds.length + interviewStoryIds.length,
          note: noteSection?.[1]?.trim() || "",
        };
      });
  }

  const peopleDir = path.join(WIKI, "people");
  const charactersDir = path.join(WIKI, "characters");
  const peopleFromLegacy = buildPersonCards(
    peopleDir,
    "Memoir stories",
    "Interview stories"
  );
  const peopleFromFiction = buildPersonCards(
    charactersDir,
    "Appearances",
    "Additional appearances"
  );
  const peopleBySlug = new Map<string, PersonCard>();
  for (const p of peopleFromLegacy) peopleBySlug.set(p.slug, p);
  for (const p of peopleFromFiction) peopleBySlug.set(p.slug, p);
  const people = [...peopleBySlug.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Timeline
  const timelinePath = path.join(WIKI, "timeline/career-timeline.md");
  const timelineContent = fs.existsSync(timelinePath)
    ? fs.readFileSync(timelinePath, "utf-8")
    : "";
  const timelineEvents: TimelineEvent[] = [];
  const tlRefRe = new RegExp(
    `- \\*\\*(\\d{4})\\*\\* — (.+?)(?:\\s*\\((.+?)\\))?(?:,\\s*(.+?))?\\s*—\\s*\\[\\[(${STORY_ID_PAT})\\]\\]\\s*(?:\\|\\s*(.+))?`
  );
  for (const line of timelineContent.split("\n")) {
    const match = line.match(tlRefRe);
    if (match) {
      const trailing = match[6] || "";
      const sourcePart = trailing.match(/source:(\w+)/)?.[1] as TimelineSource | undefined;
      const detailPart = trailing.match(/detail:(.+?)(?:\s*\||$)/)?.[1]?.trim();
      const illustration = trailing
        .replace(/source:\w+/g, "")
        .replace(/detail:.+?(?:\s*\||$)/g, "")
        .replace(/\|/g, "")
        .trim() || undefined;

      timelineEvents.push({
        year: parseInt(match[1]),
        event: match[2].trim(),
        organization: match[3] || "",
        location: match[4]?.trim() || "",
        storyRef: match[5],
        illustration,
        source: sourcePart || "memoir",
        sourceDetail: detailPart,
      });
    }
  }

  // Write static data module
  const output = `// Auto-generated by scripts/generate-static-data.ts
// Do not edit manually. Run: npx tsx scripts/generate-static-data.ts

import type {
  CanonStatusV1,
  ContentTypeV1,
  SourceTypeV1,
  VisibilityPolicyV1,
} from "@/lib/wiki/taxonomy";

export type StorySource = "memoir" | "interview" | "family";
export type TimelineSource = "memoir" | "public_record" | "interview";

export interface StoryCard {
  storyId: string;
  slug: string;
  title: string;
  summary: string;
  source: StorySource;
  sourceDetail: string;
  lifeStage: string;
  themes: string[];
  wordCount: number;
  principles: string[];
  volume?: string;
  contentType: ContentTypeV1;
  sourceType: SourceTypeV1;
  canonStatus: CanonStatusV1;
  visibilityPolicy: VisibilityPolicyV1;
}

export interface ThemeCard {
  slug: string;
  name: string;
  storyCount: number;
  storyIds: string[];
}

export type PersonTier = "A" | "B" | "C" | "D";

export interface PersonCard {
  slug: string;
  name: string;
  tiers: PersonTier[];
  memoirStoryIds: string[];
  interviewStoryIds: string[];
  storyCount: number;
  note: string;
}

export interface TimelineEvent {
  year: number;
  event: string;
  organization: string;
  location: string;
  storyRef: string;
  illustration?: string;
  source: TimelineSource;
  sourceDetail?: string;
}

export const storiesData: StoryCard[] = ${JSON.stringify(stories, null, 2)};

export const themesData: ThemeCard[] = ${JSON.stringify(themes, null, 2)};

export const peopleData: PersonCard[] = ${JSON.stringify(people, null, 2)};

export const timelineData: TimelineEvent[] = ${JSON.stringify(timelineEvents, null, 2)};
`;

  fs.writeFileSync(OUT, output);
  console.log(`✅ Static data generated → ${OUT}`);
  console.log(`   ${stories.length} stories, ${themes.length} themes, ${people.length} people, ${timelineEvents.length} timeline events`);
}

main();
