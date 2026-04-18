import test from "node:test";
import assert from "node:assert/strict";
import {
  computePeopleGraphLayout,
  computeSankeyLayout,
} from "@/components/viz/layout";
import type {
  PeopleGraphEdge,
  PeopleGraphNode,
  SankeyLink,
  SankeyNode,
} from "@/lib/wiki/graph";

test("computePeopleGraphLayout positions every node inside the viewport", () => {
  const nodes: PeopleGraphNode[] = [
    { id: "a", slug: "a", name: "A", storyCount: 5, storyIds: ["S1", "S2"] },
    { id: "b", slug: "b", name: "B", storyCount: 4, storyIds: ["S1", "S3"] },
    { id: "c", slug: "c", name: "C", storyCount: 3, storyIds: ["S2", "S3"] },
    { id: "d", slug: "d", name: "D", storyCount: 2, storyIds: ["S3", "S4"] },
  ];
  const edges: PeopleGraphEdge[] = [
    { id: "a--b", source: "a", target: "b", weight: 3, stories: [] },
    { id: "a--c", source: "a", target: "c", weight: 2, stories: [] },
    { id: "b--d", source: "b", target: "d", weight: 2, stories: [] },
  ];

  const layout = computePeopleGraphLayout(nodes, edges, 760, 540);
  assert.equal(Object.keys(layout).length, nodes.length);
  for (const positioned of Object.values(layout)) {
    assert.ok(positioned.x >= 0 && positioned.x <= 760);
    assert.ok(positioned.y >= 0 && positioned.y <= 540);
    assert.ok((positioned.radius || 0) > 0);
  }
});

test("computeSankeyLayout places nodes in three columns with positive heights", () => {
  const nodes: SankeyNode[] = [
    {
      id: "era:red_clay",
      kind: "era",
      label: "Red Clay",
      color: "#8b2c2c",
      layer: 0,
      storyIds: ["S1"],
      value: 5,
    },
    {
      id: "theme:work",
      kind: "theme",
      label: "Work",
      color: "#c8662a",
      layer: 1,
      storyIds: ["S1"],
      value: 7,
    },
    {
      id: "principle:craft",
      kind: "principle",
      label: "Craft",
      color: "#8d7b67",
      layer: 2,
      storyIds: ["S1"],
      value: 4,
    },
  ];
  const links: SankeyLink[] = [
    { id: "l1", source: "era:red_clay", target: "theme:work", value: 5, stories: [] },
    {
      id: "l2",
      source: "theme:work",
      target: "principle:craft",
      value: 4,
      stories: [],
    },
  ];

  const layout = computeSankeyLayout(nodes, links, 980, 680);
  assert.equal(Object.keys(layout).length, nodes.length);
  assert.ok((layout["era:red_clay"].x || 0) < (layout["theme:work"].x || 0));
  assert.ok((layout["theme:work"].x || 0) < (layout["principle:craft"].x || 0));
  assert.ok((layout["principle:craft"].height || 0) > 0);
});
