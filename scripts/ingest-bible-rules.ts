/**
 * ingest-bible-rules.ts
 *
 * AI-assisted extraction of **world-rule prose** from source lore documents
 * (primarily the Celestial Heritage Series Bible) into canonical rule pages
 * under `content/wiki/rules/<slug>.md`.
 *
 * Why this exists:
 *   `inventory-canon.ts` extracts *named entities* — characters, artifacts,
 *   vaults, locations, factions, and named rules (parables, directives).
 *   But the Series Bible carries large sections of setting / philosophy /
 *   constraints that are not entity-shaped (e.g. "The Ancients' Philosophy",
 *   "Technology — Rules, Limits & Style", "Moral Questions Across the
 *   Series"). These should flow into Ask as **always-on canonical context**
 *   via `getRulesContext()` in `src/lib/ai/prompts.ts`, which reads
 *   `content/wiki/rules/*.md`.
 *
 * How this plays with the rest of the pipeline:
 *   - Does NOT touch any entity-seeded files. It operates on slugs listed in
 *     the RULE_MANIFEST below, which are all NEW rule pages.
 *   - Uses a bounded `<!-- bible:rule ... -->` ... `<!-- bible:end -->` block
 *     so hand edits outside the block survive reruns (matches the idempotency
 *     pattern from `seed-canon-entities.ts`).
 *   - Source-hash attribute on the block makes re-extraction a no-op when the
 *     Series Bible section hasn't changed. Use --force to override.
 *   - Per docs/canon-integrity-program.md §2.3, rules are "always eligible for
 *     context" — these pages will appear on every Ask query.
 *
 * CLI:
 *   npx tsx scripts/ingest-bible-rules.ts [--dry-run] [--force] [--slug <s>]
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
const CANON_DIR = path.join(process.cwd(), "celestial_original");
const RULES_DIR = path.join(process.cwd(), "content/wiki/rules");

interface BibleRule {
  slug: string;
  title: string;
  subkind: string;
  sourceDoc: string;
  /** Full heading line that starts the section (inclusive). */
  startHeading: string;
  /** Full heading line that ends the section (exclusive). If omitted, runs
   *  until the next H1/H2. */
  endHeading?: string;
  /** Optional extra steering passed to the model. */
  promptHint?: string;
}

/**
 * Manifest of rule pages this script owns. Keep it explicit so reruns can
 * never drift outside these slugs. Adding a new rule = adding an entry here
 * and running the script.
 *
 * All slugs listed here MUST be new pages — if a slug already carries a
 * `<!-- canon:dossier` block (from seed-canon-entities.ts), this script
 * refuses to touch it to avoid clobbering entity-seeded content.
 */
