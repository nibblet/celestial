import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEraThemeMatrix,
  buildEraPrincipleMatrix,
  buildEntityRelationGraph,
  buildPeopleGraph,
  buildStorySankey,
  buildThemePrincipleMatrix,
} from "@/lib/wiki/graph";
import { getAllPeople, getAllStories } from "@/lib/wiki/parser";

test("buildPeopleGraph only includes people with linked story refs", () => {
  const graph = buildPeopleGraph();
  const withRefs = getAllPeople().filter(
    (p) => p.memoirStoryIds.length + p.interviewStoryIds.length > 0
  );
  if (withRefs.length === 0) {
    assert.equal(graph.nodes.length, 0);
    assert.equal(graph.edges.length, 0);
  } else {
    assert.ok(graph.nodes.length >= 1);
  }
});

test("buildEraThemeMatrix assigns every story to a named era", () => {
  const matrix = buildEraThemeMatrix();
  const storyCount = getAllStories().length;
  const assignedCount = matrix.eras.reduce((sum, era) => sum + era.storyCount, 0);
  assert.equal(assignedCount, storyCount);
  assert.equal(matrix.eras.length, 5);
  if (storyCount > 0 && matrix.themes.length > 0) {
    assert.ok(matrix.matrix.some((row) => row.some((count) => count > 0)));
  }
});

test("buildEraPrincipleMatrix uses canonical principle definitions", () => {
  const matrix = buildEraPrincipleMatrix();
  assert.equal(matrix.eras.length, 5);
  assert.equal(matrix.principles.length, 12);
  assert.ok(matrix.principles.every((principle) => principle.slug && principle.shortTitle));
  if (matrix.matrix.some((row) => row.some((count) => count > 0))) {
    assert.ok(
      matrix.cells.some((row) =>
        row.some((cell) => cell.count > 0 && cell.stories.length > 0)
      )
    );
  }
});

test("buildEraPrincipleMatrix orders principles by total occurrences then earliest era", () => {
  const matrix = buildEraPrincipleMatrix();

  function totalCol(col: number): number {
    return matrix.matrix.reduce((sum, row) => sum + row[col], 0);
  }

  function earliestEra(col: number): number | null {
    for (let era = 0; era < matrix.matrix.length; era++) {
      if (matrix.matrix[era][col] > 0) return era;
    }
    return null;
  }

  for (let col = 1; col < matrix.principles.length; col++) {
    const tPrev = totalCol(col - 1);
    const tCurr = totalCol(col);
    assert.ok(tPrev >= tCurr, "columns are ordered by non-increasing total placements");
    if (tPrev !== tCurr) continue;

    const eraPrev = earliestEra(col - 1);
    const eraCurr = earliestEra(col);
    if (eraCurr === null) continue;
    assert.ok(eraPrev !== null, "active principle never precedes inactive ones");
    assert.ok(eraPrev <= eraCurr);
  }
});

test("buildThemePrincipleMatrix maps clustered principle families onto themes", () => {
  const matrix = buildThemePrincipleMatrix();
  assert.ok(matrix.principles.length <= 12);
  assert.ok(matrix.principles.every((principle) => principle.storyCount >= 0));
  const hasCells = matrix.cells.some((row) =>
    row.some((cell) => cell.count > 0 && cell.variantTexts.length > 0)
  );
  if (getAllStories().length > 0 && matrix.principles.length > 0 && matrix.themes.length > 0) {
    assert.ok(hasCells);
  }
});

test("buildStorySankey filters out one-off links and keeps all five eras", () => {
  const sankey = buildStorySankey();
  assert.ok(sankey.links.every((link) => link.value >= 2));
  assert.equal(sankey.nodes.filter((node) => node.kind === "era").length, 5);
  assert.ok(sankey.nodes.filter((node) => node.kind === "principle").length <= 10);
});

test("buildEntityRelationGraph returns unique relation edges", () => {
  const graph = buildEntityRelationGraph();
  const seen = new Set(graph.edges.map((edge) => edge.id));
  assert.equal(seen.size, graph.edges.length);
  if (graph.edges.length > 0) {
    assert.ok(graph.nodes.length > 0);
  }
});
