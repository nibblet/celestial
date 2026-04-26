/**
 * tag-chapter-entities.ts
 *
 * For each chapter in `content/wiki/stories/CH##-*.md`, ask the LLM to produce
 * a structured tag record linking the chapter to the canonical wiki slugs it
 * meaningfully invokes: rules (incl. parables/doctrines), characters (with a
 * presence tier), vaults, artifacts, locations, factions. Output is written to
 * a single sidecar JSON at `content/raw/chapter_tags.json`.
 *
 * Why a sidecar file rather than an inline markdown block?
 *   - `scripts/ingest-celestial-book.ts` rewrites `content/wiki/stories/*.md`
 *     unconditionally from the source EPUB. Any inline block would be wiped on
 *     every re-ingest, replaying the same failure mode that stripped the
 *     character Canon Dossier blocks.
 *   - Ask, the verifier, and UI loaders only need structured metadata; loading
 *     a single JSON is faster than re-parsing 17 markdown files per request.
 *   - Slug-only citations let us hard-enforce that every tag points at an
 *     existing wiki page before writing — the verifier cannot regress.
 *
 * Idempotency:
 *   - Source hash combines the chapter body and the controlled vocabulary of
 *     slugs. Rerunning with no source change is a no-op.
 *   - Records are written with `reviewed: false`. Flipping `reviewed: true`
 *     by hand protects the record from regeneration unless `--force-reviewed`.
 *
 * CLI:
 *   npx tsx scripts/tag-chapter-entities.ts --dry-run
 *   npx tsx scripts/tag-chapter-entities.ts --chapter CH01
 *   npx tsx scripts/tag-chapter-entities.ts --force
 *   npx tsx scripts/tag-chapter-entities.ts --force-reviewed
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
const WIKI = path.join(process.cwd(), "content/wiki");
const STORIES_DIR = path.join(WIKI, "stories");
const OUT_PATH = path.join(process.cwd(), "content/raw/chapter_tags.json");
const CANON_ENTITIES_PATH = path.join(
  process.cwd(),
  "content/raw/canon_entities.json",
);

const VOCAB_KINDS = [
  "rules",
  "characters",
  "artifacts",
  "vaults",
  "locations",
  "factions",
] as const;
type VocabKind = (typeof VOCAB_KINDS)[number];

type PresenceTier = "lead" | "supporting" | "mentioned";

interface TaggedRef {
  slug: string;
  justification: string;
}

interface TaggedCharacter extends TaggedRef {
  presence: PresenceTier;
}

interface ChapterTags {
  rules: TaggedRef[];
  characters: TaggedCharacter[];
  artifacts: TaggedRef[];
  vaults: TaggedRef[];
  locations: TaggedRef[];
  factions: TaggedRef[];
  summary: string;
  themes: string[];
  continuityFlags: string[];
}

interface DeterministicAdjustments {
  locationsAdded: string[];
}

interface TagRecord extends ChapterTags {
  chapterId: string;
  title: string;
  sourceHash: string;
  generated: string;
  model: string;
  reviewed: boolean;
}

interface TagFile {
  version: 1;
  generatedAt: string;
  model: string;
  vocabHash: string;
  chapters: Record<string, TagRecord>;
}

interface Options {
  dryRun: boolean;
  onlyChapter: string | null;
  force: boolean;
  forceReviewed: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const getFlag = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    forceReviewed: args.includes("--force-reviewed"),
    onlyChapter: getFlag("--chapter"),
  };
}

function loadVocab(): Record<VocabKind, string[]> {
  const out = {} as Record<VocabKind, string[]>;
  for (const kind of VOCAB_KINDS) {
    const dir = path.join(WIKI, kind);
    if (!fs.existsSync(dir)) {
      out[kind] = [];
      continue;
    }
    out[kind] = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""))
      .sort();
  }
  return out;
}

type AliasMap = Record<VocabKind, Record<string, string[]>>;

/**
 * Extra aliases per wiki file, harvested from a `**Aliases:**` line inside
 * the wiki markdown. canon_entities.json is the primary source but some
 * slugs carry additional aliases in their wiki body (e.g. Valkyrie-1's
 * dossier lists "Martian ship", "the-ship", etc.).
 */