const RULE_MANIFEST: BibleRule[] = [
  {
    slug: "ancients-philosophy",
    title: "The Ancients' Philosophy",
    subkind: "worldview",
    sourceDoc: "Celestial Heritage Series Bible.md",
    startHeading: "## The Ancients’ Philosophy",
    endHeading: "## Setting: Earth and Mars, 2050",
    promptHint:
      "Combine the top-level Ancients' Philosophy section with its three H3 subsections: Ethics Without Absolutes, Conscious Machines and the Soul Debate, and Society and Leadership. Preserve the epigraph quote.",
  },
  {
    slug: "conscious-machines",
    title: "Conscious Machines and the Soul Debate",
    subkind: "doctrine",
    sourceDoc: "Celestial Heritage Series Bible.md",
    startHeading: "### Conscious Machines and the Soul Debate",
    endHeading: "### Society and Leadership",
    promptHint:
      "Frame this as canonical doctrine about synthetic vs organic consciousness in the series. ALARA and CAEDEN are the two poles; keep their distinction clear.",
  },
  {
    slug: "technology-limits",
    title: "Technology — Rules, Limits & Style",
    subkind: "constraint",
    sourceDoc: "Celestial Heritage Series Bible.md",
    startHeading: "## **⚙️ Technology – Rules, Limits & Style**",
    endHeading: "## **🧩 The Vault Network**",
    promptHint:
      "This is the MOST important rule for Ask — it prevents the assistant from inventing off-canon technology. Keep all hard limits (no FTL, no teleportation, no magic AI) explicit and prominent. Preserve the Galen Voss field-note quote at the end.",
  },
  {
    slug: "vault-network",
    title: "The Vault Network",
    subkind: "worldbuilding",
    sourceDoc: "Celestial Heritage Series Bible.md",
    startHeading: "## **🧩 The Vault Network**",
    endHeading: "## **📜 Parables of Resonance: Vault-Echo Symbolism**",
    promptHint:
      "Preserve all classifications (Threshold, Echo, Silence, Legacy Vaults). Structure the output so each classification stays clearly identifiable — Ask will cite them individually.",
  },
  {
    slug: "moral-questions",
    title: "Moral Questions Across the Series",
    subkind: "theme",
    sourceDoc: "Celestial Heritage Series Bible.md",
    startHeading: "### **📜 Moral Questions Across the Series**",
    endHeading: "### **🔁 Parables & Echo Logic**",
    promptHint:
      "The source has a per-book table. Preserve the exact Book I..V titles and their core moral questions as a table or clear list — Ask will use these to frame book-scoped answers.",
  },
  {
    slug: "spiritual-symbols",
    title: "Spiritual Symbols and Recurrence",
    subkind: "symbolism",
    sourceDoc: "Celestial Heritage Series Bible.md",
    startHeading: "### **✝️ Spiritual Symbols & Recurrence**",
    endHeading: "# 7",
    promptHint:
      "Preserve every recurring symbol (thresholds, light-as-resonance, hands, circles, breath/wind) and its meaning. End with the Jonah Revas quote.",
  },
  {
    slug: "prologue-timeline",
    title: "Prologue Timeline — Before Valkyrie",
    subkind: "chronology",
    sourceDoc: "Celestial Heritage Series Bible.md",
    startHeading: "## **⏳ Prologue Timeline: *Before Valkyrie***",
    endHeading: "# 1",
    promptHint:
      "This is a chronological reference Ask will cite for pre-2050 history (12,000 BCE Final Vaultworks through 2050 Valkyrie-1 construction). Preserve every dated entry as a distinct section or bullet so years stay machine-parseable. Keep the closing Resonant Fragment quote.",
  },
];

interface Options {
  dryRun: boolean;
  force: boolean;
  onlySlug: string | null;
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
    onlySlug: getFlag("--slug"),
  };
}

function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
}

/**
 * Extract the text between startHeading (inclusive) and endHeading (exclusive,
 * defaults to next H1/H2). Returns the raw source slice so we preserve
 * quotes, bullets, and inline formatting verbatim when handing to the LLM.
 */
