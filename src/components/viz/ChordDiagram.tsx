"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ChordMatrix } from "@/lib/wiki/graph";
import { themeColor } from "@/lib/design/theme-viz";

interface Props {
  data: ChordMatrix;
}

const SIZE = 640;
const CENTER = SIZE / 2;
const OUTER_R = 260;
const INNER_R = 240;
const LABEL_R = 276;
const GAP_ANGLE = 0.022;

function color(slug: string): string {
  return themeColor(slug);
}

/** Point on a circle at the given angle, where 0 rad = 3 o'clock. */
function pt(r: number, a: number): [number, number] {
  return [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)];
}

/** Build an SVG path for an arc band between innerR and outerR, from a1 to a2. */
function arcBand(innerR: number, outerR: number, a1: number, a2: number): string {
  const large = a2 - a1 > Math.PI ? 1 : 0;
  const [x1, y1] = pt(outerR, a1);
  const [x2, y2] = pt(outerR, a2);
  const [x3, y3] = pt(innerR, a2);
  const [x4, y4] = pt(innerR, a1);
  return [
    `M ${x1} ${y1}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

/**
 * Build a ribbon path connecting arc [a1,a2] on theme i to arc [b1,b2] on theme j.
 * Uses cubic bezier through the center for a soft chord feel.
 */
function ribbonPath(a1: number, a2: number, b1: number, b2: number): string {
  const [x1, y1] = pt(INNER_R, a1);
  const [x2, y2] = pt(INNER_R, a2);
  const [x3, y3] = pt(INNER_R, b1);
  const [x4, y4] = pt(INNER_R, b2);
  // Arc along theme i's inner edge from a1 -> a2
  const largeA = a2 - a1 > Math.PI ? 1 : 0;
  // Arc along theme j's inner edge from b1 -> b2
  const largeB = b2 - b1 > Math.PI ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeA} 1 ${x2} ${y2}`,
    `Q ${CENTER} ${CENTER} ${x3} ${y3}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeB} 1 ${x4} ${y4}`,
    `Q ${CENTER} ${CENTER} ${x1} ${y1}`,
    "Z",
  ].join(" ");
}

interface ThemeArc {
  slug: string;
  name: string;
  startAngle: number;
  endAngle: number;
  rowSum: number;
  // sub-arcs for each counterpart j: [startAngle, endAngle]
  subArcs: { [otherSlug: string]: [number, number] };
}

