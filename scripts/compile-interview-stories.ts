/**
 * compile-interview-stories.ts
 *
 * Parses the Coffee with Cagnetta transcript into interview stories
 * that follow the same wiki format as memoir stories.
 *
 * Pipeline mirrors the memoir flow:
 *   raw transcript → cleaned stories_md + stories_json → wiki pages
 *
 * Run: npx tsx scripts/compile-interview-stories.ts
 *
 * Curated stories: IDs listed in content/raw/interview/CURATED_STORY_IDS.txt are
 * skipped so hand-edited markdown/json/wiki files are not overwritten.
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const PUBLIC_INFO = path.join(ROOT, "brain_lab/public_info");
const RAW_IV = path.join(ROOT, "content/raw/interview");
const WIKI_STORIES = path.join(ROOT, "content/wiki/stories");
const CURATED_STORY_IDS_PATH = path.join(RAW_IV, "CURATED_STORY_IDS.txt");

function loadCuratedStoryIds(): Set<string> {
  if (!fs.existsSync(CURATED_STORY_IDS_PATH)) return new Set();
  const raw = fs.readFileSync(CURATED_STORY_IDS_PATH, "utf8");
  return new Set(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
  );
}

// --- Story grouping map: chapter ranges → story ---

interface StoryMapping {
  storyId: string;
  title: string;
  chapters: number[]; // 1-indexed chapter numbers to include
  lifeStage: string;
  themes: string[];
  relatedStories: string[];
  summary: string;
  principles: string[];
  heuristics: string[];
  quotes: string[];
  bestUsedWhen: string[];
}

const STORY_MAP: StoryMapping[] = [
  {
    storyId: "IV_S01",
    title: "Writing the Memoir",
    chapters: [1, 2],
    lifeStage: "Reflection",
    themes: ["Curiosity", "Identity", "Gratitude"],
    relatedStories: ["P1_S39"],
    summary:
      "Keith describes how he began writing Out of the Red Clay Hills — starting with scattered memories, getting advice from a memoir seminar instructor on a cruise ship who told him to throw away his CPA-style outline, and spending four years letting the stories come naturally.",
    principles: [
      "Be willing to discard your approach when an expert shows you a better way.",
      "Creative work requires patience — a book develops over years, not weeks.",
      "Start by capturing stories as they come; structure follows organically.",
    ],
    heuristics: [
      "When starting a writing or creative project, gather material freely before imposing structure.",
      "When your systematic approach isn't working, seek expert guidance and be willing to start over.",
    ],
    quotes: [
      "This looks like it was written by a CPA. You need to throw this away.",
      "Just sit down and write your stories as they come to you in no particular order or fashion.",
    ],
    bestUsedWhen: [
      "Someone is starting a creative project and over-planning",
      "Someone needs encouragement to let go of rigid structure",
      "Someone asks about the memoir itself",
    ],
  },
  {
    storyId: "IV_S02",
    title: "Mississippi Roots (Interview)",
    chapters: [3],
    lifeStage: "Childhood",
    themes: ["Community", "Identity", "Gratitude"],
    relatedStories: ["P1_S01", "P1_S02"],
    summary:
      "Keith reflects on growing up in a small North Mississippi town of about 2,000 people — a microcosm of society with an unusually strong education system. He describes the red clay hills that gave his memoir its title and how he maintained roots there even after leaving.",
    principles: [
      "A small community can provide an education and value system as strong as any large one.",
      "Your origins stay with you — they are a foundation, not a limitation.",
    ],
    heuristics: [
      "When evaluating where you come from, look for the unique strengths of your community rather than its limitations.",
    ],
    quotes: [
      "I learned a lot in that small world, a microcosm of society.",
      "It's in a part of Mississippi that has red clay hills. So hence the title.",
    ],
    bestUsedWhen: [
      "Someone asks about Keith's childhood",
      "Someone is reflecting on small-town origins",
      "Someone asks about the book title",
    ],
  },
  {
    storyId: "IV_S03",
    title: "The KPMG Journey (Interview)",
    chapters: [4, 5],
    lifeStage: "Mid Career",
    themes: ["Career Choices", "Leadership", "Work Ethic", "Mentorship"],
    relatedStories: ["P1_S16", "P1_S18", "P1_S19", "P1_S20", "P1_S21", "P1_S22", "P1_S23", "P1_S24"],
    summary:
      "Keith traces his 32-year journey at KPMG — from choosing the firm over other Big Eight offers because of fit, starting in Jackson, Mississippi, opening the Orlando office when Disney World opened, running Fort Lauderdale for 14 years, then Baltimore, Philadelphia, and New York. He reflects on team-building and recruiting as his strongest skills.",
    principles: [
      "Choose based on fit, not just the offer — long-term alignment matters more than short-term advantage.",
      "Recruiting great people is the single most important leadership skill.",
      "Building teams is a learned skill developed through years of practice.",
    ],
    heuristics: [
      "When choosing between comparable opportunities, pick the one that feels like the best fit for who you are.",
      "When building a team, invest more time in recruiting excellent people than in managing average ones.",
    ],
    quotes: [
      "I decided on KPMG because it was a better fit for me. It turns out that was a good judgment.",
      "I think I've done a decent job of organizing and running teams, but I think I've done an even better job of recruiting people.",
    ],
    bestUsedWhen: [
      "Someone is choosing between job offers",
      "Someone asks about building teams",
      "Someone asks about Keith's career at KPMG",
    ],
  },
  {
    storyId: "IV_S04",
    title: "The Call from Alamo (Interview)",
    chapters: [6, 7],
    lifeStage: "Leadership",
    themes: ["Career Choices", "Leadership", "Adversity", "Financial Responsibility"],
    relatedStories: ["P1_S25"],
    summary:
      "Keith describes how Mike Egan called him to leave KPMG after 32 years to become CEO of Alamo Rent A Car, which was faltering. He reflects on Alamo's scale — 13% national market share, 125,000 cars — and how he and his team achieved a major turnaround over two years. The company was privately held but was a formidable operation.",
    principles: [
      "When someone you trust asks for help, answer the call — even if it means leaving security behind.",
      "Scale demands respect — understand the full magnitude of what you're taking on before acting.",
      "A turnaround requires focused execution over a defined period, not indefinite tinkering.",
    ],
    heuristics: [
      "When offered a role that leverages a long-standing relationship, weigh the trust built over years against the comfort of your current position.",
      "When facing a turnaround, define a time horizon and focus relentlessly within it.",
    ],
    quotes: [
      "I shifted gears, left the public accounting profession after 32 years.",
      "We had 13% of the national market share. We had 125,000 cars. It was a formidable operation.",
      "There was a lot to be done and fortunately we were able to get a lot done over a two-year period.",
    ],
    bestUsedWhen: [
      "Someone is considering a major career change",
      "Someone asks about the Alamo turnaround",
      "Someone faces a challenge that requires decisive action",
    ],
  },
  {
    storyId: "IV_S05",
    title: "Selling to AutoNation (Interview)",
    chapters: [8],
    lifeStage: "Leadership",
    themes: ["Career Choices", "Financial Responsibility", "Leadership"],
    relatedStories: ["P1_S25", "P1_S26"],
    summary:
      "Keith briefly describes selling Alamo to AutoNation (Republic Industries) and Wayne Huizenga's connection. AutoNation ran it for about three years before selling it. This marks Keith's transition from operator back to board member and consultant.",
    principles: [
      "A well-managed sale is a successful outcome — knowing when to transition is a leadership skill.",
    ],
    heuristics: [
      "When a strategic acquisition makes sense for all parties, execute cleanly and transition gracefully.",
    ],
    quotes: [
      "We sold the company to Wayne at AutoNation and that was his connection to it.",
    ],
    bestUsedWhen: [
      "Someone asks about the Alamo sale",
      "Someone is navigating a business exit or acquisition",
    ],
  },
  {
    storyId: "IV_S06",
    title: "Sixty Years of United Way (Interview)",
    chapters: [9, 10],
    lifeStage: "Legacy",
    themes: ["Community", "Gratitude", "Leadership", "Work Ethic"],
    relatedStories: ["P1_S38"],
    summary:
      "Keith describes his 60+ year involvement with United Way — starting with his first payroll deduction in 1963 at Peat Marwick in Jackson, Mississippi. He's been involved in every city he's lived in, served as chairman multiple times, and calls it his flagship charitable commitment. He also describes his broader nonprofit board work: Community Foundation, Library Foundation, Museum of Discovery.",
    principles: [
      "Sustained commitment to one cause over decades creates more impact than scattered involvement.",
      "Community engagement follows you — carry your civic commitments to every place you live.",
      "Giving back is not optional; it's a way of life that rewards you with relationships and purpose.",
    ],
    heuristics: [
      "When you move to a new community, immediately connect with the civic organizations you've supported before.",
      "When asked to give, start — even small — and build consistency over years.",
    ],
    quotes: [
      "I began a payroll deduction plan for the United Way in 1963. And I'm still there.",
      "I've been contributing and participating and involved with United Way for over 60 years.",
      "It's been fun and it's been rewarding and I get to meet people like you.",
    ],
    bestUsedWhen: [
      "Someone asks about community service",
      "Someone is considering nonprofit involvement",
      "Someone asks about giving back",
    ],
  },
  {
    storyId: "IV_S07",
    title: "Inside the Federal Reserve (Interview)",
    chapters: [11, 12],
    lifeStage: "Leadership",
    themes: ["Leadership", "Career Choices", "Curiosity", "Integrity"],
    relatedStories: ["P1_S26"],
    summary:
      "Keith describes the Federal Reserve as the most professionally run organization he's ever been associated with — a strong statement from someone who has seen many organizations in his career. He served on the board for six years, had to refresh his economics knowledge, and found it deeply educational. He also discusses founding Locality Bank with CEO Keith Costello and former student Drew Saito.",
    principles: [
      "The mark of a great institution is operational discipline, not just its mandate or mission.",
      "Never stop learning — even in your later career, be willing to go back to textbooks.",
      "Great organizations are built by great people — credit goes to the team, not just the structure.",
    ],
    heuristics: [
      "When evaluating an organization, look at how professionally it operates day-to-day, not just its stated goals.",
      "When entering a new domain, invest time to learn the fundamentals — even if you're already senior.",
    ],
    quotes: [
      "The Federal Reserve is the most professional organization I've ever been associated with in my whole career. And that's saying a lot.",
      "I had to go back and get one of my old college money and banking economics books to bone up for it.",
    ],
    bestUsedWhen: [
      "Someone asks about institutional quality or governance",
      "Someone asks about the Federal Reserve",
      "Someone asks about Keith's later career",
    ],
  },
  {
    storyId: "IV_S08",
    title: "Building a Relationship Army (Interview)",
    chapters: [13, 14],
    lifeStage: "Leadership",
    themes: ["Leadership", "Mentorship", "Career Choices", "Work Ethic"],
    relatedStories: ["P1_S17", "P1_S25"],
    summary:
      "Keith shares his core advice for young professionals: build a 'relationship army.' He observes that in accounting, people tend to be introverted and technically focused — but the real differentiator is relationship-building. He describes his 18-month practice at Alamo of having monthly breakfasts with five randomly selected non-supervisory employees, learning more from 90 employees than from management meetings.",
    principles: [
      "Technical capability is table stakes — relationships are the real career differentiator.",
      "Build a 'relationship army' of business connections as career infrastructure.",
      "Ground-level intelligence from frontline employees beats filtered management reports.",
      "Leading by example in community involvement motivates the people around you.",
    ],
    heuristics: [
      "When coaching young professionals, push them to build relationships outside their comfort zone.",
      "When running an organization, create structured ways to hear directly from frontline workers.",
      "When you want to know what's really happening, ask the people doing the work — not their supervisors.",
    ],
    quotes: [
      "Develop an army of relationships, business relationships.",
      "You got to be technically capable and you've got to work hard. But the biggest key and the missing link for so many people is building relationships.",
      "I had breakfast once a month with five people from the company who were not supervisory people. I did this for 18 months in a row.",
      "I learned more about what was going on in the company than I did from my weekly management meetings.",
    ],
    bestUsedWhen: [
      "Someone asks for career advice",
      "Someone is starting a new leadership role",
      "Someone asks about management by walking around",
      "Someone asks how to build professional relationships",
    ],
  },
  {
    storyId: "IV_S09",
    title: "Sixty-Two Years of Marriage (Interview)",
    chapters: [15],
    lifeStage: "Legacy",
    themes: ["Family", "Gratitude", "Identity"],
    relatedStories: ["P1_S12", "P1_S35"],
    summary:
      "Keith reveals that he and Dot grew up in the same small Mississippi town, on the same street, a block apart. They knew each other since childhood but didn't date until college — attending different colleges. They've been married 62 years. He credits having an incredible partner as a key reason for his success, and describes buying and keeping their old teacher's house for 25 years before selling it.",
    principles: [
      "An incredible partner is one of the biggest contributors to professional success.",
      "Deep roots and long-standing connections are worth maintaining, even across distance.",
    ],
    heuristics: [
      "When reflecting on career success, acknowledge the role of family and partnership.",
    ],
    quotes: [
      "We grew up in the same small town in Mississippi. We actually lived on the same street, a block apart.",
      "One of the biggest reasons for our success is having an incredible partner in our wives.",
    ],
    bestUsedWhen: [
      "Someone asks about family",
      "Someone asks about Keith's wife Dot",
      "Someone asks what makes a successful life",
    ],
  },
  {
    storyId: "IV_S10",
    title: "Never Done Learning (Interview)",
    chapters: [16, 17],
    lifeStage: "Reflection",
    themes: ["Curiosity", "Community", "Gratitude", "Identity"],
    relatedStories: ["P1_S17", "P1_S39"],
    summary:
      "Keith discusses experimenting with AI — uploading his memoir into ChatGPT to learn about the technology and potentially write a sequel. He reflects that it's never too late to learn new things. The conversation closes with appreciation for Broward County's community spirit and Keith's enduring optimism about the future.",
    principles: [
      "It's never too late to learn new things — curiosity has no retirement age.",
      "Experimentation is the best way to learn — try things hands-on rather than just reading about them.",
      "Stay optimistic about your community's future and contribute to it.",
    ],
    heuristics: [
      "When a new technology emerges, experiment with it directly rather than waiting for others to explain it.",
      "When considering whether you're too old or too established to try something new, remember: you're not.",
    ],
    quotes: [
      "I uploaded that book into ChatGPT and it came back and it now it knows me.",
      "It's never too late to learn new stuff, right? That's who I am.",
      "I've had a job of some kind since I was 12 years old.",
      "Things are coming up roses here in Broward County.",
    ],
    bestUsedWhen: [
      "Someone asks about learning new skills later in life",
      "Someone asks about AI or technology adoption",
      "Someone asks about staying relevant",
    ],
  },
];

// --- Transcript parsing ---

interface TranscriptChapter {
  number: number;
  title: string;
  lines: string[];
}

function parseTranscript(filePath: string): TranscriptChapter[] {
  const text = fs.readFileSync(filePath, "utf-8");
  const lines = text.split("\n");
  const chapters: TranscriptChapter[] = [];
  let current: TranscriptChapter | null = null;

  for (const line of lines) {
    const chapterMatch = line.match(/^Chapter (\d+): (.+)/);
    if (chapterMatch) {
      if (current) chapters.push(current);
      current = {
        number: parseInt(chapterMatch[1]),
        title: chapterMatch[2],
        lines: [],
      };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }
  if (current) chapters.push(current);

  return chapters;
}

function cleanTranscriptLine(line: string): string {
  // Remove timestamp prefixes like "0:1010 seconds...", "1:441 minute, 44 seconds...", "0:00[Music]"
  // Format: "M:SS" or "MM:SS" followed by duration text followed by actual content
  return line
    .replace(/^\d+:\d+\[.*?\]/, "") // "0:00[Music]"
    .replace(
      /^\d+:\d+\d+ (?:minutes?,? ?\d* ?seconds?|seconds?|minutes?)/,
      ""
    )
    .trim();
}

function cleanChapterText(chapter: TranscriptChapter): string {
  return chapter.lines
    .map(cleanTranscriptLine)
    .filter((l) => l.length > 0)
    .join("\n");
}

// --- Slugify ---

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// --- Generate story JSON (mirrors stories_json schema) ---

function generateStoryJson(mapping: StoryMapping): object {
  return {
    story_id: mapping.storyId,
    story_title: mapping.title,
    story_summary: mapping.summary,
    context: {
      role: "Interviewee (Keith Cobb)",
      industry: "Various — career retrospective",
      time_period: "2026 interview reflecting on 1940s–2026",
      stakes: "Preserving life lessons and career wisdom for future generations",
    },
    core_conflict: "",
    principles: mapping.principles.map((p) => ({ principle: p, evidence: "Coffee with Cagnetta interview" })),
    decision_heuristics: mapping.heuristics.map((h) => ({ heuristic: h, evidence: "Coffee with Cagnetta interview" })),
    quotes: mapping.quotes.map((q) => ({ quote: q })),
  };
}

// --- Generate wiki page (mirrors compile-wiki.ts output format) ---

function generateWikiPage(
  mapping: StoryMapping,
  fullText: string,
  wordCount: number
): string {
  const lines: string[] = [
    `# ${mapping.title}`,
    "",
    `> ${mapping.summary}`,
    "",
    `**Story ID:** ${mapping.storyId}`,
    `**Source:** Coffee with Cagnetta interview, 2026`,
    `**Life Stage:** ${mapping.lifeStage}`,
    `**Themes:** ${mapping.themes.join(", ")}`,
    `**Word Count:** ${wordCount}`,
    "",
    "## Full Text",
    "",
    fullText,
    "",
  ];

  if (mapping.principles.length > 0) {
    lines.push("## What This Story Shows", "");
    for (const p of mapping.principles) lines.push(`- ${p}`);
    lines.push("");
  }

  if (mapping.heuristics.length > 0) {
    lines.push("## If You're Thinking About...", "");
    for (const h of mapping.heuristics) lines.push(`- ${h}`);
    lines.push("");
  }

  if (mapping.quotes.length > 0) {
    lines.push("## Key Quotes", "");
    for (const q of mapping.quotes) lines.push(`> "${q}"`, "");
  }

  if (mapping.relatedStories.length > 0) {
    lines.push("## Related Stories", "");
    for (const rel of mapping.relatedStories) {
      lines.push(`- [[${rel}]]`);
    }
    lines.push("");
  }

  if (mapping.bestUsedWhen.length > 0) {
    lines.push("## Best Used When Someone Asks About", "");
    for (const b of mapping.bestUsedWhen) lines.push(`- ${b}`);
    lines.push("");
  }

  lines.push(
    "---",
    `*Source: Coffee with Cagnetta interview (video transcript), 2026*`
  );

  return lines.join("\n");
}

// ===== MAIN =====

function main() {
  console.log("🎙️  Compiling interview stories from Coffee with Cagnetta transcript...\n");

  const curatedIds = loadCuratedStoryIds();
  if (curatedIds.size > 0) {
    console.log(
      `   Locked (curated, skipped): ${[...curatedIds].sort().join(", ")}\n`
    );
  }

  // Ensure output dirs exist
  fs.mkdirSync(path.join(RAW_IV, "stories_md"), { recursive: true });
  fs.mkdirSync(path.join(RAW_IV, "stories_json"), { recursive: true });
  fs.mkdirSync(WIKI_STORIES, { recursive: true });

  // Parse transcript
  const transcriptPath = path.join(PUBLIC_INFO, "Coffee_w_Cagnetta.md");
  if (!fs.existsSync(transcriptPath)) {
    console.error("❌ Transcript not found:", transcriptPath);
    process.exit(1);
  }

  const chapters = parseTranscript(transcriptPath);
  console.log(`   Found ${chapters.length} chapters in transcript`);

  // Process each story mapping
  for (const mapping of STORY_MAP) {
    if (curatedIds.has(mapping.storyId)) {
      console.log(
        `   🔒 ${mapping.storyId} — ${mapping.title} (skipped: curated)`
      );
      continue;
    }

    // Collect chapter text
    const storyChapters = chapters.filter((ch) =>
      mapping.chapters.includes(ch.number)
    );

    if (storyChapters.length === 0) {
      console.warn(`   ⚠️  No chapters found for ${mapping.storyId}`);
      continue;
    }

    // Build full text with chapter markers
    const textParts: string[] = [];
    for (const ch of storyChapters) {
      const cleaned = cleanChapterText(ch);
      if (cleaned) textParts.push(cleaned);
    }
    const fullText = textParts.join("\n\n");
    const wordCount = fullText.split(/\s+/).length;

    // Write raw story markdown
    const mdFilename = `${mapping.storyId}-${slugify(mapping.title)}.md`;
    fs.writeFileSync(
      path.join(RAW_IV, "stories_md", mdFilename),
      `# ${mapping.title}\n\n## Full Text\n\n${fullText}\n`
    );

    // Write story JSON
    const json = generateStoryJson(mapping);
    fs.writeFileSync(
      path.join(RAW_IV, "stories_json", `${mapping.storyId}.json`),
      JSON.stringify(json, null, 2)
    );

    // Write wiki page
    const wikiPage = generateWikiPage(mapping, fullText, wordCount);
    fs.writeFileSync(path.join(WIKI_STORIES, mdFilename), wikiPage);

    console.log(
      `   ✅ ${mapping.storyId} — ${mapping.title} (${wordCount} words, chapters ${mapping.chapters.join(",")})`
    );
  }

  // Generate interview index file (mirrors 00_STORY_INDEX.md)
  const indexLines: string[] = [
    "# INTERVIEW STORY INDEX",
    "",
    "Source: Coffee with Cagnetta video interview, 2026",
    "",
    "# STORIES",
    "",
  ];

  for (const mapping of STORY_MAP) {
    indexLines.push(`---`);
    indexLines.push(`Story ID: ${mapping.storyId}`);
    indexLines.push(`Title: ${mapping.title}`);
    indexLines.push(`Life Stage: ${mapping.lifeStage}`);
    indexLines.push(`Summary: ${mapping.summary}`);
    indexLines.push(`Core Themes:`);
    for (const t of mapping.themes) indexLines.push(`- ${t}`);
    indexLines.push(`Key Principles:`);
    for (const p of mapping.principles) indexLines.push(`- ${p}`);
    indexLines.push(`Decision Heuristics:`);
    for (const h of mapping.heuristics) indexLines.push(`- ${h}`);
    indexLines.push(`Best Used When:`);
    for (const b of mapping.bestUsedWhen) indexLines.push(`- ${b}`);
    indexLines.push(`Related Stories: ${mapping.relatedStories.join(", ")}`);
    indexLines.push("");
  }

  fs.writeFileSync(
    path.join(RAW_IV, "00_INTERVIEW_INDEX.md"),
    indexLines.join("\n")
  );

  console.log(`\n✅ Interview stories compiled successfully!`);
  console.log(`   ${STORY_MAP.length} story pages → content/wiki/stories/`);
  console.log(`   ${STORY_MAP.length} story JSONs → content/raw/interview/stories_json/`);
  console.log(`   ${STORY_MAP.length} story MDs → content/raw/interview/stories_md/`);
  console.log(`   1 index → content/raw/interview/00_INTERVIEW_INDEX.md`);
}

main();
