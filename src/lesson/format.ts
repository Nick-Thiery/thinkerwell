/** Writes a whole number, at least `minimumIntegerDigits` long: useI18n's formatNumber, so in the interface's own digits. */
export type NumberWriter = (value: number, options?: Intl.NumberFormatOptions) => string;

const plainDigits: NumberWriter = (value, options) => String(value).padStart(options?.minimumIntegerDigits ?? 1, '0');

/**
 * "4:10" for 250 seconds; "1:02:05" past an hour. For video and recording
 * lengths. Pass useI18n's formatNumber so the digits are the interface's
 * own ("۴:۱۰" in Dari).
 */
export function formatDuration(totalSeconds: number, formatNumber: NumberWriter = plainDigits): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const two = (value: number) => formatNumber(value, { minimumIntegerDigits: 2, useGrouping: false });
  return h > 0 ? `${formatNumber(h)}:${two(m)}:${two(s)}` : `${formatNumber(m)}:${two(s)}`;
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
