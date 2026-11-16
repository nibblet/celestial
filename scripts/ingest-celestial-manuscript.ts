/**
 * Manuscript ingest (canonical source: the final copyedited book).
 *
 * Parses the Markdown export of the finished manuscript
 * (`celestial_original/Celestial_Heritage_-_FINAL_v3_app.md`, gitignored) and
 * regenerates:
 *   - content/wiki/stories/CH##-<slug>.md      (one page per chapter)
 *   - content/raw/mission_logs_inventory.json  (machine-readable log rows)
 *   - content/wiki/mission-logs/index.md       (human-readable log index)
 *
 * Manuscript shape:
 *   # Chapter Title            -> chapter (numbered by order; back matter skipped)
 *   ## Scene Title             -> `### Scene N: Title`
 *   ### Parable: X             -> `#### Parable: X` (stays inside its scene)
 *   > **MISSION LOG <ID>**     -> `#### Mission Log <ID>` + the log as a blockquote
 *   ----------                 -> `* * *` scene break
 *
 * Mission logs use `####` so they stay inside their scene: the scene parser
 * (src/lib/wiki/scene-parser.ts) closes a scene at any `### ` heading and
 * drops what follows until the next scene, which would lose the prose after
 * a log.
 *
 * The final book carries no "Date / Ship Time" on its logs. The app's mission
 * timeline still uses those dates, so they are carried forward from the
 * previous inventory by log id (never rendered on the story pages).
 *
 * Run: npm run ingest:manuscript [-- path/to/manuscript.md]
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const DEFAULT_SOURCE = path.join(
  ROOT,
  "celestial_original/Celestial_Heritage_-_FINAL_v3_app.md"
);
const SOURCE_LABEL = "Celestial Heritage, Book I — final manuscript (v3)";
const STORIES_DIR = path.join(ROOT, "content/wiki/stories");
const MISSION_LOGS_DIR = path.join(ROOT, "content/wiki/mission-logs");
const INVENTORY_JSON = path.join(ROOT, "content/raw/mission_logs_inventory.json");
const BACK_MATTER = new Set(["acknowledgments", "about the author"]);

const HEADER_FIELDS = ["Date / Ship Time", "Author", "Log Type", "Location", "Privacy Level", "Summary"] as const;
type HeaderField = (typeof HEADER_FIELDS)[number];

export interface ManuscriptLog {
  logId: string;
  fields: Partial<Record<HeaderField, string>>;
  /** Paragraphs of the log after its header fields, excluding attachments. */
  bodyParagraphs: string[];
  attachments: string[];
  /** Original blockquote lines (minus the title line), unescaped. */
  quoteLines: string[];
}

export interface ManuscriptScene {
  number: number;
  title: string;
  /** Rendered markdown body (logs + parables converted). */
  body: string;
  logs: ManuscriptLog[];
}

export interface ManuscriptChapter {
  number: number;
  id: string;
  title: string;
  scenes: ManuscriptScene[];
}

function unescapeMd(s: string): string {
  return s.replace(/\\([|[\]])/g, "$1");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Split blockquote content lines (without "> ") into paragraphs. */
function paragraphsOf(lines: string[]): string[] {
  const out: string[] = [];
  let cur: string[] = [];
  for (const l of lines) {
    if (l.trim() === "") {
      if (cur.length) out.push(cur.join(" ").trim());
      cur = [];
    } else cur.push(l.trim());
  }
  if (cur.length) out.push(cur.join(" ").trim());
  return out;
}

const LABEL_RE = /^\*\*([^*]+?):\*\*\s*(.*)$/;

export function parseLogBlock(logId: string, lines: string[]): ManuscriptLog {
  const paras = paragraphsOf(lines);
  const fields: ManuscriptLog["fields"] = {};
  const bodyParagraphs: string[] = [];
  const attachments: string[] = [];
  let section: "header" | "body" | "attachments" = "header";
  let pendingField: HeaderField | null = null;

  for (const p of paras) {
    const m = p.match(LABEL_RE);
    const label = m?.[1].trim();
    if (m && label === "Main Body") {
      section = "body";
      pendingField = null;
      if (m[2]) bodyParagraphs.push(m[2]);
      continue;
    }
    if (m && label === "Attachments") {
      section = "attachments";
      pendingField = null;
      if (m[2]) attachments.push(m[2]);
      continue;
    }
    if (section === "attachments") {
      const item = p.replace(/^[•\-*]\s*/, "").trim();
      if (/^[•\-*]\s/.test(p) || item.length <= 160) {
        attachments.push(item);
        continue;
      }
      // Prose after attachments belongs to the body, not the attachment list.
      section = "body";
    }
    if (section === "header" && m && (HEADER_FIELDS as readonly string[]).includes(label!)) {
      const f = label as HeaderField;
      if (m[2]) {
        fields[f] = m[2];
        pendingField = null;
      } else pendingField = f;
      continue;
    }
    if (section === "header" && pendingField && !m) {
      fields[pendingField] = p;
      pendingField = null;
      continue;
    }
    // Anything else (Entry:, Anomaly:, untagged fragments) is body content.
    bodyParagraphs.push(p);
  }

  return { logId, fields, bodyParagraphs, attachments, quoteLines: lines };
}

function renderLog(log: ManuscriptLog): string[] {
  const out = [`#### Mission Log ${log.logId}`, ""];
  // Re-emit the book's blockquote, normalising the attachments list into
  // markdown bullets so it renders as a list.
  for (const l of log.quoteLines) {
    const bullet = l.match(/^•\s*(.+)$/);
    out.push(bullet ? `> - ${bullet[1]}` : l === "" ? ">" : `> ${l}`);
  }
  // Collapse the blank quote lines between consecutive bullets.
  const collapsed: string[] = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i] === ">" && out[i - 1]?.startsWith("> - ") && out[i + 1]?.startsWith("> - ")) continue;
    collapsed.push(out[i]);
  }
  return [...collapsed, ""];
}