function extractSection(raw: string, rule: BibleRule): string {
  const lines = raw.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === rule.startHeading.trim()) {
      start = i;
      break;
    }
  }
  if (start === -1) {
    throw new Error(
      `Start heading not found in ${rule.sourceDoc}: ${rule.startHeading}`
    );
  }
  let end = lines.length;
  if (rule.endHeading) {
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].trim() === rule.endHeading.trim()) {
        end = i;
        break;
      }
      // Allow prefix-match for broader end anchors like "# 7" or "# 1".
      if (
        rule.endHeading.length <= 4 &&
        lines[i].trim().startsWith(rule.endHeading.trim())
      ) {
        end = i;
        break;
      }
    }
  } else {
    for (let i = start + 1; i < lines.length; i++) {
      if (/^#{1,2}\s+/.test(lines[i])) {
        end = i;
        break;
      }
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function systemPrompt(): string {
  return `You extract canonical world-rule prose for the Celestial Heritage wiki. Your output will be placed in content/wiki/rules/<slug>.md and fed to the Ask assistant as ALWAYS-ON canonical context for every user question. Ask will cite these rules in answers, so your prose must be trustworthy and complete.

GUIDELINES:

1. **In-universe voice.** Write in third-person, describing the world. Never mention "the author intends", "the series bible says", "the style guide", or any meta framing. The reader/LLM should not know this came from an authoring document.

2. **Preserve every fact.** You may re-order, merge bullets into prose, and tighten repetition for readability, but do not add new facts and do not drop nuance. Specific names, classifications, numbers, limits, and quotes are CANON — keep them.

3. **Preserve quoted lines.** Any line in the source that appears in quotation marks or is attributed via em-dash (e.g. \`— Jonah Revas\`) MUST appear verbatim in your output, with attribution.

4. **Structure.** Use H2 (##) and H3 (###) where the source uses them. Do NOT emit an H1 — the title line is added by the caller. Preserve tables when the source uses tables (per-book matrices, classification tables). Prefer prose over bullet lists when the content flows as reasoning, but keep bullets when enumerating items (classifications, hard limits, symbols).

5. **No meta.** Do not add "## Overview", "## Summary", or editorial framing the source doesn't have. Do not speculate. Do not add "it's worth noting that..."

6. **Output contract.** Respond with markdown body text only. No code fences, no front matter, no "Here is the rule:" preamble, no trailing commentary.`;
}

function userPrompt(rule: BibleRule, section: string): string {
  const hint = rule.promptHint ? `\n\nExtra guidance: ${rule.promptHint}` : "";
  return `Slug: ${rule.slug}
Title: ${rule.title}
Subkind: ${rule.subkind}
Source document: ${rule.sourceDoc}${hint}

Produce the canonical rule body (markdown only, no H1) from the source section below.

---

${section}`;
}

async function callModel(
  client: Anthropic,
  rule: BibleRule,
  section: string
): Promise<string> {
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
    messages: [{ role: "user", content: userPrompt(rule, section) }],
  });
  const textBlock = res.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`No text in model response for slug=${rule.slug}`);
  }
  // Strip any accidental H1 or code fence, just in case.
  let body = textBlock.text.trim();
  body = body.replace(/^```(?:markdown)?\s*/i, "").replace(/\s*```$/i, "");
  body = body.replace(/^#\s+.+\n+/, "");
  return body.trim();
}

function renderBibleBlock(
  rule: BibleRule,
  sourceHash: string,
  body: string,
  generated: string
): string {
  const attrs = [
    `slug="${rule.slug}"`,
    `source="${rule.sourceDoc}"`,
    `source-heading="${rule.startHeading.replace(/"/g, "&quot;")}"`,
    `source-hash="${sourceHash}"`,
    `model="${MODEL}"`,
    `generated="${generated}"`,
  ].join(" ");
  return [
    `<!-- bible:rule ${attrs} -->`,
    body.trim(),
    `<!-- bible:end -->`,
  ].join("\n");
}

function buildNewFile(
  rule: BibleRule,
  sourceHash: string,
  body: string,
  generated: string
): string {
  const lines: string[] = [];
  lines.push(`# ${rule.title}`);
  lines.push(`**Slug:** ${rule.slug}`);
  lines.push("");
  lines.push(renderBibleBlock(rule, sourceHash, body, generated));
  lines.push("");
  lines.push(`## Lore metadata`);
  lines.push("");
  lines.push(`**Content type:** rule`);
  lines.push(`**Subkind:** ${rule.subkind}`);
  lines.push(`**Source type:** foundational_lore`);
  lines.push(`**Canon status:** canonical`);
  lines.push(`**Visibility policy:** always_visible`);
  lines.push(`**Source document:** ${rule.sourceDoc}`);
  lines.push(`**Extractor version:** ingest-bible-rules/1`);
  lines.push("");
  return lines.join("\n");
}

