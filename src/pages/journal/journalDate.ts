/**
 * How a saved date reads on a journal entry ("today", "yesterday", or a
 * short date). Split from the page so it stays a pure, easily testable
 * function; the caller supplies `now` in tests and leaves it out otherwise.
 */
export type JournalDateKind = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'other'; text: string };

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * `lang` (the BCP 47 tag from useI18n) picks the month name's language for
 * anything older than yesterday; "today" and "yesterday" are for the caller
 * to translate themselves, so they stay in the UI's own message file.
 */
export function describeJournalDate(iso: string, lang: string, now: Date = new Date()): JournalDateKind {
  const then = new Date(iso);
  const diffDays = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
  if (diffDays === 0) return { kind: 'today' };
  if (diffDays === 1) return { kind: 'yesterday' };
  return { kind: 'other', text: new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(then) };
}
