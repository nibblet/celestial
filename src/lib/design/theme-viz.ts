export const THEME_COLORS: Record<string, string> = {
  integrity: "#efe8da",
  leadership: "#a24b2e",
  "work-ethic": "#a24b2e",
  mentorship: "#7fe7e1",
  family: "#cfd8d6",
  community: "#4fa886",
  curiosity: "#6fd6df",
  identity: "#d7a190",
  gratitude: "#77c9aa",
  adversity: "#b8c2bf",
  "financial-responsibility": "#a8f2f0",
  "career-choices": "#4da7b7",
};

export function themeColor(slug: string): string {
  return THEME_COLORS[slug] || "#a24b2e";
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
