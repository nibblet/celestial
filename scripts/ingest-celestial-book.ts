/**
 * Phase 3 ingest:
 * - Parse the source EPUB into chapter scene/mission-log segments
 * - Generate CH## wiki story pages under content/wiki/stories
 * - Emit a machine-readable mission-log inventory JSON
 * - Emit a human-readable mission-log index markdown
 *
 * EPUB parsing (rewrites CH## wiki stories and mission inventory) is opt-in only:
 * `REGENERATE_CHAPTERS_FROM_EPUB=1 npm run ingest:book` — deletes existing CH## story
 * files first. Default run only executes brain_lab (if present) and the review queue.
 *
 * Run: npx tsx scripts/ingest-celestial-book.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const BRAIN_LAB_DIR = path.join(ROOT, "brain_lab");
const SOURCE_DIR = path.join(ROOT, "celestial_original");
const WIKI_DIR = path.join(ROOT, "content/wiki");
const STORIES_DIR = path.join(WIKI_DIR, "stories");
const MISSION_LOGS_DIR = path.join(WIKI_DIR, "mission-logs");
const RAW_DIR = path.join(ROOT, "content/raw");
const INVENTORY_JSON = path.join(RAW_DIR, "mission_logs_inventory.json");
const BRAIN_LAB_REVIEW_QUEUE = path.join(
  ROOT,
  "brain_lab/out/review-queue.md"
);

interface EpubEntry {
  name: string;
  content: string;
}

interface ChapterSceneSegment {
  kind: "scene";
  chapterId: string;
  sceneNumber: number;
  title: string;
  body: string;
}

interface ChapterMissionLogSegment {
  kind: "mission_log";
  chapterId: string;
  logId: string;
  body: string;
  dateShipTime: string;
  author: string;
  logType: string;
  location: string;
  privacyLevel: string;
  summary: string;
  mainBody: string;
  attachments: string[];
}

type ChapterSegment = ChapterSceneSegment | ChapterMissionLogSegment;

interface ParsedChapter {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  segments: ChapterSegment[];
}

interface MissionLogInventoryRow {
  logId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  dateShipTime: string;
  author: string;
  logType: string;
  location: string;
  privacyLevel: string;
  summary: string;
  mainBody: string;
  attachments: string[];
  sourceFile: string;
}

function storyIdForChapter(chapterNumber: number): string {
  return `CH${String(chapterNumber).padStart(2, "0")}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function decodeEntities(input: string): string {
  const named = input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return named
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10))
    );
}

function extractZipEntries(zipPath: string): EpubEntry[] {
  const listRaw = execSync(`unzip -Z1 "${zipPath}"`, {
    encoding: "utf-8",
  });
  const fileNames = listRaw
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const out: EpubEntry[] = [];
  for (const name of fileNames) {
    try {
      const content = execSync(`unzip -p "${zipPath}" "${name}"`, {
        encoding: "utf-8",
        maxBuffer: 16 * 1024 * 1024,
      });
      out.push({ name, content });
    } catch {
      // Ignore binary/unreadable entries.
    }
  }
  return out;
}

function htmlToLines(html: string): string[] {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|li|section|article)>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  const decoded = decodeEntities(stripped)
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  return decoded
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseMissionLogBody(body: string): Omit<ChapterMissionLogSegment, "kind" | "chapterId" | "logId" | "body"> {
  const compact = body.replace(/\s+/g, " ").trim();
  const get = (label: string, nextLabels: string[]): string => {
    const next = nextLabels.length > 0 ? `(?=${nextLabels.join("|")}|$)` : "$";
    const re = new RegExp(`${label}\\s*(.+?)\\s*${next}`, "i");
    return compact.match(re)?.[1]?.trim() ?? "";
  };

  const dateShipTime = get("Date / Ship Time:", [
    "Author:",
    "Log Type:",
    "Location:",
    "Privacy Level:",
    "Summary:",
    "Main Body:",
    "Attachments:",
  ]);
  const author = get("Author:", [
    "Log Type:",
    "Location:",
    "Privacy Level:",
    "Summary:",
    "Main Body:",
    "Attachments:",
  ]);
  const logType = get("Log Type:", [
    "Location:",
    "Privacy Level:",
    "Summary:",
    "Main Body:",
    "Attachments:",
  ]);
  const location = get("Location:", [
    "Privacy Level:",
    "Summary:",
    "Main Body:",
    "Attachments:",
  ]);
  const privacyLevel = get("Privacy Level:", [
    "Summary:",
    "Main Body:",
    "Attachments:",
  ]);
  const summary = get("Summary:", ["Main Body:", "Attachments:"]);
  const mainBody = get("Main Body:", ["Attachments:"]) || get("Summary:", ["Attachments:"]);
  const attachmentsRaw = get("Attachments:", []);
  const attachments = attachmentsRaw
    .split(/(?:\s{2,}|,\s*|;|\s\|\s)/)
    .map((x) => x.trim())
    .filter(Boolean);

  return {
    dateShipTime,
    author,
    logType,
    location,
    privacyLevel,
    summary,
    mainBody,
    attachments,
  };
}

function parseChapterFromLines(chapterNumber: number, lines: string[]): ParsedChapter | null {
  const heading = lines.find((line) => new RegExp(`^Chapter\\s+${chapterNumber}\\b`, "i").test(line));
  if (!heading) return null;

  const chapterTitle = heading.replace(/^Chapter\s+\d+[:\s-]*/i, "").trim() || `Chapter ${chapterNumber}`;
  const chapterId = storyIdForChapter(chapterNumber);
  const segments: ChapterSegment[] = [];

  let currentSceneNumber = 0;
  let currentSceneTitle = "";
  let sceneBuffer: string[] = [];

  let currentLogId = "";
  let missionBuffer: string[] = [];
  let mode: "none" | "scene" | "mission" = "none";

  const flushScene = () => {
    if (mode === "scene" && currentSceneTitle && sceneBuffer.length > 0) {
      segments.push({
        kind: "scene",
        chapterId,
        sceneNumber: currentSceneNumber,
        title: currentSceneTitle,
        body: sceneBuffer.join("\n\n").trim(),
      });
    }
    sceneBuffer = [];
  };

  const flushMission = () => {
    if (mode === "mission" && currentLogId) {
      const body = missionBuffer.join("\n").trim();
      const parsed = parseMissionLogBody(body);
      segments.push({
        kind: "mission_log",
        chapterId,
        logId: currentLogId,
        body,
        ...parsed,
      });
    }
    missionBuffer = [];
  };

  for (const line of lines) {
    const sceneMatch = line.match(/^Scene\s+(\d+):\s*(.+)$/i);
    if (sceneMatch) {
      if (mode === "scene") flushScene();
      if (mode === "mission") flushMission();
      mode = "scene";
      currentSceneNumber = parseInt(sceneMatch[1], 10);
      currentSceneTitle = sceneMatch[2].trim();
      continue;
    }

    const missionMatch = line.match(/^MISSION LOG\s+(.+)$/i);
    if (missionMatch) {
      if (mode === "scene") flushScene();
      if (mode === "mission") flushMission();
      mode = "mission";
      currentLogId = missionMatch[1].trim();
      continue;
    }

    if (/^Chapter\s+\d+[:\s-]/i.test(line) && !new RegExp(`^Chapter\\s+${chapterNumber}\\b`, "i").test(line)) {
      break;
    }

    if (mode === "scene") sceneBuffer.push(line);
    else if (mode === "mission") missionBuffer.push(line);
  }

  if (mode === "scene") flushScene();
  if (mode === "mission") flushMission();

  if (segments.length === 0) return null;
  return { chapterId, chapterNumber, chapterTitle, segments };
}