function extractMarkdownAliases(kind: VocabKind, slug: string): string[] {
  const fp = path.join(WIKI, kind, `${slug}.md`);
  if (!fs.existsSync(fp)) return [];
  const body = fs.readFileSync(fp, "utf-8");
  const m = body.match(/\*\*Aliases:\*\*\s*(.+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Load aliases from `content/raw/canon_entities.json` and merge with any
 * `**Aliases:**` lines on the wiki pages themselves. The resulting map lets
 * the tagger tell the LLM that "Valkyrie" / "The Ship" → `valkyrie-1`,
 * which was the root cause of `harmonic-drive` being missed on the first
 * tagging pass.
 */
function loadAliases(vocab: Record<VocabKind, string[]>): AliasMap {
  const map: AliasMap = {
    rules: {},
    characters: {},
    artifacts: {},
    vaults: {},
    locations: {},
    factions: {},
  };
  for (const kind of VOCAB_KINDS) {
    for (const slug of vocab[kind]) map[kind][slug] = [];
  }

  try {
    if (fs.existsSync(CANON_ENTITIES_PATH)) {
      const parsed = JSON.parse(
        fs.readFileSync(CANON_ENTITIES_PATH, "utf-8"),
      ) as {
        entities?: Array<{
          slug?: string;
          kind?: string;
          aliases?: string[];
        }>;
      };
      for (const entity of parsed.entities ?? []) {
        const kind = entity.kind as VocabKind | undefined;
        const slug = entity.slug;
        if (!slug || !kind || !VOCAB_KINDS.includes(kind)) continue;
        if (!map[kind][slug]) continue;
        for (const alias of entity.aliases ?? []) {
          const trimmed = alias?.trim();
          if (trimmed) map[kind][slug].push(trimmed);
        }
      }
    }
  } catch {
    /* best effort — aliases are advisory, never block tagging */
  }

  for (const kind of VOCAB_KINDS) {
    for (const slug of vocab[kind]) {
      for (const alias of extractMarkdownAliases(kind, slug)) {
        if (!map[kind][slug].includes(alias)) map[kind][slug].push(alias);
      }
    }
  }

  // Skip aliases that are too short/generic to carry signal. "She", "ship"
  // on their own would flood the LLM with noise; only surface aliases that
  // are either multi-word or ≥ 4 chars and contain a non-lowercase character
  // (proper nouns / code names).
  const isUseful = (alias: string): boolean => {
    if (alias.length < 3) return false;
    if (/\s/.test(alias)) return true;
    if (/[A-Z0-9-]/.test(alias) && alias.length >= 4) return true;
    return false;
  };

  for (const kind of VOCAB_KINDS) {
    for (const slug of vocab[kind]) {
      map[kind][slug] = [...new Set(map[kind][slug].filter(isUseful))];
    }
  }

  return map;
}

function vocabHash(
  vocab: Record<VocabKind, string[]>,
  aliases: AliasMap,
): string {
  const flat = VOCAB_KINDS.map((k) => {
    const slugParts = vocab[k].map((slug) => {
      const al = aliases[k][slug] ?? [];
      return al.length > 0 ? `${slug}(${al.join("|")})` : slug;
    });
    return `${k}:${slugParts.join(",")}`;
  }).join("|");
  return crypto.createHash("sha256").update(flat).digest("hex").slice(0, 10);
}

interface ChapterInput {
  chapterId: string;
  filename: string;
  title: string;
  body: string;
  raw: string;
}

function loadChapters(opts: Options): ChapterInput[] {
  const files = fs
    .readdirSync(STORIES_DIR)
    .filter((f) => /^CH\d{2,3}-.*\.md$/.test(f))
    .sort();
  const out: ChapterInput[] = [];
  for (const filename of files) {
    const chapterId = filename.match(/^(CH\d{2,3})/)?.[1];
    if (!chapterId) continue;
    if (opts.onlyChapter && chapterId !== opts.onlyChapter) continue;
    const raw = fs.readFileSync(path.join(STORIES_DIR, filename), "utf-8");
    const title = raw.match(/^# (.+)/m)?.[1]?.trim() || chapterId;
    // Prefer "## Full Text" block if present; fall back to whole file minus
    // frontmatter-style header lines.
    const fullText =
      raw.match(/## Full Text\n\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() || raw;
    out.push({ chapterId, filename, title, body: fullText, raw });
  }
  return out;
}

function sourceHash(chapter: ChapterInput, vHash: string): string {
  return crypto
    .createHash("sha256")
    .update(`${vHash}\n---\n${chapter.body}`)
    .digest("hex")
    .slice(0, 10);
}

function loadExisting(): TagFile | null {
  if (!fs.existsSync(OUT_PATH)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")) as TagFile;
    if (parsed.version !== 1 || typeof parsed.chapters !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function systemPrompt(): string {
  return `You are tagging chapters of the Celestial story wiki against a fixed controlled vocabulary of slugs. You produce STRUCTURED JSON ONLY.

Output contract:
- Respond with a SINGLE JSON object, no prose, no code fences.
- Every slug you emit MUST come from the provided vocabulary. Never invent slugs.
- Ground every tag in the chapter text you are given. If the chapter does not clearly invoke an entity or rule, do not include it.
- Prefer precision over recall. A tag is only valid if a reader would say "yes, that chapter is genuinely about / involves that thing."

Presence tiers for characters:
- "lead"       — drives scenes, makes decisions, has dialogue or POV.
- "supporting" — present in scenes with meaningful action or dialogue.
- "mentioned"  — named only; does not act or speak in this chapter.

Omit characters with no mention at all. Omit "mentioned"-tier entries unless the mention is narratively load-bearing (e.g. Earth issues a directive; Rhea Solari is named as its source even though she is not on stage).`;
}

function vocabBlock(
  vocab: Record<VocabKind, string[]>,
  aliases: AliasMap,
): string {
  const lines: string[] = [
    "## Controlled vocabulary (use these slugs ONLY)",
    "",
    "Each line shows the canonical slug followed by any aliases in parentheses. If the chapter text refers to an entity by one of its aliases (e.g. \"The Ship\" → `valkyrie-1`), tag the canonical slug. Never tag an alias as if it were its own slug.",
  ];
  for (const kind of VOCAB_KINDS) {
    lines.push("", `### ${kind}`);
    for (const slug of vocab[kind]) {
      const al = aliases[kind][slug] ?? [];
      lines.push(
        al.length > 0 ? `- ${slug}  (aliases: ${al.join(", ")})` : `- ${slug}`,
      );
    }
  }
  return lines.join("\n");
}

function chapterPrompt(
  chapter: ChapterInput,
  vocab: Record<VocabKind, string[]>,
  aliases: AliasMap,
): string {
  return `Chapter: **${chapter.chapterId} — ${chapter.title}**

${vocabBlock(vocab, aliases)}

## Chapter text

${chapter.body}

## Task

Emit a single JSON object with this exact shape:

{
  "rules":      [{ "slug": "...", "justification": "<=25 words, cite a beat from the chapter" }, ...],
  "characters": [{ "slug": "...", "presence": "lead"|"supporting"|"mentioned", "justification": "<=25 words" }, ...],
  "artifacts":  [{ "slug": "...", "justification": "..." }, ...],
  "vaults":     [{ "slug": "...", "justification": "..." }, ...],
  "locations":  [{ "slug": "...", "justification": "..." }, ...],
  "factions":   [{ "slug": "...", "justification": "..." }, ...],
  "summary":    "<=60 word third-person summary of what happens in the chapter",
  "themes":     ["<=3 word theme", ...],   // 3–6 items
  "continuityFlags": ["..."]                // character-name drift, date math mismatch, or similar; [] if none
}

Rules:
- Slug values MUST appear in the vocabulary above. Any unknown slug will be dropped.
- Justifications must reference something that actually happens in the chapter.
- Do not emit a category array as null — use [] when empty.
- Return ONLY the JSON object.`;
}

function parseJsonResponse(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function asArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function sanitizeRef(
  raw: unknown,
  allowed: Set<string>,
): TaggedRef | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const slug = typeof r.slug === "string" ? r.slug.trim() : "";
  if (!slug || !allowed.has(slug)) return null;
  const justification =
    typeof r.justification === "string" ? r.justification.trim() : "";
  return { slug, justification };
}

function sanitizeCharacter(
  raw: unknown,
  allowed: Set<string>,
): TaggedCharacter | null {
  const base = sanitizeRef(raw, allowed);
  if (!base) return null;
  const r = raw as Record<string, unknown>;
  let presence: PresenceTier = "supporting";
  if (
    r.presence === "lead" ||
    r.presence === "supporting" ||
    r.presence === "mentioned"
  ) {
    presence = r.presence;
  }
  return { ...base, presence };
}

function sanitize(
  parsed: unknown,
  vocab: Record<VocabKind, string[]>,
): { tags: ChapterTags; dropped: string[] } {
  const dropped: string[] = [];
  const allowedByKind = {} as Record<VocabKind, Set<string>>;
  for (const k of VOCAB_KINDS) allowedByKind[k] = new Set(vocab[k]);
  const obj = (parsed ?? {}) as Record<string, unknown>;

  const sanitizeList = <T>(
    list: unknown,
    kind: VocabKind,
    fn: (raw: unknown, allowed: Set<string>) => T | null,
  ): T[] => {
    const out: T[] = [];
    for (const item of asArray(list)) {
      const ok = fn(item, allowedByKind[kind]);
      if (ok) {
        out.push(ok);
      } else if (
        item &&
        typeof item === "object" &&
        "slug" in (item as Record<string, unknown>)
      ) {
        const s = (item as Record<string, unknown>).slug;
        if (typeof s === "string") dropped.push(`${kind}:${s}`);
      }
    }
    return out;
  };

  const tags: ChapterTags = {
    rules: sanitizeList(obj.rules, "rules", sanitizeRef),
    characters: sanitizeList(obj.characters, "characters", sanitizeCharacter),
    artifacts: sanitizeList(obj.artifacts, "artifacts", sanitizeRef),
    vaults: sanitizeList(obj.vaults, "vaults", sanitizeRef),
    locations: sanitizeList(obj.locations, "locations", sanitizeRef),
    factions: sanitizeList(obj.factions, "factions", sanitizeRef),
    summary: typeof obj.summary === "string" ? obj.summary.trim() : "",
    themes: asArray(obj.themes)
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean),
    continuityFlags: asArray(obj.continuityFlags)
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean),
  };

  return { tags, dropped };
}

function hasRef(list: TaggedRef[], slug: string): boolean {
  return list.some((x) => x.slug === slug);
}

/**
 * Deterministic post-pass for high-confidence hierarchy/setting links where the
 * LLM can be overly conservative despite explicit on-page cues.
 *
 * Scope intentionally narrow:
 * - `giza-vault` + explicit "Great Pyramid" mention ⇒ add `great-pyramid`.
 * - Explicit ship-common-room cues (long table / tea gone cold / crew mess) on
 *   chapters already anchored aboard Valkyrie-1 ⇒ add `mess-commons`.
 */
function applyDeterministicLocationRules(
  chapter: ChapterInput,
  tags: ChapterTags,
  vocab: Record<VocabKind, string[]>,
): DeterministicAdjustments {
  const locationsAdded: string[] = [];
  const locationSet = new Set(vocab.locations);
  const body = chapter.body;

  if (
    locationSet.has("great-pyramid") &&
    hasRef(tags.vaults, "giza-vault") &&
    !hasRef(tags.locations, "great-pyramid") &&
    /great pyramid/i.test(body)
  ) {
    tags.locations.push({
      slug: "great-pyramid",
      justification:
        "Chapter explicitly references the Great Pyramid while invoking the Giza vault thread.",
    });
    locationsAdded.push("great-pyramid");
  }

  const aboardValkyrie =
    hasRef(tags.artifacts, "valkyrie-1") ||
    hasRef(tags.locations, "command-dome") ||
    hasRef(tags.locations, "living-quarters") ||
    hasRef(tags.locations, "sensorium");
  const messCues =
    /\blong table\b/i.test(body) ||
    /\btea had gone cold\b/i.test(body) ||
    /\bcrew gather(?:ed|ing)\b/i.test(body) ||
    /\bmess commons\b/i.test(body) ||
    /\bcrew mess\b/i.test(body);

  if (
    locationSet.has("mess-commons") &&
    !hasRef(tags.locations, "mess-commons") &&
    aboardValkyrie &&
    messCues
  ) {
    tags.locations.push({
      slug: "mess-commons",
      justification:
        "Chapter uses aboard-ship communal-space cues (table/crew mess context) consistent with Mess Commons scenes.",
    });
    locationsAdded.push("mess-commons");
  }

  return { locationsAdded };
}

async function tagChapter(
  client: Anthropic,
  chapter: ChapterInput,
  vocab: Record<VocabKind, string[]>,
  aliases: AliasMap,
): Promise<unknown> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: systemPrompt(),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: chapterPrompt(chapter, vocab, aliases) },
    ],
  });
  const textBlock = res.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in model response");
  }
  return parseJsonResponse(textBlock.text);
}

