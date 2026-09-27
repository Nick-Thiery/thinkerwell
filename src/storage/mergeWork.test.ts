// @vitest-environment node
import { mergeProgress, mergeQuizRecord, planImport, sameData, type LearnerOnDevice } from './mergeWork';
import { emptyProgress } from './store';
import type { Learner, LessonProgress, QuizAttempt, SectionQuizRecord } from './types';

const ID = 'learner-1';
const LESSON = 'towns-near-rivers';
const EARLY = '2026-09-01T10:00:00.000Z';
const LATE = '2026-09-05T10:00:00.000Z';

function record(updatedAt: string, patch: Partial<LessonProgress> = {}): LessonProgress {
  return { ...emptyProgress(ID, LESSON), startedAt: EARLY, updatedAt, ...patch };
}

function attempt(score: number, finishedAt: string): QuizAttempt {
  return { answers: { 'history-01': score > 5 ? 0 : 1 }, score, total: 10, finishedAt };
}

function quiz(best: QuizAttempt, latest: QuizAttempt, attempts: number): SectionQuizRecord {
  return { learnerId: ID, sectionId: 'history', best, latest, attempts };
}

/** Both orders of arguments where the rule shouldn't care which side is this device. */
function merged(device: LessonProgress, file: LessonProgress): LessonProgress {
  return mergeProgress(device, file);
}

