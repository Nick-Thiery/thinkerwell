import { describe, expect, it } from 'vitest';
import { getLessonByNumber, getLessons, getSections, type Lesson } from '../../content';
import { emptyProgress, type Learner, type LearnerWork, type LessonProgress, type SectionQuizRecord, type StageId } from '../../storage';
import { byName, earnedCertificates, summariseLearner } from './classSummary';

const lessons = getLessons();
const sections = getSections();
const lesson = (n: number) => getLessonByNumber(n) as Lesson;
const day = (d: number, h = 10) => new Date(Date.UTC(2026, 8, d, h)).toISOString();

function learner(name: string, id = name.toLowerCase(), createdAt = day(1, 8)): Learner {
  return { id, name, colour: 'lemon', createdAt };
}

function finished(learnerId: string, n: number, at: string): LessonProgress {
  return {
    ...emptyProgress(learnerId, lesson(n).id),
    stagesDone: ['read', 'write', 'speak', 'reflect'],
    currentStage: 'reflect',
    reflections: { 0: 'An answer.' },
    startedAt: at,
    updatedAt: at,
    completedAt: at,
  };
}

function started(learnerId: string, n: number, stage: StageId, at: string): LessonProgress {
  return { ...emptyProgress(learnerId, lesson(n).id), stagesDone: ['read'], currentStage: stage, startedAt: at, updatedAt: at };
}

function check(learnerId: string, sectionId: SectionQuizRecord['sectionId'], at: string): SectionQuizRecord {
  const attempt = { answers: {}, score: 3, total: 10, finishedAt: at };
  return { learnerId, sectionId, best: attempt, latest: attempt, attempts: 2 };
}

function work(who: Learner, progress: LessonProgress[] = [], quizAttempts: SectionQuizRecord[] = []): LearnerWork {
  return { learner: who, progress, quizAttempts };
}

const counts = (summary: ReturnType<typeof summariseLearner>) =>
  Object.fromEntries(summary.sections.map(({ section, completed, total }) => [section.id, `${completed} of ${total}`]));

describe('summariseLearner', () => {
  it('counts the lessons finished in each section, out of how many it has', () => {
    const amina = learner('Amina');
    const summary = summariseLearner(
      work(amina, [
        ...[10, 11, 12, 13, 14].map((n, i) => finished(amina.id, n, day(10 + i))),
        finished(amina.id, 1, day(2)),
        finished(amina.id, 2, day(3)),
        started(amina.id, 3, 'write', day(20)),
      ]),
      lessons,
      sections,
    );
    expect(counts(summary)).toEqual({ history: '2 of 9', geography: '5 of 5', culture: '0 of 5', civics: '0 of 5' });
  });

  it('is on the unfinished lesson worked on most recently, at the step they were on', () => {
    const amina = learner('Amina');
    const summary = summariseLearner(
      work(amina, [started(amina.id, 3, 'write', day(20)), started(amina.id, 7, 'speak', day(21)), finished(amina.id, 1, day(22))]),
      lessons,
      sections,
    );
    expect(summary.onNow).toEqual({ kind: 'in-progress', lesson: lesson(7), stage: 'speak' });
  });

  it('with nothing unfinished open, has the next lesson up, as "Continue" on their home does', () => {
    const amina = learner('Amina');
    const summary = summariseLearner(work(amina, [finished(amina.id, 10, day(5)), finished(amina.id, 11, day(6))]), lessons, sections);
    expect(summary.onNow).toEqual({ kind: 'up-next', lesson: lesson(12) });
  });

  it('says when nothing is started, and when everything is finished', () => {
    const kofi = learner('Kofi');
    expect(summariseLearner(work(kofi), lessons, sections).onNow).toEqual({ kind: 'not-started' });
    const all = summariseLearner(
      work(
        kofi,
        lessons.map((each, i) => finished(kofi.id, each.number, day(1 + i))),
      ),
      lessons,
      sections,
    );
    expect(all.onNow).toEqual({ kind: 'finished' });
    expect(counts(all)).toEqual({ history: '9 of 9', geography: '5 of 5', culture: '5 of 5', civics: '5 of 5' });
  });

  it('was last active when any lesson or section check was last saved', () => {
    const amina = learner('Amina');
    expect(summariseLearner(work(amina), lessons, sections).lastActive).toBeNull();
    expect(summariseLearner(work(amina, [finished(amina.id, 1, day(3)), started(amina.id, 2, 'read', day(9))]), lessons, sections).lastActive).toBe(
      day(9),
    );
    expect(
      summariseLearner(work(amina, [finished(amina.id, 1, day(3))], [check(amina.id, 'history', day(12))]), lessons, sections).lastActive,
    ).toBe(day(12));
  });

  it('lists the section checks tried, in course order, with no score', () => {
    const amina = learner('Amina');
    const summary = summariseLearner(
      work(amina, [], [check(amina.id, 'civics', day(5)), check(amina.id, 'geography', day(4))]),
      lessons,
      sections,
    );
    expect(summary.checksTried.map((section) => section.id)).toEqual(['geography', 'civics']);
    expect(JSON.stringify(summary)).not.toMatch(/"score"|"best"|"latest"/);
  });
});

describe('byName', () => {
  it('orders learners by name, ignoring case and accents, never by progress', () => {
    const names = ['yusuf', 'Amina', 'Élodie', 'bashir', 'Zahra'].map((name) => ({ learner: learner(name) }));
    expect(byName(names, 'en').map((each) => each.learner.name)).toEqual(['Amina', 'bashir', 'Élodie', 'yusuf', 'Zahra']);
  });

  it('keeps learners who share a name in the order they were added', () => {
    const later = { learner: learner('Amina', 'b', day(5)) };
    const earlier = { learner: learner('amina', 'a', day(2)) };
    expect(byName([later, earlier], 'en')).toEqual([earlier, later]);
  });
});

describe('earnedCertificates', () => {
  it("lists each learner's finished sections, then the course, learners by name", () => {
    const yusuf = learner('Yusuf');
    const amina = learner('Amina');
    const kofi = learner('Kofi');
    const certificates = earnedCertificates(
      [
        work(yusuf, lessons.map((each, i) => finished(yusuf.id, each.number, day(1 + i)))),
        // Geography finished; one Culture lesson missing, so no Culture certificate.
        work(amina, [10, 11, 12, 13, 14, 15, 16, 17, 18].map((n, i) => finished(amina.id, n, day(1 + i)))),
        // A section check alone never earns one.
        work(kofi, [started(kofi.id, 1, 'write', day(3))], [check(kofi.id, 'history', day(4))]),
      ],
      lessons,
      sections,
      'en',
    );
    expect(certificates.map(({ learner: who, scope }) => `${who.name}: ${scope.kind === 'course' ? 'course' : scope.section.id}`)).toEqual([
      'Amina: geography',
      'Yusuf: history',
      'Yusuf: geography',
      'Yusuf: culture',
      'Yusuf: civics',
      'Yusuf: course',
    ]);
    // Dated the day the last of its lessons was finished.
    expect(certificates[0]!.finishedAt).toBe(day(5));
    expect(certificates[5]!.finishedAt).toBe(day(24));
  });

  it('is empty when nobody has finished a section', () => {
    const amina = learner('Amina');
    expect(earnedCertificates([work(amina, [finished(amina.id, 1, day(1))])], lessons, sections, 'en')).toEqual([]);
    expect(earnedCertificates([], lessons, sections, 'en')).toEqual([]);
  });
});