export function parseManuscript(md: string): ManuscriptChapter[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const chapters: ManuscriptChapter[] = [];
  let chapter: ManuscriptChapter | null = null;
  let scene: { number: number; title: string; out: string[]; logs: ManuscriptLog[] } | null = null;
  let inBackMatter = false;

  const flushScene = () => {
    if (chapter && scene) {
      chapter.scenes.push({
        number: scene.number,
        title: scene.title,
        body: scene.out.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
        logs: scene.logs,
      });
    }
    scene = null;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      flushScene();
      const title = h1[1].trim();
      inBackMatter = BACK_MATTER.has(title.toLowerCase());
      if (inBackMatter) {
        chapter = null;
      } else {
        const number = chapters.length + 1;
        chapter = { number, id: `CH${String(number).padStart(2, "0")}`, title, scenes: [] };
        chapters.push(chapter);
      }
      i++;
      continue;
    }
    if (inBackMatter || !chapter) {
      i++;
      continue;
    }
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      flushScene();
      scene = { number: chapter.scenes.length + 1, title: unescapeMd(h2[1].trim()), out: [], logs: [] };
      i++;
      continue;
    }
    if (!scene) {
      if (line.trim()) throw new Error(`${chapter.id}: text before first scene heading: ${line.slice(0, 80)}`);
      i++;
      continue;
    }
    const s = scene as { out: string[]; logs: ManuscriptLog[] };
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      s.out.push(`#### ${unescapeMd(h3[1].trim())}`);
      i++;
      continue;
    }
    if (/^-{3,}\s*$/.test(line)) {
      s.out.push("* * *");
      i++;
      continue;
    }
    if (line.startsWith(">")) {
      // Gather the whole blockquote.
      const block: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        block.push(unescapeMd(lines[i].replace(/^>\s?/, "")));
        i++;
      }
      // A blockquote may hold one or more mission logs, or none (fragments).
      let current: { id: string; lines: string[] } | null = null;
      const pre: string[] = [];
      const flushLog = () => {
        if (!current) return;
        while (current.lines.length && current.lines[0].trim() === "") current.lines.shift();
        while (current.lines.length && current.lines[current.lines.length - 1].trim() === "") current.lines.pop();
        const log = parseLogBlock(current.id, current.lines);
        s.logs.push(log);
        s.out.push(...renderLog(log));
        current = null;
      };
      for (const bl of block) {
        const t = bl.match(/^\*\*MISSION LOG\s+(.+?)\*\*\s*$/);
        if (t) {
          if (!current && pre.some((x) => x.trim())) {
            s.out.push(...pre.map((x) => (x ? `> ${x}` : ">")), "");
          }
          pre.length = 0;
          flushLog();
          current = { id: t[1].trim(), lines: [] };
          continue;
        }
        if (current) (current as { lines: string[] }).lines.push(bl);
        else pre.push(bl);
      }
      flushLog();
      if (pre.some((x) => x.trim())) s.out.push(...pre.map((x) => (x ? `> ${x}` : ">")), "");
      continue;
    }
    s.out.push(unescapeMd(line));
    i++;
  }
  flushScene();
  return chapters;
}

/** Plain text for the inventory (the mission-log page renders it unformatted). */
function plain(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").trim();
}

function firstParagraph(body: string): string {
  for (const p of body.split(/\n\n+/)) {
    const t = p.trim();
    if (t && !t.startsWith("#") && !t.startsWith(">") && t !== "* * *" && !/^\*[^*].*\*$/.test(t)) {
      return t.replace(/\s*\n\s*/g, " ");
    }
  }
  return "";
}

