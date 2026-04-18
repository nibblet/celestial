import * as fs from "fs";
import * as path from "path";

const WIKI_DIR = path.join(process.cwd(), "content/wiki");
const RAW_CONTENT_DIR = path.join(process.cwd(), "content/raw");

export type StorySource = "memoir" | "interview" | "family";

export interface WikiStory {
  storyId: string;
  volume: string;
  slug: string;
  title: string;
  summary: string;
  source: StorySource;
  sourceDetail: string;
  lifeStage: string;
  themes: string[];
  wordCount: number;
  fullText: string;
  principles: string[];
  heuristics: string[];
  quotes: string[];
  relatedStoryIds: string[];
  bestUsedWhen: string[];
  timelineEvents: string[];
}

export interface WikiTheme {
  slug: string;
  name: string;
  storyCount: number;
  principles: { text: string; storyId: string }[];
  storyIds: string[];
  stories: { storyId: string; title: string; summary: string }[];
  quotes: { text: string; title: string }[];
}

export type TimelineSource = "memoir" | "public_record" | "interview";

export interface WikiTimelineEvent {
  year: number;
  event: string;
  organization: string;
  location: string;
  storyRef: string;
  /** Path under public/, e.g. /timeline/usm.jpg */
  illustration?: string;
  source: TimelineSource;
  sourceDetail?: string;
}

export interface ClusteredPrincipleVariant {
  text: string;
  storyId: string;
  file: string;
}

export interface ClusteredPrinciple {
  displayText: string;
  fingerprint: string;
  frequency: number;
  storyIds: string[];
  totalMentions: number;
  evidence: string;
  variants: ClusteredPrincipleVariant[];
}

export interface WikiPrincipleStory {
  storyId: string;
  slug: string;
  title: string;
  summary: string;
}

export interface WikiPrincipleTheme {
  slug: string;
  name: string;
  count: number;
}

export interface WikiPrincipleVariant {
  text: string;
  storyId: string;
  storyTitle: string;
  storySlug: string;
}

export interface WikiPrinciple {
  id: string;
  slug: string;
  label: string;
  storyCount: number;
  frequency: number;
  totalMentions: number;
  evidence: string;
  stories: WikiPrincipleStory[];
  relatedThemes: WikiPrincipleTheme[];
  variants: WikiPrincipleVariant[];
  summaryText: string;
  askPrompt: string;
}

interface CanonicalPrincipleDefinition {
  slug: string;
  title: string;
  shortTitle: string;
  thesis: string;
  narrative: string;
  aiNarrative?: string;
  themeSlugs: string[];
  matchTerms: string[];
  seedStoryIds: string[];
}

export interface CanonicalPrincipleStatement {
  id: string;
  slug: string;
  label: string;
  storyCount: number;
  storyIds: string[];
  stories: WikiPrincipleStory[];
  relatedThemes: WikiPrincipleTheme[];
  variants: WikiPrincipleVariant[];
  evidence: string;
}

export interface CanonicalPrinciple {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  thesis: string;
  narrative: string;
  aiNarrative: string;
  summaryText: string;
  askPrompt: string;
  relatedThemes: WikiPrincipleTheme[];
  supportingStatements: CanonicalPrincipleStatement[];
  stories: WikiPrincipleStory[];
  evidence: string[];
}

