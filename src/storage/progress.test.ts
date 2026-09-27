import { describe, expect, it } from 'vitest';
import { getLessons, getSections } from '../content';
import { emptyProgress } from './store';
import type { LessonProgress } from './types';
import {
  findContinueTarget,
  isLessonComplete,
  nextStageForLesson,
  progressByLessonId,
  sectionProgress,
  stagesDoneForLesson,
  totalLessonsCompleted,
} from './progress';

const LEARNER = 'learner-1';
const lessons = getLessons();
const sections = getSections();

function completed(lessonId: string): LessonProgress {
  return { ...emptyProgress(LEARNER, lessonId), stagesDone: ['read', 'write', 'speak', 'watch', 'reflect'], completedAt: '2026-01-01T00:00:00.000Z' };
}

function inProgress(lessonId: string, currentStage: LessonProgress['currentStage'] = 'write'): LessonProgress {
  return { ...emptyProgress(LEARNER, lessonId), stagesDone: ['read'], currentStage };
}

describe('isLessonComplete', () => {
  it('is false with no progress, or progress that has not reached Reflect', () => {
    expect(isLessonComplete(undefined)).toBe(false);
    expect(isLessonComplete(inProgress(lessons[0]!.id))).toBe(false);
  });

  it('is true once completedAt is set', () => {
    expect(isLessonComplete(completed(lessons[0]!.id))).toBe(true);
  });
});

describe('stagesDoneForLesson and nextStageForLesson', () => {
  it('default to no stages done and Read, with no saved progress', () => {
    expect(stagesDoneForLesson(undefined)).toEqual([]);
    expect(nextStageForLesson(undefined)).toBe('read');
  });

  it('read from the saved record', () => {
    const progress = inProgress(lessons[0]!.id, 'speak');
    expect(stagesDoneForLesson(progress)).toEqual(['read']);
    expect(nextStageForLesson(progress)).toBe('speak');
  });
});

describe('findContinueTarget', () => {
  it('points at Lesson 1, Read, for a brand-new learner', () => {
    const target = findContinueTarget(lessons, progressByLessonId([]));
    expect(target).toEqual({ lesson: lessons[0], stage: 'read' });
  });

  it('picks the first unfinished lesson in course order, at its saved stage', () => {
    const records = [completed(lessons[0]!.id), completed(lessons[1]!.id), inProgress(lessons[2]!.id, 'watch')];
    const target = findContinueTarget(lessons, progressByLessonId(records));
    expect(target).toEqual({ lesson: lessons[2], stage: 'watch' });
  });

  it('is undefined once every lesson is complete', () => {
    const records = lessons.map((lesson) => completed(lesson.id));
    expect(findContinueTarget(lessons, progressByLessonId(records))).toBeUndefined();
  });

  it('prefers a later lesson the learner has actually started over an earlier untouched one', () => {
    // Nothing is locked: a learner (or an old educator link) can jump straight
    // to Lesson 6 and leave Lessons 1-5 untouched. "Continue" should still
    // mean their Lesson 6, not send them back to Lesson 1.
    const started = inProgress(lessons[5]!.id, 'speak');
    const target = findContinueTarget(lessons, progressByLessonId([started]));
    expect(target).toEqual({ lesson: lessons[5], stage: 'speak' });
  });

  it('with nothing in progress, goes on after the lesson finished most recently', () => {
    // Finished Lesson 10 only: Continue offers Lesson 11, as the complete screen's "Up next" does.
    const target = findContinueTarget(lessons, progressByLessonId([completed(lessons[9]!.id)]));
    expect(target).toEqual({ lesson: lessons[10], stage: 'read' });
  });

  it('skips finished lessons and wraps round to the start of the course', () => {
    const last = lessons.length - 1;
    const records = [
      { ...completed(lessons[0]!.id), completedAt: '2026-01-01T00:00:00.000Z' },
      { ...completed(lessons[last]!.id), completedAt: '2026-03-01T00:00:00.000Z' },
      { ...completed(lessons[5]!.id), completedAt: '2026-02-01T00:00:00.000Z' },
    ];
    expect(findContinueTarget(lessons, progressByLessonId(records))).toEqual({ lesson: lessons[1], stage: 'read' });
  });

  it('picks the most recently updated in-progress lesson when several are unfinished', () => {
    const older: LessonProgress = { ...inProgress(lessons[1]!.id, 'write'), updatedAt: '2026-01-01T00:00:00.000Z' };
    const newer: LessonProgress = { ...inProgress(lessons[4]!.id, 'speak'), updatedAt: '2026-02-01T00:00:00.000Z' };
    const target = findContinueTarget(lessons, progressByLessonId([older, newer]));
    expect(target).toEqual({ lesson: lessons[4], stage: 'speak' });
  });
});

describe('sectionProgress and totalLessonsCompleted', () => {
  it('counts only that section’s completed lessons', () => {
    const history = sections.find((s) => s.id === 'history')!;
    const historyLessons = lessons.filter((l) => l.section === 'history');
    const records = [completed(historyLessons[0]!.id), completed(historyLessons[1]!.id)];
    const progress = progressByLessonId(records);
    expect(sectionProgress(history, lessons, progress)).toEqual({ completed: 2, total: historyLessons.length });
    expect(totalLessonsCompleted(lessons, progress)).toBe(2);
  });

  it('is zero out of the section size with no progress', () => {
    for (const section of sections) {
      const sectionLessons = lessons.filter((l) => l.section === section.id);
      expect(sectionProgress(section, lessons, progressByLessonId([]))).toEqual({
        completed: 0,
        total: sectionLessons.length,
      });
    }
  });
});
