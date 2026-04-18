import {
  getAllPeople,
  getAllCanonicalPrinciples,
  getAllStories,
  getAllThemes,
  getClusteredPrinciples,
  getTimeline,
  type ClusteredPrinciple,
  type WikiPerson,
  type WikiStory,
  type WikiTheme,
} from "./parser";
import {
  getAllEraAccents,
  lifeStageToEraAccent,
  yearToEraAccent,
  type EraAccent,
  type EraKey,
} from "@/lib/design/era";
import { themeColor } from "@/lib/design/theme-viz";

export interface GraphThemeNode {
  id: string;
  kind: "theme";
  name: string;
  storyCount: number;
}

export interface GraphStoryNode {
  id: string;
  kind: "story";
  title: string;
  summary: string;
  slug: string;
  themeCount: number;
}

export type GraphNode = GraphThemeNode | GraphStoryNode;

export interface GraphLink {
  source: string;
  target: string;
}

export interface ThemeGraph {
  themes: GraphThemeNode[];
  stories: GraphStoryNode[];
  links: GraphLink[];
}

export interface ChordMatrix {
  themes: { slug: string; name: string; storyCount: number }[];
  matrix: number[][];
}

export interface StoryRef {
  storyId: string;
  title: string;
  slug: string;
  summary: string;
}

export interface PeopleGraphNode {
  id: string;
  slug: string;
  name: string;
  storyCount: number;
  storyIds: string[];
}

export interface PeopleGraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  stories: StoryRef[];
}

export interface PeopleGraph {
  nodes: PeopleGraphNode[];
  edges: PeopleGraphEdge[];
}

export interface EraThemeMatrixEra {
  key: EraKey;
  label: string;
  color: string;
  storyCount: number;
}

export interface MatrixTheme {
  slug: string;
  name: string;
  color: string;
  storyCount: number;
}

export interface EraThemeMatrixCell {
  eraKey: EraKey;
  themeSlug: string;
  count: number;
  stories: StoryRef[];
}

export interface EraThemeMatrix {
  eras: EraThemeMatrixEra[];
  themes: MatrixTheme[];
  matrix: number[][];
  cells: EraThemeMatrixCell[][];
}

export interface MatrixCorePrinciple {
  slug: string;
  title: string;
  shortTitle: string;
  storyCount: number;
}

export interface EraPrincipleMatrixCell {
  eraKey: EraKey;
  principleSlug: string;
  count: number;
  stories: StoryRef[];
  supportingStatements: string[];
}

export interface EraPrincipleMatrix {
  eras: EraThemeMatrixEra[];
  principles: MatrixCorePrinciple[];
  matrix: number[][];
  cells: EraPrincipleMatrixCell[][];
}

export interface PrincipleMatrixRow {
  id: string;
  label: string;
  frequency: number;
  storyCount: number;
  storyIds: string[];
  evidence: string;
}

export interface ThemePrincipleMatrixCell {
  principleId: string;
  themeSlug: string;
  count: number;
  stories: StoryRef[];
  variantTexts: string[];
}

export interface ThemePrincipleMatrix {
  themes: MatrixTheme[];
  principles: PrincipleMatrixRow[];
  matrix: number[][];
  cells: ThemePrincipleMatrixCell[][];
}

export interface SankeyNode {
  id: string;
  kind: "era" | "theme" | "principle";
  label: string;
  color: string;
  layer: 0 | 1 | 2;
  href?: string;
  storyIds: string[];
  value: number;
}

export interface SankeyLink {
  id: string;
  source: string;
  target: string;
  value: number;
  stories: StoryRef[];
}

