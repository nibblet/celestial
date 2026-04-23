/**
 * enrich-artifact-dossier.ts
 *
 * For each canonical artifact (one with a `<!-- canon:dossier -->` block),
 * generate four AI-derived sub-sections grounded in the canonical dossier
 * plus chapter excerpts where the artifact is actually invoked:
 *
 *   - Chapter Appearances
 *   - Wielders & Interactions
 *   - Thematic Role
 *   - Timeline
 *
 * Chapters for each artifact are pulled from the curated `chapter_tags.json`
 * produced by `scripts/tag-chapter-entities.ts`, which already validated
 * slugs against the controlled vocabulary. Excerpt text is harvested from
 * the story bodies using the artifact's name plus aliases as needles.
 *
 * Output markers follow the same idempotent shape as the character enricher:
 *
 *   <!-- ai-dossier:appearances generated="YYYY-MM-DD" reviewed="false"
 *        model="..." source-hash="..." -->
 *   ## Chapter Appearances
 *   ...
 *   <!-- ai-dossier:end -->
 *
 * Blocks with `reviewed="true"` are preserved unless `--force-reviewed`.
 * Blocks whose `source-hash` matches the current inputs are skipped unless
 * `--force` or `--force-reviewed` is passed. Blocks are inserted between
 * `<!-- canon:end -->` and the existing `## Lore metadata` section.
 *
 * CLI:
 *   npx tsx scripts/enrich-artifact-dossier.ts --dry-run
 *   npx tsx scripts/enrich-artifact-dossier.ts --artifact valkyrie-1
 *   npx tsx scripts/enrich-artifact-dossier.ts --field thematic-role
 *   npx tsx scripts/enrich-artifact-dossier.ts --force
 *   npx tsx scripts/enrich-artifact-dossier.ts --force-reviewed
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";

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
const ARTIFACTS_DIR = path.join(process.cwd(), "content/wiki/artifacts");
const STORIES_DIR = path.join(process.cwd(), "content/wiki/stories");
const CHAPTER_TAGS_PATH = path.join(
  process.cwd(),
  "content/raw/chapter_tags.json",
);
const CANON_ENTITIES_PATH = path.join(
  process.cwd(),
  "content/raw/canon_entities.json",
);

type DerivedField = "appearances" | "wielders" | "thematic-role" | "timeline";

const ALL_FIELDS: DerivedField[] = [
  "appearances",
  "wielders",
  "thematic-role",
  "timeline",
];

const HEADING: Record<DerivedField, string> = {
  appearances: "Chapter Appearances",
  wielders: "Wielders & Interactions",
  "thematic-role": "Thematic Role",
  timeline: "Timeline",
};

/** JSON keys the model returns; the `thematic-role` field is kebab-cased
 *  to match the marker name but JSON keys must be valid identifiers. */
const JSON_KEY: Record<DerivedField, string> = {
  appearances: "appearances",
  wielders: "wielders",
  "thematic-role": "thematicRole",
  timeline: "timeline",
};

interface ArtifactFile {
  slug: string;
  name: string;
  path: string;
  raw: string;
  canonDossier: string;
  aliases: string[];
  chapterIds: string[];
  justifications: ChapterTagJustification[];
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
      `Unknown --field "${field}". Must be one of: ${ALL_FIELDS.join(", ")}`,
    );
    process.exit(1);
  }
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    forceReviewed: args.includes("--force-reviewed"),
    onlySlug: getFlag("--artifact"),
    onlyField: (field as DerivedField) ?? null,
  };
}

interface ChapterTagArtifact {
  slug: string;
  justification: string;
}

interface ChapterTagRecord {
  chapterId: string;
  title: string;
  artifacts: ChapterTagArtifact[];
}

interface ChapterTagFile {
  chapters: Record<string, ChapterTagRecord>;
}

interface ChapterTagJustification {
  chapterId: string;
  title: string;
  justification: string;
}

interface ChapterTagsByArtifact {
  chapters: Map<string, string[]>;
  justifications: Map<string, ChapterTagJustification[]>;
}