function readWikiFile(relativePath: string): string {
  const fullPath = path.join(WIKI_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf-8");
}

function extractSection(content: string, heading: string): string[] {
  const regex = new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |\\n---|$)`);
  const match = content.match(regex);
  if (!match) return [];
  return match[1]
    .split("\n")
    .filter((l) => l.startsWith("- ") || l.startsWith("> "))
    .map((l) => l.replace(/^[-*>]\s*/, "").replace(/^"/, "").replace(/"$/, "").trim());
}

function extractMetadata(content: string, key: string): string {
  const regex = new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`);
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function slugifyLabel(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function summarizeList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const CANONICAL_PRINCIPLES: CanonicalPrincipleDefinition[] = [
  {
    slug: "work-hard-and-carry-your-weight",
    title: "Work Hard and Carry Your Weight",
    shortTitle: "Carry Your Weight",
    thesis:
      "Effort, reliability, service, and personal responsibility are basic obligations, not optional virtues.",
    narrative:
      "Keith's stories treat work as a way to build character and earn trust. Whether the setting is family, school, civic life, or a professional assignment, the pattern is the same: show up, do the work, and take responsibility when something needs doing.",
    aiNarrative:
      "In the memoir, work is not presented as a slogan or a decorative virtue. It begins in ordinary places: a small Mississippi town, a father who was steady and trustworthy, a mother who knew how to make things with skill and industry, and a boy learning that chores, school, church, and family expectations were all part of the same education. From those stories, work becomes one of the ways character is formed. You do not wait for ideal circumstances, and you do not make a production of your effort. You simply carry your part of the load.\n\nThat same principle follows Keith into his professional life. In the stories about Peat Marwick, new offices, civic commitments, and leadership roles, the lesson is not that he did everything alone. In fact, he is often careful to credit the people who helped him along the way. But the recurring idea is clear: when there is a gap, step into it; when there is a responsibility, own it; when others have trusted you with work, do it well. The stories suggest that work ethic, integrity, and leadership are not three separate values. They are different expressions of the same habit of carrying your weight.",
    themeSlugs: ["work-ethic", "integrity", "leadership"],
    matchTerms: [
      "work",
      "hard work",
      "diligent",
      "ownership",
      "deliverables",
      "responsibility",
      "accountability",
      "service define leadership",
      "carry",
      "effort",
    ],
    seedStoryIds: ["P1_S01", "P1_S06", "P1_S09", "P1_S18", "P1_S19"],
  },
  {
    slug: "character-is-formed-early",
    title: "Character Is Formed Early",
    shortTitle: "Character Is Formed Early",
    thesis:
      "Home, school, church, mentors, and early disciplines shape the person for life.",
    narrative:
      "The early stories repeatedly return to formative influences. Keith's values do not appear suddenly in adulthood; they are cultivated by family, teachers, church, scouting, small-town expectations, and repeated practice.",
    aiNarrative:
      "The memoir returns often to the idea that character is formed long before a person has a title, a career, or much sense of where life is headed. Home, school, and church were not just settings in Keith's childhood; they were the basic touch points of his existence. Teachers, parents, Scout leaders, neighbors, and small-town institutions all helped establish expectations about honesty, discipline, curiosity, and service.\n\nWhat is striking in these stories is how modest many of the influences were at the time. A teacher's standard, a parent's example, a Scout requirement, a chore, or a word of encouragement might not have seemed momentous. But taken together, they became the early architecture of a life. The stories suggest that character is rarely formed by one dramatic event. It is usually formed by repeated exposure to people and places that quietly teach what matters.",
    themeSlugs: ["identity", "mentorship", "family"],
    matchTerms: [
      "early influences",
      "home",
      "school",
      "church",
      "character",
      "formative",
      "childhood",
      "children",
      "teaching",
      "education",
      "milestones",
    ],
    seedStoryIds: ["P1_S01", "P1_S02", "P1_S03", "P1_S04", "P1_S34"],
  },
  {
    slug: "lead-by-example",
    title: "Lead by Example",
    shortTitle: "Lead by Example",
    thesis:
      "Real leadership is modeled through conduct, steadiness, standards, and service.",
    narrative:
      "Keith's leadership examples are rarely abstract. They show people watching conduct: steadiness under stress, high standards, willingness to serve, and the humility to delegate rather than carry everything alone.",
    aiNarrative:
      "In Keith's stories, leadership is often learned by watching someone else. His father did not need to lecture about steadiness; he modeled it. Scout leaders, teachers, partners, and colleagues demonstrated that people pay attention to conduct long before they listen to advice. Standards, composure, fairness, and work habits become a kind of instruction.\n\nThe same idea follows Keith into his own leadership roles. The stories do not present leadership as a matter of personality or command. They present it as behavior under observation: doing the work, treating people fairly, remaining calm, setting expectations, and learning not to carry every responsibility alone. The lesson is practical and clear. If you want people to trust your leadership, first give them something trustworthy to observe.",
    themeSlugs: ["leadership", "integrity", "work-ethic"],
    matchTerms: [
      "lead by example",
      "model",
      "leaders",
      "leadership",
      "delegate",
      "delegation",
      "standards",
      "composure",
      "steady",
      "calm",
    ],
    seedStoryIds: ["P1_S04", "P1_S06", "P1_S22", "P1_S25", "IV_S07"],
  },
  {
    slug: "build-relationships-before-you-need-them",
    title: "Build Relationships Before You Need Them",
    shortTitle: "Build Relationships",
    thesis:
      "Relationships are not a byproduct of success; they are part of the infrastructure of a meaningful life and career.",
    narrative:
      "Keith's relationship principle stretches from family and friendship to career, civic leadership, and turnaround work. Technical ability matters, but relationships create trust, information, opportunity, and resilience over time.",
    aiNarrative:
      "Keith's phrase about building a relationship army captures something that appears across many of the stories. Relationships were not ornamental to his career or community life; they were part of the structure that made both possible. Friends, mentors, clients, colleagues, civic leaders, and frontline employees all became sources of trust, perspective, information, and opportunity.\n\nThe memoir does not diminish technical skill. In fact, Keith clearly valued competence. But the stories suggest that skill alone was never enough. Relationships had to be built before they were needed, sustained across distance, and treated as real human obligations rather than transactions. Again and again, doors opened, problems became clearer, and institutions became stronger because someone had taken the time to know people well.",
    themeSlugs: ["leadership", "mentorship", "community"],
    matchTerms: [
      "relationship",
      "relationships",
      "network",
      "networks",
      "communication",
      "frontline",
      "people",
      "community engagement",
      "sponsors",
      "connections",
    ],
    seedStoryIds: ["P1_S12", "P1_S15", "P1_S23", "P1_S25", "IV_S08"],
  },
  {
    slug: "keep-learning",
    title: "Keep Learning",
    shortTitle: "Keep Learning",
    thesis:
      "Curiosity, reading, exploration, and openness to better methods are lifelong disciplines.",
    narrative:
      "Across Keith's stories, curiosity is more than a personality trait. It becomes a practice: reading, traveling, studying, experimenting, listening to expert advice, and staying open to new tools late in life.",
    aiNarrative:
      "Curiosity runs through the memoir like a quiet current. It appears in books, teachers, music, travel, professional study, and even the later willingness to experiment with new tools and new ways of writing. Keith's stories suggest that learning is not confined to school or youth. It is a lifelong habit of paying attention and remaining teachable.\n\nThere is also a practical humility in this principle. To keep learning, a person has to admit that someone else may know a better method, that a new subject may be worth the effort, or that an old approach may need to be discarded. The stories make curiosity feel less like restlessness and more like stewardship: if life keeps offering chances to learn, the responsible thing is to keep taking them.",
    themeSlugs: ["curiosity", "identity", "career-choices"],
    matchTerms: [
      "curiosity",
      "curious",
      "learning",
      "learn",
      "reading",
      "literature",
      "books",
      "horizons",
      "new things",
      "discard your approach",
      "expert",
    ],
    seedStoryIds: ["P1_S03", "P1_S10", "P1_S17", "IV_S01", "IV_S10"],
  },
  {
    slug: "choose-with-judgment-then-act-decisively",
    title: "Choose with Judgment, Then Act Decisively",
    shortTitle: "Choose, Then Act",
    thesis:
      "Good decisions come from reflection, fit, counsel, and then confident action.",
    narrative:
      "Keith's decision-making pattern is neither impulsive nor passive. He weighs fit, asks for counsel, studies the situation, and then moves with conviction when the moment calls for action.",
    aiNarrative:
      "Keith often writes about forks in the road, and the stories suggest that he took those forks seriously. Decisions about school, career, relocation, firms, leadership roles, and family life were not treated as simple calculations. He looked for fit, listened to counsel, weighed practical realities, and tried to understand the character of the people and institutions involved.\n\nBut reflection did not mean paralysis. Once the judgment was made, the stories often move with real decisiveness: take the job, open the office, accept the hard assignment, confront the problem, or move quickly in a turnaround. The principle is not merely to be careful, and it is not merely to be bold. It is to do the careful work first, then act with enough conviction to give the decision a chance to matter.",
    themeSlugs: ["career-choices", "leadership", "adversity"],
    matchTerms: [
      "choose",
      "decision",
      "decisions",
      "fit",
      "long-term",
      "act decisively",
      "decisively",
      "turnaround",
      "rapidly",
      "compromise",
      "criteria",
    ],
    seedStoryIds: ["P1_S16", "P1_S20", "P1_S23", "P1_S25", "IV_S04"],
  },
  {
    slug: "do-what-is-right-even-when-it-costs-you",
    title: "Do What Is Right, Even When It Costs You",
    shortTitle: "Do What Is Right",
    thesis:
      "Integrity means honesty, courage, accountability, and willingness to confront what is wrong.",
    narrative:
      "The ethics stories show Keith's willingness to challenge unfairness, negligence, weak systems, and financial irresponsibility. The principle is not just to believe in integrity, but to act on it when the stakes are uncomfortable.",
    aiNarrative:
      "The memoir's ethical stories are calm in tone, but they are not vague. Keith describes a world in which right and wrong were made clear early, and that clarity became important when he encountered unfairness, negligence, weak controls, or decisions that did not sit right. Integrity in these stories is not a decorative word. It is a practical test of whether one is willing to speak, investigate, vote, redesign, or take responsibility when silence would be easier.\n\nThere is nothing flashy about this principle. It is expressed in audits, boardrooms, student government, professional judgment, and financial discipline. The stories suggest that doing what is right often requires steadiness more than drama. You do not need to scold or posture. You need to see clearly, act honestly, and accept that there may be a cost.",
    themeSlugs: ["integrity", "financial-responsibility", "leadership"],
    matchTerms: [
      "integrity",
      "honest",
      "unfair",
      "challenge",
      "negligence",
      "ethics",
      "ethical",
      "fraud",
      "financial responsibility",
      "avoid debt",
      "right",
    ],
    seedStoryIds: ["P1_S13", "P1_S15", "P1_S19", "P1_S27", "P1_S28"],
  },
  {
    slug: "invest-in-people",
    title: "Invest in People",
    shortTitle: "Invest in People",
    thesis:
      "Teaching, mentoring, recruiting, sponsoring, and developing others is one of the highest uses of leadership.",
    narrative:
      "Keith's stories consistently honor the people who taught, sponsored, recruited, and challenged him. They also show him carrying that pattern forward by building teams, developing talent, and valuing mentorship as a practical force.",
    aiNarrative:
      "One of the most consistent notes in Keith's stories is gratitude for the people who invested in him. Teachers, mentors, sponsors, partners, and family members appear not as background characters but as essential contributors. He is careful to name them, credit them, and acknowledge that much of his own progress came through the generosity and confidence of others.\n\nThat gratitude becomes a principle of action. Recruiting good people, developing younger professionals, teaching practical skills, and building teams are not side duties; they are central responsibilities of leadership. The stories suggest that one of the best ways to honor the people who helped you is to become useful in the development of someone else.",
    themeSlugs: ["mentorship", "leadership", "community"],
    matchTerms: [
      "mentor",
      "mentorship",
      "sponsor",
      "sponsors",
      "recruit",
      "recruiting",
      "teach",
      "teaching",
      "develop",
      "great people",
      "support",
    ],
    seedStoryIds: ["P1_S03", "P1_S17", "P1_S18", "P1_S19", "IV_S03"],
  },
  {
    slug: "family-is-the-foundation",
    title: "Family Is the Foundation",
    shortTitle: "Family Foundation",
    thesis:
      "Partnership, parenting, loyalty, and provision are central, not peripheral, to a successful life.",
    narrative:
      "Family is not a separate chapter from Keith's work and service; it is part of the foundation beneath them. His stories connect marriage, parenting, education, provision, roots, and gratitude into one steady source of meaning.",
    aiNarrative:
      "Family in the memoir is not treated as a sentimental appendix to the more public parts of life. It is part of the foundation beneath everything else. Keith's stories about parents, Dot, children, education, homes, and roots all point to the same truth: professional achievement and public service were supported by private commitments that mattered just as much.\n\nThere is a steady gratitude in the way these stories speak about family. Partnership, parenting, provision, loyalty, and memory are not abstract ideals; they show up in decisions about where to live, how to raise children, how to honor parents, and how to recognize the help that made a career possible. The stories suggest that family is not a competing priority with a meaningful life. It is one of the main reasons the life has meaning.",
    themeSlugs: ["family", "gratitude", "identity"],
    matchTerms: [
      "family",
      "partner",
      "marriage",
      "children",
      "sons",
      "spouse",
      "education for children",
      "roots",
      "home",
      "parents",
    ],
    seedStoryIds: ["P1_S06", "P1_S34", "P1_S35", "IV_S09", "IV_S02"],
  },
  {
    slug: "give-back-as-a-way-of-life",
    title: "Give Back as a Way of Life",
    shortTitle: "Give Back",
    thesis:
      "Service, stewardship, civic duty, faithfulness, and long-term commitment to community are enduring obligations.",
    narrative:
      "Keith's service stories show giving back as a habit, not a special occasion. Civic work, philanthropy, faith, board service, and decades-long commitments become ways of expressing gratitude and responsibility.",
    aiNarrative:
      "The service stories make clear that giving back was not an occasional project for Keith and Dot. It became a way of life. United Way, church, civic boards, foundations, and community institutions appear as places where time, professional skill, money, and leadership could be put to use for something beyond personal advancement.\n\nThe tone of these stories is important. They do not present service as self-congratulation. They present it as stewardship and gratitude. If a person has been helped, educated, trusted, and given opportunities, then some part of life should be spent paying that forward. The stories suggest that giving back is not separate from success. It is one of the ways success becomes worthwhile.",
    themeSlugs: ["community", "gratitude", "leadership"],
    matchTerms: [
      "charity",
      "service",
      "stewardship",
      "volunteer",
      "civic",
      "philanthropic",
      "giving",
      "give back",
      "community",
      "faith",
      "commitment to one cause",
    ],
    seedStoryIds: ["P1_S37", "P1_S38", "P1_S39", "IV_S06", "P1_S26"],
  },
  {
    slug: "remember-where-you-came-from",
    title: "Remember Where You Came From",
    shortTitle: "Remember Your Roots",
    thesis:
      "Origin, place, memory, and rootedness help explain identity, values, and later decisions.",
    narrative:
      "Keith's origin stories do not treat Calhoun City or Mississippi as background scenery. They frame roots as a continuing source of identity, humility, gratitude, and explanation for later choices.",
    aiNarrative:
      "The red clay hills are more than a place in the memoir. They are a way of understanding the person who came from them. Keith's stories about Calhoun City, Mississippi, family, school, church, and neighbors are not written as nostalgia alone. They explain values, habits, limitations, advantages, and the sense of gratitude that carried into later life.\n\nRemembering where you came from does not mean being confined by it. In Keith's stories, roots are a foundation, not a ceiling. The small town remains present even as the career moves through larger cities, national firms, boardrooms, and public institutions. The lesson is that a person can go far without needing to outgrow the people and places that first taught him who he was.",
    themeSlugs: ["identity", "community", "gratitude"],
    matchTerms: [
      "origins",
      "origin",
      "roots",
      "remembering",
      "small community",
      "small town",
      "foundation",
      "identity",
      "red clay",
      "mississippi",
    ],
    seedStoryIds: ["P1_S01", "P1_S10", "IV_S02", "IV_S09", "P1_S36"],
  },
  {
    slug: "make-the-most-of-adversity",
    title: "Make the Most of Adversity",
    shortTitle: "Use Adversity",
    thesis:
      "Setbacks, constraints, and disappointments can become training grounds for resilience, judgment, and growth.",
    narrative:
      "Keith's adversity stories are not simple triumph stories. They show constraint, regret, illness, career difficulty, and institutional problems becoming occasions for learning, adjustment, and renewed discipline.",
    aiNarrative:
      "Keith's adversity stories are not written as grand dramas. They are often quite practical: an illness, a limitation, a missed opportunity, a difficult office, a constrained choice, or a professional problem that had to be worked through. The point is not that every setback is pleasant or that every disappointment disappears. The point is that difficulty can become useful if it teaches discipline, resourcefulness, humility, or judgment.\n\nSeveral stories also include regret, which gives this principle its honesty. Keith does not pretend that every gift was fully developed or every choice was perfect. But the larger pattern is resilient. When circumstances are not ideal, look for what can still be learned, built, repaired, or carried forward. The stories suggest that adversity is not automatically good, but it can become formative when met with effort and reflection.",
    themeSlugs: ["adversity", "work-ethic", "career-choices"],
    matchTerms: [
      "adversity",
      "setback",
      "constraints",
      "constrained",
      "regret",
      "half-hearted",
      "discipline",
      "durable skills",
      "resourcefulness",
      "recovering",
      "challenge",
    ],
    seedStoryIds: ["P1_S02", "P1_S05", "P1_S20", "P1_S22", "P1_S25"],
  },
];

/**
 * Wiki "Full Text" often repeats the H1 title as its own first line; the app already shows `title` in the header.
 */
export function stripDuplicateLeadingTitleFromFullText(
  fullText: string,
  title: string
): string {
  const t = title.trim();
  const trimmed = fullText.trim();
  if (!t || !trimmed) return fullText;

  const nl = trimmed.indexOf("\n");
  const firstLine = (nl === -1 ? trimmed : trimmed.slice(0, nl)).trim();
  if (firstLine !== t) return fullText;

  const afterFirst = nl === -1 ? "" : trimmed.slice(nl + 1);
  return afterFirst.replace(/^\s+/, "");
}

// --- Public API ---

export function getAllStories(): WikiStory[] {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getStoryFromFile(f))
    .filter(Boolean)
    .sort((a, b) => a!.storyId.localeCompare(b!.storyId)) as WikiStory[];
}

