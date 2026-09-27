/** "4:10" for 250 seconds; "1:02:05" past an hour. For video durations. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Whole minutes, rounded, never below 1: "Optional · 4 min". */
export function roundedMinutes(totalSeconds: number): number {
  return Math.max(1, Math.round(totalSeconds / 60));
}

/**
 * Splits authored lesson text into paragraphs on blank lines. Every lesson
 * today is one paragraph per reading section, but the renderer shouldn't
 * depend on that.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
