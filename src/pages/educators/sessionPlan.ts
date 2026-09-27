/**
 * The suggested session plan on every teacher guide: the steps of a lesson
 * in the order a group usually takes them, with minutes for a 45-minute
 * session and for a 30-minute one. The same for every lesson (lessons vary
 * a little in length, and the teacher adapts it), so it lives here, not in
 * the lesson files. `short: null` means the step is skipped in 30 minutes:
 * Watch can wait, because nothing is locked and learners can open it later.
 *
 * The totals on the page are added up from these numbers, and a test
 * checks that they come to 45 and 30.
 */
export const SESSION_PLAN = [
  { step: 'warmUp', minutes: 3, short: 2 },
  { step: 'read', minutes: 12, short: 9 },
  { step: 'check', minutes: 5, short: 4 },
  { step: 'write', minutes: 10, short: 8 },
  { step: 'speak', minutes: 5, short: 4 },
  { step: 'watch', minutes: 7, short: null },
  { step: 'reflect', minutes: 3, short: 3 },
] as const satisfies ReadonlyArray<{ step: string; minutes: number; short: number | null }>;

export type SessionStep = (typeof SESSION_PLAN)[number]['step'];

/** The length of the full session, in minutes. */
export const SESSION_MINUTES = 45;
/** The length of the shorter session, in minutes. */
export const SHORT_SESSION_MINUTES = 30;

export function planTotal(which: 'minutes' | 'short'): number {
  return SESSION_PLAN.reduce<number>((sum, row) => sum + (row[which] ?? 0), 0);
}