function loadChapterTagsByArtifact(): ChapterTagsByArtifact {
  const chapters = new Map<string, string[]>();
  const justifications = new Map<string, ChapterTagJustification[]>();
  if (!fs.existsSync(CHAPTER_TAGS_PATH))
    return { chapters, justifications };
  try {
    const parsed = JSON.parse(
      fs.readFileSync(CHAPTER_TAGS_PATH, "utf-8"),
    ) as ChapterTagFile;
    const rows = Object.values(parsed.chapters ?? {}).sort((a, b) =>
      a.chapterId.localeCompare(b.chapterId),
    );
    for (const ch of rows) {
      for (const art of ch.artifacts ?? []) {
        const list = chapters.get(art.slug) ?? [];
        if (!list.includes(ch.chapterId)) list.push(ch.chapterId);
        chapters.set(art.slug, list);
        const justList = justifications.get(art.slug) ?? [];
        justList.push({
          chapterId: ch.chapterId,
          title: ch.title,
          justification: art.justification ?? "",
        });
        justifications.set(art.slug, justList);
      }
    }
  } catch {
    /* chapter tags are advisory — enrichment falls back gracefully */
  }
  return { chapters, justifications };
}

function loadCanonAliases(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!fs.existsSync(CANON_ENTITIES_PATH)) return out;
  try {
    const parsed = JSON.parse(
      fs.readFileSync(CANON_ENTITIES_PATH, "utf-8"),
    ) as {
      entities?: Array<{
        kind?: string;
        slug?: string;
        aliases?: string[];
      }>;
    };
    for (const e of parsed.entities ?? []) {
      if (e.kind !== "artifacts" || !e.slug) continue;
      out.set(e.slug, (e.aliases ?? []).filter(Boolean));
    }
  } catch {
    /* best effort */
  }
  return out;
}

function extractCanonDossier(raw: string): string {
  const m = raw.match(
    /<!--\s*canon:dossier[^>]*-->([\s\S]*?)<!--\s*canon:end\s*-->/i,
  );
  return m ? m[1].trim() : "";
}

function extractAliasesFromMarkdown(raw: string): string[] {
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
  for (const a of aliases) {
    if (!a) continue;
    if (a.length < 3) continue;
    needles.add(a);
  }
  return [...needles];
}

