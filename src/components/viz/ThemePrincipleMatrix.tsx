"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ThemePrincipleMatrix as ThemePrincipleMatrixData } from "@/lib/wiki/graph";
import { withAlpha } from "@/lib/design/theme-viz";

interface Props {
  data: ThemePrincipleMatrixData;
}

const LABEL_W = 320;
const HEADER_H = 86;
const CELL_W = 66;
const CELL_H = 56;

export function ThemePrincipleMatrix({ data }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<{ row: number; col: number } | null>(null);
  const max = useMemo(() => Math.max(...data.matrix.flat(), 1), [data.matrix]);
  const width = LABEL_W + data.themes.length * CELL_W + 24;
  const height = HEADER_H + data.principles.length * CELL_H + 24;
  const activeCell = active ? data.cells[active.row][active.col] : null;
  const activeTheme = active ? data.themes[active.col] : null;
  const activePrinciple = active ? data.principles[active.row] : null;

  return (
    <section className="mb-8">
      <div className="mx-auto max-w-content">
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-burgundy">
          Principle families by theme
        </h2>
        <p className="type-ui mt-2 text-ink-muted">
          Clustered principle families reveal which lessons most often travel
          with each theme across the story library.
        </p>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-warm-white p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto min-w-[1120px]"
          role="img"
          aria-label="Theme by principle matrix"
        >
          {data.themes.map((theme, col) => (
            <g
              key={theme.slug}
              transform={`translate(${LABEL_W + col * CELL_W}, 0)`}
              onClick={() => router.push(`/themes/${theme.slug}`)}
              className="cursor-pointer"
            >
              <text
                x={CELL_W / 2}
                y={24}
                textAnchor="middle"
                fontFamily="var(--font-inter), sans-serif"
                fontSize="12"
                fontWeight={700}
                fill="#2c1c10"
              >
                {theme.name}
              </text>
              <line
                x1={CELL_W / 2}
                y1={34}
                x2={CELL_W / 2}
                y2={62}
                stroke={theme.color}
                strokeWidth={4}
                strokeLinecap="round"
              />
            </g>
          ))}

          {data.principles.map((principle, row) => (
            <g key={principle.id} transform={`translate(0, ${HEADER_H + row * CELL_H})`}>
              <text
                x={14}
                y={24}
                fontFamily="var(--font-lora), serif"
                fontSize="13"
                fill="#2c1c10"
              >
                {wrapLabel(principle.label).map((line, index) => (
                  <tspan key={index} x={14} dy={index === 0 ? 0 : 16}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          ))}

          {data.cells.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const theme = data.themes[colIndex];
              const activeMatch = active?.row === rowIndex && active?.col === colIndex;
              const intensity = cell.count === 0 ? 0.03 : 0.14 + (cell.count / max) * 0.72;

              return (
                <g
                  key={`${cell.principleId}-${cell.themeSlug}`}
                  transform={`translate(${LABEL_W + colIndex * CELL_W}, ${HEADER_H + rowIndex * CELL_H})`}
                >
                  <rect
                    x={4}
                    y={4}
                    rx={12}
                    ry={12}
                    width={CELL_W - 10}
                    height={CELL_H - 10}
                    fill={withAlpha(theme.color, intensity)}
                    stroke={activeMatch ? theme.color : "rgba(44,28,16,0.08)"}
                    strokeWidth={activeMatch ? 2.5 : 1}
                    className={cell.count > 0 ? "cursor-pointer" : "cursor-default"}
                    onMouseEnter={() => setActive({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setActive(null)}
                    onClick={() => {
                      if (cell.count > 0) setActive({ row: rowIndex, col: colIndex });
                    }}
                  />
                  <text
                    x={CELL_W / 2}
                    y={CELL_H / 2 + 5}
                    textAnchor="middle"
                    fontFamily="var(--font-inter), sans-serif"
                    fontSize="16"
                    fontWeight={700}
                    fill={cell.count > 0 ? "#2c1c10" : "#9e9184"}
                    style={{ pointerEvents: "none" }}
                  >
                    {cell.count}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-warm-white p-4">
        {activeCell && activeTheme && activePrinciple ? (
          <div>
            <div className="type-meta text-ink-ghost">Theme x principle family</div>
            <h3 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-burgundy">
              {activeTheme.name}
            </h3>
            <p className="font-[family-name:var(--font-lora)] text-sm italic text-ink-muted">
              {activePrinciple.label}
            </p>
            <p className="type-ui mt-2 text-ink-muted">
              {activeCell.count} matching {activeCell.count === 1 ? "story" : "stories"}
            </p>
            {activeCell.variantTexts.length > 0 && (
              <ul className="mt-3 space-y-2">
                {activeCell.variantTexts.slice(0, 3).map((text) => (
                  <li key={text} className="type-ui text-ink-muted">
                    {text}
                  </li>
                ))}
              </ul>
            )}
            {activeCell.stories.length > 0 && (
              <ul className="mt-3 space-y-2">
                {activeCell.stories.slice(0, 4).map((story) => (
                  <li key={story.storyId} className="type-ui text-ink-muted">
                    {story.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="type-ui text-ink-muted">
            Hover a cell to see example stories and the exact principle wording
            that feeds that clustered family.
          </p>
        )}
      </div>
    </section>
  );
}

function wrapLabel(label: string): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 34 && current) {
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
