import { describe, expect, it } from 'vitest';
import { getLesson, getLessons, STAGES, type LessonStep } from '../content';
import { resolveLessonPrintRoute, resolveLessonRoute, resolveTeacherGuideRoute } from './lessonRoutes';
import { answerKeyPath, educatorsPath, lessonPath, sectionCheckPath, teacherGuidePath } from './lessonUrls';

const STEPS: LessonStep[] = [...STAGES, 'complete'];
const lessons = getLessons();

describe('resolveLessonRoute', () => {
  it('knows all 24 lessons', () => {
    expect(lessons).toHaveLength(24);
  });

  describe.each(lessons.map((l) => [l.number, l] as const))('lesson %i', (_number, lesson) => {
    it.each(STEPS)('shows /lesson/:id/%s', (step) => {
      const result = resolveLessonRoute(lesson.id, step);
      expect(result.kind).toBe('show');
      if (result.kind !== 'show') return;
      expect(result.lesson.id).toBe(lesson.id);
      expect(result.step).toBe(step);
    });

    it('redirects a new id with no stage to Read', () => {
      expect(resolveLessonRoute(lesson.id, undefined)).toEqual({ kind: 'redirect', to: `/lesson/${lesson.id}/read` });
    });

    it(`redirects its old id (${lesson.oldId}) with no stage to Read`, () => {
      expect(resolveLessonRoute(lesson.oldId, undefined)).toEqual({ kind: 'redirect', to: `/lesson/${lesson.id}/read` });
    });

    it.each(STEPS)(`redirects its old id (${lesson.oldId}) keeping the %s stage`, (step) => {
      expect(resolveLessonRoute(lesson.oldId, step)).toEqual({ kind: 'redirect', to: `/lesson/${lesson.id}/${step}` });
    });

    it('redirects an upper-case old id', () => {
      expect(resolveLessonRoute(lesson.oldId.toUpperCase(), 'Write')).toEqual({
        kind: 'redirect',
        to: `/lesson/${lesson.id}/write`,
      });
    });

    it('is not found with an unknown stage, for both the new and old id', () => {
      expect(resolveLessonRoute(lesson.id, 'quiz')).toEqual({ kind: 'not-found' });
      expect(resolveLessonRoute(lesson.oldId, 'quiz')).toEqual({ kind: 'not-found' });
    });
  });

  it('maps the old ids named in the Base44 audit', () => {
    const cases: Array<[string, string, number]> = [
      ['l1', 'finding-out-about-the-past', 1],
      ['history-scale', 'changing-scale', 3],
      ['l6', 'towns-near-rivers', 10],
      // l10 is lesson 14, not lesson 10: old ids don't follow lesson numbers.
      ['l10', 'responding-to-environmental-change', 14],
      ['l20', 'young-people-contribute', 24],
    ];
    for (const [oldId, newId, number] of cases) {
      expect(resolveLessonRoute(oldId, undefined)).toEqual({ kind: 'redirect', to: `/lesson/${newId}/read` });
      expect(getLesson(newId)?.number).toBe(number);
    }
  });

  it('matches stage and id case-insensitively', () => {
    expect(resolveLessonRoute('L6', 'Watch')).toEqual({ kind: 'redirect', to: '/lesson/towns-near-rivers/watch' });
    expect(resolveLessonRoute('l6', 'WATCH')).toEqual({ kind: 'redirect', to: '/lesson/towns-near-rivers/watch' });
    expect(resolveLessonRoute('L6', undefined)).toEqual({ kind: 'redirect', to: '/lesson/towns-near-rivers/read' });
    // A new id with a capitalised stage redirects to the lower-case URL.
    expect(resolveLessonRoute('towns-near-rivers', 'Watch')).toEqual({
      kind: 'redirect',
      to: '/lesson/towns-near-rivers/watch',
    });
    expect(resolveLessonRoute('Towns-Near-Rivers', 'read')).toEqual({
      kind: 'redirect',
      to: '/lesson/towns-near-rivers/read',
    });
    expect(resolveLessonRoute('TOWNS-NEAR-RIVERS', undefined)).toEqual({
      kind: 'redirect',
      to: '/lesson/towns-near-rivers/read',
    });
    expect(resolveLessonRoute('towns-near-rivers', 'Complete')).toEqual({
      kind: 'redirect',
      to: '/lesson/towns-near-rivers/complete',
    });
  });

  it('never redirects to itself', () => {
    for (const lesson of lessons) {
      for (const step of STEPS) {
        const result = resolveLessonRoute(lesson.id, step);
        expect(result.kind).toBe('show');
      }
    }
  });

  it('is not found for an unknown lesson, an unknown stage or an empty id', () => {
    expect(resolveLessonRoute('nope', 'read')).toEqual({ kind: 'not-found' });
    expect(resolveLessonRoute('nope', undefined)).toEqual({ kind: 'not-found' });
    expect(resolveLessonRoute('l99', undefined)).toEqual({ kind: 'not-found' });
    expect(resolveLessonRoute('towns-near-rivers', 'quiz')).toEqual({ kind: 'not-found' });
    expect(resolveLessonRoute('towns-near-rivers', '')).toEqual({ kind: 'not-found' });
    expect(resolveLessonRoute('', 'read')).toEqual({ kind: 'not-found' });
    expect(resolveLessonRoute('', undefined)).toEqual({ kind: 'not-found' });
    expect(resolveLessonRoute(undefined, undefined)).toEqual({ kind: 'not-found' });
  });

  it('does not treat object keys as lesson ids', () => {
    expect(resolveLessonRoute('constructor', 'read')).toEqual({ kind: 'not-found' });
    expect(resolveLessonRoute('__proto__', undefined)).toEqual({ kind: 'not-found' });
    expect(resolveLessonRoute('towns-near-rivers', 'constructor')).toEqual({ kind: 'not-found' });
  });
});

