import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEraThemeMatrix,
  buildEraPrincipleMatrix,
  buildPeopleGraph,
  buildStorySankey,
  buildThemePrincipleMatrix,
} from "@/lib/wiki/graph";
import { getAllStories } from "@/lib/wiki/parser";

test("buildPeopleGraph excludes Keith by default and dedupes shared stories", () => {
  const graph = buildPeopleGraph();
  assert.ok(graph.nodes.length > 0);
  assert.equal(graph.nodes.some((node) => node.slug === "keith-cobb"), false);
  assert.ok(graph.edges.every((edge) => edge.weight >= 2));
  assert.ok(
    graph.edges.every(
      (edge) => new Set(edge.stories.map((story) => story.storyId)).size === edge.stories.length
    )
  );
});

test("buildPeopleGraph can include Keith when requested", () => {
  const graph = buildPeopleGraph({ includeKeith: true });
  assert.equal(graph.nodes.some((node) => node.slug === "keith-cobb"), true);
});

test("buildEraThemeMatrix assigns every story to a named era", () => {
  const matrix = buildEraThemeMatrix();
  const storyCount = getAllStories().length;
  const assignedCount = matrix.eras.reduce((sum, era) => sum + era.storyCount, 0);
  assert.equal(assignedCount, storyCount);
  assert.equal(matrix.eras.length, 5);
  assert.ok(matrix.matrix.some((row) => row.some((count) => count > 0)));
});

test("buildEraPrincipleMatrix uses the twelve canonical principles", () => {
  const matrix = buildEraPrincipleMatrix();
  assert.equal(matrix.eras.length, 5);
  assert.equal(matrix.principles.length, 12);
  assert.ok(matrix.principles.every((principle) => principle.slug && principle.shortTitle));
  assert.ok(matrix.matrix.some((row) => row.some((count) => count > 0)));
  assert.ok(
    matrix.cells.some((row) =>
      row.some((cell) => cell.count > 0 && cell.stories.length > 0)
    )
  );
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
  assert.equal(matrix.principles.length, 12);
  assert.ok(matrix.principles.every((principle) => principle.storyCount > 0));
  assert.ok(
    matrix.cells.some((row) =>
      row.some((cell) => cell.count > 0 && cell.variantTexts.length > 0)
    )
  );
});

test("buildStorySankey filters out one-off links and keeps all five eras", () => {
  const sankey = buildStorySankey();
  assert.ok(sankey.links.length > 0);
  assert.ok(sankey.links.every((link) => link.value >= 2));
  assert.equal(sankey.nodes.filter((node) => node.kind === "era").length, 5);
  assert.ok(sankey.nodes.filter((node) => node.kind === "principle").length <= 10);
});