export function ChordDiagram({ data }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const themeArcs: ThemeArc[] = useMemo(() => {
    const n = data.themes.length;
    if (n === 0) return [];

    const rowSums = data.matrix.map((row) => row.reduce((a, b) => a + b, 0));
    const total = rowSums.reduce((a, b) => a + b, 0) || 1;

    const available = Math.PI * 2 - GAP_ANGLE * n;
    let cursor = -Math.PI / 2; // start at 12 o'clock

    const arcs: ThemeArc[] = [];
    for (let i = 0; i < n; i++) {
      const arcAngle = (rowSums[i] / total) * available;
      const start = cursor;
      const end = cursor + arcAngle;

      // subdivide within this arc, in theme order (j = 0..n-1)
      const subArcs: ThemeArc["subArcs"] = {};
      let sub = start;
      for (let j = 0; j < n; j++) {
        const w = data.matrix[i][j];
        if (rowSums[i] === 0) {
          subArcs[data.themes[j].slug] = [sub, sub];
          continue;
        }
        const subAngle = (w / rowSums[i]) * arcAngle;
        subArcs[data.themes[j].slug] = [sub, sub + subAngle];
        sub += subAngle;
      }

      arcs.push({
        slug: data.themes[i].slug,
        name: data.themes[i].name,
        startAngle: start,
        endAngle: end,
        rowSum: rowSums[i],
        subArcs,
      });

      cursor = end + GAP_ANGLE;
    }
    return arcs;
  }, [data]);

  // Ribbons for each i < j pair where matrix[i][j] > 0
  const ribbons = useMemo(() => {
    const out: {
      key: string;
      a: string;
      b: string;
      d: string;
      weight: number;
    }[] = [];
    const n = data.themes.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const w = data.matrix[i][j];
        if (w <= 0) continue;
        const arcI = themeArcs[i];
        const arcJ = themeArcs[j];
        if (!arcI || !arcJ) continue;
        const [a1, a2] = arcI.subArcs[arcJ.slug];
        const [b1, b2] = arcJ.subArcs[arcI.slug];
        out.push({
          key: `${arcI.slug}--${arcJ.slug}`,
          a: arcI.slug,
          b: arcJ.slug,
          d: ribbonPath(a1, a2, b1, b2),
          weight: w,
        });
      }
    }
    return out.sort((x, y) => x.weight - y.weight); // draw lighter first
  }, [data, themeArcs]);

  const hoveredPairs = useMemo(() => {
    if (!hovered) return null;
    return ribbons
      .filter((r) => r.a === hovered || r.b === hovered)
      .map((r) => ({
        other: r.a === hovered ? r.b : r.a,
        weight: r.weight,
      }))
      .sort((x, y) => y.weight - x.weight);
  }, [hovered, ribbons]);

  const hoveredName = useMemo(() => {
    if (!hovered) return null;
    return data.themes.find((t) => t.slug === hovered)?.name ?? null;
  }, [hovered, data.themes]);

  return (
    <div className="relative">
      <div className="sci-panel overflow-hidden p-2">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Chord diagram of theme co-occurrence"
          className="block h-auto w-full"
        >
          {/* Ribbons */}
          <g>
            {ribbons.map((r) => {
              const dim = hovered && r.a !== hovered && r.b !== hovered;
              const lit = hovered && (r.a === hovered || r.b === hovered);
              const baseColor = color(hovered === r.a ? r.b : r.a);
              return (
                <path
                  key={r.key}
                  d={r.d}
                  fill={hovered ? (lit ? baseColor : "#bfae96") : color(r.a)}
                  fillOpacity={dim ? 0.06 : lit ? 0.55 : 0.22}
                  stroke="none"
                />
              );
            })}
          </g>

          {/* Theme arcs */}
          <g>
            {themeArcs.map((arc) => {
              const isHover = hovered === arc.slug;
              const dim = hovered && !isHover;
              const href = `/themes/${arc.slug}`;
              return (
                <g
                  key={arc.slug}
                  role="link"
                  aria-label={`Open ${arc.name} theme`}
                  tabIndex={0}
                  onMouseEnter={() => setHovered(arc.slug)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(arc.slug)}
                  onBlur={() => setHovered(null)}
                  onClick={() => router.push(href)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(href);
                    }
                  }}
                  className="cursor-pointer focus:outline-none"
                  opacity={dim ? 0.5 : 1}
                >
                  <path
                    d={arcBand(INNER_R, OUTER_R, arc.startAngle, arc.endAngle)}
                    fill={color(arc.slug)}
                    stroke="var(--color-warm-white)"
                    strokeWidth={1.5}
                  />
                  <ThemeLabel arc={arc} />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Hover summary panel */}
      <div className="sci-panel mt-4 min-h-[120px] p-4">
        {hoveredName && hoveredPairs ? (
          <>
            <div className="type-meta text-ink-ghost">Co-occurrences with</div>
            <h3
              className="font-[family-name:var(--font-playfair)] text-lg font-semibold"
              style={{ color: color(hovered!) }}
            >
              {hoveredName}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {hoveredPairs.map((p) => {
                const name = data.themes.find((t) => t.slug === p.other)?.name;
                return (
                  <li key={p.other} className="type-ui text-ink-muted">
                    <span
                      className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ background: color(p.other) }}
                    />
                    {name}{" "}
                    <span className="text-ink-ghost">
                      · {p.weight} shared {p.weight === 1 ? "story" : "stories"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link
              href={`/themes/${hovered}`}
              className="type-ui mt-3 inline-block text-ocean hover:text-ocean-light"
            >
              Open {hoveredName} →
            </Link>
          </>
        ) : (
          <p className="type-ui text-ink-muted">
            Hover a theme to see how it intertwines with the others. Ribbon
            thickness = number of stories shared between two themes.
          </p>
        )}
      </div>
    </div>
  );
}

function ThemeLabel({ arc }: { arc: ThemeArc }) {
  // Place label at midpoint of the arc, rotated tangentially.
  const mid = (arc.startAngle + arc.endAngle) / 2;
  const [x, y] = pt(LABEL_R, mid);
  const deg = (mid * 180) / Math.PI;
  // Flip label on the left half so text reads left-to-right
  const flipped = deg > 90 || deg < -90;
  const rotation = flipped ? deg + 180 : deg;
  const anchor = flipped ? "end" : "start";

  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      transform={`rotate(${rotation} ${x} ${y})`}
      fontFamily="var(--font-playfair), Georgia, serif"
      fontSize={13}
      fontWeight={600}
      fill="var(--color-ink)"
      style={{ pointerEvents: "none" }}
    >
      {arc.name}
    </text>
  );
}