function upsertBibleBlock(raw: string, newBlock: string): string {
  const blockRe = /<!--\s*bible:rule[\s\S]*?<!--\s*bible:end\s*-->/;
  if (blockRe.test(raw)) return raw.replace(blockRe, newBlock);
  const slugMatch = raw.match(/(^\*\*Slug:\*\*.*$)/m);
  if (slugMatch) {
    return raw.replace(slugMatch[0], `${slugMatch[0]}\n\n${newBlock}`);
  }
  const h1Match = raw.match(/(^#\s+.*$)/m);
  if (h1Match) {
    return raw.replace(h1Match[0], `${h1Match[0]}\n\n${newBlock}`);
  }
  return `${newBlock}\n\n${raw}`;
}

function extractExistingSourceHash(raw: string): string | null {
  const m = raw.match(/<!--\s*bible:rule[^>]*source-hash="([^"]+)"/);
  return m ? m[1] : null;
}

function hasCanonDossier(raw: string): boolean {
  return /<!--\s*canon:dossier/.test(raw);
}

async function main() {
  const opts = parseArgs();
  const generated = new Date().toISOString().slice(0, 10);

  const targets = RULE_MANIFEST.filter(
    (r) => !opts.onlySlug || r.slug === opts.onlySlug
  );
  if (targets.length === 0) {
    console.error(`No manifest entries matched --slug ${opts.onlySlug}`);
    process.exit(1);
  }

  const sourceCache = new Map<string, string>();
  const loadSource = (doc: string): string => {
    if (!sourceCache.has(doc)) {
      const p = path.join(CANON_DIR, doc);
      if (!fs.existsSync(p)) {
        throw new Error(`Source doc not found: ${p}`);
      }
      sourceCache.set(doc, fs.readFileSync(p, "utf-8"));
    }
    return sourceCache.get(doc)!;
  };

  const client = opts.dryRun
    ? null
    : (() => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          console.error("ANTHROPIC_API_KEY missing.");
          process.exit(1);
        }
        return new Anthropic({ apiKey });
      })();

  const totals = {
    generated: 0,
    reused: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    blocked: 0,
  };

  for (const rule of targets) {
    const filepath = path.join(RULES_DIR, `${rule.slug}.md`);
    const exists = fs.existsSync(filepath);
    const existing = exists ? fs.readFileSync(filepath, "utf-8") : "";

    if (exists && hasCanonDossier(existing)) {
      console.log(
        `  ⛔ ${rule.slug}: has canon:dossier block — owned by entity seeder, skipping`
      );
      totals.blocked++;
      continue;
    }

    let section: string;
    try {
      section = extractSection(loadSource(rule.sourceDoc), rule);
    } catch (err) {
      console.error(
        `  ⚠  ${rule.slug}: ${err instanceof Error ? err.message : String(err)}`
      );
      totals.skipped++;
      continue;
    }

    const sourceHash = hashContent(section);
    const existingHash = extractExistingSourceHash(existing);
    if (!opts.force && exists && existingHash === sourceHash) {
      console.log(`  ⏭  ${rule.slug} (source unchanged, hash=${sourceHash})`);
      totals.reused++;
      continue;
    }

    if (opts.dryRun) {
      console.log(
        `  ── DRY: ${rule.slug} (${section.length} chars, would ${exists ? "update" : "create"})`
      );
      totals.skipped++;
      continue;
    }

    if (!client) throw new Error("client not init");

    try {
      const body = await callModel(client, rule, section);
      const block = renderBibleBlock(rule, sourceHash, body, generated);
      const nextContent = exists
        ? upsertBibleBlock(existing, block)
        : buildNewFile(rule, sourceHash, body, generated);

      fs.writeFileSync(filepath, nextContent);
      totals.generated++;
      if (exists) totals.updated++;
      else totals.created++;
      console.log(
        `  ${exists ? "↻ upd" : "✓ new"} ${rule.slug}.md (${body.length} chars, hash=${sourceHash})`
      );
    } catch (err) {
      console.error(
        `  ⚠  ${rule.slug}: ${err instanceof Error ? err.message : String(err)}`
      );
      totals.skipped++;
    }
  }

  console.log("\nBible rules");
  console.log(`  created:   ${totals.created}`);
  console.log(`  updated:   ${totals.updated}`);
  console.log(`  reused:    ${totals.reused} (source-hash unchanged)`);
  console.log(`  blocked:   ${totals.blocked} (owned by entity seeder)`);
  console.log(`  skipped:   ${totals.skipped}`);
  if (opts.dryRun) console.log(`  (dry-run; no files written)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