export interface StorySankey {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface PeopleGraphOptions {
  includeKeith?: boolean;
  limit?: number;
  minSharedStories?: number;
}

export function slugifyTheme(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function storyThemeSlugs(story: WikiStory, knownThemeSlugs: Set<string>): string[] {
  return story.themes.map(slugifyTheme).filter((slug) => knownThemeSlugs.has(slug));
}

function buildStoryMap(stories = getAllStories()): Map<string, StoryRef> {
  return new Map(
    stories.map((story) => [
      story.storyId,
      {
        storyId: story.storyId,
        title: story.title,
        slug: story.slug,
        summary: story.summary,
      },
    ])
  );
}

function uniqueStoryIdsForPerson(person: WikiPerson): string[] {
  return Array.from(new Set([...person.memoirStoryIds, ...person.interviewStoryIds]));
}

function storyEraKeyLookup(stories = getAllStories()): Map<string, EraAccent> {
  const timelineYears = new Map<string, number>();
  for (const event of getTimeline()) {
    const previous = timelineYears.get(event.storyRef);
    if (previous === undefined || event.year < previous) {
      timelineYears.set(event.storyRef, event.year);
    }
  }

  const lookup = new Map<string, EraAccent>();
  for (const story of stories) {
    const year = timelineYears.get(story.storyId);
    lookup.set(
      story.storyId,
      year === undefined ? lifeStageToEraAccent(story.lifeStage) : yearToEraAccent(year)
    );
  }
  return lookup;
}

function topPrincipleClusters(limit: number): ClusteredPrinciple[] {
  return getClusteredPrinciples()
    .filter((cluster) => cluster.displayText && cluster.storyIds.length > 0)
    .sort((a, b) => {
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      if (b.storyIds.length !== a.storyIds.length) return b.storyIds.length - a.storyIds.length;
      return a.displayText.localeCompare(b.displayText);
    })
    .slice(0, limit);
}

export function buildThemeGraph(): ThemeGraph {
  const rawThemes = getAllThemes();
  const rawStories = getAllStories();
  const knownThemeSlugs = new Set(rawThemes.map((theme) => theme.slug));

  const themes: GraphThemeNode[] = rawThemes.map((theme) => ({
    id: theme.slug,
    kind: "theme",
    name: theme.name,
    storyCount: theme.storyCount,
  }));

  const stories: GraphStoryNode[] = [];
  const links: GraphLink[] = [];

  for (const story of rawStories) {
    const themeSlugs = storyThemeSlugs(story, knownThemeSlugs);
    if (themeSlugs.length === 0) continue;

    stories.push({
      id: story.storyId,
      kind: "story",
      title: story.title,
      summary: story.summary,
      slug: story.slug,
      themeCount: themeSlugs.length,
    });

    for (const themeSlug of themeSlugs) {
      links.push({ source: themeSlug, target: story.storyId });
    }
  }

  return { themes, stories, links };
}

export function buildChordMatrix(): ChordMatrix {
  const rawThemes = getAllThemes();
  const rawStories = getAllStories();
  const knownThemeSlugs = new Set(rawThemes.map((theme) => theme.slug));

  const themes = rawThemes.map((theme) => ({
    slug: theme.slug,
    name: theme.name,
    storyCount: theme.storyCount,
  }));

  const slugToIdx = new Map(themes.map((theme, index) => [theme.slug, index]));
  const matrix: number[][] = Array.from({ length: themes.length }, () =>
    Array.from({ length: themes.length }, () => 0)
  );

  for (const story of rawStories) {
    const indices = storyThemeSlugs(story, knownThemeSlugs)
      .map((slug) => slugToIdx.get(slug))
      .filter((index): index is number => typeof index === "number");

    for (const source of indices) {
      for (const target of indices) {
        matrix[source][target] += 1;
      }
    }
  }

  return { themes, matrix };
}

export function buildPeopleGraph(options: PeopleGraphOptions = {}): PeopleGraph {
  const { includeKeith = false, limit = 18, minSharedStories = 2 } = options;
  const storyMap = buildStoryMap();

  const ranked = getAllPeople()
    .map((person) => {
      const storyIds = uniqueStoryIdsForPerson(person);
      return {
        person,
        storyIds,
        storyCount: storyIds.length,
      };
    })
    .filter(({ storyCount, person }) => {
      if (storyCount === 0) return false;
      if (!includeKeith && person.slug === "keith-cobb") return false;
      return true;
    })
    .sort((a, b) => {
      if (b.storyCount !== a.storyCount) return b.storyCount - a.storyCount;
      return a.person.name.localeCompare(b.person.name);
    })
    .slice(0, limit);

  const nodes: PeopleGraphNode[] = ranked.map(({ person, storyCount, storyIds }) => ({
    id: person.slug,
    slug: person.slug,
    name: person.name,
    storyCount,
    storyIds,
  }));

  const edges: PeopleGraphEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const source = nodes[i];
    const sourceIds = new Set(source.storyIds);
    for (let j = i + 1; j < nodes.length; j++) {
      const target = nodes[j];
      const sharedIds = target.storyIds.filter((storyId) => sourceIds.has(storyId));
      if (sharedIds.length < minSharedStories) continue;

      edges.push({
        id: `${source.slug}--${target.slug}`,
        source: source.slug,
        target: target.slug,
        weight: sharedIds.length,
        stories: sharedIds
          .map((storyId) => storyMap.get(storyId))
          .filter((story): story is StoryRef => Boolean(story)),
      });
    }
  }

  return { nodes, edges };
}

export function buildEraThemeMatrix(): EraThemeMatrix {
  const stories = getAllStories();
  const themes = getAllThemes().map((theme) => ({
    slug: theme.slug,
    name: theme.name,
    color: themeColor(theme.slug),
    storyCount: theme.storyCount,
  }));
  const themeIndex = new Map(themes.map((theme, index) => [theme.slug, index]));
  const eras = getAllEraAccents().map((era) => ({
    key: era.key,
    label: era.label,
    color: era.hex,
    storyCount: 0,
  }));
  const eraIndex = new Map(eras.map((era, index) => [era.key, index]));
  const cells: EraThemeMatrixCell[][] = eras.map((era) =>
    themes.map((theme) => ({
      eraKey: era.key,
      themeSlug: theme.slug,
      count: 0,
      stories: [],
    }))
  );
  const matrix = eras.map(() => themes.map(() => 0));
  const storyMap = buildStoryMap(stories);
  const storyEras = storyEraKeyLookup(stories);

  for (const story of stories) {
    const era = storyEras.get(story.storyId);
    if (!era) continue;
    const rowIndex = eraIndex.get(era.key);
    if (rowIndex === undefined) continue;
    eras[rowIndex].storyCount += 1;

    for (const slug of story.themes.map(slugifyTheme)) {
      const columnIndex = themeIndex.get(slug);
      if (columnIndex === undefined) continue;

      matrix[rowIndex][columnIndex] += 1;
      cells[rowIndex][columnIndex].count += 1;
      const ref = storyMap.get(story.storyId);
      if (ref) cells[rowIndex][columnIndex].stories.push(ref);
    }
  }

  return { eras, themes, matrix, cells };
}

export function buildEraPrincipleMatrix(): EraPrincipleMatrix {
  const stories = getAllStories();
  const storyMap = buildStoryMap(stories);
  const storyEras = storyEraKeyLookup(stories);
  const eras = getAllEraAccents().map((era) => ({
    key: era.key,
    label: era.label,
    color: era.hex,
    storyCount: 0,
  }));
  const principles = getAllCanonicalPrinciples().map((principle) => ({
    slug: principle.slug,
    title: principle.title,
    shortTitle: principle.shortTitle,
    storyCount: principle.stories.length,
  }));
  const eraIndex = new Map(eras.map((era, index) => [era.key, index]));
  const principleIndex = new Map(
    principles.map((principle, index) => [principle.slug, index])
  );
  const cells: EraPrincipleMatrixCell[][] = eras.map((era) =>
    principles.map((principle) => ({
      eraKey: era.key,
      principleSlug: principle.slug,
      count: 0,
      stories: [],
      supportingStatements: [],
    }))
  );
  const matrix = eras.map(() => principles.map(() => 0));
  const countedEraStories = new Set<string>();

  for (const principle of getAllCanonicalPrinciples()) {
    const columnIndex = principleIndex.get(principle.slug);
    if (columnIndex === undefined) continue;

    const storyStatementLabels = new Map<string, Set<string>>();
    for (const statement of principle.supportingStatements) {
      for (const story of statement.stories) {
        if (!storyStatementLabels.has(story.storyId)) {
          storyStatementLabels.set(story.storyId, new Set());
        }
        storyStatementLabels.get(story.storyId)?.add(statement.label);
      }
    }

    for (const story of principle.stories) {
      const era = storyEras.get(story.storyId);
      if (!era) continue;
      const rowIndex = eraIndex.get(era.key);
      if (rowIndex === undefined) continue;

      const eraStoryKey = `${era.key}:${story.storyId}`;
      if (!countedEraStories.has(eraStoryKey)) {
        eras[rowIndex].storyCount += 1;
        countedEraStories.add(eraStoryKey);
      }

      const ref = storyMap.get(story.storyId);
      if (!ref) continue;
      matrix[rowIndex][columnIndex] += 1;
      const cell = cells[rowIndex][columnIndex];
      cell.count += 1;
      cell.stories.push(ref);
      for (const label of storyStatementLabels.get(story.storyId) || []) {
        if (!cell.supportingStatements.includes(label)) {
          cell.supportingStatements.push(label);
        }
      }
    }
  }

  const principleOrder = reorderPrinciplesByStoryCountThenEarliestEra(matrix);
  const principlesOrdered = principleOrder.map((i) => principles[i]);
  const matrixOrdered = matrix.map((row) => principleOrder.map((j) => row[j]));
  const cellsOrdered = cells.map((row) => principleOrder.map((j) => row[j]));

  return { eras, principles: principlesOrdered, matrix: matrixOrdered, cells: cellsOrdered };
}

/** Earliest era index with any story evidence, or null if none */
function firstEraWithActivityForPrinciple(matrix: number[][], principleCol: number): number | null {
  for (let era = 0; era < matrix.length; era++) {
    if (matrix[era][principleCol] > 0) return era;
  }
  return null;
}

/** Sum of matrix cells for one principle column (= story-era placements on the chart). */
function totalMatrixOccurrences(matrix: number[][], principleCol: number): number {
  let sum = 0;
  for (let era = 0; era < matrix.length; era++) sum += matrix[era][principleCol];
  return sum;
}

/**
 * Chart row order: more total story placements first; ties broken by earlier
 * life era (then stable index).
 */
function reorderPrinciplesByStoryCountThenEarliestEra(matrix: number[][]): number[] {
  const n = matrix[0]?.length ?? 0;
  const indices = [...Array(n).keys()];
  return indices.sort((a, b) => {
    const totalA = totalMatrixOccurrences(matrix, a);
    const totalB = totalMatrixOccurrences(matrix, b);
    if (totalB !== totalA) return totalB - totalA;

    const eraA = firstEraWithActivityForPrinciple(matrix, a);
    const eraB = firstEraWithActivityForPrinciple(matrix, b);
    if (eraA !== eraB) {
      if (eraA === null) return 1;
      if (eraB === null) return -1;
      return eraA - eraB;
    }
    return a - b;
  });
}

export function buildThemePrincipleMatrix(limit = 12): ThemePrincipleMatrix {
  const storyMap = buildStoryMap();
  const themes = getAllThemes().map((theme) => ({
    slug: theme.slug,
    name: theme.name,
    color: themeColor(theme.slug),
    storyCount: theme.storyCount,
  }));
  const principles = topPrincipleClusters(limit).map((cluster) => ({
    id: cluster.fingerprint,
    label: cluster.displayText,
    frequency: cluster.frequency,
    storyCount: cluster.storyIds.length,
    storyIds: cluster.storyIds,
    evidence: cluster.evidence,
  }));
  const cells: ThemePrincipleMatrixCell[][] = principles.map((principle) =>
    themes.map((theme) => ({
      principleId: principle.id,
      themeSlug: theme.slug,
      count: 0,
      stories: [],
      variantTexts: [],
    }))
  );
  const matrix = principles.map(() => themes.map(() => 0));
  const themeIndex = new Map(themes.map((theme, index) => [theme.slug, index]));
  const principleIndex = new Map(principles.map((principle, index) => [principle.id, index]));
  const clusters = new Map(topPrincipleClusters(limit).map((cluster) => [cluster.fingerprint, cluster]));
  const stories = getAllStories();

  for (const story of stories) {
    const storyThemes = story.themes.map(slugifyTheme);
    const matchedPrinciples = Array.from(clusters.values()).filter((cluster) =>
      cluster.storyIds.includes(story.storyId)
    );
    if (matchedPrinciples.length === 0) continue;

    for (const themeSlug of storyThemes) {
      const columnIndex = themeIndex.get(themeSlug);
      if (columnIndex === undefined) continue;

      for (const cluster of matchedPrinciples) {
        const rowIndex = principleIndex.get(cluster.fingerprint);
        if (rowIndex === undefined) continue;
        matrix[rowIndex][columnIndex] += 1;
        cells[rowIndex][columnIndex].count += 1;
        const ref = storyMap.get(story.storyId);
        if (ref) cells[rowIndex][columnIndex].stories.push(ref);
        for (const variant of cluster.variants) {
          if (variant.storyId !== story.storyId || !variant.text) continue;
          if (!cells[rowIndex][columnIndex].variantTexts.includes(variant.text)) {
            cells[rowIndex][columnIndex].variantTexts.push(variant.text);
          }
        }
      }
    }
  }

  return { themes, principles, matrix, cells };
}

export function buildStorySankey(limit = 10, minLinkValue = 2): StorySankey {
  const stories = getAllStories();
  const storyMap = buildStoryMap(stories);
  const storyEras = storyEraKeyLookup(stories);
  const principleClusters = topPrincipleClusters(limit);
  const themes = getAllThemes().map((theme) => ({
    slug: theme.slug,
    name: theme.name,
    color: themeColor(theme.slug),
  }));

  const eraNodes: SankeyNode[] = getAllEraAccents().map((era) => ({
    id: `era:${era.key}`,
    kind: "era",
    label: era.label,
    color: era.hex,
    layer: 0,
    href: "/stories/timeline",
    storyIds: [],
    value: 0,
  }));
  const themeNodes: SankeyNode[] = themes.map((theme) => ({
    id: `theme:${theme.slug}`,
    kind: "theme",
    label: theme.name,
    color: theme.color,
    layer: 1,
    href: `/themes/${theme.slug}`,
    storyIds: [],
    value: 0,
  }));
  const principleNodes: SankeyNode[] = principleClusters.map((cluster) => ({
    id: `principle:${cluster.fingerprint}`,
    kind: "principle",
    label: cluster.displayText,
    color: "#8d7b67",
    layer: 2,
    storyIds: [],
    value: 0,
  }));

  const eraTheme = new Map<string, string[]>();
  const themePrinciple = new Map<string, string[]>();

  for (const story of stories) {
    const era = storyEras.get(story.storyId);
    if (!era) continue;
    for (const themeSlug of story.themes.map(slugifyTheme)) {
      const eraThemeKey = `${era.key}|${themeSlug}`;
      const themeNode = themeNodes.find((node) => node.id === `theme:${themeSlug}`);
      if (!themeNode) continue;
      eraTheme.set(eraThemeKey, [...(eraTheme.get(eraThemeKey) || []), story.storyId]);

      for (const cluster of principleClusters) {
        if (!cluster.storyIds.includes(story.storyId)) continue;
        const themePrincipleKey = `${themeSlug}|${cluster.fingerprint}`;
        themePrinciple.set(themePrincipleKey, [
          ...(themePrinciple.get(themePrincipleKey) || []),
          story.storyId,
        ]);
      }
    }
  }

  const links: SankeyLink[] = [];
  for (const [key, storyIds] of eraTheme.entries()) {
    const uniqueIds = Array.from(new Set(storyIds));
    if (uniqueIds.length < minLinkValue) continue;
    const [eraKey, themeSlug] = key.split("|");
    links.push({
      id: `era:${eraKey}->theme:${themeSlug}`,
      source: `era:${eraKey}`,
      target: `theme:${themeSlug}`,
      value: uniqueIds.length,
      stories: uniqueIds
        .map((storyId) => storyMap.get(storyId))
        .filter((story): story is StoryRef => Boolean(story)),
    });
  }
  for (const [key, storyIds] of themePrinciple.entries()) {
    const uniqueIds = Array.from(new Set(storyIds));
    if (uniqueIds.length < minLinkValue) continue;
    const [themeSlug, fingerprint] = key.split("|");
    links.push({
      id: `theme:${themeSlug}->principle:${fingerprint}`,
      source: `theme:${themeSlug}`,
      target: `principle:${fingerprint}`,
      value: uniqueIds.length,
      stories: uniqueIds
        .map((storyId) => storyMap.get(storyId))
        .filter((story): story is StoryRef => Boolean(story)),
    });
  }

  const nodeMap = new Map<string, SankeyNode>(
    [...eraNodes, ...themeNodes, ...principleNodes].map((node) => [node.id, node])
  );

  for (const link of links) {
    const source = nodeMap.get(link.source);
    const target = nodeMap.get(link.target);
    if (!source || !target) continue;
    source.value += link.value;
    target.value += link.value;
    for (const story of link.stories) {
      if (!source.storyIds.includes(story.storyId)) source.storyIds.push(story.storyId);
      if (!target.storyIds.includes(story.storyId)) target.storyIds.push(story.storyId);
    }
  }

  const nodes = [...nodeMap.values()].filter((node) => {
    if (node.kind === "era") return true;
    return node.value > 0;
  });

  return { nodes, links };
}

export type { ClusteredPrinciple, WikiTheme, WikiStory };
