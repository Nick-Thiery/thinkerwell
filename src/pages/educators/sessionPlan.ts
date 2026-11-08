/**
 * The suggested session plan on every teacher guide: the steps of a lesson
 * in the order a group usually takes them, with minutes for a 45-minute
 * session and for a 30-minute one. The same for every lesson (lessons vary
 * a little in length, and the teacher adapts it), so it lives here, not in
 * the lesson files. `short: null` means the step is skipped in 30 minutes:
 * Watch can wait, because nothing is locked and learners can open it later.
 *
 * A lesson with no Watch step (a translated language with no video of its
 * own for it: CourseContent.stagesFor) has its own plan, with Watch's time
 * given to reading, writing and talking (SESSION_PLAN_WITHOUT_WATCH).
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

/** The plan for a lesson without Watch: the same steps without it, still 45 and 30 minutes. */
export const SESSION_PLAN_WITHOUT_WATCH = [
  { step: 'warmUp', minutes: 3, short: 2 },
  { step: 'read', minutes: 14, short: 9 },
  { step: 'check', minutes: 5, short: 4 },
  { step: 'write', minutes: 12, short: 8 },
  { step: 'speak', minutes: 7, short: 4 },
  { step: 'reflect', minutes: 4, short: 3 },
] as const satisfies ReadonlyArray<{ step: string; minutes: number; short: number | null }>;

export type SessionStep = (typeof SESSION_PLAN)[number]['step'];

export type SessionPlanRow = { readonly step: SessionStep; readonly minutes: number; readonly short: number | null };

/** Which of the optional parts a lesson has: a preview course's lesson may have no warm-up or quick check. */
export interface SessionPlanParts {
  warmUp: boolean;
  check: boolean;
}

/**
 * The plan for a lesson with or without its Watch step. A lesson without a
 * warm-up or a quick check leaves those rows out and gives their minutes to
 * the reading, so the session is still 45 and 30 minutes.
 */
export function sessionPlan(withWatch: boolean, parts: SessionPlanParts = { warmUp: true, check: true }): readonly SessionPlanRow[] {
  const plan: readonly SessionPlanRow[] = withWatch ? SESSION_PLAN : SESSION_PLAN_WITHOUT_WATCH;
  if (parts.warmUp && parts.check) return plan;
  const left = plan.filter((row) => (row.step === 'warmUp' ? !parts.warmUp : row.step === 'check' ? !parts.check : false));
  const spare = (which: 'minutes' | 'short') => left.reduce((sum, row) => sum + (row[which] ?? 0), 0);
  return plan
    .filter((row) => !left.includes(row))
    .map((row) => (row.step === 'read' ? { ...row, minutes: row.minutes + spare('minutes'), short: (row.short ?? 0) + spare('short') } : row));
}

/** The length of the full session, in minutes. */
export const SESSION_MINUTES = 45;
/** The length of the shorter session, in minutes. */
export const SHORT_SESSION_MINUTES = 30;

export function planTotal(which: 'minutes' | 'short', plan: readonly SessionPlanRow[] = SESSION_PLAN): number {
  return plan.reduce<number>((sum, row) => sum + (row[which] ?? 0), 0);
}
