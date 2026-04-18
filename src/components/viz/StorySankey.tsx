"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SankeyLink, SankeyNode, StorySankey as StorySankeyData } from "@/lib/wiki/graph";
import { computeSankeyLayout } from "./layout";
import { withAlpha } from "@/lib/design/theme-viz";

interface Props {
  data: StorySankeyData;
}

const WIDTH = 980;
const HEIGHT = 680;

export function StorySankey({ data }: Props) {
  const router = useRouter();
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const layout = useMemo(
    () => computeSankeyLayout(data.nodes, data.links, WIDTH, HEIGHT),
    [data]
  );

  const activeNode = data.nodes.find((node) => node.id === activeNodeId) || null;
  const activeLink = data.links.find((link) => link.id === activeLinkId) || null;
  const highlightedNodeIds = useMemo(() => {
    if (!activeLink) return new Set<string>();
    return new Set([activeLink.source, activeLink.target]);
  }, [activeLink]);

  return (
    <section className="mb-8">
      <div className="mx-auto max-w-content">
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-burgundy">
          How chapters of life turn into values
        </h2>
        <p className="type-ui mt-2 text-ink-muted">
          This flow traces how named eras feed recurring themes, which then
          crystallize into clustered principle families.
        </p>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-warm-white p-3">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto min-w-[980px]"
          role="img"
          aria-label="Era to theme to principle sankey"
        >
          {data.links.map((link) => {
            const source = layout[link.source];
            const target = layout[link.target];
            if (!source?.width || !source.height || !target?.width || !target.height) return null;
            const x1 = source.x + source.width;
            const y1 = source.y + source.height / 2;
            const x2 = target.x;
            const y2 = target.y + target.height / 2;
            const mid = (x1 + x2) / 2;
            const active = activeLink?.id === link.id;
            const muted =
              activeNode &&
              link.source !== activeNode.id &&
              link.target !== activeNode.id
                ? 0.08
                : activeLink && !active
                  ? 0.08
                  : 0.38;

            return (
              <path
                key={link.id}
                d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={active ? "#8b2c2c" : "#8d7b67"}
                strokeOpacity={muted}
                strokeWidth={Math.max(2, link.value * 2.3)}
                strokeLinecap="round"
                className="cursor-pointer"
                onMouseEnter={() => {
                  setActiveLinkId(link.id);
                  setActiveNodeId(null);
                }}
                onMouseLeave={() => setActiveLinkId(null)}
                onClick={() => {
                  setActiveLinkId(link.id);
                  setActiveNodeId(null);
                }}
              />
            );
          })}

          {data.nodes.map((node) => {
            const positioned = layout[node.id];
            if (!positioned?.width || !positioned.height) return null;
            const active = activeNode?.id === node.id;
            const connected = highlightedNodeIds.has(node.id);
            const dim =
              activeLink && !connected
                ? 0.3
                : activeNode && !active
                  ? 0.4
                  : 1;

            return (
              <g key={node.id}>
                <rect
                  x={positioned.x}
                  y={positioned.y}
                  width={positioned.width}
                  height={positioned.height}
                  rx={10}
                  ry={10}
                  fill={node.color}
                  fillOpacity={dim}
                  stroke={active ? "#2c1c10" : withAlpha(node.color, 0.28)}
                  strokeWidth={active ? 2.5 : 1}
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setActiveNodeId(node.id);
                    setActiveLinkId(null);
                  }}
                  onMouseLeave={() => setActiveNodeId(null)}
                  onClick={() => {
                    if (node.kind === "principle") {
                      setActiveNodeId(node.id);
                      setActiveLinkId(null);
                      return;
                    }
                    if (node.href) router.push(node.href);
                  }}
                />
                <text
                  x={node.layer === 2 ? positioned.x - 10 : positioned.x + positioned.width + 10}
                  y={positioned.y + positioned.height / 2 + 4}
                  textAnchor={node.layer === 2 ? "end" : "start"}
                  fontFamily="var(--font-inter), sans-serif"
                  fontSize="13"
                  fontWeight={600}
                  fill="#2c1c10"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-warm-white p-4">
        {activeLink ? (
          <LinkDetail link={activeLink} nodes={data.nodes} />
        ) : activeNode ? (
          <NodeDetail node={activeNode} />
        ) : (
          <p className="type-ui text-ink-muted">
            Hover a flow to inspect the stories carried through it, or select a
            principle block to see how much of the library feeds that lesson.
          </p>
        )}
      </div>
    </section>
  );
}

function LinkDetail({ link, nodes }: { link: SankeyLink; nodes: SankeyNode[] }) {
  const source = nodes.find((node) => node.id === link.source);
  const target = nodes.find((node) => node.id === link.target);

  return (
    <div>
      <div className="type-meta text-ink-ghost">Flow detail</div>
      <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-burgundy">
        {source?.label} → {target?.label}
      </h3>
      <p className="type-ui mt-1 text-ink-muted">
        {link.value} contributing {link.value === 1 ? "story" : "stories"}
      </p>
      <ul className="mt-3 space-y-2">
        {link.stories.slice(0, 4).map((story) => (
          <li key={story.storyId} className="type-ui text-ink-muted">
            {story.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NodeDetail({ node }: { node: SankeyNode }) {
  return (
    <div>
      <div className="type-meta text-ink-ghost">
        {node.kind === "principle" ? "Principle family" : "Node detail"}
      </div>
      <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-burgundy">
        {node.label}
      </h3>
      <p className="type-ui mt-1 text-ink-muted">
        Connected to {node.value} story-flow {node.value === 1 ? "count" : "counts"}{" "}
        across {node.storyIds.length} {node.storyIds.length === 1 ? "story" : "stories"}.
      </p>
    </div>
  );
}
