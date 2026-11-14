/**
 * generate-connectors.ts
 *
 * Generates AI connector text between adjacent stories in each Guided Journey,
 * then writes the results back into the journey markdown files under a
 * ## Connectors section. Safe to re-run — skips any pair already written.
 *
 * Usage:
 *   npx tsx scripts/generate-connectors.ts
 *
 * Requires ANTHROPIC_API_KEY in your environment or .env.local.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

// Load .env.local if present (Node 20.6+ can use --env-file instead)
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const JOURNEYS_DIR = path.join(process.cwd(), "content/wiki/journeys");
const STORIES_DIR = path.join(process.cwd(), "content/wiki/stories");

// --- Story helpers ---

interface StoryInfo {
  title: string;
  summary: string;
  firstPrinciple: string;
}

function getStoryInfo(storyId: string): StoryInfo {
  const files = fs.readdirSync(STORIES_DIR);
  const file = files.find((f) => f.startsWith(storyId) && f.endsWith(".md"));
  if (!file) return { title: storyId, summary: "", firstPrinciple: "" };

  const content = fs.readFileSync(path.join(STORIES_DIR, file), "utf-8");

  const titleMatch = content.match(/^# (.+)/m);
  const title = titleMatch?.[1]?.trim() || storyId;

  const summaryMatch = content.match(/\*\*Summary:\*\*\s*(.+)/);
  const summary = summaryMatch?.[1]?.trim() || "";

  const principlesBlock = content.match(/## Principles\s*\n\n([\s\S]*?)(?=\n## |\n*$)/);
  let firstPrinciple = "";
  if (principlesBlock) {
    const firstLine = principlesBlock[1].split("\n").find((l) => l.startsWith("- "));
    if (firstLine) firstPrinciple = firstLine.replace(/^-\s*/, "").trim();
  }

  return { title, summary, firstPrinciple };
}

// --- Connector generation ---

async function generateConnector(
  journeyTitle: string,
  fromId: string,
  toId: string
): Promise<string> {
  const from = getStoryInfo(fromId);
  const to = getStoryInfo(toId);

  const prompt = `You are writing a 2-sentence bridge that connects two adjacent stories in a family memoir storybook.

Journey: "${journeyTitle}"

Story the reader just finished:
- Title: "${from.title}"
- What it's about: ${from.summary}
- Core lesson: ${from.firstPrinciple || "growth through experience"}

Story coming up next:
- Title: "${to.title}"
- What it's about: ${to.summary}

Write exactly 2 sentences that:
1. Name or reflect on the emotional core of what was just read — not a summary, more like an echo
2. Create a sense of forward movement into the next story without spoiling it
3. Sound warm, reflective, and wise — like a thoughtful narrator bridging two chapters of a memoir
4. Feel earned, not promotional — this is not a teaser, it is a genuine connection

Rules:
- Do not start with "In this story", "You just read", or "Now"
- Do not use em-dashes as openers
- Keep it under 60 words total
- Output only the 2 sentences — no labels, no quotes, no explanation`;

  const message = await anthropic.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 120,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

// --- File processing ---

function parseStoryIds(content: string): string[] {
  const block = content.match(/## Stories\s*\n\n([\s\S]*?)(?=\n## |\n*$)/);
  if (!block) return [];
  const ids: string[] = [];
  for (const line of block[1].split("\n")) {
    const m = line.match(/\[\[(P\d+_S\d+)\]\]/);
    if (m) ids.push(m[1]);
  }
  return ids;
}

function parseExistingConnectors(content: string): Record<string, string> {
  const block = content.match(/## Connectors\s*\n\n([\s\S]*?)(?=\n## |\n*$)/);
  const result: Record<string, string> = {};
  if (!block) return result;
  for (const line of block[1].split("\n")) {
    const m = line.match(/^-\s*\[\[(\w+)→(\w+)\]\]:\s*(.+)$/);
    if (m) result[`${m[1]}→${m[2]}`] = m[3].trim();
  }
  return result;
}

function buildConnectorsSection(
  storyIds: string[],
  connectors: Record<string, string>
): string {
  const lines = storyIds.slice(0, -1).map((fromId, i) => {
    const toId = storyIds[i + 1];
    const key = `${fromId}→${toId}`;
    return `- [[${fromId}→${toId}]]: ${connectors[key] || ""}`;
  });
  return `## Connectors\n\n${lines.join("\n")}`;
}

async function processFile(filename: string) {
  const filePath = path.join(JOURNEYS_DIR, filename);
  let content = fs.readFileSync(filePath, "utf-8");

  const storyIds = parseStoryIds(content);
  if (storyIds.length < 2) {
    console.log(`  Skipping — fewer than 2 stories`);
    return;
  }

  const titleMatch = content.match(/^# (.+)/m);
  const journeyTitle = titleMatch?.[1]?.trim() || filename;

  const connectors = parseExistingConnectors(content);
  let anyNew = false;

  for (let i = 0; i < storyIds.length - 1; i++) {
    const fromId = storyIds[i];
    const toId = storyIds[i + 1];
    const key = `${fromId}→${toId}`;

    if (connectors[key]) {
      console.log(`  ${key}: already exists`);
      continue;
    }

    process.stdout.write(`  ${key}: generating...`);
    const text = await generateConnector(journeyTitle, fromId, toId);
    connectors[key] = text;
    anyNew = true;
    console.log(` done`);
  }

  if (!anyNew) {
    console.log(`  No new connectors needed`);
    return;
  }

  const section = buildConnectorsSection(storyIds, connectors);

  if (content.includes("## Connectors")) {
    // Replace existing section (greedy up to next ## or end of file)
    content = content.replace(
      /## Connectors\s*\n\n[\s\S]*?(?=\n## |\s*$)/,
      section
    );
  } else {
    content = content.trimEnd() + `\n\n${section}\n`;
  }

  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  Written to ${filename}`);
}

// --- Main ---

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY not set. Add it to .env.local or your environment.");
    process.exit(1);
  }

  const files = fs.readdirSync(JOURNEYS_DIR).filter((f) => f.endsWith(".md"));
  console.log(`Found ${files.length} journey files\n`);

  for (const file of files) {
    console.log(`Processing: ${file}`);
    await processFile(file);
    console.log();
  }

  console.log("All done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