function loadArtifact(
  filename: string,
  chapterIdsByArtifact: Map<string, string[]>,
  justificationsByArtifact: Map<string, ChapterTagJustification[]>,
  canonAliases: Map<string, string[]>,
): ArtifactFile | null {
  const filepath = path.join(ARTIFACTS_DIR, filename);
  const raw = fs.readFileSync(filepath, "utf-8");
  // Only operate on files with a canon dossier block — hand-authored stubs
  // without canon content have nothing to enrich from.
  if (!/<!--\s*canon:dossier/i.test(raw)) return null;
  const slug =
    raw.match(/\*\*Slug:\*\*\s*(.+)/)?.[1]?.trim() ||
    filename.replace(/\.md$/, "");
  const name = raw.match(/^# (.+)/m)?.[1]?.trim() || slug;
  const canonDossier = extractCanonDossier(raw);
  const mdAliases = extractAliasesFromMarkdown(raw);
  const canonAl = canonAliases.get(slug) ?? [];
  const aliases = [...new Set([...canonAl, ...mdAliases])];
  const chapterIds = chapterIdsByArtifact.get(slug) ?? [];
  const justifications = justificationsByArtifact.get(slug) ?? [];
  return {
    slug,
    name,
    path: filepath,
    raw,
    canonDossier,
    aliases,
    chapterIds,
    justifications,
  };
}

function loadStoryBody(
  chapterId: string,
): { title: string; text: string } | null {
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
  const escaped = needles
    .filter((n) => n && n.length >= 3)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) return "";
  // Word-boundary-ish match. Artifact names often contain hyphens
  // (`valkyrie-1`) so we allow `-` and digits at the boundary.
  const re = new RegExp(
    `(?:^|[^A-Za-z])(?:${escaped.join("|")})(?:[^A-Za-z]|$)`,
    "i",
  );
  for (let i = 0; i < paragraphs.length; i++) {
    if (re.test(paragraphs[i])) {
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
  source: "prose" | "justification";
}

/**
 * Build per-chapter excerpts used to ground the LLM. First try literal
 * passage matching (artifact name / aliases). When the artifact is
 * symbolic or referenced obliquely (e.g. `triple-helix-symbol` whose
 * aliases are descriptive phrases like "interlocking triple helix"),
 * fall back to the chapter-tag `justification` text — that's already a
 * grounded summary of the artifact's beat in that chapter, written at
 * tag time by the same LLM family under a stricter "cite exact scene"
 * contract.
 */
function buildExcerpts(artifact: ArtifactFile): ChapterExcerpt[] {
  const needles = buildNeedles(artifact.name, artifact.aliases);
  const justByChapter = new Map<string, ChapterTagJustification>(
    artifact.justifications.map((j) => [j.chapterId, j]),
  );
  const out: ChapterExcerpt[] = [];
  for (const id of artifact.chapterIds) {
    const story = loadStoryBody(id);
    if (!story) continue;
    const body = passagesMentioning(story.text, needles);
    if (body.trim()) {
      out.push({ chapterId: id, title: story.title, body, source: "prose" });
      continue;
    }
    const just = justByChapter.get(id);
    if (just?.justification?.trim()) {
      out.push({
        chapterId: id,
        title: story.title,
        body: `(chapter-tag justification, not direct prose) ${just.justification.trim()}`,
        source: "justification",
      });
    }
  }
  return out;
}

function sourceHash(
  artifact: ArtifactFile,
  excerpts: ChapterExcerpt[],
): string {
  const input = [
    artifact.canonDossier,
    artifact.aliases.join("|"),
    ...excerpts.map((e) => `${e.chapterId}::${e.body}`),
  ].join("\n---\n");
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 10);
}

function findExistingBlocks(raw: string): ExistingBlock[] {
  const blocks: ExistingBlock[] = [];
  const re =
    /<!--\s*ai-dossier:(appearances|wielders|thematic-role|timeline)\s+([^>]*?)-->\n([\s\S]*?)\n<!--\s*ai-dossier:end\s*-->/gi;
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
  meta: {
    generated: string;
    reviewed: boolean;
    model: string;
    sourceHash: string;
  },
): string {
  return [
    `<!-- ai-dossier:${field} generated="${meta.generated}" reviewed="${meta.reviewed}" model="${meta.model}" source-hash="${meta.sourceHash}" -->`,
    `## ${HEADING[field]}`,
    body.trim(),
    `<!-- ai-dossier:end -->`,
  ].join("\n");
}

/**
 * Replace an existing `ai-dossier:<field>` block in place; if none exists,
 * insert the new block after the canon dossier and before `## Lore metadata`
 * (or `## Appearances` stub / EOF). Artifacts don't have a `## Dossier`
 * parent heading like characters do — these blocks sit as top-level H2s.
 */
function upsertBlock(
  raw: string,
  field: DerivedField,
  rendered: string,
): string {
  const existingRe = new RegExp(
    `<!--\\s*ai-dossier:${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s[\\s\\S]*?<!--\\s*ai-dossier:end\\s*-->`,
    "i",
  );
  if (existingRe.test(raw)) {
    return raw.replace(existingRe, rendered);
  }
  // Insertion anchor: prefer `## Lore metadata`, fall back to the empty
  // `## Appearances` stub, fall back to EOF.
  const anchors = ["## Lore metadata", "## Appearances"];
  let insertAt = -1;
  for (const a of anchors) {
    const idx = raw.indexOf(a);
    if (idx !== -1 && (insertAt === -1 || idx < insertAt)) insertAt = idx;
  }
  if (insertAt === -1) insertAt = raw.length;
  const before = raw.slice(0, insertAt).trimEnd();
  const after = raw.slice(insertAt);
  return `${before}\n\n${rendered}\n\n${after}`.replace(/\n{3,}/g, "\n\n");
}

/**
 * Remove the empty auto-generated `## Appearances` stub produced by the
 * canon seeder. Once the AI writes a real `## Chapter Appearances` block
 * the stub has no value and its presence is visual noise.
 */
function stripEmptyAppearancesStub(raw: string): string {
  return raw.replace(
    /\n## Appearances\n_\(auto-generated; review and expand\.\)_\n(?=\n)/,
    "\n",
  );
}

function systemPrompt(): string {
  return `You are writing entries for the Celestial story wiki. You will be given (a) the canonical dossier for ONE artifact and (b) chapter excerpts where it appears. You will produce FOUR sections in a single JSON response.

Output contract:
- Respond with a SINGLE JSON object, no prose, no code fences.
- Shape: {"appearances": string, "wielders": string, "thematicRole": string, "timeline": string}
- Each value is the markdown body of that section, WITHOUT its heading line.
- If evidence for a field is insufficient, set that field to the literal string "INSUFFICIENT_EVIDENCE".

Grounding rules (apply to every field):
- Ground every claim in the provided excerpts or canonical dossier.
- Never cite a chapter id that isn't in the provided excerpts.
- Never invent quotes, characters, or events.`;
}

function combinedPrompt(
  artifact: ArtifactFile,
  excerpts: ChapterExcerpt[],
): string {
  const canonical = `## Canonical dossier (ground truth)

${artifact.canonDossier}`;

  const excerptBlock =
    excerpts.length > 0
      ? excerpts
          .map((e) => `### ${e.chapterId} — ${e.title}\n\n${e.body}\n`)
          .join("\n")
      : "_(no chapter excerpts — Book I may reference this artifact only obliquely or in a later book.)_";

  const aliasNote =
    artifact.aliases.length > 0
      ? `\n**Known aliases for this artifact (any match these in the excerpts refers to this artifact):** ${artifact.aliases.join(", ")}\n`
      : "";

  return `Artifact: **${artifact.name}** (\`${artifact.slug}\`)
${aliasNote}
${canonical}

## Chapter excerpts

${excerptBlock}

## Tasks (produce all four as one JSON object)

**appearances** — One bullet per chapter where the artifact is meaningfully present. Format:
\`- **CHxx Title** — what the artifact does or what happens to it in this chapter.\`
Only include chapters present in the excerpts above. Under 1200 characters total.

**wielders** — 2–5 bullets describing characters who interact with, use, or are affected by this artifact. Format:
\`- **Character Name** — their relationship with the artifact (CHxx, CHyy).\`
Ground every claim in an excerpt. Under 600 characters total.

**thematicRole** — 2–4 sentences describing what this artifact MEANS in the story — what it symbolizes, what it tests in the crew, why it matters thematically. Anchored in canonical dossier + excerpts. Under 500 characters.

**timeline** — Ordered bullets showing how the artifact evolves across the book. Format:
\`- **CHxx** — state change or significant event (first seen, activated, transformed, contained, etc.).\`
Only chapters present in the excerpts. Skip chapters where nothing new happens to the artifact. Under 900 characters total.

If the artifact genuinely lacks on-page presence (e.g. no excerpts at all for \`appearances\`, or only one excerpt for \`timeline\`), return "INSUFFICIENT_EVIDENCE" for that field.

Respond with ONLY the JSON object.`;
}

function parseJsonResponse(text: string): Record<DerivedField, string> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model response");
  }
  const parsed = JSON.parse(candidate.slice(start, end + 1)) as Record<
    string,
    unknown
  >;
  const read = (k: string) => String(parsed[k] ?? "").trim();
  return {
    appearances: read(JSON_KEY.appearances),
    wielders: read(JSON_KEY.wielders),
    "thematic-role": read(JSON_KEY["thematic-role"]),
    timeline: read(JSON_KEY.timeline),
  };
}