/** Regex that matches any story ID prefix: P1_S01, IV_S01, P2_S01, etc. */
const STORY_ID_RE = /(?:P\d+|IV)_S\d+/;

function deriveSource(storyId: string): { source: StorySource; volume: string } {
  if (storyId.startsWith("IV_")) return { source: "interview", volume: "IV" };
  if (storyId.startsWith("P1_")) return { source: "memoir", volume: "P1" };
  return { source: "family", volume: storyId.match(/^(P\d+)/)?.[1] || "P2" };
}

function getStoryFromFile(filename: string): WikiStory | null {
  const content = readWikiFile(`stories/${filename}`);
  if (!content) return null;

  const storyIdMatch = content.match(
    new RegExp(`\\*\\*Story ID:\\*\\*\\s*(${STORY_ID_RE.source})`)
  );
  if (!storyIdMatch) return null;

  const titleMatch = content.match(/^# (.+)/m);
  const summaryMatch = content.match(/^> (.+)/m);

  const fullTextMatch = content.match(/## Full Text\n\n([\s\S]*?)(?=\n## )/);

  const slug = filename
    .replace(/\.md$/, "")
    .replace(new RegExp(`^${STORY_ID_RE.source}-`), "");

  const { source, volume } = deriveSource(storyIdMatch[1]);
  const sourceDetail = extractMetadata(content, "Source");

  return {
    storyId: storyIdMatch[1],
    volume,
    slug,
    title: titleMatch?.[1] || "",
    summary: summaryMatch?.[1] || "",
    source,
    sourceDetail,
    lifeStage: extractMetadata(content, "Life Stage"),
    themes: extractMetadata(content, "Themes")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    wordCount: parseInt(extractMetadata(content, "Word Count")) || 0,
    fullText: stripDuplicateLeadingTitleFromFullText(
      fullTextMatch?.[1]?.trim() || "",
      titleMatch?.[1] || ""
    ),
    principles: extractSection(content, "What This Story Shows"),
    heuristics: extractSection(content, "If You're Thinking About\\.\\.\\."),
    quotes: extractSection(content, "Key Quotes"),
    relatedStoryIds: extractSection(content, "Related Stories").map(
      (l) => l.match(new RegExp(`\\[\\[(${STORY_ID_RE.source})\\]\\]`))?.[1] || ""
    ).filter(Boolean),
    bestUsedWhen: extractSection(content, "Best Used When Someone Asks About"),
    timelineEvents: extractSection(content, "Timeline"),
  };
}

export function getStoryBySlug(slug: string): WikiStory | null {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return null;

  const file = fs.readdirSync(dir).find((f) => f.includes(slug) && f.endsWith(".md"));
  if (!file) return null;

  return getStoryFromFile(file);
}

export function getStoryById(storyId: string): WikiStory | null {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return null;

  const prefix = `${storyId}-`;
  const file = fs.readdirSync(dir).find((f) => f.startsWith(prefix) && f.endsWith(".md"));
  if (!file) return null;

  return getStoryFromFile(file);
}

export function getAllThemes(): WikiTheme[] {
  const dir = path.join(WIKI_DIR, "themes");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getThemeFromFile(f))
    .filter(Boolean)
    .sort((a, b) => b!.storyCount - a!.storyCount) as WikiTheme[];
}

function getThemeFromFile(filename: string): WikiTheme | null {
  const content = readWikiFile(`themes/${filename}`);
  if (!content) return null;

  const titleMatch = content.match(/^# (.+)/m);
  const countMatch = content.match(/\*\*(\d+) stories\*\*/);

  const slug = filename.replace(/\.md$/, "");
  const name = titleMatch?.[1] || slug;

  // Parse stories section
  const storiesRaw = extractSection(content, "Stories");
  const stories = storiesRaw.map((line) => {
    const idMatch = line.match(/\[\[(P\d+_S\d+)\]\]\s*(.+?)(?:\s*—\s*(.+))?$/);
    return {
      storyId: idMatch?.[1] || "",
      title: idMatch?.[2] || "",
      summary: idMatch?.[3] || "",
    };
  }).filter((s) => s.storyId);

  // Parse principles
  const principlesRaw = extractSection(content, "Principles");
  const principles = principlesRaw.map((line) => {
    const match = line.match(/(.+?)\s*_\((P\d+_S\d+)\)_/);
    return { text: match?.[1]?.trim() || line, storyId: match?.[2] || "" };
  });

  // Parse quotes
  const quotesRaw = extractSection(content, "Selected Quotes");
  const quotes = quotesRaw.map((line) => {
    const match = line.match(/"(.+?)"\s*—\s*_(.+?)_/);
    return { text: match?.[1] || line, title: match?.[2] || "" };
  });

  return {
    slug,
    name,
    storyCount: parseInt(countMatch?.[1] || "0") || stories.length,
    principles,
    storyIds: stories.map((s) => s.storyId),
    stories,
    quotes,
  };
}

export function getThemeBySlug(slug: string): WikiTheme | null {
  const dir = path.join(WIKI_DIR, "themes");
  const filepath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;
  return getThemeFromFile(`${slug}.md`);
}

export function getTimeline(): WikiTimelineEvent[] {
  const content = readWikiFile("timeline/career-timeline.md");
  if (!content) return [];

  const events: WikiTimelineEvent[] = [];
  const lines = content.split("\n");

  const storyRefPat = STORY_ID_RE.source;

  for (const line of lines) {
    // Match lines with story refs: **YYYY** — event (org), location — [[ID]] | illustration | source:xxx | detail:xxx
    const match = line.match(
      new RegExp(
        `- \\*\\*(\\d{4})\\*\\* — (.+?)(?:\\s*\\((.+?)\\))?(?:,\\s*(.+?))?\\s*—\\s*\\[\\[(${storyRefPat})\\]\\]\\s*(?:\\|\\s*(.+))?`
      )
    );
    if (match) {
      const trailing = match[6] || "";
      // Parse optional source and detail from trailing pipe-separated fields
      const sourcePart = trailing.match(/source:(\w+)/)?.[1] as TimelineSource | undefined;
      const detailPart = trailing.match(/detail:(.+?)(?:\s*\||$)/)?.[1]?.trim();
      const illustration = trailing
        .replace(/source:\w+/g, "")
        .replace(/detail:.+?(?:\s*\||$)/g, "")
        .replace(/\|/g, "")
        .trim() || undefined;

      events.push({
        year: parseInt(match[1]),
        event: match[2].trim(),
        organization: match[3] || "",
        location: match[4] || "",
        storyRef: match[5],
        illustration: illustration || undefined,
        source: sourcePart || "memoir",
        sourceDetail: detailPart,
      });
    }
  }

  return events;
}

export function getWikiSummaries(): string {
  return readWikiFile("index.md");
}

export function getClusteredPrinciples(): ClusteredPrinciple[] {
  const fullPath = path.join(RAW_CONTENT_DIR, "clusters", "ai_merged_principles.json");
  if (!fs.existsSync(fullPath)) return [];

  const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8")) as Array<{
    display_text?: string;
    fingerprint?: string;
    frequency?: number;
    story_ids?: string[];
    total_mentions?: number;
    evidence?: string;
    variants?: Array<{ text?: string; story_id?: string; file?: string }>;
  }>;

  return raw.map((cluster) => ({
    displayText: cluster.display_text || "",
    fingerprint: cluster.fingerprint || "",
    frequency: cluster.frequency || 0,
    storyIds: cluster.story_ids || [],
    totalMentions: cluster.total_mentions || 0,
    evidence: cluster.evidence || "",
    variants: (cluster.variants || []).map((variant) => ({
      text: variant.text || "",
      storyId: variant.story_id || "",
      file: variant.file || "",
    })),
  }));
}

export function buildPrincipleAskPrompt(label: string): string {
  return `How does this principle apply to my situation: "${label}"? Can you ground your answer in Keith's stories and explain which broader themes it reinforces?`;
}

function buildPrincipleSummary(
  label: string,
  storyCount: number,
  relatedThemes: WikiPrincipleTheme[],
  stories: WikiPrincipleStory[]
): string {
  const storyCountText = storyCount === 1 ? "1 story" : `${storyCount} stories`;
  const themeNames = relatedThemes.slice(0, 3).map((theme) => theme.name);
  const storyTitles = stories.slice(0, 3).map((story) => story.title);

  let summary = `This principle appears across ${storyCountText}.`;
  if (themeNames.length > 0) {
    summary += ` It most strongly reinforces themes such as ${summarizeList(themeNames)}.`;
  }
  if (storyTitles.length > 0) {
    summary += ` Keith's stories show it through ${summarizeList(storyTitles)}.`;
  }
  return summary;
}

function buildWikiPrinciple(
  cluster: ClusteredPrinciple,
  storyMap: Map<string, WikiStory>,
  themeNameBySlug: Map<string, string>
): WikiPrinciple | null {
  const stories = cluster.storyIds
    .map((storyId) => storyMap.get(storyId))
    .filter((story): story is WikiStory => Boolean(story))
    .map((story) => ({
      storyId: story.storyId,
      slug: story.slug,
      title: story.title,
      summary: story.summary,
    }));

  if (stories.length === 0 || !cluster.displayText || !cluster.fingerprint) return null;

  const themeCounts = new Map<string, number>();
  for (const story of cluster.storyIds.map((id) => storyMap.get(id)).filter(Boolean) as WikiStory[]) {
    for (const themeName of story.themes) {
      const slug = slugifyLabel(themeName);
      themeCounts.set(slug, (themeCounts.get(slug) || 0) + 1);
    }
  }

  const relatedThemes = Array.from(themeCounts.entries())
    .map(([slug, count]) => ({
      slug,
      name: themeNameBySlug.get(slug) || slug.replace(/-/g, " "),
      count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

  const variants = cluster.variants
    .map((variant) => {
      const story = storyMap.get(variant.storyId);
      return {
        text: variant.text,
        storyId: variant.storyId,
        storyTitle: story?.title || variant.storyId,
        storySlug: story?.slug || "",
      };
    })
    .filter((variant) => variant.text);

  return {
    id: cluster.fingerprint,
    slug: slugifyLabel(cluster.displayText),
    label: cluster.displayText,
    storyCount: stories.length,
    frequency: cluster.frequency,
    totalMentions: cluster.totalMentions,
    evidence: cluster.evidence,
    stories,
    relatedThemes,
    variants,
    summaryText: buildPrincipleSummary(
      cluster.displayText,
      stories.length,
      relatedThemes,
      stories
    ),
    askPrompt: buildPrincipleAskPrompt(cluster.displayText),
  };
}

export function getAllPrinciples(): WikiPrinciple[] {
  const storyMap = new Map(getAllStories().map((story) => [story.storyId, story]));
  const themeNameBySlug = new Map(
    getAllThemes().map((theme) => [theme.slug, theme.name])
  );

  return getClusteredPrinciples()
    .map((cluster) => buildWikiPrinciple(cluster, storyMap, themeNameBySlug))
    .filter((principle): principle is WikiPrinciple => Boolean(principle))
    .sort((a, b) => {
      if (b.storyCount !== a.storyCount) return b.storyCount - a.storyCount;
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.label.localeCompare(b.label);
    });
}

export function getPrincipleBySlug(slug: string): WikiPrinciple | null {
  return getAllPrinciples().find((principle) => principle.slug === slug) || null;
}

function scorePrincipleForDefinition(
  principle: WikiPrinciple,
  definition: CanonicalPrincipleDefinition
): number {
  const haystack = [
    principle.label,
    principle.evidence,
    ...principle.variants.map((variant) => variant.text),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const term of definition.matchTerms) {
    if (haystack.includes(term.toLowerCase())) {
      score += term.length > 10 ? 4 : 2;
    }
  }

  const definitionThemes = new Set(definition.themeSlugs);
  for (const theme of principle.relatedThemes) {
    if (definitionThemes.has(theme.slug)) score += 2;
  }

  const definitionStories = new Set(definition.seedStoryIds);
  for (const story of principle.stories) {
    if (definitionStories.has(story.storyId)) score += 3;
  }

  return score;
}

function statementFromPrinciple(principle: WikiPrinciple): CanonicalPrincipleStatement {
  return {
    id: principle.id,
    slug: principle.slug,
    label: principle.label,
    storyCount: principle.storyCount,
    storyIds: principle.stories.map((story) => story.storyId),
    stories: principle.stories,
    relatedThemes: principle.relatedThemes,
    variants: principle.variants,
    evidence: principle.evidence,
  };
}

function uniqueStories(stories: WikiPrincipleStory[]): WikiPrincipleStory[] {
  const seen = new Set<string>();
  const out: WikiPrincipleStory[] = [];
  for (const story of stories) {
    if (seen.has(story.storyId)) continue;
    seen.add(story.storyId);
    out.push(story);
  }
  return out;
}

function buildCanonicalSummary(
  definition: CanonicalPrincipleDefinition,
  storyCount: number,
  supportingCount: number,
  relatedThemes: WikiPrincipleTheme[]
): string {
  const storyText = storyCount === 1 ? "1 story" : `${storyCount} stories`;
  const statementText =
    supportingCount === 1
      ? "1 supporting statement"
      : `${supportingCount} supporting statements`;
  const themeText = summarizeList(relatedThemes.slice(0, 3).map((theme) => theme.name));
  return `${definition.title} organizes ${statementText} across ${storyText}. It most strongly reinforces ${themeText}.`;
}

export function getAllCanonicalPrinciples(): CanonicalPrinciple[] {
  const rawPrinciples = getAllPrinciples();
  const storyMap = new Map(getAllStories().map((story) => [story.storyId, story]));
  const themeNameBySlug = new Map(
    getAllThemes().map((theme) => [theme.slug, theme.name])
  );
  const assigned = new Map<string, CanonicalPrincipleStatement[]>(
    CANONICAL_PRINCIPLES.map((definition) => [definition.slug, []])
  );

  for (const principle of rawPrinciples) {
    let best: CanonicalPrincipleDefinition | null = null;
    let bestScore = 0;
    for (const definition of CANONICAL_PRINCIPLES) {
      const score = scorePrincipleForDefinition(principle, definition);
      if (score > bestScore) {
        best = definition;
        bestScore = score;
      }
    }
    if (best && bestScore >= 2) {
      assigned.get(best.slug)?.push(statementFromPrinciple(principle));
    }
  }

  return CANONICAL_PRINCIPLES.map((definition) => {
    const supportingStatements = (assigned.get(definition.slug) || []).sort((a, b) => {
      if (b.storyCount !== a.storyCount) return b.storyCount - a.storyCount;
      return a.label.localeCompare(b.label);
    });

    const seedStories = definition.seedStoryIds
      .map((storyId) => storyMap.get(storyId))
      .filter((story): story is WikiStory => Boolean(story))
      .map((story) => ({
        storyId: story.storyId,
        slug: story.slug,
        title: story.title,
        summary: story.summary,
      }));

    const stories = uniqueStories([
      ...supportingStatements.flatMap((statement) => statement.stories),
      ...seedStories,
    ]);

    const themeCounts = new Map<string, number>();
    for (const themeSlug of definition.themeSlugs) themeCounts.set(themeSlug, 0);
    for (const statement of supportingStatements) {
      for (const theme of statement.relatedThemes) {
        if (definition.themeSlugs.includes(theme.slug)) {
          themeCounts.set(theme.slug, (themeCounts.get(theme.slug) || 0) + theme.count);
        }
      }
    }

    const relatedThemes = Array.from(themeCounts.entries())
      .map(([slug, count]) => ({
        slug,
        name: themeNameBySlug.get(slug) || slug.replace(/-/g, " "),
        count,
      }))
      .sort((a, b) => {
        const aIndex = definition.themeSlugs.indexOf(a.slug);
        const bIndex = definition.themeSlugs.indexOf(b.slug);
        return aIndex - bIndex;
      });

    const evidence = Array.from(
      new Set(
        supportingStatements
          .map((statement) => statement.evidence.trim())
          .filter(Boolean)
      )
    ).slice(0, 4);

    return {
      id: definition.slug,
      slug: definition.slug,
      title: definition.title,
      shortTitle: definition.shortTitle,
      thesis: definition.thesis,
      narrative: definition.narrative,
      aiNarrative: definition.aiNarrative || definition.narrative,
      summaryText: buildCanonicalSummary(
        definition,
        stories.length,
        supportingStatements.length,
        relatedThemes
      ),
      askPrompt: buildPrincipleAskPrompt(definition.title),
      relatedThemes,
      supportingStatements,
      stories,
      evidence,
    };
  });
}

export function getCanonicalPrincipleBySlug(slug: string): CanonicalPrinciple | null {
  return (
    getAllCanonicalPrinciples().find((principle) => principle.slug === slug) ||
    null
  );
}

// --- People ---

export type PersonTier = "A" | "B" | "C" | "D";

export type AiDraftStatus = "none" | "draft" | "reviewed";

export interface WikiPerson {
  slug: string;
  name: string;
  tiers: PersonTier[];
  memoirStoryIds: string[];
  interviewStoryIds: string[];
  note: string;
  body: string;
  aiDraft: string;
  aiDraftStatus: AiDraftStatus;
  aiDraftGeneratedAt: string;
}

function getPersonFromFile(filename: string): WikiPerson | null {
  const content = readWikiFile(`people/${filename}`);
  if (!content) return null;

  const nameMatch = content.match(/^# (.+)/m);
  const slugMatch = content.match(/\*\*Slug:\*\*\s*(.+)/);
  const tiersMatch = content.match(/tiers:\s*([A-D,\s]+)\)/);

  const slug = slugMatch?.[1]?.trim() || filename.replace(/\.md$/, "");
  const tiers = (tiersMatch?.[1] || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is PersonTier => /^[A-D]$/.test(t));

  const memoirSection = content.match(/## Memoir stories\n\n([\s\S]*?)(?=\n## |\n---|\n<!--|$)/);
  const interviewSection = content.match(/## Interview stories\n\n([\s\S]*?)(?=\n## |\n---|\n<!--|$)/);
  const noteSection = content.match(/## Note\n\n([\s\S]*?)(?=\n## |\n---|\n<!--|$)/);

  const aiDraftMatch = content.match(
    /<!-- ai-draft:start(?:\s+generated="([^"]*)")?(?:\s+reviewed="(true|false)")? -->\n([\s\S]*?)\n<!-- ai-draft:end -->/
  );
  const aiDraft = aiDraftMatch?.[3]?.trim() || "";
  const aiDraftGeneratedAt = aiDraftMatch?.[1] || "";
  const aiDraftStatus: AiDraftStatus = aiDraftMatch
    ? aiDraftMatch[2] === "true"
      ? "reviewed"
      : "draft"
    : "none";

  const extractIds = (block: string | undefined): string[] => {
    if (!block) return [];
    const re = new RegExp(`\\((${STORY_ID_RE.source})\\)`, "g");
    const ids: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(block)) !== null) ids.push(m[1]);
    return ids;
  };

  return {
    slug,
    name: nameMatch?.[1]?.trim() || slug,
    tiers,
    memoirStoryIds: extractIds(memoirSection?.[1]),
    interviewStoryIds: extractIds(interviewSection?.[1]),
    note: noteSection?.[1]?.trim() || "",
    body: content,
    aiDraft,
    aiDraftStatus,
    aiDraftGeneratedAt,
  };
}

export function getAllPeople(): WikiPerson[] {
  const dir = path.join(WIKI_DIR, "people");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getPersonFromFile(f))
    .filter(Boolean)
    .sort((a, b) => a!.name.localeCompare(b!.name)) as WikiPerson[];
}

export function getPersonBySlug(slug: string): WikiPerson | null {
  const filepath = path.join(WIKI_DIR, "people", `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;
  return getPersonFromFile(`${slug}.md`);
}

export function getPeopleByStoryId(storyId: string): WikiPerson[] {
  return getAllPeople().filter(
    (p) => p.memoirStoryIds.includes(storyId) || p.interviewStoryIds.includes(storyId)
  );
}
