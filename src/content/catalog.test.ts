import { describe, expect, it } from 'vitest';
import * as catalog from './catalog';
import { LESSON_CATALOG_FIELDS } from './catalogFields';
import * as full from './index';

// The catalog (./catalog.ts) lets the home page and the course map list the
// lessons without loading them (docs/notes/slow-internet.md). It must say
// exactly what the lessons themselves say.

describe('the lesson catalog', () => {
  it('has every lesson, in course order, with the same fields as the lesson itself', () => {
    const lessons = full.getLessons();
    expect(catalog.getLessons()).toHaveLength(lessons.length);
    catalog.getLessons().forEach((summary, index) => {
      const lesson = lessons[index]!;
      expect(Object.keys(summary).sort()).toEqual([...LESSON_CATALOG_FIELDS].sort());
      for (const field of LESSON_CATALOG_FIELDS) expect(summary[field], `${lesson.id}.${field}`).toEqual(lesson[field]);
    });
  });

  it('finds lessons and sections as the full content does', () => {
    for (const lesson of full.getLessons()) {
      expect(catalog.getLesson(lesson.id)?.number).toBe(lesson.number);
      expect(catalog.getLessonByOldId(lesson.oldId)?.id).toBe(lesson.id);
      expect(catalog.getLessonByNumber(lesson.number)?.id).toBe(lesson.id);
      expect(catalog.getLessonSection(lesson)).toBe(full.getLessonSection(lesson));
    }
    expect(catalog.getLesson('nope')).toBeUndefined();
    expect(catalog.getSections()).toEqual(full.getSections());
    expect(catalog.getCourse()).toEqual(full.getCourse());
    for (const section of full.getSections()) {
      expect(catalog.getSectionLessons(section.id).map((l) => l.id)).toEqual(full.getSectionLessons(section.id).map((l) => l.id));
    }
  });

  it("counts each section check's questions", () => {
    for (const section of full.getSections()) {
      expect(catalog.getQuizQuestionCount(section.id)).toBe(full.getQuiz(section.id)?.questions.length);
    }
    expect(catalog.getQuizQuestionCount('nope')).toBe(0);
  });
});