function emptyTagFile(vHash: string): TagFile {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    vocabHash: vHash,
    chapters: {},
  };
}

async function main() {
  const opts = parseArgs();
  const vocab = loadVocab();
  const aliases = loadAliases(vocab);
  const vHash = vocabHash(vocab, aliases);
  const chapters = loadChapters(opts);
  if (opts.onlyChapter && chapters.length === 0) {
    console.error(`No story file for --chapter ${opts.onlyChapter}`);
    process.exit(1);
  }
  if (chapters.length === 0) {
    console.error("No chapter story files found.");
    process.exit(1);
  }

  const existing = loadExisting();
  const out: TagFile = existing ?? emptyTagFile(vHash);
  out.generatedAt = new Date().toISOString();
  out.model = MODEL;
  out.vocabHash = vHash;

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

  const totals = { wrote: 0, skipped: 0, errors: 0, dropped: 0 };

  for (const chapter of chapters) {
    const hash = sourceHash(chapter, vHash);
    const prior = out.chapters[chapter.chapterId];

    if (prior?.reviewed && !opts.forceReviewed) {
      console.log(`⏭  ${chapter.chapterId} (reviewed, preserved)`);
      totals.skipped++;
      continue;
    }
    if (
      prior &&
      !prior.reviewed &&
      prior.sourceHash === hash &&
      !opts.force &&
      !opts.forceReviewed
    ) {
      console.log(`⏭  ${chapter.chapterId} (up to date)`);
      totals.skipped++;
      continue;
    }

    if (opts.dryRun) {
      console.log(
        `\n── DRY RUN: ${chapter.chapterId} (hash=${hash}) ──\n${chapterPrompt(
          chapter,
          vocab,
          aliases,
        ).slice(0, 1000)}\n...`,
      );
      totals.wrote++;
      continue;
    }

    if (!client) throw new Error("API client not initialized");

    console.log(`\n→ ${chapter.chapterId} — ${chapter.title}`);
    let parsed: unknown;
    try {
      parsed = await tagChapter(client, chapter, vocab, aliases);
    } catch (err) {
      console.error(
        `  ⚠  ${chapter.chapterId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      totals.errors++;
      continue;
    }

    const { tags, dropped } = sanitize(parsed, vocab);
    const deterministic = applyDeterministicLocationRules(chapter, tags, vocab);
    if (dropped.length) {
      console.warn(
        `  ⚠  dropped ${dropped.length} unknown slug${dropped.length === 1 ? "" : "s"}: ${dropped.join(", ")}`,
      );
      totals.dropped += dropped.length;
    }
    if (deterministic.locationsAdded.length > 0) {
      console.log(
        `  ℹ  deterministic locations added: ${deterministic.locationsAdded.join(", ")}`,
      );
    }

    const record: TagRecord = {
      chapterId: chapter.chapterId,
      title: chapter.title,
      sourceHash: hash,
      generated: new Date().toISOString().slice(0, 10),
      model: MODEL,
      reviewed: false,
      ...tags,
    };
    out.chapters[chapter.chapterId] = record;
    totals.wrote++;
    const counts = [
      `rules=${tags.rules.length}`,
      `chars=${tags.characters.length}`,
      `artifacts=${tags.artifacts.length}`,
      `vaults=${tags.vaults.length}`,
      `locs=${tags.locations.length}`,
      `factions=${tags.factions.length}`,
    ].join("  ");
    console.log(`  ✓ ${chapter.chapterId}  ${counts}`);

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  }

  if (!opts.dryRun) {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  }

  console.log("\nChapter entity tagging");
  console.log(`  ✓ wrote:   ${totals.wrote}`);
  console.log(`  ⏭  skipped: ${totals.skipped}`);
  console.log(`  ⚠  dropped: ${totals.dropped}`);
  console.log(`  ⚠  errors:  ${totals.errors}`);
  if (totals.errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