describe('merging one lesson', () => {
  it('keeps every stage done on either side, in the order this device had them', () => {
    const result = merged(record(EARLY, { stagesDone: ['read', 'speak'] }), record(LATE, { stagesDone: ['write', 'read'] }));
    expect(result.stagesDone).toEqual(['read', 'speak', 'write']);
  });

  it('keeps a lesson completed on either side completed, with the earlier date', () => {
    expect(merged(record(EARLY, { completedAt: EARLY }), record(LATE)).completedAt).toBe(EARLY);
    expect(merged(record(LATE), record(EARLY, { completedAt: EARLY })).completedAt).toBe(EARLY);
    expect(merged(record(LATE, { completedAt: LATE }), record(LATE, { completedAt: EARLY })).completedAt).toBe(EARLY);
    expect(merged(record(EARLY), record(LATE)).completedAt).toBeNull();
  });

  it('keeps the earlier start and the later update (not the time of loading)', () => {
    const result = merged(record(EARLY, { startedAt: '2026-08-30T10:00:00.000Z' }), record(LATE));
    expect(result.startedAt).toBe('2026-08-30T10:00:00.000Z');
    expect(result.updatedAt).toBe(LATE);
  });

  it('takes each answer from the record saved more recently', () => {
    const device = record(EARLY, {
      warmUpAnswer: 'Old idea',
      writing: { text: 'Old writing', planning: { 0: 'Old plan' }, selfCheck: { 0: true }, exampleShown: false },
      watch: { beforeAnswer: 'Old before', afterAnswer: 'Old after', readInstead: false },
      reflections: { 0: 'Old reflection' },
      currentStage: 'write',
      speak: { practisedHow: 0 },
    });
    const file = record(LATE, {
      warmUpAnswer: 'New idea',
      writing: { text: 'New writing', planning: { 0: 'New plan' }, selfCheck: { 0: false }, exampleShown: false },
      watch: { beforeAnswer: 'New before', afterAnswer: 'New after', readInstead: false },
      reflections: { 0: 'New reflection' },
      currentStage: 'reflect',
      speak: { practisedHow: 2 },
    });
    const result = merged(device, file);
    expect(result.warmUpAnswer).toBe('New idea');
    expect(result.writing.text).toBe('New writing');
    expect(result.writing.planning).toEqual({ 0: 'New plan' });
    expect(result.writing.selfCheck).toEqual({ 0: false });
    expect(result.watch).toMatchObject({ beforeAnswer: 'New before', afterAnswer: 'New after' });
    expect(result.reflections).toEqual({ 0: 'New reflection' });
    expect(result.currentStage).toBe('reflect');
    expect(result.speak.practisedHow).toBe(2);

    // And the other way round: this device's record is the more recent one.
    const reverse = merged({ ...file, updatedAt: EARLY }, { ...device, updatedAt: LATE });
    expect(reverse.writing.text).toBe('Old writing');
    expect(reverse.currentStage).toBe('write');
  });

  it('never lets an empty answer replace a written one, whichever side is more recent', () => {
    const written = record(EARLY, {
      warmUpAnswer: 'Near water',
      writing: { text: 'My answer', planning: { 1: 'Plan' }, selfCheck: {}, exampleShown: true },
      watch: { beforeAnswer: 'Before', afterAnswer: 'After', readInstead: true },
      reflections: { 0: 'Reflection', 1: 'Second' },
      speak: { practisedHow: 1 },
      checkAnswers: { 2: { type: 'think', text: 'My thought' } },
    });
    const blank = record(LATE, {
      warmUpAnswer: null,
      writing: { text: '   ', planning: { 1: '' }, selfCheck: {}, exampleShown: false },
      reflections: { 1: '' },
      checkAnswers: { 2: { type: 'think', text: '' } },
    });
    for (const result of [merged(written, blank), merged(blank, written)]) {
      expect(result.warmUpAnswer).toBe('Near water');
      expect(result.writing.text).toBe('My answer');
      expect(result.writing.planning).toEqual({ 1: 'Plan' });
      expect(result.writing.exampleShown).toBe(true);
      expect(result.watch).toEqual({ beforeAnswer: 'Before', afterAnswer: 'After', readInstead: true });
      expect(result.reflections).toEqual({ 0: 'Reflection', 1: 'Second' });
      expect(result.speak.practisedHow).toBe(1);
      expect(result.checkAnswers[2]).toEqual({ type: 'think', text: 'My thought' });
    }
  });

  it('fills answers the other side has that this side lacks', () => {
    const result = merged(
      record(LATE, { reflections: { 0: 'Device reflection' }, writing: { text: '', planning: { 0: 'A' }, selfCheck: { 0: true }, exampleShown: false } }),
      record(EARLY, { reflections: { 1: 'File reflection' }, writing: { text: 'File writing', planning: { 2: 'C' }, selfCheck: { 1: true }, exampleShown: false } }),
    );
    expect(result.reflections).toEqual({ 0: 'Device reflection', 1: 'File reflection' });
    expect(result.writing).toEqual({ text: 'File writing', planning: { 0: 'A', 2: 'C' }, selfCheck: { 0: true, 1: true }, exampleShown: false });
  });

  it("takes a quick-check choice from the more recent record and keeps the larger number of tries", () => {
    const result = merged(
      record(EARLY, { checkAnswers: { 0: { type: 'choice', selected: 0, correct: false, tries: 3 } } }),
      record(LATE, { checkAnswers: { 0: { type: 'choice', selected: 1, correct: true, tries: 1 }, 1: { type: 'choice', selected: 2, correct: true, tries: 1 } } }),
    );
    expect(result.checkAnswers).toEqual({
      0: { type: 'choice', selected: 1, correct: true, tries: 3 },
      1: { type: 'choice', selected: 2, correct: true, tries: 1 },
    });
  });

  it('gives this device the win on an exact tie', () => {
    const result = merged(record(LATE, { writing: { text: 'Device', planning: {}, selfCheck: {}, exampleShown: false }, currentStage: 'speak' }), record(LATE, { writing: { text: 'File', planning: {}, selfCheck: {}, exampleShown: false }, currentStage: 'watch' }));
    expect(result.writing.text).toBe('Device');
    expect(result.currentStage).toBe('speak');
  });

  it('changes nothing when the file is combined again with the result', () => {
    const pairs: Array<[LessonProgress, LessonProgress]> = [
      [
        record(EARLY, { stagesDone: ['read'], reflections: { 0: 'A' }, writing: { text: '', planning: { 0: 'P' }, selfCheck: { 0: true }, exampleShown: false }, speak: { practisedHow: null } }),
        record(LATE, { stagesDone: ['write'], reflections: { 1: 'B' }, writing: { text: 'W', planning: {}, selfCheck: { 0: false }, exampleShown: true }, speak: { practisedHow: 1 }, completedAt: LATE }),
      ],
      [
        record(LATE, { stagesDone: ['reflect'], warmUpAnswer: null, completedAt: LATE }),
        record(EARLY, { stagesDone: ['read', 'reflect'], warmUpAnswer: 'Idea', completedAt: EARLY }),
      ],
      [
        record(LATE, { checkAnswers: { 0: { type: 'choice', selected: 0, correct: false, tries: 1 } } }),
        record(LATE, { checkAnswers: { 0: { type: 'choice', selected: 2, correct: true, tries: 4 } } }),
      ],
    ];
    for (const [device, file] of pairs) {
      const once = merged(device, file);
      expect(merged(once, file)).toEqual(once);
    }
  });
});

