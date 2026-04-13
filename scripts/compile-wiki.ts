/**
 * compile-wiki.ts — Deterministic Pass 1
 *
 * Reads raw content (stories, JSON, story index, timeline, quotes)
 * and produces interlinked wiki pages. No API calls needed —
 * all data is already structured.
 *
 * Run: npx tsx scripts/compile-wiki.ts
 */

import * as fs from "fs";
import * as path from "path";

const RAW = path.join(process.cwd(), "content/raw");
const WIKI = path.join(process.cwd(), "content/wiki");

// --- Types ---

interface StoryJson {
  story_id: string;
  story_title: string;
  story_summary: string;
  context: { role: string; industry: string; time_period: string; stakes: string };
  core_conflict: string;
  principles: { principle: string; evidence: string }[];
  decision_heuristics: { heuristic: string; evidence: string }[];
  quotes: { quote: string }[];
  leadership_patterns?: {
    risk_tolerance: string;
    communication_style: string;
    accountability_posture: string;
    ethical_framing: string;
  };
}

interface ManifestRow {
  story_id: string;
  title: string;
  slug: string;
  word_count: string;
}

interface TimelineEvent {
  year: number;
  event: string;
  role?: string;
  organization?: string;
  location?: string;
  story_reference: string;
  source_excerpt?: string;
  confidence: string;
}

// --- Helpers ---

function cleanTitle(title: string): string {
  return title
    .replace(/T\s+owhead/g, "Towhead")
    .replace(/T\s+eenager/g, "Teenager")
    .replace(/T\s+eacher/g, "Teacher")
    .replace(/T\s+ogetherness/g, "Togetherness")
    .replace(/Y\s+ears/g, "Years")
    .replace(/T\s+o\s+God/g, "To God")
    .replace(/T\s+\./g, "T.")
    .replace(/u2014d/g, "— ")
    .replace(/\/u2014\.d/g, "— ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(title: string): string {
  return cleanTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getLifeStage(storyId: string, storyIndex: Record<string, { life_stage: string }>): string {
  return storyIndex[storyId]?.life_stage || "Unknown";
}

// --- Parse story index from the 00_STORY_INDEX.md ---

function parseStoryIndex(indexPath: string): {
  themes: Record<string, string[]>;
  stories: Record<string, {
    title: string;
    life_stage: string;
    themes: string[];
    summary: string;
    best_used_when: string[];
    principles: string[];
    heuristics: string[];
  }>;
} {
  const text = fs.readFileSync(indexPath, "utf-8");
  const themes: Record<string, string[]> = {};
  const stories: Record<string, any> = {};

  // Parse theme directory
  const themeSection = text.split("# THEME DIRECTORY")[1]?.split("# STORIES")[0] || "";
  const themeRegex = /\*\*(.+?)\*\*\n(P1_S[\d\s]+)/g;
  let match;
  while ((match = themeRegex.exec(themeSection)) !== null) {
    const themeName = match[1].trim();
    const storyIds = match[2].trim().split(/\s+/);
    themes[themeName] = storyIds;
  }

  // Parse individual stories
  const storyBlocks = text.split(/---\nStory ID: /).slice(1);
  for (const block of storyBlocks) {
    const lines = block.trim().split("\n");
    const storyId = lines[0].trim();
    const title = (lines.find(l => l.startsWith("Title:"))?.replace("Title:", "") || "").trim();
    const lifeStage = (lines.find(l => l.startsWith("Life Stage:"))?.replace("Life Stage:", "") || "").trim();
    const summary = (lines.find(l => l.startsWith("Summary:"))?.replace("Summary:", "") || "").trim();

    // Extract themes for this story
    const storyThemes: string[] = [];
    const coreThemesIdx = lines.findIndex(l => l.startsWith("Core Themes:"));
    if (coreThemesIdx >= 0) {
      for (let i = coreThemesIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith("- ")) {
          storyThemes.push(lines[i].replace("- ", "").trim());
        } else if (!lines[i].startsWith(" ") && lines[i].trim() !== "") break;
      }
    }

    // Extract principles
    const principles: string[] = [];
    const principlesIdx = lines.findIndex(l => l.startsWith("Key Principles:"));
    if (principlesIdx >= 0) {
      for (let i = principlesIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith("- ")) {
          principles.push(lines[i].replace("- ", "").trim());
        } else if (!lines[i].startsWith(" ") && lines[i].trim() !== "") break;
      }
    }

    // Extract heuristics
    const heuristics: string[] = [];
    const heuristicsIdx = lines.findIndex(l => l.startsWith("Decision Heuristics:"));
    if (heuristicsIdx >= 0) {
      for (let i = heuristicsIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith("- ")) {
          heuristics.push(lines[i].replace("- ", "").trim());
        } else if (!lines[i].startsWith(" ") && lines[i].trim() !== "") break;
      }
    }

    // Extract best used when
    const bestUsed: string[] = [];
    const bestUsedIdx = lines.findIndex(l => l.startsWith("Best Used When"));
    if (bestUsedIdx >= 0) {
      for (let i = bestUsedIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith("- ")) {
          bestUsed.push(lines[i].replace("- ", "").trim());
        } else if (!lines[i].startsWith(" ") && lines[i].trim() !== "") break;
      }
    }

    stories[storyId] = {
      title: cleanTitle(title),
      life_stage: lifeStage,
      themes: storyThemes,
      summary,
      best_used_when: bestUsed,
      principles,
      heuristics,
    };
  }

  return { themes, stories };
}