describe('lessonPath', () => {
  it('defaults to the Read stage', () => {
    expect(lessonPath('towns-near-rivers')).toBe('/lesson/towns-near-rivers/read');
  });

  it('builds each step', () => {
    for (const step of STEPS) expect(lessonPath('changing-scale', step)).toBe(`/lesson/changing-scale/${step}`);
  });

  it('encodes the id', () => {
    expect(lessonPath('a b/c?d#e')).toBe('/lesson/a%20b%2Fc%3Fd%23e/read');
  });
});

describe('sectionCheckPath', () => {
  it('builds the section check URL', () => {
    expect(sectionCheckPath('history')).toBe('/section/history/check');
  });

  it('encodes the id', () => {
    expect(sectionCheckPath('a b/c')).toBe('/section/a%20b%2Fc/check');
  });
});

describe('teacher tools', () => {
  it('builds the teacher guide, answer key and Educators URLs', () => {
    expect(teacherGuidePath('towns-near-rivers')).toBe('/educators/lesson/towns-near-rivers');
    expect(teacherGuidePath('a b/c')).toBe('/educators/lesson/a%20b%2Fc');
    expect(answerKeyPath('history')).toBe('/educators/section/history/answers');
    expect(answerKeyPath('a b/c')).toBe('/educators/section/a%20b%2Fc/answers');
    expect(educatorsPath()).toBe('/educators');
    expect(educatorsPath('geography')).toBe('/educators?section=geography');
  });

  it('shows every lesson\'s teacher guide, and redirects old and differently cased ids', () => {
    for (const lesson of lessons) {
      expect(resolveTeacherGuideRoute(lesson.id)).toEqual({ kind: 'show', lesson });
      expect(resolveTeacherGuideRoute(lesson.oldId)).toEqual({ kind: 'redirect', to: `/educators/lesson/${lesson.id}` });
    }
    expect(resolveTeacherGuideRoute('L6')).toEqual({ kind: 'redirect', to: '/educators/lesson/towns-near-rivers' });
    expect(resolveTeacherGuideRoute('Towns-Near-Rivers')).toEqual({ kind: 'redirect', to: '/educators/lesson/towns-near-rivers' });
  });

  it('is not found for an unknown or empty id', () => {
    for (const id of ['nope', '', undefined, 'constructor']) expect(resolveTeacherGuideRoute(id)).toEqual({ kind: 'not-found' });
  });

  it('leaves the print view resolving as before', () => {
    expect(resolveLessonPrintRoute('l6')).toEqual({ kind: 'redirect', to: '/lesson/towns-near-rivers/print' });
    expect(resolveLessonPrintRoute('nope')).toEqual({ kind: 'not-found' });
  });
});