describe('merging section checks', () => {
  it('keeps the best and the latest across both, and the larger count', () => {
    const device = quiz(attempt(8, EARLY), attempt(4, '2026-09-02T10:00:00.000Z'), 3);
    const file = quiz(attempt(6, '2026-09-03T10:00:00.000Z'), attempt(6, '2026-09-03T10:00:00.000Z'), 2);
    expect(mergeQuizRecord(device, file)).toEqual(quiz(attempt(8, EARLY), attempt(6, '2026-09-03T10:00:00.000Z'), 3));
    expect(mergeQuizRecord(file, device)).toEqual(quiz(attempt(8, EARLY), attempt(6, '2026-09-03T10:00:00.000Z'), 3));
  });

  it('gives a tied best score to the later attempt, as the store does', () => {
    const result = mergeQuizRecord(quiz(attempt(7, EARLY), attempt(7, EARLY), 1), quiz(attempt(7, LATE), attempt(7, LATE), 1));
    expect(result.best.finishedAt).toBe(LATE);
  });

  it('changes nothing when combined again with the same file', () => {
    const device = quiz(attempt(5, EARLY), attempt(9, LATE), 4);
    const file = quiz(attempt(9, '2026-09-03T10:00:00.000Z'), attempt(9, '2026-09-03T10:00:00.000Z'), 6);
    const once = mergeQuizRecord(device, file);
    expect(mergeQuizRecord(once, file)).toEqual(once);
  });
});

describe('planning a load', () => {
  const amina: Learner = { id: ID, name: 'Amina', colour: 'lemon', createdAt: EARLY };
  const yusuf: Learner = { id: 'learner-2', name: 'Yusuf', colour: 'civics', createdAt: EARLY };
  const otherAmina: Learner = { id: 'learner-3', name: 'Amina', colour: 'lemon', createdAt: LATE };

  it('adds learners who are not here, with all their work', () => {
    const work = { learner: yusuf, progress: [{ ...record(LATE), learnerId: yusuf.id }], quizAttempts: [] };
    const plan = planImport([work], new Map());
    expect(plan.learners).toEqual([yusuf]);
    expect(plan.progress).toEqual(work.progress);
    expect(plan.summary).toEqual({ added: [yusuf], updated: [], unchanged: [] });
  });

  it('adds a different learner with the same name as someone here, never merging by name', () => {
    const here = new Map<string, LearnerOnDevice>([[amina.id, { learner: amina, progress: [record(LATE)], quizAttempts: [] }]]);
    const plan = planImport([{ learner: otherAmina, progress: [], quizAttempts: [] }], here);
    expect(plan.learners).toEqual([otherAmina]);
    expect(plan.summary.added).toEqual([otherAmina]);
  });

  it("combines work for a learner already here, keeps this device's details, and writes only what changes", () => {
    const sameLesson = record(EARLY, { reflections: { 0: 'Here' } });
    const untouched = { ...record(EARLY), lessonId: 'finding-out-about-the-past' };
    const here = new Map<string, LearnerOnDevice>([[amina.id, { learner: amina, progress: [sameLesson, untouched], quizAttempts: [] }]]);
    const renamedInFile = { ...amina, name: 'Mina', colour: 'civics' as const };
    const plan = planImport(
      [{ learner: renamedInFile, progress: [record(LATE, { reflections: { 1: 'From file' } }), untouched], quizAttempts: [quiz(attempt(5, LATE), attempt(5, LATE), 1)] }],
      here,
    );
    expect(plan.learners).toEqual([]);
    expect(plan.progress).toHaveLength(1);
    expect(plan.progress[0]!.reflections).toEqual({ 0: 'Here', 1: 'From file' });
    expect(plan.quizAttempts).toHaveLength(1);
    expect(plan.summary).toEqual({ added: [], updated: [amina], unchanged: [] });
  });

  it('writes nothing when this device already has everything in the file', () => {
    const progress = record(LATE, { reflections: { 0: 'Here' } });
    const quizRecord = quiz(attempt(5, LATE), attempt(5, LATE), 1);
    const here = new Map<string, LearnerOnDevice>([[amina.id, { learner: amina, progress: [progress], quizAttempts: [quizRecord] }]]);
    const plan = planImport([{ learner: amina, progress: [{ ...progress }], quizAttempts: [{ ...quizRecord }] }], here);
    expect(plan.progress).toEqual([]);
    expect(plan.quizAttempts).toEqual([]);
    expect(plan.summary).toEqual({ added: [], updated: [], unchanged: [amina] });
  });
});

describe('sameData', () => {
  it('ignores key order and undefined fields', () => {
    expect(sameData({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true);
    expect(sameData({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(sameData({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(sameData({ a: null }, { a: {} })).toBe(false);
    expect(sameData([], {})).toBe(false);
  });
});