async function generateAllFields(
  client: Anthropic,
  artifact: ArtifactFile,
  excerpts: ChapterExcerpt[],
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
    messages: [
      { role: "user", content: combinedPrompt(artifact, excerpts) },
    ],
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
  allowedChapters: Set<string>,
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
  // `thematic-role` can be purely analytical (no chapter citations required).
  if (field !== "thematic-role" && citedChapters.size === 0) {
    return { ok: false, reason: "no chapter citations" };
  }
  return { ok: true };
}

async function processArtifact(
  client: Anthropic | null,
  artifact: ArtifactFile,
  opts: Options,
): Promise<{
  wrote: DerivedField[];
  skipped: DerivedField[];
  errors: string[];
}> {
  const excerpts = buildExcerpts(artifact);
  const allowedChapters = new Set(artifact.chapterIds);
  const hash = sourceHash(artifact, excerpts);
  const existing = findExistingBlocks(artifact.raw);
  const existingByField = new Map<DerivedField, ExistingBlock>(
    existing.map((b) => [b.field, b]),
  );
  const generated = new Date().toISOString().slice(0, 10);

  const wrote: DerivedField[] = [];
  const skipped: DerivedField[] = [];
  const errors: string[] = [];

  const targetFields = opts.onlyField ? [opts.onlyField] : ALL_FIELDS;

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
    if (excerpts.length === 0 && field !== "thematic-role") {
      errors.push(`${artifact.slug}/${field}: no usable chapter excerpts`);
      continue;
    }
    fieldsToGenerate.push(field);
  }

  let raw = artifact.raw;

  if (fieldsToGenerate.length === 0) {
    return { wrote, skipped, errors };
  }

  if (opts.dryRun) {
    console.log(
      `\n── DRY RUN: ${artifact.slug} (hash=${hash}, fields=${fieldsToGenerate.join(",")}) ──`,
    );
    console.log(combinedPrompt(artifact, excerpts).slice(0, 1500) + "\n...");
    wrote.push(...fieldsToGenerate);
    return { wrote, skipped, errors };
  }

  if (!client) throw new Error("API client not initialized");

  let generatedFields: Record<DerivedField, string>;
  try {
    generatedFields = await generateAllFields(client, artifact, excerpts);
  } catch (err) {
    errors.push(
      `${artifact.slug}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { wrote, skipped, errors };
  }

  for (const field of fieldsToGenerate) {
    const body = generatedFields[field];
    const validation = validateField(body, field, allowedChapters);
    if (!validation.ok) {
      errors.push(`${artifact.slug}/${field}: ${validation.reason}`);
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
    console.log(`  ✓ ${artifact.slug}/${field}`);
  }

  if (raw !== artifact.raw) {
    // Only strip the empty auto-generated Appearances stub when we have
    // just written a real Chapter Appearances block in its place.
    if (wrote.includes("appearances")) {
      raw = stripEmptyAppearancesStub(raw);
    }
    fs.writeFileSync(artifact.path, raw);
  }

  return { wrote, skipped, errors };
}

async function main() {
  const opts = parseArgs();

  const { chapters: chapterIdsByArtifact, justifications } =
    loadChapterTagsByArtifact();
  const canonAliases = loadCanonAliases();

  const files = fs
    .readdirSync(ARTIFACTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => !opts.onlySlug || f === `${opts.onlySlug}.md`);

  if (opts.onlySlug && files.length === 0) {
    console.error(`No artifact file for --artifact ${opts.onlySlug}`);
    process.exit(1);
  }

  const artifacts = files
    .map((f) =>
      loadArtifact(f, chapterIdsByArtifact, justifications, canonAliases),
    )
    .filter((a): a is ArtifactFile => !!a);

  if (artifacts.length === 0) {
    console.log(
      "No artifacts with a <!-- canon:dossier --> block found.",
    );
    return;
  }

  const client = opts.dryRun
    ? null
    : (() => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          console.error(
            "ANTHROPIC_API_KEY missing. Run with --dry-run or export the key.",
          );
          process.exit(1);
        }
        return new Anthropic({ apiKey });
      })();

  const totals = { wrote: 0, skipped: 0, errors: 0 };
  for (const artifact of artifacts) {
    console.log(
      `\n→ ${artifact.slug} (${artifact.chapterIds.length} chapter${artifact.chapterIds.length === 1 ? "" : "s"}: ${artifact.chapterIds.join(", ") || "none"})`,
    );
    const res = await processArtifact(client, artifact, opts);
    totals.wrote += res.wrote.length;
    totals.skipped += res.skipped.length;
    totals.errors += res.errors.length;
    if (res.skipped.length) {
      console.log(`  ⏭  skipped: ${res.skipped.join(", ")}`);
    }
    for (const e of res.errors) console.error(`  ⚠  ${e}`);
  }

  console.log("\nArtifact dossier enrichment");
  console.log(`  ✓ wrote:   ${totals.wrote}`);
  console.log(`  ⏭  skipped: ${totals.skipped}`);
  console.log(`  ⚠  errors:  ${totals.errors}`);
  if (totals.errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
