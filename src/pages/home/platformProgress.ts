/**
 * What the learner Home works out across every course (Justin's brief of
 * 10 November 2026, section 16): how many lessons are finished out of all of
 * them, where "Resume here" goes, and the latest thing written. Pure, over
 * lesson ids and the learner's saved progress, so it needs no course to be
 * loaded: progress is kept per lesson id whichever course the lesson is in.
 */
import type { StageId } from '../../content/stages';
import { isLessonComplete, nextStageForLesson, type ProgressByLessonId } from '../../storage/progress';

/** A course as Home counts it: its id and every lesson id, in order. */
export interface PlatformCourse {
  id: string;
  lessonIds: readonly string[];
}

export interface CourseCount {
  id: string;
  completed: number;
  total: number;
}

export function courseCount(course: PlatformCourse, progress: ProgressByLessonId): CourseCount {
  const completed = course.lessonIds.filter((id) => isLessonComplete(progress.get(id))).length;
  return { id: course.id, completed, total: course.lessonIds.length };
}

/** "N of 73 lessons completed": finished lessons over every lesson of every course shown. */
export function platformCount(courses: readonly PlatformCourse[], progress: ProgressByLessonId): { completed: number; total: number } {
  return courses.reduce(
    (sum, course) => {
      const count = courseCount(course, progress);
      return { completed: sum.completed + count.completed, total: sum.total + count.total };
    },
    { completed: 0, total: 0 },
  );
}

/**
 * What the one card under "Your progress" offers:
 * - `start`: nothing done anywhere yet, so "Choose a course";
 * - `resume`: the lesson touched most recently is unfinished, so back to it
 *   at the step the learner was on;
 * - `next`: the lesson touched most recently is finished, so the next
 *   unfinished lesson of that course;
 * - `choose`: that course is finished, but others are not, so "Choose a course";
 * - `explore`: every lesson of every course is finished.
 */
export type HomeTarget =
  | { kind: 'start' }
  | { kind: 'resume'; courseId: string; lessonId: string; stage: StageId }
  | { kind: 'next'; courseId: string; lessonId: string }
  | { kind: 'choose' }
  | { kind: 'explore' };

export function homeTarget(
  courses: readonly PlatformCourse[],
  progress: ProgressByLessonId,
  stagesFor: (lessonId: string) => readonly StageId[],
): HomeTarget {
  const { completed, total } = platformCount(courses, progress);
  if (total > 0 && completed === total) return { kind: 'explore' };

  // The lesson with the most recent activity, finished or not, in any course.
  let latest: { course: PlatformCourse; index: number; at: string } | undefined;
  for (const course of courses) {
    course.lessonIds.forEach((id, index) => {
      const record = progress.get(id);
      if (record && (!latest || record.updatedAt > latest.at)) latest = { course, index, at: record.updatedAt };
    });
  }
  if (!latest) return { kind: 'start' };

  const { course, index } = latest;
  const lessonId = course.lessonIds[index]!;
  const record = progress.get(lessonId);
  if (!isLessonComplete(record)) return { kind: 'resume', courseId: course.id, lessonId, stage: nextStageForLesson(record, stagesFor(lessonId)) };

  for (let step = 1; step < course.lessonIds.length; step++) {
    const id = course.lessonIds[(index + step) % course.lessonIds.length]!;
    if (!isLessonComplete(progress.get(id))) return { kind: 'next', courseId: course.id, lessonId: id };
  }
  return { kind: 'choose' };
}

export interface PlatformJournalEntry {
  courseId: string;
  lessonId: string;
  stage: 'write' | 'reflect';
  text: string;
}

/** The most recently saved writing or reflection in any course (the journal's preview on Home). */
export function latestWriting(courses: readonly PlatformCourse[], progress: ProgressByLessonId): PlatformJournalEntry | undefined {
  let best: (PlatformJournalEntry & { at: string }) | undefined;
  for (const course of courses) {
    for (const lessonId of course.lessonIds) {
      const record = progress.get(lessonId);
      if (!record || (best && record.updatedAt <= best.at)) continue;
      const reflections = Object.values(record.reflections).filter((text) => text.trim());
      const reflection = reflections[reflections.length - 1];
      if (record.writing.text.trim()) best = { courseId: course.id, lessonId, stage: 'write', text: record.writing.text, at: record.updatedAt };
      else if (reflection) best = { courseId: course.id, lessonId, stage: 'reflect', text: reflection, at: record.updatedAt };
    }
  }
  return best && { courseId: best.courseId, lessonId: best.lessonId, stage: best.stage, text: best.text };
}
