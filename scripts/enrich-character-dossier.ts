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
    if (!process.env[key]) process.env[key] = value;
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

function buildNeedles(name: string, aliases: string[]): string[] {
  const needles = new Set<string>();
  if (name) needles.add(name);
  for (const a of aliases) if (a) needles.add(a);
  const firstName = name.split(/\s+/)[0];
  if (firstName && firstName.length >= 3) needles.add(firstName);
  return [...needles];
}

/**
 * Derive chapter appearances by scanning story files for the character's
 * name, first name, and aliases. Uses word-boundary checks so "Jax" doesn't
 * match "Jaxon", etc. Falls back to whatever ids are in `fileIds` if the
 * stories directory is unreadable.
 */
function deriveChapterIdsFromStories(
  needles: string[],
  fileIds: string[]
): string[] {
  let files: string[];
  try {
    files = fs.readdirSync(STORIES_DIR).filter((f) => /^CH\d{2,3}-.*\.md$/.test(f));
  } catch {
    return fileIds;
  }
  const escaped = needles
    .filter((n) => n && n.length >= 3)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) return fileIds;
  const re = new RegExp(`(?:^|[^A-Za-z])(?:${escaped.join("|")})(?:[^A-Za-z]|$)`);
  const ids = new Set<string>();
  for (const f of files) {
    const chId = f.match(/^(CH\d{2,3})/)?.[1];
    if (!chId) continue;
    const text = fs.readFileSync(path.join(STORIES_DIR, f), "utf-8");
    if (re.test(text)) ids.add(chId);
  }
  // Union with any ids explicitly mentioned in the character file (defensive).
  for (const id of fileIds) ids.add(id);
  return [...ids].sort();
}

function loadCharacter(filename: string): CharacterFile | null {
  const filepath = path.join(CHAR_DIR, filename);
  const raw = fs.readFileSync(filepath, "utf-8");
  if (!/^## Dossier$/m.test(raw)) return null;
  const slug =
    raw.match(/\*\*Slug:\*\*\s*(.+)/)?.[1]?.trim() || filename.replace(/\.md$/, "");
  const name = raw.match(/^# (.+)/m)?.[1]?.trim() || slug;
  const aliases = extractAliases(raw);
  const fileIds = extractChapterIds(raw);
  const needles = buildNeedles(name, aliases);
  const chapterIds = deriveChapterIdsFromStories(needles, fileIds);
  return {
    slug,
    name,
    path: filepath,
    raw,
    role: extractDossierSubField(raw, "Role"),
    profile: extractDossierSubField(raw, "Profile"),
    arc: extractDossierSubField(raw, "Character Arc"),
    chapterIds,
    aliases,
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
  return `You are writing entries for the Celestial story wiki. You will be given (a) the canonical dossier for ONE character and (b) chapter excerpts where they appear. You will produce FOUR dossier sections in a single JSON response.

Output contract:
- Respond with a SINGLE JSON object, no prose, no code fences.
- Shape: {"relationships": string, "moments": string, "voice": string, "timeline": string}
- Each value is the markdown body of that section, WITHOUT its heading line.
- If evidence for a field is insufficient, set that field to the literal string "INSUFFICIENT_EVIDENCE".

Grounding rules (apply to every field):
- Ground every claim in the provided excerpts or canonical dossier.
- Never cite a chapter id that isn't in the provided excerpts.
- Never invent quotes, relationships, or events.`;
}

function combinedPrompt(
  char: CharacterFile,
  excerpts: ChapterExcerpt[]
): string {
  const canonical = `## Canonical dossier (ground truth)

**Role:** ${char.role}

**Profile:** ${char.profile}

**Character Arc:** ${char.arc}`;

  const excerptBlock = excerpts
    .map((e) => `### ${e.chapterId} — ${e.title}\n\n${e.body}\n`)
    .join("\n");

  return `Character: **${char.name}**

${canonical}

## Chapter excerpts

${excerptBlock}

## Tasks (produce all four as one JSON object)

**relationships** — 3–6 bullets of this character's most important relationships in the book. Format:
\`- **Name** — short description (CHxx, CHyy).\`
Only include relationships supported by the excerpts or canonical dossier. Under 400 characters total.

**moments** — 3–5 specific scenes that most define this character. Format:
\`- **CHxx Title** — one-sentence description.\`
When a direct quote from or about this character captures the moment, append ONE ≤30-word direct quote from the excerpts in quotation marks after the description. Never invent a quote. Under 800 characters total.

**voice** — 2–3 sentences describing how this character speaks and carries themselves, grounded in the excerpts. Only observable voice and manner — no psychology, no inferred motivation. Under 400 characters.

**timeline** — One bullet per chapter in which the character meaningfully appears, ordered by chapter number. Format:
\`- **CHxx Title** — one-sentence beat.\`
Only include chapters where the excerpt shows actual action, dialogue, or decision by the character. Skip mere mentions. Under 1500 characters total.

Respond with ONLY the JSON object.`;
}

function parseJsonResponse(text: string): Record<DerivedField, string> {
  // Strip optional code fence wrapping and locate the JSON object.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model response");
  }
  const parsed = JSON.parse(candidate.slice(start, end + 1));
  const out: Record<DerivedField, string> = {
    relationships: String(parsed.relationships ?? "").trim(),
    moments: String(parsed.moments ?? "").trim(),
    voice: String(parsed.voice ?? "").trim(),
    timeline: String(parsed.timeline ?? "").trim(),
  };
  return out;
}

async function generateAllFields(
  client: Anthropic,
  char: CharacterFile,
  excerpts: ChapterExcerpt[]
): Promise<Record<DerivedField, string>> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: [
      {
        type: "text",
        text: systemPrompt(),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: combinedPrompt(char, excerpts) }],
  });
  const textBlock = res.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in model response");
  }
  return parseJsonResponse(textBlock.text);
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

  // Decide per-field whether regeneration is needed. A single API call covers
  // all fields, so if every target is up-to-date we skip the call entirely.
  const fieldsToGenerate: DerivedField[] = [];
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
    fieldsToGenerate.push(field);
  }

  let raw = char.raw;

  if (fieldsToGenerate.length === 0) {
    return { wrote, skipped, errors };
  }

  if (opts.dryRun) {
    console.log(
      `\n── DRY RUN: ${char.slug} (hash=${hash}, fields=${fieldsToGenerate.join(",")}) ──`
    );
    console.log(combinedPrompt(char, excerpts).slice(0, 1500) + "\n...");
    wrote.push(...fieldsToGenerate);
    return { wrote, skipped, errors };
  }

  if (!client) throw new Error("API client not initialized");

  let generatedFields: Record<DerivedField, string>;
  try {
    generatedFields = await generateAllFields(client, char, excerpts);
  } catch (err) {
    errors.push(
      `${char.slug}: ${err instanceof Error ? err.message : String(err)}`
    );
    return { wrote, skipped, errors };
  }

  for (const field of fieldsToGenerate) {
    const body = generatedFields[field];
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
  }

  if (raw !== char.raw) {
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
