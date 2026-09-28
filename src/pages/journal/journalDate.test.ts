import { describe, expect, it } from 'vitest';
import { formatDateIn } from '../../i18n';
import { describeJournalDate, JOURNAL_DATE_FORMAT } from './journalDate';

// No trailing "Z": parsed as local time, so the day-boundary math below is
// the same wherever this test runs, regardless of the machine's time zone.
const NOW = new Date('2026-09-27T15:00:00');

describe('describeJournalDate', () => {
  it('is "today" for a moment earlier the same day', () => {
    expect(describeJournalDate('2026-09-27T09:00:00', NOW)).toEqual({ kind: 'today' });
  });

  it('is "yesterday" for the day before', () => {
    expect(describeJournalDate('2026-09-26T23:00:00', NOW)).toEqual({ kind: 'yesterday' });
  });

  it('gives anything older as its date, for the page to write as a short date in its language', () => {
    const older = describeJournalDate('2026-09-20T09:00:00', NOW);
    expect(older).toEqual({ kind: 'other', date: new Date('2026-09-20T09:00:00') });
    expect(older.kind === 'other' && formatDateIn('en', older.date, JOURNAL_DATE_FORMAT)).toBe('Sep 20');
  });

  it('compares calendar days, not a fixed 24 hours', () => {
    // Just after midnight today is still "today", even though under an hour has passed.
    const justAfterMidnight = new Date('2026-09-27T00:10:00');
    expect(describeJournalDate('2026-09-26T23:50:00', justAfterMidnight)).toEqual({ kind: 'yesterday' });
  });
});
