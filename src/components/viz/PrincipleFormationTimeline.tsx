"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  EraPrincipleMatrix,
  EraPrincipleMatrixCell,
} from "@/lib/wiki/graph";
import { withAlpha } from "@/lib/design/theme-viz";

interface Props {
  data: EraPrincipleMatrix;
}

const LABEL_W = 210;
const ERA_W = 150;
const ROW_H = 52;
const HEADER_H = 54;
const RIGHT_PAD = 34;
/** Baseline offset for principle labels; tuned with ROW_H for vertical balance */
const LABEL_BASELINE_Y = Math.round((27 / 64) * ROW_H);
const LABEL_LINE_GAP = Math.round((15 / 64) * ROW_H);

export function PrincipleFormationTimeline({ data }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<{ row: number; col: number } | null>(null);
  const width = LABEL_W + data.eras.length * ERA_W + RIGHT_PAD;
  const height = HEADER_H + data.principles.length * ROW_H + 12;
  const activeCell = active ? data.cells[active.col][active.row] : null;
  const activePrinciple = active ? data.principles[active.row] : null;
  const activeEra = active ? data.eras[active.col] : null;
  const activeIsOrigin =
    active !== null ? active.col === firstActiveEra(data, active.row) : false;

  return (
    <section className="mb-10">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto min-w-[980px]"
          role="img"
          aria-label="Core principle formation timeline"
        >
          {data.eras.map((era, col) => {
            const x = LABEL_W + col * ERA_W;
            return (
              <g key={era.key}>
                <line
                  x1={x + ERA_W / 2}
                  y1={HEADER_H - 8}
                  x2={x + ERA_W / 2}
                  y2={height - 10}
                  stroke={withAlpha(era.color, 0.12)}
                  strokeWidth={1}
                />
                <text
                  x={x + ERA_W / 2}
                  y={24}
                  textAnchor="middle"
                  fontFamily="var(--font-playfair), Georgia, serif"
                  fontSize="14"
                  fontWeight={700}
                  fill={era.color}
                >
                  {era.label}
                </text>
              </g>
            );
          })}

          {data.principles.map((principle, row) => {
            const y = HEADER_H + row * ROW_H;
            const firstCol = firstActiveEra(data, row);
            const lastCol = lastActiveEra(data, row);

            return (
              <g key={principle.slug}>
                <line
                  x1={LABEL_W}
                  y1={y + ROW_H / 2}
                  x2={LABEL_W + data.eras.length * ERA_W}
                  y2={y + ROW_H / 2}
                  stroke="rgba(44,28,16,0.10)"
                  strokeWidth={1}
                />
                {firstCol !== null && lastCol !== null && (
                  <line
                    x1={dotX(firstCol)}
                    y1={y + ROW_H / 2}
                    x2={dotX(lastCol)}
                    y2={y + ROW_H / 2}
                    stroke="#b5451b"
                    strokeOpacity={0.28}
                    strokeWidth={7}
                    strokeLinecap="round"
                  />
                )}

                <g
                  onClick={() => router.push(`/principles/${principle.slug}`)}
                  className="cursor-pointer"
                >
                  <text
                    x={12}
                    y={y + LABEL_BASELINE_Y}
                    fontFamily="var(--font-lora), serif"
                    fontSize="13"
                    fontWeight={700}
                    fill="#2c1c10"
                  >
                    {wrapPrinciple(principle.shortTitle).map((line, index) => (
                      <tspan key={line} x={12} dy={index === 0 ? 0 : LABEL_LINE_GAP}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>

                {data.eras.map((era, col) => {
                  const cell = data.cells[col][row];
                  const isOrigin = col === firstCol && cell.count > 0;
                  const isActive = active?.row === row && active?.col === col;
                  const radius = cell.count === 0 ? 4 : 9 + Math.min(cell.count, 5) * 2.3;
                  const cx = dotX(col);
                  const cy = y + ROW_H / 2;

                  return (
                    <g key={`${principle.slug}-${era.key}`}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius + (isActive ? 7 : 4)}
                        fill={withAlpha(era.color, cell.count > 0 ? 0.12 : 0.04)}
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={cell.count > 0 ? era.color : "rgba(141,123,103,0.18)"}
                        stroke={isOrigin ? "#6b1e1e" : isActive ? "#2c1c10" : "#fff8ea"}
                        strokeWidth={isOrigin ? 3 : isActive ? 2.5 : 1.5}
                        strokeDasharray={isOrigin ? "0" : undefined}
                        className={cell.count > 0 ? "cursor-pointer" : "cursor-default"}
                        onMouseEnter={() => {
                          if (cell.count > 0) setActive({ row, col });
                        }}
                        onClick={() => {
                          if (cell.count > 0) setActive({ row, col });
                        }}
                      />
                      {isOrigin && (
                        <text
                          x={cx}
                          y={cy - radius - 8}
                          textAnchor="middle"
                          fontFamily="var(--font-inter), sans-serif"
                          fontSize="10"
                          fontWeight={700}
                          fill="#6b1e1e"
                          style={{ pointerEvents: "none" }}
                        >
                          origin
                        </text>
                      )}
                      {cell.count > 0 && (
                        <text
                          x={cx}
                          y={cy + 4}
                          textAnchor="middle"
                          fontFamily="var(--font-inter), sans-serif"
                          fontSize="11"
                          fontWeight={700}
                          fill="#fff8ea"
                          style={{ pointerEvents: "none" }}
                        >
                          {cell.count}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-1.5 min-h-[108px]">
        {activeCell && activePrinciple && activeEra ? (
          <TimelineDetail
            cell={activeCell}
            principleName={activePrinciple.title}
            eraName={activeEra.label}
            isOrigin={activeIsOrigin}
          />
        ) : (
          <p className="type-ui text-ink-ghost">Select a number to see the stories.</p>
        )}
      </div>
    </section>
  );
}

function TimelineDetail({
  cell,
  principleName,
  eraName,
  isOrigin,
}: {
  cell: EraPrincipleMatrixCell;
  principleName: string;
  eraName: string;
  isOrigin: boolean;
}) {
  return (
    <div>
      <div className="type-meta text-ink-ghost">
        {isOrigin ? "Origin moment" : "Reinforcement moment"}
      </div>
      <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-burgundy">
        {principleName} in {eraName}
      </h3>
      <p className="type-ui mt-1 text-ink-muted">
        {cell.count} supporting {cell.count === 1 ? "story" : "stories"}
      </p>
      {cell.stories.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {cell.stories.slice(0, 4).map((story) => (
            <li key={story.storyId}>
              <Link
                href={`/stories/${story.storyId}`}
                className="type-ui block text-ink transition-colors hover:text-burgundy hover:underline"
              >
                {story.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-ui mt-3 text-ink-ghost">
          No supporting stories are currently mapped to this era.
        </p>
      )}
      {cell.supportingStatements.length > 0 && (
        <p className="mt-3 font-[family-name:var(--font-lora)] text-sm italic text-ink-muted">
          {cell.supportingStatements[0]}
        </p>
      )}
    </div>
  );
}

function dotX(col: number): number {
  return LABEL_W + col * ERA_W + ERA_W / 2;
}

function firstActiveEra(data: EraPrincipleMatrix, principleIndex: number): number | null {
  for (let col = 0; col < data.eras.length; col++) {
    if (data.cells[col][principleIndex].count > 0) return col;
  }
  return null;
}

function lastActiveEra(data: EraPrincipleMatrix, principleIndex: number): number | null {
  for (let col = data.eras.length - 1; col >= 0; col--) {
    if (data.cells[col][principleIndex].count > 0) return col;
  }
  return null;
}

function wrapPrinciple(label: string): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 22 && current) {
      lines.push(current);
      current = word;
      if (lines.length === 2) break;
    } else {
      current = next;
    }
  }

  if (current && lines.length < 2) lines.push(current);
  return lines;
}
