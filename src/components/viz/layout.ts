import type { PeopleGraphEdge, PeopleGraphNode, SankeyLink, SankeyNode } from "@/lib/wiki/graph";

export interface PositionedNode {
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
}

export function computePeopleGraphLayout(
  nodes: PeopleGraphNode[],
  edges: PeopleGraphEdge[],
  width: number,
  height: number
): Record<string, PositionedNode> {
  const cx = width / 2;
  const cy = height / 2;
  if (nodes.length === 0) return {};

  const weights = new Map<string, number>();
  const adjacency = new Map<string, Map<string, number>>();

  for (const node of nodes) {
    adjacency.set(node.id, new Map());
    weights.set(node.id, node.storyCount);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.set(edge.target, edge.weight);
    adjacency.get(edge.target)?.set(edge.source, edge.weight);
    weights.set(edge.source, (weights.get(edge.source) || 0) + edge.weight * 2);
    weights.set(edge.target, (weights.get(edge.target) || 0) + edge.weight * 2);
  }

  const ranked = [...nodes].sort((a, b) => {
    const scoreDiff = (weights.get(b.id) || 0) - (weights.get(a.id) || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });

  const inner = ranked.slice(0, Math.min(3, ranked.length));
  const middle = ranked.slice(inner.length, inner.length + Math.min(6, ranked.length - inner.length));
  const outer = ranked.slice(inner.length + middle.length);
  const anchors = inner.map((node) => node.id);

  const anchorSort = (ring: PeopleGraphNode[]) =>
    [...ring].sort((a, b) => {
      const anchorA = bestAnchor(a.id, anchors, adjacency);
      const anchorB = bestAnchor(b.id, anchors, adjacency);
      if (anchorA !== anchorB) return anchorA - anchorB;
      const scoreDiff = (weights.get(b.id) || 0) - (weights.get(a.id) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    });

  const layout: Record<string, PositionedNode> = {};
  const maxCount = Math.max(...nodes.map((node) => node.storyCount), 1);

  const placeRing = (
    ring: PeopleGraphNode[],
    radius: number,
    startAngle: number,
    spread: number
  ) => {
    const ordered = anchorSort(ring);
    if (ordered.length === 0) return;
    ordered.forEach((node, index) => {
      const angle =
        ordered.length === 1
          ? startAngle + spread / 2
          : startAngle + (spread * index) / ordered.length;
      layout[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        radius: 18 + (node.storyCount / maxCount) * 18,
      };
    });
  };

  if (inner.length === 1) {
    const node = inner[0];
    layout[node.id] = {
      x: cx,
      y: cy,
      radius: 20 + (node.storyCount / maxCount) * 18,
    };
  } else if (inner.length > 0) {
    const innerRadius = inner.length === 2 ? 72 : 88;
    inner.forEach((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / inner.length;
      layout[node.id] = {
        x: cx + innerRadius * Math.cos(angle),
        y: cy + innerRadius * Math.sin(angle),
        radius: 20 + (node.storyCount / maxCount) * 18,
      };
    });
  }

  placeRing(middle, Math.min(width, height) * 0.28, -Math.PI / 2, Math.PI * 2);
  placeRing(outer, Math.min(width, height) * 0.41, -Math.PI / 2, Math.PI * 2);

  return layout;
}

function bestAnchor(
  nodeId: string,
  anchors: string[],
  adjacency: Map<string, Map<string, number>>
): number {
  let bestIndex = 0;
  let bestWeight = -1;
  for (let i = 0; i < anchors.length; i++) {
    const weight = adjacency.get(nodeId)?.get(anchors[i]) || 0;
    if (weight > bestWeight) {
      bestWeight = weight;
      bestIndex = i;
    }
  }
  return bestIndex;
}

export function computeSankeyLayout(
  nodes: SankeyNode[],
  links: SankeyLink[],
  width: number,
  height: number
): Record<string, PositionedNode> {
  const columnX = [120, width / 2 - 16, width - 152];
  const nodeWidth = 28;
  const layout: Record<string, PositionedNode> = {};

  for (const layer of [0, 1, 2] as const) {
    const columnNodes = nodes.filter((node) => node.layer === layer);
    const gap = 16;
    const minHeight = columnNodes.length > 8 ? 22 : 28;
    const available = height - gap * Math.max(columnNodes.length - 1, 0);
    const total = columnNodes.reduce((sum, node) => sum + Math.max(node.value, 1), 0) || 1;
    const extraRoom = Math.max(available - minHeight * columnNodes.length, 0);
    let cursor = 0;

    columnNodes.forEach((node) => {
      const normalized = Math.max(node.value, 1) / total;
      const nodeHeight = minHeight + normalized * extraRoom;
      layout[node.id] = {
        x: columnX[layer],
        y: cursor,
        width: nodeWidth,
        height: nodeHeight,
      };
      cursor += nodeHeight + gap;
    });

    const columnHeight = cursor - gap;
    const offset = Math.max((height - columnHeight) / 2, 0);
    columnNodes.forEach((node) => {
      const positioned = layout[node.id];
      if (positioned) positioned.y += offset;
    });
  }

  for (const link of links) {
    if (!layout[link.source] || !layout[link.target]) continue;
  }

  return layout;
}
