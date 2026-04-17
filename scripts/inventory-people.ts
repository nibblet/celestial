/**
 * inventory-people.ts — Deterministic people inventory from memoir + interviews
 *
 * Run: npx tsx scripts/inventory-people.ts
 *
 * ## Tiers (see plan: People inventory from stories)
 *
 * - **Tier A — Dedicated story:** Memoir chapter is primarily about a named person.
 *   Detected via: (1) optional `people_seed.json` story_id list + display names;
 *   (2) `story_title` contains a comma — subject is the segment before the first comma
 *     when that segment does not start with a generic article phrase (`A `, `An `, `The `);
 *   (3) `story_title` contains an em/en dash (— or –) — subject is the segment before the dash,
 *     again excluding titles that start with generic articles.
 *
 * - **Tier B — Repeat across memoir:** Candidate proper-name phrase appears in ≥ 2 distinct
 *   `P1_S*` sources (memoir markdown full text + flattened `stories_json` strings).
 *
 * - **Tier C — Manual overrides:** `people_inventory_overrides.json` supplies `exclude_phrases`,
 *   `include_people`, and `aliases` (short form → canonical display string).
 *
 * - **Tier D — Memoir + interviews:** Same phrase extraction as Tier B on `content/wiki/stories/IV_*.md`
 *   full text. Union of memoir source ids + interview ids must be ≥ 2. Output lists memoir vs interview
 *   columns separately.
 *
 * ## P1_S30 carve-out (famous cameos)
 *
 * Mentions that appear **only** in `P1_S30` (no hits in any other memoir chapter) do **not**
 * contribute toward Tier B or Tier D frequency. If a name also appears outside `P1_S30`, all
 * memoir sources (including `P1_S30`) count normally.
 *
 * ## Outputs
 *
 * - `content/raw/people_inventory.md` — human review table
 * - `content/raw/people_inventory.json` — machine-readable rows for `compile-wiki.ts` (wiki stubs).
 *   `wiki_eligible`: Tier **A** and **C** always; Tier **B/D** only if the phrase passes `isLikelyPersonForWiki`
 *   (filters businesses, schools, churches, many locations). Use `wiki_person_include` / `wiki_person_exclude`
 *   in overrides to adjust. `wiki_only` / `wiki_exclude` still apply as hard filters on stubs.
 *   **`curation_notes`:** map canonical name → sentence appended to each row’s `note` in the inventory output.
 */

import * as fs from "fs";
import * as path from "path";

const RAW = path.join(process.cwd(), "content/raw");
const WIKI_STORIES = path.join(process.cwd(), "content/wiki/stories");
const P1_S30 = "P1_S30";

// --- Types ---

interface PeopleSeed {
  tier_a_story_ids?: string[];
  display_name_by_story_id?: Record<string, string>;
}

interface Overrides {
  exclude_phrases?: string[];
  /** Full canonical names to force-include with optional source hints */
  include_people?: {
    canonical_name: string;
    memoir_story_ids?: string[];
    interview_story_ids?: string[];
    note?: string;
  }[];
  /** Map extracted / short phrase → canonical display name (counts merge) */
  aliases?: Record<string, string>;
  /** If set, only these canonical names get wiki stubs (case-insensitive). Omit for all tiered rows. */
  wiki_only?: string[];
  /** Canonical names to omit from wiki stubs even if tiered (case-insensitive). */
  wiki_exclude?: string[];
  /** Force wiki stub for this canonical (after person filter); use for false negatives. */
  wiki_person_include?: string[];
  /** Block wiki stub even if person filter passes (e.g. Tier A edge case). */
  wiki_person_exclude?: string[];
  /** Appended to `note` on rows whose `canonical_name` matches (case-insensitive). */
  curation_notes?: Record<string, string>;
}

interface StoryJson {
  story_id: string;
  story_title: string;
  [key: string]: unknown;
}

interface PersonRow {
  canonical_name: string;
  slug: string;
  tiers: string[];
  memoir_story_ids: string[];
  interview_story_ids: string[];
  /** Story IDs whose chapter subject is this person (Tier A) */
  tier_a_story_ids: string[];
  note: string;
  wiki_eligible: boolean;
}