function buildStoryMarkdown(chapter: ParsedChapter): string {
  const scenes = chapter.segments.filter((s): s is ChapterSceneSegment => s.kind === "scene");
  const logs = chapter.segments.filter((s): s is ChapterMissionLogSegment => s.kind === "mission_log");
  const title = `Chapter ${chapter.chapterNumber}: ${chapter.chapterTitle}`;
  const summary = scenes[0]?.body.split("\n")[0] ?? `Narrative chapter ${chapter.chapterId}.`;
  const fullTextParts: string[] = [];

  for (const segment of chapter.segments) {
    if (segment.kind === "scene") {
      fullTextParts.push(`### Scene ${segment.sceneNumber}: ${segment.title}`, "", segment.body, "");
      continue;
    }
    fullTextParts.push(
      `### Mission Log ${segment.logId}`,
      "",
      `- **Date / Ship Time:** ${segment.dateShipTime || "—"}`,
      `- **Author:** ${segment.author || "—"}`,
      `- **Log Type:** ${segment.logType || "—"}`,
      `- **Location:** ${segment.location || "—"}`,
      `- **Privacy Level:** ${segment.privacyLevel || "—"}`,
      `- **Summary:** ${segment.summary || "—"}`,
      "",
      segment.mainBody || segment.body || "—",
      "",
      segment.attachments.length > 0
        ? `Attachments: ${segment.attachments.join(" | ")}`
        : "Attachments: —",
      ""
    );
  }

  const lines: string[] = [
    `# ${title}`,
    "",
    `> ${summary}`,
    "",
    `**Story ID:** ${chapter.chapterId}`,
    `**Life Stage:** Main Narrative`,
    `**Themes:** Fiction Narrative`,
    `**Word Count:** ${fullTextParts.join("\n").split(/\s+/).filter(Boolean).length}`,
    "",
    "## Full Text",
    "",
    fullTextParts.join("\n").trim(),
    "",
  ];

  if (logs.length > 0) {
    lines.push("## Mission Logs", "");
    for (const log of logs) {
      lines.push(`- [[${log.logId}]] ${log.summary || "Mission log entry"}`);
    }
    lines.push("");
  }

  lines.push("---", "*Sources: celestial_original/celestial-heritage.epub*");
  return lines.join("\n");
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function runBrainLabEntityPipeline(): void {
  const makefile = path.join(BRAIN_LAB_DIR, "Makefile");
  if (!fs.existsSync(makefile)) return;
  try {
    execSync(`make -C "${BRAIN_LAB_DIR}" ingest-celestial`, {
      stdio: "inherit",
    });
  } catch {
    // Keep chapter/mission ingest resilient even if Python deps are not installed.
    console.warn(
      "[ingest] brain_lab ingest-celestial failed; continuing with chapter + mission log ingest"
    );
  }
}

function writeReviewQueue(): void {
  const dirs = ["characters", "artifacts", "locations", "factions", "rules"]
    .map((sub) => path.join(WIKI_DIR, sub))
    .filter((p) => fs.existsSync(p));
  const pending: string[] = [];
  for (const dir of dirs) {
    for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
      const fullPath = path.join(dir, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      if (
        content.includes("<!-- generated:ingest -->") &&
        /reviewed:\s*false/i.test(content)
      ) {
        pending.push(path.relative(ROOT, fullPath));
      }
    }
  }
  const lines = [
    "# Review queue",
    "",
    `Generated at ${new Date().toISOString()}.`,
    "",
    "Files requiring human review (reviewed: false):",
    "",
    ...(pending.length > 0 ? pending.map((p) => `- ${p}`) : ["- (none)"]),
    "",
  ];
  ensureDir(path.dirname(BRAIN_LAB_REVIEW_QUEUE));
  fs.writeFileSync(BRAIN_LAB_REVIEW_QUEUE, lines.join("\n"));
}

function main() {
  console.log("📘 Phase 3: ingesting source book from celestial_original...");
  runBrainLabEntityPipeline();
  ensureDir(STORIES_DIR);
  ensureDir(MISSION_LOGS_DIR);
  ensureDir(RAW_DIR);

  const epubPath = path.join(SOURCE_DIR, "celestial-heritage.epub");
  const regenFromEpub = process.env.REGENERATE_CHAPTERS_FROM_EPUB === "1";
  if (!regenFromEpub || !fs.existsSync(epubPath)) {
    if (!fs.existsSync(epubPath)) {
      console.warn(`[ingest] No EPUB at ${epubPath}; skipping EPUB-derived outputs.`);
    } else if (!regenFromEpub) {
      console.warn(
        `[ingest] Skipping EPUB regeneration (opt-in). To rewrite CH## stories and mission inventory: REGENERATE_CHAPTERS_FROM_EPUB=1 npm run ingest:book`
      );
    } else {
      console.warn(
        `[ingest] REGENERATE_CHAPTERS_FROM_EPUB=1 but no file at ${epubPath}; skipping.`
      );
    }
    writeReviewQueue();
    return;
  }

  // Keep non-CH wiki stories untouched; refresh generated chapter artifacts each run.
  for (const file of fs.readdirSync(STORIES_DIR)) {
    if (/^CH\d{2}-.+\.md$/.test(file)) {
      fs.unlinkSync(path.join(STORIES_DIR, file));
    }
  }

  const zipEntries = extractZipEntries(epubPath)
    .filter((entry) => /^OEBPS\/\d+_chapter-\d+.+\.xhtml$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const parsedChapters: ParsedChapter[] = [];
  const missionInventory: MissionLogInventoryRow[] = [];

  for (const entry of zipEntries) {
    const chapterNumberMatch = entry.name.match(/chapter-(\d+)/i);
    if (!chapterNumberMatch) continue;
    const chapterNumber = parseInt(chapterNumberMatch[1], 10);
    const lines = htmlToLines(entry.content);
    const parsed = parseChapterFromLines(chapterNumber, lines);
    if (!parsed) continue;
    parsedChapters.push(parsed);

    const storyMarkdown = buildStoryMarkdown(parsed);
    const slug = slugify(parsed.chapterTitle);
    const storyFilename = `${parsed.chapterId}-${slug}.md`;
    fs.writeFileSync(path.join(STORIES_DIR, storyFilename), storyMarkdown);

    for (const segment of parsed.segments) {
      if (segment.kind !== "mission_log") continue;
      missionInventory.push({
        logId: segment.logId,
        chapterId: parsed.chapterId,
        chapterNumber: parsed.chapterNumber,
        chapterTitle: parsed.chapterTitle,
        dateShipTime: segment.dateShipTime,
        author: segment.author,
        logType: segment.logType,
        location: segment.location,
        privacyLevel: segment.privacyLevel,
        summary: segment.summary,
        mainBody: segment.mainBody,
        attachments: segment.attachments,
        sourceFile: entry.name,
      });
    }
  }

  missionInventory.sort((a, b) => a.logId.localeCompare(b.logId));
  fs.writeFileSync(
    INVENTORY_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "celestial_original/celestial-heritage.epub",
        missionLogs: missionInventory,
      },
      null,
      2
    )
  );

  const missionLogMd: string[] = [
    "# Mission Log Inventory",
    "",
    `Generated from \`celestial_original/celestial-heritage.epub\` on ${new Date().toISOString()}.`,
    "",
    `**${missionInventory.length} mission logs** across **${parsedChapters.length} chapters**.`,
    "",
    "## Logs",
    "",
  ];
  for (const item of missionInventory) {
    missionLogMd.push(
      `- **${item.logId}** — ${item.chapterId} (${item.chapterTitle})`,
      `  - Date/Time: ${item.dateShipTime || "—"}`,
      `  - Author: ${item.author || "—"} | Type: ${item.logType || "—"}`,
      `  - Location: ${item.location || "—"}`,
      `  - Summary: ${item.summary || "—"}`,
      item.attachments.length > 0
        ? `  - Attachments: ${item.attachments.join(" | ")}`
        : "  - Attachments: —",
      ""
    );
  }
  fs.writeFileSync(path.join(MISSION_LOGS_DIR, "index.md"), missionLogMd.join("\n"));

  console.log(`✅ Parsed ${parsedChapters.length} chapters`);
  console.log(`✅ Wrote ${missionInventory.length} mission logs inventory rows`);
  console.log(`✅ Stories → ${STORIES_DIR}`);
  console.log(`✅ Mission logs index → ${path.join(MISSION_LOGS_DIR, "index.md")}`);
  console.log(`✅ Mission logs JSON → ${INVENTORY_JSON}`);
  writeReviewQueue();
  console.log(`✅ Review queue → ${BRAIN_LAB_REVIEW_QUEUE}`);
}

main();
