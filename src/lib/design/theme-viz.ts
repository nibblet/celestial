export const THEME_COLORS: Record<string, string> = {
  integrity: "#8b2c2c",
  leadership: "#b5451b",
  "work-ethic": "#c8662a",
  mentorship: "#d4a843",
  family: "#6b1e1e",
  community: "#3d6b35",
  curiosity: "#4a7fa0",
  identity: "#a04a4a",
  gratitude: "#6ba35a",
  adversity: "#6b5040",
  "financial-responsibility": "#7ab3c9",
  "career-choices": "#2f5d7a",
};

export function themeColor(slug: string): string {
  return THEME_COLORS[slug] || "#b5451b";
}

export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
