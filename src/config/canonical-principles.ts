/**
 * Per-book canonical principle definitions (schema for the interactive companion).
 * Text is genericized; update `seedStoryIds` when the fiction corpus is wired to CH## IDs.
 */

export interface CanonicalPrincipleDefinition {
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

export const CANONICAL_PRINCIPLES: CanonicalPrincipleDefinition[] = [
  {
    slug: "work-hard-and-carry-your-weight",
    title: "Work Hard and Carry Your Weight",
    shortTitle: "Carry Your Weight",
    thesis:
      "Effort, reliability, service, and personal responsibility are basic obligations, not optional virtues.",
    narrative:
      "These stories treat work as a way to build character and earn trust. Whether the setting is family, school, civic life, or a professional assignment, the pattern is the same: show up, do the work, and take responsibility when something needs doing.",
    aiNarrative:
      "In the memoir, work is not presented as a slogan or a decorative virtue. It begins in ordinary places: a small Mississippi town, a father who was steady and trustworthy, a mother who knew how to make things with skill and industry, and a boy learning that chores, school, church, and family expectations were all part of the same education. From those stories, work becomes one of the ways character is formed. You do not wait for ideal circumstances, and you do not make a production of your effort. You simply carry your part of the load.\n\nThat same principle follows the narrator into his professional life. In the stories about Peat Marwick, new offices, civic commitments, and leadership roles, the lesson is not that he did everything alone. In fact, he is often careful to credit the people who helped him along the way. But the recurring idea is clear: when there is a gap, step into it; when there is a responsibility, own it; when others have trusted you with work, do it well.\n\nWhat makes this principle powerful is that it crosses the boundaries between family, career, and community. The same ethic that begins with chores and small-town expectations later shows up in professional responsibility and civic service. The stories suggest that work ethic, integrity, and leadership are not three separate values. They are different expressions of the same habit of carrying your weight.",
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
      "The early stories repeatedly return to formative influences. The narrator's values do not appear suddenly in adulthood; they are cultivated by family, teachers, church, scouting, small-town expectations, and repeated practice.",
    aiNarrative:
      "The memoir returns often to the idea that character is formed long before a person has a title, a career, or much sense of where life is headed. Home, school, and church were not just settings in the narrator's childhood; they were the basic touch points of his existence. Teachers, parents, Scout leaders, neighbors, and small-town institutions all helped establish expectations about honesty, discipline, curiosity, and service.\n\nWhat is striking in these stories is how modest many of the influences were at the time. A teacher's standard, a parent's example, a Scout requirement, a chore, or a word of encouragement might not have seemed momentous. But taken together, they became the early architecture of a life. The stories suggest that character is rarely formed by one dramatic event. It is usually formed by repeated exposure to people and places that quietly teach what matters.",
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
      "The narrator's leadership examples are rarely abstract. They show people watching conduct: steadiness under stress, high standards, willingness to serve, and the humility to delegate rather than carry everything alone.",
    aiNarrative:
      "In these stories, leadership is often learned by watching someone else. His father did not need to lecture about steadiness; he modeled it. Scout leaders, teachers, partners, and colleagues demonstrated that people pay attention to conduct long before they listen to advice. Standards, composure, fairness, and work habits become a kind of instruction.\n\nThe same idea follows the narrator into his own leadership roles. The stories do not present leadership as a matter of personality or command. They present it as behavior under observation: doing the work, treating people fairly, remaining calm, setting expectations, and learning not to carry every responsibility alone. The lesson is practical and clear. If you want people to trust your leadership, first give them something trustworthy to observe.",
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
      "The narrator's relationship principle stretches from family and friendship to career, civic leadership, and turnaround work. Technical ability matters, but relationships create trust, information, opportunity, and resilience over time.",
    aiNarrative:
      "The narrator's phrase about building a relationship army captures something that appears across many of the stories. Relationships were not ornamental to his career or community life; they were part of the structure that made both possible. Friends, mentors, clients, colleagues, civic leaders, and frontline employees all became sources of trust, perspective, information, and opportunity.\n\nThe memoir does not diminish technical skill. In fact, the narrator clearly valued competence. But the stories suggest that skill alone was never enough. Relationships had to be built before they were needed, sustained across distance, and treated as real human obligations rather than transactions. Again and again, doors opened, problems became clearer, and institutions became stronger because someone had taken the time to know people well.\n\nThis is also one of the places where the narrator's advice becomes most practical. If you wait until you need a relationship, you are already late. The stories suggest a quieter discipline: stay in touch, listen to people at every level, show up in the community, and build trust before there is any immediate advantage in doing so.",
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
      "Across These stories, curiosity is more than a personality trait. It becomes a practice: reading, traveling, studying, experimenting, listening to expert advice, and staying open to new tools late in life.",
    aiNarrative:
      "Curiosity runs through the memoir like a quiet current. It appears in books, teachers, music, travel, professional study, and even the later willingness to experiment with new tools and new ways of writing. These stories suggest that learning is not confined to school or youth. It is a lifelong habit of paying attention and remaining teachable.\n\nThere is also a practical humility in this principle. To keep learning, a person has to admit that someone else may know a better method, that a new subject may be worth the effort, or that an old approach may need to be discarded. The stories make curiosity feel less like restlessness and more like stewardship: if life keeps offering chances to learn, the responsible thing is to keep taking them.",
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
      "The narrator's decision-making pattern is neither impulsive nor passive. He weighs fit, asks for counsel, studies the situation, and then moves with conviction when the moment calls for action.",
    aiNarrative:
      "The narrator often writes about forks in the road, and the stories suggest that he took those forks seriously. Decisions about school, career, relocation, firms, leadership roles, and family life were not treated as simple calculations. He looked for fit, listened to counsel, weighed practical realities, and tried to understand the character of the people and institutions involved.\n\nBut reflection did not mean paralysis. Once the judgment was made, the stories often move with real decisiveness: take the job, open the office, accept the hard assignment, confront the problem, or move quickly in a turnaround. The principle is not merely to be careful, and it is not merely to be bold.\n\nThe balance matters. Care without action can become hesitation, while action without judgment can become recklessness. These stories suggest a middle course: do the careful work first, then act with enough conviction to give the decision a chance to matter.",
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
      "The ethics stories show the narrator's willingness to challenge unfairness, negligence, weak systems, and financial irresponsibility. The principle is not just to believe in integrity, but to act on it when the stakes are uncomfortable.",
    aiNarrative:
      "The memoir's ethical stories are calm in tone, but they are not vague. The narrator describes a world in which right and wrong were made clear early, and that clarity became important when he encountered unfairness, negligence, weak controls, or decisions that did not sit right. Integrity in these stories is not a decorative word. It is a practical test of whether one is willing to speak, investigate, vote, redesign, or take responsibility when silence would be easier.\n\nThere is nothing flashy about this principle. It is expressed in audits, boardrooms, student government, professional judgment, and financial discipline. The stories suggest that doing what is right often requires steadiness more than drama.\n\nThat distinction keeps the principle from becoming preachy. These stories do not suggest that moral clarity requires scolding or posturing. They suggest something quieter and harder: see clearly, act honestly, and accept that there may be a cost.",
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
      "These stories consistently honor the people who taught, sponsored, recruited, and challenged him. They also show him carrying that pattern forward by building teams, developing talent, and valuing mentorship as a practical force.",
    aiNarrative:
      "One of the most consistent notes in These stories is gratitude for the people who invested in him. Teachers, mentors, sponsors, partners, and family members appear not as background characters but as essential contributors. He is careful to name them, credit them, and acknowledge that much of his own progress came through the generosity and confidence of others.\n\nThat gratitude becomes a principle of action. Recruiting good people, developing younger professionals, teaching practical skills, and building teams are not side duties; they are central responsibilities of leadership.\n\nThere is a kind of continuity in this. Someone teaches you, sponsors you, or gives you confidence before you have fully earned it. Later, you are given the chance to do the same for someone else. The stories suggest that one of the best ways to honor the people who helped you is to become useful in the development of another person.",
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
      "Family is not a separate chapter from the narrator's work and service; it is part of the foundation beneath them. His stories connect marriage, parenting, education, provision, roots, and gratitude into one steady source of meaning.",
    aiNarrative:
      "Family in the memoir is not treated as a sentimental appendix to the more public parts of life. It is part of the foundation beneath everything else. These stories about parents, Dot, children, education, homes, and roots all point to the same truth: professional achievement and public service were supported by private commitments that mattered just as much.\n\nThere is a steady gratitude in the way these stories speak about family. Partnership, parenting, provision, loyalty, and memory are not abstract ideals; they show up in decisions about where to live, how to raise children, how to honor parents, and how to recognize the help that made a career possible. The stories suggest that family is not a competing priority with a meaningful life. It is one of the main reasons the life has meaning.",
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
      "The narrator's service stories show giving back as a habit, not a special occasion. Civic work, philanthropy, faith, board service, and decades-long commitments become ways of expressing gratitude and responsibility.",
    aiNarrative:
      "The service stories make clear that giving back was not an occasional project for the narrator and their family. It became a way of life. United Way, church, civic boards, foundations, and community institutions appear as places where time, professional skill, money, and leadership could be put to use for something beyond personal advancement.\n\nThe tone of these stories is important. They do not present service as self-congratulation. They present it as stewardship and gratitude. If a person has been helped, educated, trusted, and given opportunities, then some part of life should be spent paying that forward.\n\nThis is where the memoir's philosophy of work and service meet. A person may make a living by what he does, but the stories suggest that he makes a life by what he gives. Giving back is not separate from success. It is one of the ways success becomes worthwhile.",
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
      "The narrator's origin stories do not treat Calhoun City or Mississippi as background scenery. They frame roots as a continuing source of identity, humility, gratitude, and explanation for later choices.",
    aiNarrative:
      "The red clay hills are more than a place in the memoir. They are a way of understanding the person who came from them. These stories about Calhoun City, Mississippi, family, school, church, and neighbors are not written as nostalgia alone. They explain values, habits, limitations, advantages, and the sense of gratitude that carried into later life.\n\nRemembering where you came from does not mean being confined by it. In These stories, roots are a foundation, not a ceiling. The small town remains present even as the career moves through larger cities, national firms, boardrooms, and public institutions. The lesson is that a person can go far without needing to outgrow the people and places that first taught him who he was.",
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
      "The narrator's adversity stories are not simple triumph stories. They show constraint, regret, illness, career difficulty, and institutional problems becoming occasions for learning, adjustment, and renewed discipline.",
    aiNarrative:
      "The narrator's adversity stories are not written as grand dramas. They are often quite practical: an illness, a limitation, a missed opportunity, a difficult office, a constrained choice, or a professional problem that had to be worked through. The point is not that every setback is pleasant or that every disappointment disappears. The point is that difficulty can become useful if it teaches discipline, resourcefulness, humility, or judgment.\n\nSeveral stories also include regret, which gives this principle its honesty. The narrator does not pretend that every gift was fully developed or every choice was perfect. But the larger pattern is resilient.\n\nWhen circumstances are not ideal, the question becomes what can still be learned, built, repaired, or carried forward. The stories suggest that adversity is not automatically good, but it can become formative when met with effort and reflection.",
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