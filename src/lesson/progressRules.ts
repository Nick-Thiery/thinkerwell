/**
 * When each lesson stage counts as done, as pure functions over the lesson
 * and the learner's saved progress. The lesson player applies these; the
 * course map's StageDots, the learner home's continue card and the
 * completion screen all read the same `stagesDone` / `completedAt` they
 * produce (src/storage/progress.ts).
 *
 * Nothing is ever locked (CLAUDE.md rule 3): these rules only decide what
 * gets a tick. Every stage, and the completion screen, can be opened at any
 * time, in any order, by URL or from the StagePath.
 *
 *   Read     Done once the learner has answered every choice question in the
 *            quick check (right or wrong: checks never block), or taps the
 *            continue button at the end of Read (after the quick check).
 *            The think question is optional and never needed.
 *   Write    Done when the learner taps continue having written something
 *            in the writing box. Continuing with an empty box moves on
 *            without a tick.
 *   Speak    Done as soon as the learner chooses how they practised
 *            (course.json practiceOptions). The recorder is optional and
 *            never counts.
 *   Watch    Optional. Done when the learner answers the after question, or
 *            taps continue (watching, reading instead, or skipping all
 *            count: the video is optional).
 *   Reflect  Done as soon as the required prompt has an answer: the change
 *            that types it is saved together with the tick (so leaving by
 *            the StagePath, the header or Back still counts), and "Finish
 *            lesson" applies it again. That also completes the lesson
 *            (completedAt), which is what "Lesson complete" everywhere
 *            means. Clearing the answer later doesn't undo a completion.
 *
 * "Current stage" (for Continue) is the stage the learner last opened in
 * this lesson. Opening a stage only writes it when the learner already has a
 * saved record for the lesson; otherwise their first real save carries it.
 */
import type { Lesson } from '../content';
import type { CheckAnswer, LessonProgress, StageId } from '../storage';

/** The indexes (in lesson.read.checks) of the choice questions. */
export function choiceCheckIndexes(lesson: Lesson): number[] {
  return lesson.read.checks.flatMap((check, index) => (check.type === 'choice' ? [index] : []));
}

/** True once every choice question has an answer (right or wrong). */
export function allChoiceChecksAnswered(lesson: Lesson, checkAnswers: Record<number, CheckAnswer>): boolean {
  const indexes = choiceCheckIndexes(lesson);
  return indexes.length > 0 && indexes.every((index) => checkAnswers[index]?.type === 'choice');
}

/** True when there is some non-blank text. */
export function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** The index of the required reflect prompt (the schema guarantees there is one). */
export function requiredReflectIndex(lesson: Lesson): number {
  return lesson.reflect.prompts.findIndex((prompt) => prompt.required);
}

/** True when the required reflect prompt has an answer. */
export function isRequiredReflectionAnswered(lesson: Lesson, progress: Pick<LessonProgress, 'reflections'>): boolean {
  return hasText(progress.reflections[requiredReflectIndex(lesson)]);
}

/**
 * The events the lesson player reports. Each stage calls
 * `stageEvent(...)` from useLessonPlayer() when one happens, and the rules
 * below decide whether it marks the stage done.
 */
export type StageEvent =
  | { stage: 'read'; kind: 'check-answered' }
  | { stage: 'read'; kind: 'continue' }
  | { stage: 'write'; kind: 'continue' }
  | { stage: 'speak'; kind: 'practised' }
  | { stage: 'speak'; kind: 'continue' }
  | { stage: 'watch'; kind: 'after-answered' }
  | { stage: 'watch'; kind: 'continue' }
  | { stage: 'reflect'; kind: 'answered' }
  | { stage: 'reflect'; kind: 'finish' };

/** Whether this event, with the progress as it is now (after the event's own change), marks its stage done. */
export function eventMarksStageDone(lesson: Lesson, progress: LessonProgress, event: StageEvent): boolean {
  switch (event.stage) {
    case 'read':
      return event.kind === 'continue' || allChoiceChecksAnswered(lesson, progress.checkAnswers);
    case 'write':
      return hasText(progress.writing.text);
    case 'speak':
      return progress.speak.practisedHow !== null;
    case 'watch':
      return event.kind === 'continue' || hasText(progress.watch.afterAnswer);
    case 'reflect':
      return isRequiredReflectionAnswered(lesson, progress);
  }
}

/** Adds `stage` to stagesDone once, keeping the order stages were finished in. */
export function withStageDone(progress: LessonProgress, stage: StageId): LessonProgress {
  return progress.stagesDone.includes(stage) ? progress : { ...progress, stagesDone: [...progress.stagesDone, stage] };
}

/**
 * Applies an event: marks its stage done when the rules say so, and for
 * Reflect's finish also sets completedAt (keeping the first completion date
 * if the lesson was already complete). Pure: returns the same object when
 * nothing changes.
 */
export function applyStageEvent(lesson: Lesson, progress: LessonProgress, event: StageEvent, now: string): LessonProgress {
  if (!eventMarksStageDone(lesson, progress, event)) return progress;
  const next = withStageDone(progress, event.stage);
  if (event.stage === 'reflect' && !next.completedAt) return { ...next, completedAt: now };
  return next;
}
