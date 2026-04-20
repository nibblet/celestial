/**
 * enrich-character-dossier.ts
 *
 * For each primary character (one with a `## Dossier` block), generate four
 * AI-derived sub-fields grounded in the canonical dossier + chapter excerpts:
 *
 *   - Key Relationships
 *   - Notable Moments
 *   - Voice & Manner
 *   - Timeline
 *
 * Output is written back into the wiki file between idempotent markers:
 *
 *   <!-- ai-dossier:relationships generated="YYYY-MM-DD" reviewed="false"
 *        model="..." source-hash="..." -->
 *   ### Key Relationships
 *   ...
 *   <!-- ai-dossier:end -->
 *
 * Rules:
 *   - `reviewed="true"` blocks are preserved unless --force-reviewed.
 *   - `reviewed="false"` blocks are skipped if source-hash matches and no
 *     --force. Otherwise regenerated.
 *
 * CLI:
 *   npx tsx scripts/enrich-character-dossier.ts --dry-run
 *   npx tsx scripts/enrich-character-dossier.ts --character aven-voss
 *   npx tsx scripts/enrich-character-dossier.ts --field voice
 *   npx tsx scripts/enrich-character-dossier.ts --force
 *   npx tsx scripts/enrich-character-dossier.ts --force-reviewed
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";

// Load .env.local without requiring dotenv.
(() => {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
})();

const MODEL = "claude-sonnet-4-5";
const WIKI = path.join(process.cwd(), "content/wiki");
const CHAR_DIR = path.join(WIKI, "characters");
const STORIES_DIR = path.join(WIKI, "stories");

type DerivedField = "relationships" | "moments" | "voice" | "timeline";

const ALL_FIELDS: DerivedField[] = ["relationships", "moments", "voice", "timeline"];

const MARKER_NAME: Record<DerivedField, string> = {
  relationships: "relationships",
  moments: "moments",
  voice: "voice",
  timeline: "timeline",
};

const HEADING: Record<DerivedField, string> = {
  relationships: "Key Relationships",
  moments: "Notable Moments",
  voice: "Voice & Manner",
  timeline: "Timeline",
};

interface CharacterFile {
  slug: string;
  name: string;
  path: string;
  raw: string;
  role: string;
  profile: string;
  arc: string;
  chapterIds: string[];
  aliases: string[];
}

interface ExistingBlock {
  field: DerivedField;
  fullMatch: string;
  body: string;
  generated: string;
  reviewed: boolean;
  model: string;
  sourceHash: string;
}

interface Options {
  dryRun: boolean;
  onlySlug: string | null;
  onlyField: DerivedField | null;
  force: boolean;
  forceReviewed: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const getFlag = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };
  const field = getFlag("--field");
  if (field && !ALL_FIELDS.includes(field as DerivedField)) {
    console.error(
      `Unknown --field "${field}". Must be one of: ${ALL_FIELDS.join(", ")}`
    );
    process.exit(1);
  }
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    forceReviewed: args.includes("--force-reviewed"),
    onlySlug: getFlag("--character"),
    onlyField: (field as DerivedField) ?? null,
  };
}

function extractDossierSubField(
  raw: string,
  heading: string
): string {
  const re = new RegExp(
    `### ${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\n([\\s\\S]*?)(?=\\n### |\\n<!--\\s*ai-dossier|\\n## |$)`
  );
  const m = raw.match(re);
  return m?.[1]?.trim() ?? "";
}

function extractChapterIds(raw: string): string[] {
  const ids = new Set<string>();
  const re = /\bCH(\d{2,3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) ids.add(`CH${m[1]}`);
  return [...ids].sort();
}

function extractAliases(raw: string): string[] {
  const m = raw.match(/\*\*Aliases:\*\*\s*(.+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadCharacter(filename: string): CharacterFile | null {
  const filepath = path.join(CHAR_DIR, filename);
  const raw = fs.readFileSync(filepath, "utf-8");
  if (!/^## Dossier$/m.test(raw)) return null;
  const slug =
    raw.match(/\*\*Slug:\*\*\s*(.+)/)?.[1]?.trim() || filename.replace(/\.md$/, "");
  const name = raw.match(/^# (.+)/m)?.[1]?.trim() || slug;
  return {
    slug,
    name,
    path: filepath,
    raw,
    role: extractDossierSubField(raw, "Role"),
    profile: extractDossierSubField(raw, "Profile"),
    arc: extractDossierSubField(raw, "Character Arc"),
    chapterIds: extractChapterIds(raw),
    aliases: extractAliases(raw),
  };
}

function loadStoryBody(chapterId: string): { title: string; text: string } | null {
  const file = fs
    .readdirSync(STORIES_DIR)
    .find((f) => f.startsWith(`${chapterId}-`));
  if (!file) return null;
  const raw = fs.readFileSync(path.join(STORIES_DIR, file), "utf-8");
  const title = raw.match(/^# (.+)/m)?.[1]?.trim() || chapterId;
  const text =
    raw.match(/## Full Text\n\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() || "";
  return { title, text };
}

function passagesMentioning(text: string, needles: string[]): string {
  const paragraphs = text.split(/\n\s*\n/);
  const hits = new Set<number>();
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (needles.some((n) => n && p.includes(n))) {
      hits.add(i);
      if (i > 0) hits.add(i - 1);
      if (i < paragraphs.length - 1) hits.add(i + 1);
    }
  }
  return [...hits]
    .sort((a, b) => a - b)
    .map((i) => paragraphs[i])
    .join("\n\n");
}

interface ChapterExcerpt {
  chapterId: string;
  title: string;
  body: string;
}

function buildExcerpts(char: CharacterFile): ChapterExcerpt[] {
  const needles = [char.name, ...char.aliases];
  const firstName = char.name.split(/\s+/)[0];
  if (firstName && firstName.length >= 3 && !needles.includes(firstName)) {
    needles.push(firstName);
  }
  const out: ChapterExcerpt[] = [];
  for (const id of char.chapterIds) {
    const story = loadStoryBody(id);
    if (!story) continue;
    const body = passagesMentioning(story.text, needles);
    if (!body.trim()) continue;
    out.push({ chapterId: id, title: story.title, body });
  }
  return out;
}

function sourceHash(char: CharacterFile, excerpts: ChapterExcerpt[]): string {
  const input = [
    char.role,
    char.profile,
    char.arc,
    ...excerpts.map((e) => `${e.chapterId}::${e.body}`),
  ].join("\n---\n");
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 10);
}

function findExistingBlocks(raw: string): ExistingBlock[] {
  const blocks: ExistingBlock[] = [];
  const re =
    /<!--\s*ai-dossier:(relationships|moments|voice|timeline)\s+([^>]*?)-->\n([\s\S]*?)\n<!--\s*ai-dossier:end\s*-->/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const attrs = m[2];
    const get = (k: string) =>
      attrs.match(new RegExp(`${k}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ?? "";
    blocks.push({
      field: m[1].toLowerCase() as DerivedField,
      fullMatch: m[0],
      body: m[3].trim(),
      generated: get("generated"),
      reviewed: get("reviewed").toLowerCase() === "true",
      model: get("model"),
      sourceHash: get("source-hash"),
    });
  }
  return blocks;
}

function renderBlock(
  field: DerivedField,
  body: string,
  meta: { generated: string; reviewed: boolean; model: string; sourceHash: string }
): string {
  return [
    `<!-- ai-dossier:${MARKER_NAME[field]} generated="${meta.generated}" reviewed="${meta.reviewed}" model="${meta.model}" source-hash="${meta.sourceHash}" -->`,
    `### ${HEADING[field]}`,
    body.trim(),
    `<!-- ai-dossier:end -->`,
  ].join("\n");
}

function upsertBlock(
  raw: string,
  field: DerivedField,
  rendered: string
): string {
  const existingRe = new RegExp(
    `<!--\\s*ai-dossier:${MARKER_NAME[field]}\\s[\\s\\S]*?<!--\\s*ai-dossier:end\\s*-->`,
    "i"
  );
  if (existingRe.test(raw)) {
    return raw.replace(existingRe, rendered);
  }
  // Insert at end of ## Dossier block, before the next ## heading or EOF.
  const dossierStart = raw.indexOf("## Dossier");
  if (dossierStart === -1) return raw;
  const afterDossier = raw.indexOf("\n## ", dossierStart + 1);
  const insertAt = afterDossier === -1 ? raw.length : afterDossier;
  const before = raw.slice(0, insertAt).trimEnd();
  const after = afterDossier === -1 ? "" : raw.slice(insertAt);
  return `${before}\n\n${rendered}\n${after}`;
}

function systemPrompt(): string {
  return `You are writing entries for the Celestial story wiki. You will be given (a) the canonical dossier for ONE character, (b) chapter excerpts where they appear. Produce ONLY the requested section body, as markdown, WITHOUT the section heading line.

Rules:
- Ground every claim in the excerpts or canonical dossier. Do not invent chapter ids, relationships, or quotes.
- Never cite a chapter id that isn't in the provided excerpts.
- If evidence is insufficient, return the literal string INSUFFICIENT_EVIDENCE and nothing else.
- Do not wrap output in code fences.`;
}

function fieldPrompt(
  char: CharacterFile,
  excerpts: ChapterExcerpt[],
  field: DerivedField
): string {
  const canonical = `## Canonical dossier (ground truth)

**Role:** ${char.role}

**Profile:** ${char.profile}

**Character Arc:** ${char.arc}`;

  const excerptBlock = excerpts
    .map((e) => `### ${e.chapterId} — ${e.title}\n\n${e.body}\n`)
    .join("\n");

  const task: Record<DerivedField, string> = {
    relationships: `## Task

Produce 3–6 bullets describing this character's most important relationships in the book. Format each bullet as:

\`- **Name** — short description (CHxx, CHyy).\`

Only include relationships supported by the excerpts or canonical dossier. Keep total output under 400 characters. Emit ONLY the bullets, no heading.`,
    moments: `## Task

Pick 3–5 specific scenes that most define this character. Format each as:

\`- **CHxx Title** — one-sentence description.\`

Then, when a direct quote from or about this character appears in the excerpts and captures the moment, include ONE ≤30-word direct quote from the excerpts in quotation marks, after the description. Never invent a quote. Emit ONLY the bullets, no heading. Under 800 characters total.`,
    voice: `## Task

Write 2–3 sentences describing how this character speaks and carries themselves, grounded in the excerpts. No psychology, no inferred motivation — only observable voice and manner. Emit ONLY the sentences, no heading. Under 400 characters.`,
    timeline: `## Task

One bullet per chapter in which the character meaningfully appears, ordered by chapter number. Format:

\`- **CHxx Title** — one-sentence beat.\`

Only include chapters where the excerpt shows actual action, dialogue, or decision by the character. Skip mere mentions. Emit ONLY the bullets, no heading. Under 1500 characters total.`,
  };

  return `You are writing the **${HEADING[field]}** section of the dossier for **${char.name}**.

${canonical}

## Chapter excerpts

${excerptBlock}

${task[field]}`;
}

async function generateField(
  client: Anthropic,
  char: CharacterFile,
  excerpts: ChapterExcerpt[],
  field: DerivedField
): Promise<string> {
  const prompt = fieldPrompt(char, excerpts, field);
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: systemPrompt(),
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = res.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in model response");
  }
  return textBlock.text.trim();
}

function validateField(
  body: string,
  field: DerivedField,
  allowedChapters: Set<string>
): { ok: true } | { ok: false; reason: string } {
  if (!body || body === "INSUFFICIENT_EVIDENCE") {
    return { ok: false, reason: "INSUFFICIENT_EVIDENCE" };
  }
  const citedChapters = new Set<string>();
  const re = /\bCH(\d{2,3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) citedChapters.add(`CH${m[1]}`);
  for (const cited of citedChapters) {
    if (!allowedChapters.has(cited)) {
      return { ok: false, reason: `cites unlisted chapter ${cited}` };
    }
  }
  if (field !== "voice" && citedChapters.size === 0) {
    return { ok: false, reason: "no chapter citations" };
  }
  return { ok: true };
}

async function processCharacter(
  client: Anthropic | null,
  char: CharacterFile,
  opts: Options
): Promise<{ wrote: DerivedField[]; skipped: DerivedField[]; errors: string[] }> {
  const excerpts = buildExcerpts(char);
  const allowedChapters = new Set(char.chapterIds);
  const hash = sourceHash(char, excerpts);
  const existing = findExistingBlocks(char.raw);
  const existingByField = new Map<DerivedField, ExistingBlock>(
    existing.map((b) => [b.field, b])
  );
  const generated = new Date().toISOString().slice(0, 10);

  const wrote: DerivedField[] = [];
  const skipped: DerivedField[] = [];
  const errors: string[] = [];

  const targetFields = opts.onlyField ? [opts.onlyField] : ALL_FIELDS;

  let raw = char.raw;

  for (const field of targetFields) {
    const prior = existingByField.get(field);

    if (prior?.reviewed && !opts.forceReviewed) {
      skipped.push(field);
      continue;
    }
    if (
      prior &&
      !prior.reviewed &&
      prior.sourceHash === hash &&
      !opts.force &&
      !opts.forceReviewed
    ) {
      skipped.push(field);
      continue;
    }
    if (excerpts.length === 0 && field !== "voice") {
      errors.push(`${char.slug}/${field}: no usable chapter excerpts`);
      continue;
    }

    if (opts.dryRun) {
      console.log(
        `\n── DRY RUN: ${char.slug} / ${field} (hash=${hash}, prior=${prior ? (prior.reviewed ? "reviewed" : "draft") : "none"}) ──`
      );
      console.log(fieldPrompt(char, excerpts, field).slice(0, 1200) + "\n...");
      wrote.push(field);
      continue;
    }

    if (!client) throw new Error("API client not initialized");

    try {
      const body = await generateField(client, char, excerpts, field);
      const validation = validateField(body, field, allowedChapters);
      if (!validation.ok) {
        errors.push(`${char.slug}/${field}: ${validation.reason}`);
        continue;
      }
      const rendered = renderBlock(field, body, {
        generated,
        reviewed: false,
        model: MODEL,
        sourceHash: hash,
      });
      raw = upsertBlock(raw, field, rendered);
      wrote.push(field);
      console.log(`  ✓ ${char.slug}/${field}`);
    } catch (err) {
      errors.push(
        `${char.slug}/${field}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (!opts.dryRun && raw !== char.raw) {
    fs.writeFileSync(char.path, raw);
  }

  return { wrote, skipped, errors };
}

async function main() {
  const opts = parseArgs();

  const files = fs
    .readdirSync(CHAR_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => !opts.onlySlug || f === `${opts.onlySlug}.md`);

  if (opts.onlySlug && files.length === 0) {
    console.error(`No character file for --character ${opts.onlySlug}`);
    process.exit(1);
  }

  const chars = files
    .map(loadCharacter)
    .filter((c): c is CharacterFile => !!c);

  if (chars.length === 0) {
    console.log("No characters with a ## Dossier section found.");
    return;
  }

  const client = opts.dryRun
    ? null
    : (() => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          console.error(
            "ANTHROPIC_API_KEY missing. Run with --dry-run or export the key."
          );
          process.exit(1);
        }
        return new Anthropic({ apiKey });
      })();

  const totals = { wrote: 0, skipped: 0, errors: 0 };
  for (const char of chars) {
    console.log(`\n→ ${char.slug} (${char.chapterIds.length} chapters)`);
    const res = await processCharacter(client, char, opts);
    totals.wrote += res.wrote.length;
    totals.skipped += res.skipped.length;
    totals.errors += res.errors.length;
    if (res.skipped.length) {
      console.log(`  ⏭  skipped: ${res.skipped.join(", ")}`);
    }
    for (const e of res.errors) console.error(`  ⚠  ${e}`);
  }

  console.log("\nCharacter dossier enrichment");
  console.log(`  ✓ wrote:   ${totals.wrote}`);
  console.log(`  ⏭  skipped: ${totals.skipped}`);
  console.log(`  ⚠  errors:  ${totals.errors}`);
  if (totals.errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
