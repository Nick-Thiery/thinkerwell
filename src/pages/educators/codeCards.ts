/**
 * Learners' codes for a pilot (/educators/code-cards): a group's prefix and
 * a number, like HLP-01. A learner types their code as their name, so no
 * real name is on the device; the organisation keeps the list that matches
 * codes to names, on paper (docs/research/MEASUREMENT_PLAN.md).
 */

/** The most cards one sheet run makes: six A4 pages of ten. */
export const MAX_LEARNERS = 60;

/** Cards on one A4 page: two across, five down. */
export const CARDS_PER_PAGE = 10;

const PREFIX = /^[A-Z0-9]{2,5}$/;

/** What the prefix field keeps of what was typed: capital letters and digits, at most five. */
export function normalisePrefix(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5);
}

export function isValidPrefix(prefix: string): boolean {
  return PREFIX.test(prefix);
}

/** The number of learners typed, or null unless it is a whole number from 1 to MAX_LEARNERS. */
export function parseCount(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const count = Number(text);
  return count >= 1 && count <= MAX_LEARNERS ? count : null;
}

/** HLP-01, HLP-02 … with at least two digits, so the codes sort and line up. */
export function learnerCodes(prefix: string, count: number): string[] {
  const width = Math.max(2, String(count).length);
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(width, '0')}`);
}

/** The codes split into printed pages of CARDS_PER_PAGE. */
export function cardPages(codes: readonly string[]): string[][] {
  const pages: string[][] = [];
  for (let start = 0; start < codes.length; start += CARDS_PER_PAGE) pages.push(codes.slice(start, start + CARDS_PER_PAGE));
  return pages;
}
