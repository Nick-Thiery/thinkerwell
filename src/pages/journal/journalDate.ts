/**
 * How a saved date reads on a journal entry ("Saved today", "Saved
 * yesterday", or "Saved" and a short date). Split from the page so it stays
 * a pure, easily testable function; the caller supplies `now` in tests and
 * leaves it out otherwise.
 */
export type JournalDateKind = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'other'; date: Date };

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Which day a piece was saved on, as the caller words it: "today" and
 * "yesterday" are whole messages of their own in en.json (so a translation
 * can word each its own way), and any other day is a date the caller
 * formats in the interface's language (useI18n's formatDate).
 */
export function describeJournalDate(iso: string, now: Date = new Date()): JournalDateKind {
  const then = new Date(iso);
  const diffDays = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
  if (diffDays === 0) return { kind: 'today' };
  if (diffDays === 1) return { kind: 'yesterday' };
  return { kind: 'other', date: then };
}

/** The options for a journal entry's short date ("Sep 20"). */
export const JOURNAL_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
