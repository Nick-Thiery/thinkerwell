/**
 * The five lesson stages, in order. Nothing is locked: any stage can be opened at any time.
 *
 * A lesson in a language whose lessons are translated (Indonesian, Malay) has
 * no Watch step unless that language has an approved video of its own for it
 * (October 2026: the English videos aren't shown there; docs/notes/local-language-videos.md).
 * Which stages a lesson has comes from its content, through `stagesFor`
 * (./courseContent.ts, ./catalog.ts), never from a list kept anywhere else.
 */
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

/** The four stages of a lesson with no Watch step. */
export const STAGES_WITHOUT_WATCH: readonly StageId[] = ['read', 'write', 'speak', 'reflect'];

/** A lesson's stages: all five, or the four without Watch. */
export function lessonStages(withWatch: boolean): readonly StageId[] {
  return withWatch ? STAGES : STAGES_WITHOUT_WATCH;
}

/** The stage to show for `stage` among a lesson's stages: itself, or (for a Watch the lesson hasn't got) the next one it has. */
export function stageAmong(stages: readonly StageId[], stage: StageId): StageId {
  if (stages.includes(stage)) return stage;
  for (const later of STAGES.slice(STAGES.indexOf(stage) + 1)) if (stages.includes(later)) return later;
  return stages[stages.length - 1] ?? 'reflect';
}

/** The stage after this one among a lesson's stages, or undefined after the last. */
export function stageAfter(stages: readonly StageId[], stage: StageId): StageId | undefined {
  const index = stages.indexOf(stage);
  return index === -1 ? undefined : stages[index + 1];
}

/** The stage before this one among a lesson's stages, or undefined before the first. */
export function stageBefore(stages: readonly StageId[], stage: StageId): StageId | undefined {
  const index = stages.indexOf(stage);
  return index <= 0 ? undefined : stages[index - 1];
}

/**
 * The stages every one of these lessons has, in order: what "every lesson
 * has …" may truthfully say (home, About, the session guide). Four without
 * Watch where any lesson has none, all five otherwise.
 */
export function commonStages<L>(lessons: readonly L[], stagesFor: (lesson: L) => readonly StageId[]): readonly StageId[] {
  const all = lessons.map(stagesFor);
  return STAGES.filter((stage) => all.every((stages) => stages.includes(stage)));
}
