/** The five lesson stages, in order. Nothing is locked: any stage can be opened at any time. */
export const STAGES = ['read', 'write', 'speak', 'watch', 'reflect'] as const;
export type StageId = (typeof STAGES)[number];

/** Route-only step after Reflect: /lesson/:id/complete (built in phase 4). */
export const COMPLETE_STEP = 'complete' as const;
export type LessonStep = StageId | typeof COMPLETE_STEP;

export function isStageId(value: unknown): value is StageId {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value);
}

export function isLessonStep(value: unknown): value is LessonStep {
  return value === COMPLETE_STEP || isStageId(value);
}

/** The stage after this one, or undefined after Reflect. */
export function nextStage(stage: StageId): StageId | undefined {
  return STAGES[STAGES.indexOf(stage) + 1];
}