// --- Title cleanup (align with compile-wiki) ---

function cleanTitle(title: string): string {
  return title
    .replace(/T\s+owhead/g, "Towhead")
    .replace(/T\s+eenager/g, "Teenager")
    .replace(/T\s+eacher/g, "Teacher")
    .replace(/T\s+ogetherness/g, "Togetherness")
    .replace(/Y\s+ears/g, "Years")
    .replace(/T\s+o\s+God/g, "To God")
    .replace(/T\s+\./g, "T.")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(name: string): string {
  return cleanTitle(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Memoir markdown: prefer ## Full Text body */
function extractMemoirBody(rawMd: string): string {
  const fullTextMatch = rawMd.match(/## Full Text\n\n([\s\S]*)/);
  return fullTextMatch ? fullTextMatch[1] : rawMd;
}

/** Wiki story page: prefer ## Full Text */
function extractWikiStoryBody(md: string): string {
  const fullTextMatch = md.match(/## Full Text\n\n([\s\S]*?)(?=\n## |\n---\s*$)/);
  if (fullTextMatch) return fullTextMatch[1];
  const fm = md.replace(/^---[\s\S]*?---\s*/, "");
  return fm;
}

function jsonStrings(v: unknown, acc: string[] = []): string[] {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) for (const x of v) jsonStrings(x, acc);
  else if (v && typeof v === "object") for (const x of Object.values(v)) jsonStrings(x, acc);
  return acc;
}

const GENERIC_SUBJECT_PREFIX = /^(A|An|The)\s+/i;

function tierASubjectFromTitle(storyId: string, titleRaw: string, seed: PeopleSeed): string | null {
  const title = cleanTitle(titleRaw);
  if (seed.display_name_by_story_id?.[storyId]) return seed.display_name_by_story_id[storyId]!;

  const commaIdx = title.indexOf(",");
  if (commaIdx > 0) {
    const seg = title.slice(0, commaIdx).trim();
    // Require a space so "Houses, Cars and Boats" is not treated as a person
    if (seg.includes(" ") && seg.length >= 2 && !GENERIC_SUBJECT_PREFIX.test(seg)) return seg;
  }

  // Em/en dash may touch the word before it (e.g. "Frances Cobb—A Spool…")
  const dashParts = title.split(/[—–\-]/);
  if (dashParts.length >= 2) {
    const seg = dashParts[0]!.trim();
    if (seg.length >= 2 && !GENERIC_SUBJECT_PREFIX.test(seg)) {
      if (/^[A-Z]{2,10}$/.test(seg.replace(/\s+/g, ""))) return null;
      return seg;
    }
  }

  if (seed.tier_a_story_ids?.includes(storyId)) {
    return title;
  }

  return null;
}

function tierAStoryIds(jsonById: Record<string, StoryJson>, seed: PeopleSeed): Map<string, string> {
  const out = new Map<string, string>();
  for (const id of seed.tier_a_story_ids || []) {
    const j = jsonById[id];
    if (!j) continue;
    const subj = tierASubjectFromTitle(id, j.story_title, seed);
    if (subj) out.set(id, subj);
  }
  for (const [id, j] of Object.entries(jsonById)) {
    if (out.has(id)) continue;
    const subj = tierASubjectFromTitle(id, j.story_title, seed);
    if (subj) out.set(id, subj);
  }
  return out;
}

const MIDDLE_PARTICLES = new Set(["and", "of", "the", "van", "de", "la", "von", "der"]);

/** Single-letter tokens are not name edges (prevents "But I", "A Car"). */
function isNameEdgeToken(w: string): boolean {
  if (!w || w.length < 2) return false;
  if (MIDDLE_PARTICLES.has(w.toLowerCase())) return false;
  if (/^[A-Z]\.$/.test(w)) return true; // T.
  return /^[A-Z][a-zA-Z'\-]*$/.test(w) || /^[A-Z]{2,3}$/.test(w);
}

function isNameToken(w: string): boolean {
  if (!w) return false;
  if (MIDDLE_PARTICLES.has(w.toLowerCase())) return true;
  if (/^[A-Z]\.$/.test(w)) return true;
  return /^[A-Z][a-zA-Z'\-]*$/.test(w) || /^[A-Z]{2,3}$/.test(w);
}

/** Light filter: obvious sentence starters / pronoun tails (keep short to avoid dropping real names). */
const BANNED_PHRASE_FIRST = new Set([
  "although",
  "actually",
  "because",
  "before",
  "after",
  "whether",
  "when",
  "while",
  "until",
  "since",
  "though",
  "if",
  "but",
  "and",
  "or",
  "well",
  "yeah",
  "perhaps",
  "probably",
  "according",
]);

const BANNED_PHRASE_LAST = new Set([
  "i",
  "he",
  "she",
  "we",
  "it",
  "my",
  "me",
  "you",
  "an",
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
]);

/** Drop the worst sentence fragments; permissive for more names/places/orgs. */
function passesPhraseShape(words: string[]): boolean {
  if (words.length < 2) return false;
  const first = words[0]!.toLowerCase();
  const last = words[words.length - 1]!.toLowerCase();
  if (BANNED_PHRASE_FIRST.has(first)) return false;
  if (BANNED_PHRASE_LAST.has(last)) return false;
  if (words.length === 2) {
    const a = words[0]!.length;
    const b = words[1]!.length;
    if (a < 2 || b < 2) return false;
    if (a === 2 && b === 2) return false;
  }
  return true;
}

/** Extract 2–5 word candidate phrases from token stream */
function extractPhrasesFromText(text: string): Set<string> {
  const rawTokens = text.split(/[^A-Za-z0-9'\-]+/).filter(Boolean);
  const phrases = new Set<string>();

  for (let i = 0; i < rawTokens.length; i++) {
    for (let len = 2; len <= 5 && i + len <= rawTokens.length; len++) {
      const slice = rawTokens.slice(i, i + len);
      if (!isNameEdgeToken(slice[0]!)) continue;
      if (!isNameEdgeToken(slice[len - 1]!)) continue;
      let ok = true;
      for (let k = 1; k < len - 1; k++) {
        if (!isNameToken(slice[k]!)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const phrase = slice.join(" ");
      if (phrase.length < 5) continue;
      if (!passesPhraseShape(slice)) continue;
      phrases.add(phrase);
    }
  }
  return phrases;
}

function phraseRegex(phrase: string): RegExp {
  const parts = phrase.split(/\s+/).map(escapeRegex);
  return new RegExp(`(?:^|[^A-Za-z0-9])${parts.join("[^A-Za-z0-9]+")}(?:[^A-Za-z0-9]|$)`, "i");
}

function storyContainsPhrase(body: string, phrase: string): boolean {
  return phraseRegex(phrase).test(body);
}

/** P1_S30-only mentions do not count toward B/D unless also elsewhere */
function applyP130Carveout(memoirHits: Set<string>): Set<string> {
  const without = new Set([...memoirHits].filter((id) => id !== P1_S30));
  if (without.size === 0) return new Set();
  return memoirHits;
}

function normalizePhrase(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function loadJson<T>(p: string, fallback: T): T {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

const DEFAULT_STOPLIST = new Set(
  [
    "United States",
    "Peat Marwick",
    "Boy Scouts",
    "Big Eight",
    "United Way",
    "Federal Reserve",
    "North Mississippi",
    "South Florida",
    "Fort Lauderdale",
    "New York",
    "Los Angeles",
    "Washington DC",
    "Washington Dc",
    "Middle East",
    "Eastern Shore",
    "Red Clay",
    "Calhoun City",
    "Mississippi State",
    "State University",
    "First Baptist",
    "Baptist Church",
    "English Class",
    "Old English",
    "Major League",
    "Life Magazine",
    "Create Community",
    "Student Government",
    "Eagle Scout",
    "Cub Scout",
    "Boy Scout",
    "Saturday Evening",
    "Silvery Moon",
    "Canterbury Tales",
    "Return Native",
    "Native American",
    "Justice Company",
    "State Cash",
    "Rupert Supermarket",
    "Nova Southeastern",
    "Republic Industries",
    "AutoNation",
    "Coffee With",
    "Chat GPT",
    "Out Of",
    "Clay Hills",
    "This Looks",
    "Man I",
    "Thank You",
    "Good Job",
    "Well I",
    "Yeah I",
    "You Know",
    "I Think",
    "I Mean",
    "I I",
    "We We",
    "It It",
    "And So",
    "So I",
    "If You",
    "When You",
    "What You",
    "How You",
    "One One",
    "Each Each",
    "Every Every",
    "Some Some",
    "Many Many",
    "Most Most",
    "More More",
    "Very Very",
    "Just Just",
    "Only Only",
    "Also Also",
    "Even Even",
    "Still Still",
    "Ever Ever",
    "Never Never",
    "Always Always",
    "Really Really",
    "Pretty Pretty",
    "Little Little",
    "Long Long",
    "Much Much",
    "Such Such",
    "Other Other",
    "Same Same",
    "Next Next",
    "Last Last",
    "First First",
    "Second Second",
    "Third Third",
    "New New",
    "Old Old",
    "Young Young",
    "Small Small",
    "Large Large",
    "High High",
    "Low Low",
    "Big Big",
    "Bad Bad",
    "Good Good",
    "Best Best",
    "Main Main",
    "Great Great",
    "Full Full",
    "Half Half",
    "Whole Whole",
    "True True",
    "False False",
    "Right Right",
    "Wrong Wrong",
    "Left Left",
    "White White",
    "Black Black",
  ].map((x) => x.toLowerCase())
);

/**
 * Last token strongly suggests a place / institution / business (not a person’s name).
 * Omit bare US state names here — they double as given names (e.g. Virginia, Georgia).
 */
const NONPERSON_LAST_WORDS = new Set([
  "county", "city", "springs", "beach", "island", "islands", "bay", "creek", "river", "lake", "mountain",
  "park", "plaza", "mall", "airport", "highway", "road", "street", "avenue", "boulevard", "drive", "lane",
  "school", "schools", "university", "college", "academy", "campus", "institute", "seminary",
  "church", "chapel", "cathedral", "temple", "synagogue", "mosque",
  "foundation", "corporation", "company", "companies", "industries", "systems", "services", "foods", "motors",
  "bank", "banks", "credit", "loan", "savings", "union", "center", "centre", "hall", "stadium", "arena",
  "field", "caverns", "canyon", "valley", "forest", "woods", "hills", "clay", "store", "stores", "shop",
  "council", "commission", "committee", "department", "administration", "government", "board", "authority",
  "rica", "band", "choir", "orchestra", "ensemble", "quartet", "symphony",
  "co", "inc", "llc", "ltd", "corp",
]);

/** If any token matches, treat as org/place noise for wiki (B/D only). */
const NONPERSON_TOKEN = new Set([
  "university", "college", "campus", "institute", "seminary", "academy", "school", "preschool",
  "corporation", "corp", "inc", "llc", "ltd", "company", "companies", "industries", "systems", "foods",
  "motors", "airlines", "airline", "foundation", "association", "associates", "partners", "partnership",
  "bank", "banks", "credit", "savings", "loan", "union", "trust", "financial", "insurance", "realtors",
  "rent", "leasing", "stores", "store", "market", "markets", "plaza", "mall", "center", "centre", "hospital",
  "clinic", "medical", "museum", "library", "courthouse", "prison", "jail", "airport", "station", "depot",
  "hotel", "motel", "resort", "inn", "suites", "tower", "towers", "building", "complex", "campus",
  "church", "chapel", "cathedral", "temple", "synagogue", "mosque", "parish", "diocese", "ministry",
  "council", "commission", "committee", "department", "administration", "government", "senate", "congress",
  "agency", "bureau", "office", "offices", "headquarters", "hq", "division", "subsidiary", "group", "holdings",
  "enterprises", "international", "regional", "municipal",
  "township", "borough", "district", "zone", "authority", "transit", "utilities", "electric", "gas", "water",
  "jamboree", "federation", "coalition", "alliance", "network", "forum", "league",
  "franchise", "supermarket", "wholesale", "warehouse", "factory", "plant", "mills",
  "unit", "units", "chapter", "lodge", "order", "society", "guild",
]);

const NONPERSON_SUBSTRINGS = [
  "high school",
  "middle school",
  "elementary school",
  "state university",
  "community college",
  "city college",
  "federal reserve",
  "boy scout",
  "girl scout",
  "united way",
  "rent a car",
  "savings and loan",
  "credit union",
  "first national bank",
  "national bank",
  "community foundation",
  "arts center",
  "arts centre",
  "professional services",
  "accounting professional",
  "disney world",
  "city of fort",
  "city high",
  "city mississippi",
  "federal reserve board",
  "presbyterian church",
  "baptist church",
  "methodist church",
  "catholic church",
  "episcopal church",
  "lutheran church",
  "first presbyterian",
  "coral ridge presbyterian",
  "alliance data",
  "data systems",
  "capital kidder",
  "peat marwick",
  "arthur andersen",
  "cal-maine",
  "commonwealth savings",
  "contracting company",
  "contracting co",
  "bargain store",
  "drug store",
  "concerto no",
  "flat minor",
  "flat major",
  "boy scout council",
  "boy scout jamboree",
  "air force academy",
  "air force",
  "force academy",
  "dean of student",
  "dean of the",
  "ceo of",
  "cfo of",
  "president of the",
  "secretary of the",
  "secretary of state",
  "student affairs",
  "student government",
  "fair lady",
  "fair talent",
  "talent competition",
  "closer walk",
  "ebbets field",
  "forest hall",
  "crest school",
  "duchin story",
  "baltimore philadelphia",
  "baltimore accepted",
  "africa one",
  "all-state band",
  "all state band",
  "first national",
  "general motors",
  "ge capital",
  "kidder peabody",
  "main hurdman",
  "main line",
  "lauderdale peat",
  "mallory house",
  "hall of fame",
  "humble oil",
  "marwick mitchell",
  "mid-south fair",
  "forge pennsylvania",
  "jackson mississippi",
  "hattiesburg mississippi",
  "louis cardinals",
  "i've i've",
  "i' i've",
  "mississippi southern",
  "florida and the",
  "florida state",
  "calhoun city high",
  "calhoun city mississippi",
  "city of fort lauderdale",
  "broward county",
  "altamonte springs",
  "coral ridge",
  "carlsbad caverns",
  "camp palila",
  "costa rica",
  "dr carter dobbs dr",
  "dobbs dr",
  "carter dobbs dr",
];

const NONPERSON_FIRST_WORDS = new Set([
  "north", "south", "east", "west", "new", "fort", "los", "san", "lake", "mount", "gulf", "atlantic",
  "pacific", "greater", "metro", "metropolitan", "upper", "lower", "central", "eastern", "western",
  "northern", "southern", "inner", "outer", "mid", "broward", "orange", "dade", "altamonte", "bargain",
  "africa", "europe", "asia",
]);

/** Strong person signal: honorific / role that usually prefixes a person name. */
const PERSON_PREFIX = /^(Dr|Mr|Mrs|Miss|Ms|Prof|Professor|Senator|Sen|Rep|Representative|Judge|Justice|Colonel|Col|General|Gen|Captain|Capt|Major|Maj|Lieutenant|Lt)\b/i;

/** Looks like an acronym ticker (KPMG, IBM) — usually not a personal name page. */
function hasOrgAcronymToken(words: string[]): boolean {
  for (const w of words) {
    if (/^[A-Z]{3,6}$/.test(w)) return true;
  }
  return false;
}

/**
 * Wiki stubs should skew to **people**, not businesses, campuses, or geography.
 * Tier A / C always pass; Tier B/D must satisfy this (plus overrides).
 */
function isLikelyPersonForWiki(canonical: string, tiers: string[]): boolean {
  if (tiers.includes("A") || tiers.includes("C")) return true;
  const raw = normalizePhrase(canonical);
  const low = raw.toLowerCase();
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;

  if (PERSON_PREFIX.test(raw)) {
    const t = raw.trim();
    if (/\sdr\.?$/i.test(t)) return false;
    return true;
  }

  for (const sub of NONPERSON_SUBSTRINGS) {
    if (low.includes(sub)) return false;
  }

  const last = words[words.length - 1]!.toLowerCase();
  if (NONPERSON_LAST_WORDS.has(last)) return false;

  const first = words[0]!.toLowerCase();
  if (NONPERSON_FIRST_WORDS.has(first)) return false;

  for (const w of words) {
    const t = w.toLowerCase();
    if (NONPERSON_TOKEN.has(t)) return false;
  }

  if (hasOrgAcronymToken(words)) return false;

  const second = words.length >= 2 ? words[1]!.toLowerCase() : "";
  if (words.length === 2) {
    const a = words[0]!.length;
    const b = words[1]!.length;
    if (NONPERSON_LAST_WORDS.has(second) || NONPERSON_TOKEN.has(second)) return false;
    if (["rent", "bank", "store", "city", "county", "springs", "beach", "center", "hall", "systems", "services", "foods", "data", "loan", "corp", "inc"].includes(second))
      return false;
    if (a < 3 && b < 4) return false;
  }

  if (/\b(of|for)\s+the\s+/i.test(low)) return false;

  if (words.length >= 4) return false;

  return true;
}

function main() {
  const seed = loadJson<PeopleSeed>(path.join(RAW, "people_seed.json"), {});
  const overrides = loadJson<Overrides>(path.join(RAW, "people_inventory_overrides.json"), {});

  const stoplist = new Set(DEFAULT_STOPLIST);
  for (const p of overrides.exclude_phrases || []) stoplist.add(p.trim().toLowerCase());

  const jsonDir = path.join(RAW, "stories_json");
  const mdDir = path.join(RAW, "stories_md");

  const jsonById: Record<string, StoryJson> = {};
  for (const f of fs.readdirSync(jsonDir).filter((x) => x.endsWith(".json"))) {
    const j = JSON.parse(fs.readFileSync(path.join(jsonDir, f), "utf-8")) as StoryJson;
    jsonById[j.story_id] = j;
  }

  const mdById: Record<string, string> = {};
  for (const f of fs.readdirSync(mdDir).filter((x) => x.endsWith(".md"))) {
    const m = f.match(/^(P\d+_S\d+)/);
    if (m) mdById[m[1]!] = fs.readFileSync(path.join(mdDir, f), "utf-8");
  }

  const memoirBodies: Record<string, string> = {};
  for (const id of Object.keys(jsonById)) {
    const md = mdById[id] || "";
    const jsonBlob = jsonStrings(jsonById[id]).join("\n");
    memoirBodies[id] = `${extractMemoirBody(md)}\n${jsonBlob}`;
  }

  const ivFiles = fs.existsSync(WIKI_STORIES)
    ? fs.readdirSync(WIKI_STORIES).filter((f) => f.startsWith("IV_") && f.endsWith(".md"))
    : [];

  if (ivFiles.length === 0) {
    console.warn(
      "⚠️  No IV_*.md under content/wiki/stories — Tier D will have no interview sources. Run `npx tsx scripts/compile-wiki.ts` first."
    );
  }

  const ivBodies: Record<string, string> = {};
  for (const f of ivFiles) {
    const id = f.match(/^(IV_S\d+)/)?.[1];
    if (!id) continue;
    const raw = fs.readFileSync(path.join(WIKI_STORIES, f), "utf-8");
    ivBodies[id] = extractWikiStoryBody(raw);
  }

  function canonicalizePhrase(phrase: string): string {
    const n = normalizePhrase(phrase);
    const a = overrides.aliases || {};
    const lower = n.toLowerCase();
    for (const [from, to] of Object.entries(a)) {
      if (from.toLowerCase() === lower) return normalizePhrase(to);
    }
    return n;
  }

  /** Phrase → source story ids (memoir), built by scanning each body once */
  const memoirRaw = new Map<string, Set<string>>();
  for (const [id, body] of Object.entries(memoirBodies)) {
    for (const phrase of extractPhrasesFromText(body)) {
      const norm = normalizePhrase(phrase);
      if (norm.length < 5 || stoplist.has(norm.toLowerCase())) continue;
      if (!storyContainsPhrase(body, norm)) continue;
      if (!memoirRaw.has(norm)) memoirRaw.set(norm, new Set());
      memoirRaw.get(norm)!.add(id);
    }
  }

  const ivHits = new Map<string, Set<string>>();
  for (const [id, body] of Object.entries(ivBodies)) {
    for (const phrase of extractPhrasesFromText(body)) {
      const norm = normalizePhrase(phrase);
      if (norm.length < 5 || stoplist.has(norm.toLowerCase())) continue;
      if (!storyContainsPhrase(body, norm)) continue;
      if (!ivHits.has(norm)) ivHits.set(norm, new Set());
      ivHits.get(norm)!.add(id);
    }
  }

  type Agg = { memoir: Set<string>; iv: Set<string> };
  const merged = new Map<string, Agg>();
  function bump(canon: string, mem: Iterable<string>, iv: Iterable<string>) {
    if (!merged.has(canon)) merged.set(canon, { memoir: new Set(), iv: new Set() });
    const g = merged.get(canon)!;
    for (const x of mem) g.memoir.add(x);
    for (const x of iv) g.iv.add(x);
  }
  for (const [ph, ids] of memoirRaw.entries()) bump(canonicalizePhrase(ph), ids, []);
  for (const [ph, ids] of ivHits.entries()) bump(canonicalizePhrase(ph), [], ids);

  const tierAMap = tierAStoryIds(jsonById, seed);

  const rowsByName = new Map<string, PersonRow>();

  function getOrCreateRow(name: string): PersonRow {
    const canon = normalizePhrase(name);
    const slug = slugify(canon);
    let r = rowsByName.get(canon);
    if (!r) {
      r = {
        canonical_name: canon,
        slug,
        tiers: [],
        memoir_story_ids: [],
        interview_story_ids: [],
        tier_a_story_ids: [],
        note: "",
        wiki_eligible: true,
      };
      rowsByName.set(canon, r);
    }
    return r;
  }

  function recomputeTiers(r: PersonRow, manualC: boolean) {
    const memoirAll = new Set(r.memoir_story_ids);
    const ivAll = new Set(r.interview_story_ids);
    const memoirForFreq = applyP130Carveout(memoirAll);
    const unionForD = new Set([...memoirForFreq, ...ivAll]);
    const tiers: string[] = [];
    if (r.tier_a_story_ids.length > 0) tiers.push("A");
    if (memoirForFreq.size >= 2) tiers.push("B");
    if (unionForD.size >= 2) tiers.push("D");
    if (manualC) tiers.push("C");
    r.tiers = [...new Set(tiers)].sort();
  }

  // Tier A — dedicated chapter subjects
  for (const [storyId, subject] of tierAMap.entries()) {
    const r = getOrCreateRow(subject);
    if (!r.tier_a_story_ids.includes(storyId)) r.tier_a_story_ids.push(storyId);
    if (!r.memoir_story_ids.includes(storyId)) r.memoir_story_ids.push(storyId);
    r.memoir_story_ids.sort();
    r.tier_a_story_ids.sort();
    r.note = [r.note, `Tier A subject from ${storyId}.`].filter(Boolean).join(" ").trim();
  }

  // Tier B / D — frequency across merged map (full memoir + IV sets for evidence columns)
  for (const [phrase, agg] of merged.entries()) {
    if (stoplist.has(phrase.toLowerCase())) continue;
    const memoirAll = new Set(agg.memoir);
    const ivAll = new Set(agg.iv);
    const memoirForFreq = applyP130Carveout(memoirAll);
    const unionForD = new Set([...memoirForFreq, ...ivAll]);
    const bHit = memoirForFreq.size >= 2;
    const dHit = unionForD.size >= 2;
    if (!bHit && !dHit) continue;

    const r = getOrCreateRow(phrase);
    for (const x of memoirAll) if (!r.memoir_story_ids.includes(x)) r.memoir_story_ids.push(x);
    for (const x of ivAll) if (!r.interview_story_ids.includes(x)) r.interview_story_ids.push(x);
    r.memoir_story_ids.sort();
    r.interview_story_ids.sort();
  }

  const manualCNames = new Set(
    (overrides.include_people || []).map((x) => normalizePhrase(x.canonical_name).toLowerCase())
  );

  // Manual includes (Tier C)
  for (const inc of overrides.include_people || []) {
    const r = getOrCreateRow(inc.canonical_name);
    for (const x of inc.memoir_story_ids || [])
      if (!r.memoir_story_ids.includes(x)) r.memoir_story_ids.push(x);
    for (const x of inc.interview_story_ids || [])
      if (!r.interview_story_ids.includes(x)) r.interview_story_ids.push(x);
    r.memoir_story_ids.sort();
    r.interview_story_ids.sort();
    r.note = [r.note, inc.note || "Manual include."].filter(Boolean).join(" ").trim();
  }

  // Exclude phrases: remove rows whose canonical matches
  const excludeLower = new Set((overrides.exclude_phrases || []).map((x) => x.toLowerCase()));
  for (const k of [...rowsByName.keys()]) {
    if (excludeLower.has(k.toLowerCase())) rowsByName.delete(k);
  }

  const rows = [...rowsByName.values()];
  for (const r of rows) {
    recomputeTiers(r, manualCNames.has(r.canonical_name.toLowerCase()));
  }

  const finalRows = [...rowsByName.values()]
    .filter((r) => r.tiers.length > 0)
    .sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));

  const curNotes = overrides.curation_notes || {};
  for (const r of finalRows) {
    const key = r.canonical_name.toLowerCase();
    for (const [nk, text] of Object.entries(curNotes)) {
      if (nk.toLowerCase() !== key) continue;
      r.note = [r.note, text].filter(Boolean).join(" ").trim();
    }
  }

  const wikiOnly = overrides.wiki_only?.length
    ? new Set(overrides.wiki_only.map((x) => normalizePhrase(x).toLowerCase()))
    : null;
  const wikiExclude = new Set(
    (overrides.wiki_exclude || []).map((x) => normalizePhrase(x).toLowerCase())
  );
  const wikiPersonInclude = new Set(
    (overrides.wiki_person_include || []).map((x) => normalizePhrase(x).toLowerCase())
  );
  const wikiPersonExclude = new Set(
    (overrides.wiki_person_exclude || []).map((x) => normalizePhrase(x).toLowerCase())
  );
  for (const r of finalRows) {
    const key = r.canonical_name.toLowerCase();
    if (wikiExclude.has(key)) {
      r.wiki_eligible = false;
      continue;
    }
    if (wikiOnly && !wikiOnly.has(key)) {
      r.wiki_eligible = false;
      continue;
    }
    if (wikiPersonExclude.has(key)) {
      r.wiki_eligible = false;
      continue;
    }
    if (wikiPersonInclude.has(key)) {
      r.wiki_eligible = r.tiers.length > 0;
      continue;
    }
    r.wiki_eligible = r.tiers.length > 0 && isLikelyPersonForWiki(r.canonical_name, r.tiers);
  }

  const today = new Date().toISOString().split("T")[0];
  const mdLines = [
    "# People inventory (generated)",
    "",
    `> Deterministic scan of memoir \`stories_md\` + \`stories_json\` and interview wiki \`IV_*.md\`. **Tiers:** A = dedicated chapter subject; B = ≥2 memoir sources (P1_S30 carve-out); C = manual include; D = ≥2 sources in union of memoir (carved) + interviews. Generated ${today}.`,
    "",
    "| canonical_name | tiers | memoir_sources | interview_sources | wiki_eligible | note |",
    "|---|---:|---|---|---|---|",
  ];

  for (const r of finalRows) {
    const tiers = r.tiers.join("+");
    const mem = r.memoir_story_ids.join(", ");
    const iv = r.interview_story_ids.join(", ");
    mdLines.push(
      `| ${r.canonical_name.replace(/\|/g, "\\|")} | ${tiers} | ${mem || "—"} | ${iv || "—"} | ${r.wiki_eligible} | ${(r.note || "").replace(/\|/g, "\\|")} |`
    );
  }

  const outMd = path.join(RAW, "people_inventory.md");
  const outJson = path.join(RAW, "people_inventory.json");
  fs.writeFileSync(outMd, mdLines.join("\n") + "\n");
  fs.writeFileSync(
    outJson,
    JSON.stringify({ generated: today, people: finalRows }, null, 2) + "\n"
  );

  console.log(`Wrote ${outMd}`);
  console.log(`Wrote ${outJson}`);
  console.log(`Rows: ${finalRows.length}`);
}

main();
