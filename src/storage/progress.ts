/**
 * Small, pure helpers for reading progress across lessons and sections, used
 * by the home dashboard and the course map (and reused by the lesson player
 * in phase 4). None of these touch storage themselves: callers load the
 * learner's progress with the store (`listProgress`) and pass it in, so
 * these stay easy to unit-test and easy to reuse from a component that
 * already has the data loaded.
 */
import type { Lesson, Section } from '../content';
import type { LessonProgress, StageId } from './types';

/** A lookup from lessonId to that learner's progress, built once per render. */
export type ProgressByLessonId = ReadonlyMap<string, LessonProgress>;

export function progressByLessonId(records: readonly LessonProgress[]): ProgressByLessonId {
  return new Map(records.map((record) => [record.lessonId, record]));
}

/** True once the lesson's required reflect prompt has been answered. */
export function isLessonComplete(progress: LessonProgress | undefined): boolean {
  return Boolean(progress?.completedAt);
}

/** The stages finished so far, in the order the learner finished them. */
export function stagesDoneForLesson(progress: LessonProgress | undefined): StageId[] {
  return progress?.stagesDone ?? [];
}

/** Where "Continue" should go for this one lesson: the saved stage, or Read if never started. */
export function nextStageForLesson(progress: LessonProgress | undefined): StageId {
  return progress?.currentStage ?? 'read';
}

export interface ContinueTarget {
  lesson: Lesson;
  stage: StageId;
}

/**
 * The next thing a learner should do. Nothing is ever locked, so a learner
 * may have started a later lesson while an earlier one is still untouched
 * (an old educator link, or simply working out of order); this points at
 * whichever unfinished lesson they most recently touched (by `updatedAt`),
 * so "Continue" always means what it says. With nothing in progress it
 * goes on to the first unfinished lesson after the one finished most
 * recently (Lesson 1 for a brand-new learner).
 * Undefined once every lesson is complete (the dashboard then shows a
 * "finished" state instead).
 */
export function findContinueTarget(
  lessons: readonly Lesson[],
  progress: ProgressByLessonId,
): ContinueTarget | undefined {
  let mostRecent: { lesson: Lesson; record: LessonProgress } | undefined;
  for (const lesson of lessons) {
    const record = progress.get(lesson.id);
    if (!record || isLessonComplete(record)) continue;
    if (!mostRecent || record.updatedAt > mostRecent.record.updatedAt) mostRecent = { lesson, record };
  }
  if (mostRecent) return { lesson: mostRecent.lesson, stage: nextStageForLesson(mostRecent.record) };

  // Nothing in progress: go on from the lesson finished most recently, to
  // the first unfinished lesson after it in course order (wrapping round to
  // the start), the same "next lesson" the lesson complete screen offers.
  // A brand-new learner starts at the first lesson.
  let lastFinished = -1;
  let lastFinishedAt = '';
  lessons.forEach((lesson, index) => {
    const at = progress.get(lesson.id)?.completedAt;
    if (at && at > lastFinishedAt) {
      lastFinishedAt = at;
      lastFinished = index;
    }
  });
  for (let step = 1; step <= lessons.length; step++) {
    const lesson = lessons[(lastFinished + step) % lessons.length]!;
    if (!isLessonComplete(progress.get(lesson.id))) return { lesson, stage: 'read' };
  }
  return undefined;
}

export interface SectionProgress {
  completed: number;
  total: number;
}

/** How many of a section's lessons are complete, out of how many there are. */
export function sectionProgress(
  section: Pick<Section, 'lessons'>,
  lessons: readonly Lesson[],
  progress: ProgressByLessonId,
): SectionProgress {
  const sectionLessons = lessons.filter((lesson) => section.lessons.includes(lesson.number));
  const completed = sectionLessons.filter((lesson) => isLessonComplete(progress.get(lesson.id))).length;
  return { completed, total: sectionLessons.length };
}

/** How many lessons (across every section) a learner has finished. */
export function totalLessonsCompleted(lessons: readonly Lesson[], progress: ProgressByLessonId): number {
  return lessons.filter((lesson) => isLessonComplete(progress.get(lesson.id))).length;
}

export interface JournalEntry {
  lessonNumber: number;
  stage: 'write' | 'reflect';
  text: string;
}

/**
 * The most recently saved bit of writing (Write's answer) or reflection
 * (Reflect's prompts), across every lesson, for "From your journal" on the
 * dashboard. The journal itself is built straight from this saved progress —
 * it has no store of its own (CLAUDE.md's "data kept on the device").
 * Undefined when nothing has been written yet.
 */
export function latestJournalEntry(lessons: readonly Lesson[], progress: ProgressByLessonId): JournalEntry | undefined {
  let best: (JournalEntry & { updatedAt: string }) | undefined;
  for (const lesson of lessons) {
    const record = progress.get(lesson.id);
    if (!record) continue;
    const reflections = Object.values(record.reflections).filter((text) => text.trim());
    const lastReflection = reflections[reflections.length - 1];
    if (lastReflection && (!best || record.updatedAt > best.updatedAt)) {
      best = { lessonNumber: lesson.number, stage: 'reflect', text: lastReflection, updatedAt: record.updatedAt };
    }
    if (record.writing.text.trim() && (!best || record.updatedAt > best.updatedAt)) {
      best = { lessonNumber: lesson.number, stage: 'write', text: record.writing.text, updatedAt: record.updatedAt };
    }
  }
  return best;
}
