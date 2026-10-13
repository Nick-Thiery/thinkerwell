/**
 * What the lesson player tells pilot measurement, worked out from a
 * learner's progress record (docs/notes/pilot-measurement.md). Only counts
 * and ids come out of here: never a word a learner wrote.
 */
import type { LessonProgress } from '../storage/types';
import type { Stage } from './events';

/** How many words a text has (0 for empty). Counts only; the words are never kept. */
export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const sum = (texts: Iterable<string | null | undefined>): number => {
  let total = 0;
  for (const text of texts) total += countWords(text);
  return total;
};

/** Words written so far in each stage that has writing: Read (warm-up and think answers), Write, Watch and Reflect. */
export function writingWordCounts(progress: LessonProgress): Record<'read' | 'write' | 'watch' | 'reflect', number> {
  const think: string[] = [];
  for (const answer of Object.values(progress.checkAnswers)) if (answer.type === 'think') think.push(answer.text);
  return {
    read: sum([progress.warmUpAnswer, ...think]),
    write: sum([progress.writing.text, ...Object.values(progress.writing.planning)]),
    watch: sum([progress.watch.beforeAnswer, progress.watch.afterAnswer]),
    reflect: sum(Object.values(progress.reflections)),
  };
}

/** The stages in `after` that were not done in `before`, and whether the lesson just became complete. */
export function newlyFinished(before: LessonProgress, after: LessonProgress): { stages: Stage[]; lessonComplete: boolean } {
  const stages = after.stagesDone.filter((stage) => !before.stagesDone.includes(stage));
  return { stages, lessonComplete: Boolean(after.completedAt) && !before.completedAt };
}
