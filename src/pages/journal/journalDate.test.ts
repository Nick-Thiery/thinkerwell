import { describe, expect, it } from 'vitest';
import { describeJournalDate } from './journalDate';

// No trailing "Z": parsed as local time, so the day-boundary math below is
// the same wherever this test runs, regardless of the machine's time zone.
const NOW = new Date('2026-09-27T15:00:00');

describe('describeJournalDate', () => {
  it('is "today" for a moment earlier the same day', () => {
    expect(describeJournalDate('2026-09-27T09:00:00', 'en', NOW)).toEqual({ kind: 'today' });
  });

  it('is "yesterday" for the day before', () => {
    expect(describeJournalDate('2026-09-26T23:00:00', 'en', NOW)).toEqual({ kind: 'yesterday' });
  });

  it('formats anything older as a short local date', () => {
    expect(describeJournalDate('2026-09-20T09:00:00', 'en', NOW)).toEqual({ kind: 'other', text: 'Sep 20' });
  });

  it('compares calendar days, not a fixed 24 hours', () => {
    // Just after midnight today is still "today", even though under an hour has passed.
    const justAfterMidnight = new Date('2026-09-27T00:10:00');
    expect(describeJournalDate('2026-09-26T23:50:00', 'en', justAfterMidnight)).toEqual({ kind: 'yesterday' });
  });
});
