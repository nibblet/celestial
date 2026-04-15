const DEFAULT_LISTEN_WPM = 160;

export function getEstimatedListenMinutes(wordCount: number): number {
  if (!Number.isFinite(wordCount) || wordCount <= 0) return 0;
  return Math.ceil(wordCount / DEFAULT_LISTEN_WPM);
}

export function formatEstimatedListenLabel(wordCount: number): string {
  if (!Number.isFinite(wordCount) || wordCount <= 0) return "< 1 min listen";
  if (wordCount < DEFAULT_LISTEN_WPM) return "< 1 min listen";
  const minutes = getEstimatedListenMinutes(wordCount);
  if (minutes === 1) return "1 min listen";
  return `${minutes} min listen`;
}

export { DEFAULT_LISTEN_WPM };