// --- Parse manifest CSV ---

function parseManifest(csvPath: string): Record<string, ManifestRow> {
  const lines = fs.readFileSync(csvPath, "utf-8").trim().split("\n");
  const headers = lines[0].split(",");
  const rows: Record<string, ManifestRow> = {};

  for (const line of lines.slice(1)) {
    // Simple CSV parse (handles quoted fields)
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { fields.push(current); current = ""; continue; }
      current += ch;
    }
    fields.push(current);

    const row: any = {};
    headers.forEach((h, i) => { row[h.trim()] = (fields[i] || "").trim(); });
    rows[row.story_id] = row;
  }
  return rows;
}

// --- Find related stories by shared themes ---

function findRelatedStories(
  storyId: string,
  themes: Record<string, string[]>,
  limit = 4
): string[] {
  const scores: Record<string, number> = {};

  for (const [, storyIds] of Object.entries(themes)) {
    if (!storyIds.includes(storyId)) continue;
    for (const otherId of storyIds) {
      if (otherId === storyId) continue;
      scores[otherId] = (scores[otherId] || 0) + 1;
    }
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

// --- Map life stages ---

const LIFE_STAGE_ORDER = [
  "Childhood",
  "Education",
  "Early Career",
  "Mid Career",
  "Leadership",
  "Retirement",
  "Reflection",
  "Legacy",
];

function normalizeLifeStage(stage: string): string {
  const lower = stage.toLowerCase();
  if (lower.includes("child")) return "Childhood";
  if (lower.includes("edu") || lower.includes("school") || lower.includes("college")) return "Education";
  if (lower.includes("early") && lower.includes("career")) return "Early Career";
  if (lower.includes("mid") && lower.includes("career")) return "Mid Career";
  if (lower.includes("leader") || lower.includes("executive") || lower.includes("ceo")) return "Leadership";
  if (lower.includes("retire") || lower.includes("reflection") || lower.includes("later")) return "Reflection";
  if (lower.includes("legacy") || lower.includes("family")) return "Legacy";
  if (lower.includes("career")) return "Mid Career";
  return stage;
}

// ===== MAIN =====

function main() {
  console.log("📚 Compiling wiki from raw content...\n");

  // Ensure output dirs exist
  for (const dir of ["stories", "themes", "timeline", "people"]) {
    fs.mkdirSync(path.join(WIKI, dir), { recursive: true });
  }

  // Load data
  const storyIndexData = parseStoryIndex(path.join(RAW, "upload_to_gpt/00_STORY_INDEX.md"));
  const manifest = parseManifest(path.join(RAW, "manifest.csv"));
  const timeline: TimelineEvent[] = JSON.parse(
    fs.readFileSync(path.join(RAW, "library/career_timeline.json"), "utf-8")
  );
  const quotesData = JSON.parse(
    fs.readFileSync(path.join(RAW, "quotes/quotes.json"), "utf-8")
  );

  // Load all story JSONs
  const storyJsons: Record<string, StoryJson> = {};
  const jsonDir = path.join(RAW, "stories_json");
  for (const file of fs.readdirSync(jsonDir).filter(f => f.endsWith(".json"))) {
    const data: StoryJson = JSON.parse(fs.readFileSync(path.join(jsonDir, file), "utf-8"));
    storyJsons[data.story_id] = data;
  }

  // Load story markdown files
  const storyMdDir = path.join(RAW, "stories_md");
  const storyMdFiles: Record<string, string> = {};
  for (const file of fs.readdirSync(storyMdDir).filter(f => f.endsWith(".md"))) {
    const storyId = file.match(/^(P1_S\d+)/)?.[1];
    if (storyId) {
      storyMdFiles[storyId] = fs.readFileSync(path.join(storyMdDir, file), "utf-8");
    }
  }

  const allStoryIds = Object.keys(storyJsons).sort();
  const indexEntries: string[] = [];

  // ============ COMPILE STORY PAGES ============

  console.log(`📖 Compiling ${allStoryIds.length} story pages...`);

  for (const storyId of allStoryIds) {
    const json = storyJsons[storyId];
    const indexEntry = storyIndexData.stories[storyId];
    const title = cleanTitle(json.story_title);
    const slug = slugify(title);
    const lifeStage = indexEntry ? normalizeLifeStage(indexEntry.life_stage) : "Unknown";
    const summary = json.story_summary;

    // Get full text — strip the frontmatter from the MD file
    const rawMd = storyMdFiles[storyId] || "";
    const fullTextMatch = rawMd.match(/## Full Text\n\n([\s\S]*)/);
    const fullText = fullTextMatch ? fullTextMatch[1].trim() : rawMd;

    // Get themes for this story
    const storyThemes: string[] = [];
    for (const [theme, ids] of Object.entries(storyIndexData.themes)) {
      if (ids.includes(storyId)) storyThemes.push(theme);
    }

    // Related stories
    const related = findRelatedStories(storyId, storyIndexData.themes);

    // Timeline events for this story
    const storyTimeline = timeline.filter(e => e.story_reference === storyId);

    // Quotes
    const storyQuotes = (json.quotes || []).map(q => q.quote);

    // Principles
    const principles = (json.principles || []).map(p => p.principle);

    // Heuristics
    const heuristics = (json.decision_heuristics || []).map(h => h.heuristic);

    // Build page
    const page = [
      `# ${title}`,
      "",
      `> ${summary}`,
      "",
      `**Story ID:** ${storyId}`,
      `**Life Stage:** ${lifeStage}`,
      `**Themes:** ${storyThemes.join(", ")}`,
      `**Word Count:** ${manifest[storyId]?.word_count || "—"}`,
      "",
      "## Full Text",
      "",
      fullText,
      "",
    ];

    if (principles.length > 0) {
      page.push("## What This Story Shows", "");
      for (const p of principles) page.push(`- ${p}`);
      page.push("");
    }

    if (heuristics.length > 0) {
      page.push("## If You're Thinking About...", "");
      for (const h of heuristics) page.push(`- ${h}`);
      page.push("");
    }

    if (storyQuotes.length > 0) {
      page.push("## Key Quotes", "");
      for (const q of storyQuotes) page.push(`> "${q}"`, "");
    }

    if (storyTimeline.length > 0) {
      page.push("## Timeline", "");
      for (const e of storyTimeline) {
        page.push(`- **${e.year}** — ${e.event}${e.organization ? ` (${e.organization})` : ""}`);
      }
      page.push("");
    }

    if (related.length > 0) {
      page.push("## Related Stories", "");
      for (const relId of related) {
        const relJson = storyJsons[relId];
        if (relJson) {
          page.push(`- [[${relId}]] ${cleanTitle(relJson.story_title)} — ${relJson.story_summary.slice(0, 100)}...`);
        }
      }
      page.push("");
    }

    if (indexEntry?.best_used_when?.length) {
      page.push("## Best Used When Someone Asks About", "");
      for (const b of indexEntry.best_used_when) page.push(`- ${b}`);
      page.push("");
    }

    page.push("---", `*Sources: stories_md/${storyId}, stories_json/${storyId}.json*`);

    const filename = `${storyId}-${slug}.md`;
    fs.writeFileSync(path.join(WIKI, "stories", filename), page.join("\n"));
    indexEntries.push(`- [[stories/${filename}]] — ${title}: ${summary.slice(0, 80)}...`);
  }

  // ============ COMPILE THEME PAGES ============

  console.log(`💡 Compiling ${Object.keys(storyIndexData.themes).length} theme pages...`);

  for (const [theme, storyIds] of Object.entries(storyIndexData.themes)) {
    const slug = slugify(theme);

    // Collect all principles across stories in this theme
    const themePrinciples: { principle: string; storyId: string }[] = [];
    const themeQuotes: { quote: string; storyId: string; title: string }[] = [];

    for (const sid of storyIds) {
      const json = storyJsons[sid];
      if (!json) continue;
      for (const p of json.principles || []) {
        themePrinciples.push({ principle: p.principle, storyId: sid });
      }
      for (const q of json.quotes || []) {
        themeQuotes.push({ quote: q.quote, storyId: sid, title: cleanTitle(json.story_title) });
      }
    }

    // Deduplicate principles by text
    const seenPrinciples = new Set<string>();
    const uniquePrinciples = themePrinciples.filter(p => {
      if (seenPrinciples.has(p.principle)) return false;
      seenPrinciples.add(p.principle);
      return true;
    });

    const page = [
      `# ${theme}`,
      "",
      `> Stories and principles related to ${theme.toLowerCase()}.`,
      "",
      `**${storyIds.length} stories** explore this theme.`,
      "",
      "## Principles",
      "",
    ];

    for (const p of uniquePrinciples.slice(0, 10)) {
      page.push(`- ${p.principle} _(${p.storyId})_`);
    }
    page.push("");

    page.push("## Stories", "");
    for (const sid of storyIds) {
      const json = storyJsons[sid];
      if (json) {
        page.push(`- [[${sid}]] ${cleanTitle(json.story_title)} — ${json.story_summary.slice(0, 80)}...`);
      }
    }
    page.push("");

    if (themeQuotes.length > 0) {
      page.push("## Selected Quotes", "");
      for (const q of themeQuotes.slice(0, 5)) {
        page.push(`> "${q.quote}" — _${q.title}_`, "");
      }
    }

    page.push("---", `*Theme compiled from story index*`);

    const filename = `${slug}.md`;
    fs.writeFileSync(path.join(WIKI, "themes", filename), page.join("\n"));
    indexEntries.push(`- [[themes/${filename}]] — ${theme}: ${storyIds.length} stories`);
  }

  // ============ COMPILE TIMELINE PAGES ============

  console.log("📅 Compiling timeline pages...");

  // Group timeline events by life stage / decade
  const timelineByDecade: Record<string, TimelineEvent[]> = {};
  for (const evt of timeline) {
    const decade = `${Math.floor(evt.year / 10) * 10}s`;
    if (!timelineByDecade[decade]) timelineByDecade[decade] = [];
    timelineByDecade[decade].push(evt);
  }

  // Single timeline page with all events
  const timelinePage = [
    "# Keith Cobb — Life Timeline",
    "",
    "> Chronological events from Keith Cobb's life and career, linked to stories.",
    "",
    `**${timeline.length} events** spanning ${timeline[0]?.year || ""}–${timeline[timeline.length - 1]?.year || ""}.`,
    "",
  ];

  for (const [decade, events] of Object.entries(timelineByDecade).sort()) {
    timelinePage.push(`## ${decade}`, "");
    for (const evt of events.sort((a, b) => a.year - b.year)) {
      const storyRef = storyJsons[evt.story_reference]
        ? `[[${evt.story_reference}]]`
        : evt.story_reference;
      timelinePage.push(
        `- **${evt.year}** — ${evt.event}${evt.organization ? ` (${evt.organization})` : ""}${evt.location ? `, ${evt.location}` : ""} — ${storyRef}`
      );
    }
    timelinePage.push("");
  }

  timelinePage.push("---", "*Compiled from career_timeline.json*");
  fs.writeFileSync(path.join(WIKI, "timeline", "career-timeline.md"), timelinePage.join("\n"));
  indexEntries.push(`- [[timeline/career-timeline.md]] — Full career timeline: ${timeline.length} events`);

  // ============ COMPILE INDEX ============

  console.log("📋 Generating index.md...");

  const indexPage = [
    "# Keith Cobb Storybook — Wiki Index",
    "",
    "> Master index of all wiki pages. Used by the AI layer to navigate content.",
    "",
    `**${allStoryIds.length} stories** | **${Object.keys(storyIndexData.themes).length} themes** | **${timeline.length} timeline events**`,
    "",
    "## Stories",
    "",
    ...indexEntries.filter(e => e.includes("stories/")),
    "",
    "## Themes",
    "",
    ...indexEntries.filter(e => e.includes("themes/")),
    "",
    "## Timeline",
    "",
    ...indexEntries.filter(e => e.includes("timeline/")),
    "",
    "---",
    `*Compiled: ${new Date().toISOString().split("T")[0]}*`,
  ];

  fs.writeFileSync(path.join(WIKI, "index.md"), indexPage.join("\n"));

  // ============ COMPILE LOG ============

  const logEntry = `## [${new Date().toISOString().split("T")[0]}] compile | Initial wiki compilation\n\n- ${allStoryIds.length} story pages\n- ${Object.keys(storyIndexData.themes).length} theme pages\n- 1 timeline page\n- 1 index page\n`;
  fs.writeFileSync(path.join(WIKI, "log.md"), `# Wiki Compilation Log\n\n${logEntry}`);

  console.log(`\n✅ Wiki compiled successfully!`);
  console.log(`   ${allStoryIds.length} story pages → content/wiki/stories/`);
  console.log(`   ${Object.keys(storyIndexData.themes).length} theme pages → content/wiki/themes/`);
  console.log(`   1 timeline page → content/wiki/timeline/`);
  console.log(`   1 index → content/wiki/index.md`);
  console.log(`   1 log → content/wiki/log.md`);
}

main();
