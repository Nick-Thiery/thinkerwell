import { describe, expect, it } from 'vitest';
import { courseSummaries } from './catalog';
import { loadCourseCredits, loadCourseOutlines } from './outline';
import { openCourseIds, platformTotals, roundedDownToTen } from './platformCounts';

// The outline and credits records are made from the courses' own files at
// build time (tools/outline/build.ts), so pages can list a course without
// loading it.

describe('the courses’ outline', () => {
  it('has every lesson of the three other courses, in four sections each, matching the catalog', async () => {
    const outlines = await loadCourseOutlines();
    expect(Object.keys(outlines)).toEqual(['digital-world', 'southeast-asia-through-time', 'art-architecture-society']);
    for (const [id, outline] of Object.entries(outlines)) {
      expect(outline.sections).toHaveLength(4);
      expect(outline.lessons.map((lesson) => lesson.id)).toEqual(courseSummaries[id]!.lessonIds);
      expect(outline.sections.flatMap((section) => section.lessons)).toEqual(outline.lessons.map((lesson) => lesson.number));
    }
  });

  it('says which sections have a check: Southeast Asia Through Time’s four, none of the others', async () => {
    const outlines = await loadCourseOutlines();
    expect(outlines['southeast-asia-through-time']!.sections.every((section) => (section.checkQuestions ?? 0) > 0)).toBe(true);
    expect(outlines['digital-world']!.sections.every((section) => section.checkQuestions === null)).toBe(true);
    expect(outlines['art-architecture-society']!.sections.every((section) => section.checkQuestions === null)).toBe(true);
  });

  it('gives each lesson’s credits, and a credit for every real picture', async () => {
    const credits = await loadCourseCredits();
    expect(credits['art-architecture-society']!).toHaveLength(20);
    for (const lesson of credits['art-architecture-society']!) {
      expect(lesson.pictures.length, lesson.id).toBeGreaterThan(0);
      for (const picture of lesson.pictures) expect(picture.credit?.licence, lesson.id).toBeTruthy();
    }
    expect(credits['digital-world']!.every((lesson) => lesson.pictures.length === 0)).toBe(true);
  });
});

describe('the platform’s size', () => {
  it('is 73 lessons in 4 courses, so the visitor home says “Over 70”', () => {
    expect(openCourseIds()).toHaveLength(4);
    const totals = platformTotals(24);
    expect(totals).toEqual({ lessons: 73, courses: 4 });
    expect(roundedDownToTen(totals.lessons)).toBe(70);
  });
});