export function buildStoryMarkdown(ch: ManuscriptChapter): string {
  const parts: string[] = [];
  for (const sc of ch.scenes) parts.push(`### Scene ${sc.number}: ${sc.title}`, "", sc.body, "");
  const fullText = parts.join("\n").trim();
  const logs = ch.scenes.flatMap((s) => s.logs);
  const summary = firstParagraph(ch.scenes[0]?.body ?? "") || `Narrative chapter ${ch.id}.`;
  const lines = [
    `# Chapter ${ch.number}: ${ch.title}`,
    "",
    `> ${summary}`,
    "",
    `**Story ID:** ${ch.id}`,
    `**Life Stage:** Main Narrative`,
    `**Themes:** Fiction Narrative`,
    `**Word Count:** ${fullText.split(/\s+/).filter(Boolean).length}`,
    "",
    "## Full Text",
    "",
    fullText,
    "",
  ];
  if (logs.length) {
    lines.push("## Mission Logs", "");
    for (const l of logs) lines.push(`- [[${l.logId}]] ${l.fields.Summary || "Mission log entry"}`);
    lines.push("");
  }
  lines.push("---", `*Sources: ${SOURCE_LABEL}*`, "");
  return lines.join("\n");
}

interface InventoryRow {
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

function main() {
  const sourcePath = path.resolve(process.argv[2] ?? DEFAULT_SOURCE);
  if (!fs.existsSync(sourcePath)) {
    console.error(`[ingest:manuscript] No manuscript at ${sourcePath}`);
    process.exit(1);
  }
  const chapters = parseManuscript(fs.readFileSync(sourcePath, "utf-8"));

  // Carry dates forward from the previous inventory (the book has none).
  const priorDates = new Map<string, string>();
  if (fs.existsSync(INVENTORY_JSON)) {
    const prior = JSON.parse(fs.readFileSync(INVENTORY_JSON, "utf-8")) as { missionLogs?: InventoryRow[] };
    for (const r of prior.missionLogs ?? []) if (r.dateShipTime) priorDates.set(r.logId, r.dateShipTime);
  }

  for (const f of fs.readdirSync(STORIES_DIR)) {
    if (/^CH\d{2}-.+\.md$/.test(f)) fs.unlinkSync(path.join(STORIES_DIR, f));
  }

  const inventory: InventoryRow[] = [];
  for (const ch of chapters) {
    fs.writeFileSync(path.join(STORIES_DIR, `${ch.id}-${slugify(ch.title)}.md`), buildStoryMarkdown(ch));
    for (const sc of ch.scenes) {
      for (const log of sc.logs) {
        inventory.push({
          logId: log.logId,
          chapterId: ch.id,
          chapterNumber: ch.number,
          chapterTitle: ch.title,
          dateShipTime: log.fields["Date / Ship Time"] || priorDates.get(log.logId) || "",
          author: plain(log.fields.Author || ""),
          logType: plain(log.fields["Log Type"] || ""),
          location: plain(log.fields.Location || ""),
          privacyLevel: plain(log.fields["Privacy Level"] || ""),
          summary: plain(log.fields.Summary || ""),
          mainBody: log.bodyParagraphs.map(plain).join("\n\n"),
          attachments: log.attachments.map(plain),
          sourceFile: `${path.basename(sourcePath)}#${ch.id}/${slugify(sc.title)}`,
        });
      }
    }
  }
  inventory.sort((a, b) => a.logId.localeCompare(b.logId));

  fs.writeFileSync(
    INVENTORY_JSON,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), source: SOURCE_LABEL, missionLogs: inventory },
      null,
      2
    ) + "\n"
  );

  const md = [
    "# Mission Log Inventory",
    "",
    `Generated from ${SOURCE_LABEL} on ${new Date().toISOString()}.`,
    "",
    `**${inventory.length} mission logs** across **${chapters.length} chapters**.`,
    "",
    "## Logs",
    "",
  ];
  for (const r of inventory) {
    md.push(
      `- **${r.logId}** — ${r.chapterId} (${r.chapterTitle})`,
      `  - Date/Time: ${r.dateShipTime || "—"}`,
      `  - Author: ${r.author || "—"} | Type: ${r.logType || "—"}`,
      `  - Location: ${r.location || "—"}`,
      `  - Summary: ${r.summary || "—"}`,
      r.attachments.length ? `  - Attachments: ${r.attachments.join("; ")}` : "  - Attachments: —",
      ""
    );
  }
  fs.mkdirSync(MISSION_LOGS_DIR, { recursive: true });
  fs.writeFileSync(path.join(MISSION_LOGS_DIR, "index.md"), md.join("\n"));

  console.log(`✅ ${chapters.length} chapters, ${chapters.reduce((n, c) => n + c.scenes.length, 0)} scenes, ${inventory.length} mission logs`);
}

if (require.main === module) main();
