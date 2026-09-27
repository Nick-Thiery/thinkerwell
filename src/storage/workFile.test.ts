// @vitest-environment node
import { emptyProgress } from './store';
import type { Learner, LessonProgress, SectionQuizRecord } from './types';
import {
  buildWorkFile,
  checkWorkFile,
  checkWorkFileSize,
  MAX_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_WORK_FILE_BYTES,
  serialiseWorkFile,
  workFileName,
  WORK_FILE_FORMAT,
  WORK_FILE_VERSION,
  type KnownContent,
  type LearnerWork,
} from './workFile';

const known: KnownContent = {
  lessonIds: new Set(['finding-out-about-the-past', 'towns-near-rivers']),
  sectionIds: new Set(['history', 'geography', 'culture', 'civics']),
};

const AMINA: Learner = {
  id: '6f1c2d3e-0000-4000-8000-000000000001',
  name: 'Amina',
  colour: 'geography',
  createdAt: '2026-09-01T08:00:00.000Z',
  classCode: 'HLP-07',
  readingLevel: 'simpler',
};

function lesson(lessonId: string, patch: Partial<LessonProgress> = {}): LessonProgress {
  return {
    ...emptyProgress(AMINA.id, lessonId),
    startedAt: '2026-09-02T08:00:00.000Z',
    updatedAt: '2026-09-02T09:00:00.000Z',
    ...patch,
  };
}

function quiz(sectionId: SectionQuizRecord['sectionId'], score = 7): SectionQuizRecord {
  const attempt = { answers: { 'history-01': 0, 'history-02': 2 }, score, total: 10, finishedAt: '2026-09-03T10:00:00.000Z' };
  return { learnerId: AMINA.id, sectionId, best: attempt, latest: attempt, attempts: 2 };
}

const aminaWork: LearnerWork = {
  learner: AMINA,
  progress: [
    lesson('towns-near-rivers', {
      stagesDone: ['read', 'write', 'reflect'],
      currentStage: 'reflect',
      warmUpAnswer: 'Near the river',
      checkAnswers: { 0: { type: 'choice', selected: 1, correct: true, tries: 2 }, 2: { type: 'think', text: 'Water for crops' } },
      writing: { text: 'I would build by the river.', planning: { 0: 'Water', 1: 'Trade' }, selfCheck: { 0: true }, exampleShown: true },
      speak: { practisedHow: 1 },
      watch: { beforeAnswer: 'Fish', afterAnswer: 'Floods', readInstead: true },
      reflections: { 0: 'Rivers give water.' },
      completedAt: '2026-09-02T09:00:00.000Z',
    }),
  ],
  quizAttempts: [quiz('history')],
};

/** A file's text, from an object (so tests can break it on purpose). */
const json = (value: unknown) => JSON.stringify(value);

function goodFile(): ReturnType<typeof buildWorkFile> {
  return buildWorkFile([aminaWork], new Date('2026-09-28T07:30:00.000Z'));
}

type Json = Record<string, unknown>;

/** A copy of a good file as plain JSON, with handles on the parts the tests break. */
interface Parts {
  file: Json;
  learners: unknown[];
  learner: Json;
  work: Json;
  progress: unknown[];
  lesson: Json;
  writing: Json;
  checkAnswers: Json;
  firstCheck: Json;
  quizzes: unknown[];
  quiz: Json;
}

function parts(): Parts {
  const file = JSON.parse(serialiseWorkFile(goodFile())) as Json;
  const learners = file.learners as Json[];
  const work = learners[0]!;
  const progress = work.progress as Json[];
  const lesson = progress[0]!;
  const checkAnswers = lesson.checkAnswers as Json;
  const quizzes = work.quizAttempts as Json[];
  return {
    file,
    learners,
    work,
    learner: work.learner as Json,
    progress,
    lesson,
    writing: lesson.writing as Json,
    checkAnswers,
    firstCheck: checkAnswers[0] as Json,
    quizzes,
    quiz: quizzes[0]!,
  };
}

/** A good file with one change made to a copy of it. */
function broken(change: (parts: Parts) => void): string {
  const copy = parts();
  change(copy);
  return json(copy.file);
}

describe('making a work file', () => {
  it('has the marker, the version, the date saved and each learner with their work', () => {
    const file = goodFile();
    expect(file).toEqual({
      format: 'thinkerwell-work',
      version: 1,
      savedAt: '2026-09-28T07:30:00.000Z',
      learners: [aminaWork],
    });
    expect(WORK_FILE_FORMAT).toBe('thinkerwell-work');
    expect(WORK_FILE_VERSION).toBe(1);
  });

  it('comes back from its own text exactly as it was', () => {
    const result = checkWorkFile(serialiseWorkFile(goodFile()), known);
    expect(result).toEqual({ ok: true, file: goodFile(), skipped: 0 });
  });

  it('holds no recordings and no device settings', () => {
    const text = serialiseWorkFile(goodFile());
    expect(text).not.toMatch(/recording|blob|mimeType|saveData|listeningSpeed|partner|speechCheck|currentLearnerId/);
  });

  it('is small: a learner who has done every lesson is well under 100 kB', () => {
    const everyLesson = Array.from({ length: 24 }, (_, i) => ({ ...aminaWork.progress[0]!, lessonId: `lesson-${i}` }));
    const text = serialiseWorkFile(buildWorkFile([{ ...aminaWork, progress: everyLesson }]));
    expect(text.length).toBeLessThan(100_000);
  });

  it('names the file after the learner and the day, or all learners', () => {
    const day = new Date(2026, 8, 28, 23, 59);
    expect(workFileName('Amina', day)).toBe('thinkerwell-amina-2026-09-28.json');
    expect(workFileName(null, day)).toBe('thinkerwell-all-learners-2026-09-28.json');
    expect(workFileName('Zoë Al-Hassan', day)).toBe('thinkerwell-zoe-al-hassan-2026-09-28.json');
    expect(workFileName('محمد', day)).toBe('thinkerwell-learner-2026-09-28.json');
    expect(workFileName('../../etc/passwd', day)).toBe('thinkerwell-etc-passwd-2026-09-28.json');
  });
});

describe('checking a work file', () => {
  const problem = (text: string) => {
    const result = checkWorkFile(text, known);
    return result.ok ? 'ok' : result.problem;
  };

  it('refuses text that is not JSON', () => {
    expect(problem('this is not json')).toBe('not-work-file');
    expect(problem('{"format": "thinkerwell-work", ')).toBe('not-work-file');
    expect(problem('<html></html>')).toBe('not-work-file');
  });

  it('refuses JSON without our marker', () => {
    expect(problem(json({ learners: [] }))).toBe('not-work-file');
    expect(problem(json({ ...goodFile(), format: 'someone-else' }))).toBe('not-work-file');
    expect(problem(json([goodFile()]))).toBe('not-work-file');
    expect(problem('null')).toBe('not-work-file');
    expect(problem('42')).toBe('not-work-file');
  });

  it('refuses a file from a newer version before looking at the rest', () => {
    expect(problem(json({ format: WORK_FILE_FORMAT, version: 2, anything: 'else' }))).toBe('newer-version');
    expect(problem(json({ ...goodFile(), version: 7 }))).toBe('newer-version');
  });

  it('refuses a version that is not a whole number from 1', () => {
    for (const version of [0, -1, 1.5, '1', null]) {
      expect(problem(json({ ...goodFile(), version }))).toBe('damaged');
    }
  });

  it('refuses an empty file, and a file with no learners', () => {
    expect(problem('')).toBe('empty');
    expect(problem('  \n ')).toBe('empty');
    expect(problem(json({ ...goodFile(), learners: [] }))).toBe('empty');
    expect(checkWorkFileSize(0)).toBe('empty');
  });

  it('refuses a file over 5 MB before and after reading it', () => {
    expect(MAX_WORK_FILE_BYTES).toBe(5 * 1024 * 1024);
    expect(checkWorkFileSize(MAX_WORK_FILE_BYTES + 1)).toBe('too-big');
    expect(checkWorkFileSize(MAX_WORK_FILE_BYTES)).toBeNull();
    expect(checkWorkFileSize(2_000)).toBeNull();
    expect(problem(' '.repeat(MAX_WORK_FILE_BYTES + 1))).toBe('too-big');
  });

  it.each<[string, (parts: Parts) => void]>([
    ['no date saved', (p) => delete p.file.savedAt],
    ['a date in another form', (p) => (p.file.savedAt = '28/09/2026')],
    ['an impossible date', (p) => (p.file.savedAt = '2026-02-31T10:00:00.000Z')],
    ['learners that are not a list', (p) => (p.file.learners = { 0: p.work })],
    ['no learner record', (p) => delete p.work.learner],
    ['a learner with no id', (p) => delete p.learner.id],
    ['a learner id with odd characters', (p) => (p.learner.id = '<script>')],
    ['a learner with no name', (p) => delete p.learner.name],
    ['a blank name', (p) => (p.learner.name = '   ')],
    ['a name with a line break', (p) => (p.learner.name = 'Amina\nOmar')],
    ['a name that is far too long', (p) => (p.learner.name = 'A'.repeat(MAX_NAME_LENGTH + 1))],
    ['an unknown colour', (p) => (p.learner.colour = 'red')],
    ['a colour made to look like a class name', (p) => (p.learner.colour = 'lemon tw-hidden')],
    ['an odd class code', (p) => (p.learner.classCode = 'HLP 07 <b>')],
    ['an unknown reading level', (p) => (p.learner.readingLevel = 'hard')],
    ['the same learner twice', (p) => p.learners.push(p.work)],
    ['progress that is not a list', (p) => (p.work.progress = 'none')],
    ['no progress list', (p) => delete p.work.progress],
    ['no section-check list', (p) => delete p.work.quizAttempts],
    ['progress for another learner', (p) => (p.lesson.learnerId = 'someone-else')],
    ['a lesson record with no writing', (p) => delete p.lesson.writing],
    ['writing that is a number', (p) => (p.writing.text = 42)],
    ['an unknown stage', (p) => (p.lesson.stagesDone = ['read', 'dance'])],
    ['an unknown current stage', (p) => (p.lesson.currentStage = 'complete')],
    ['a reflection keyed by a word', (p) => (p.lesson.reflections = { first: 'x' })],
    ['a reflection keyed __proto__', (p) => (p.lesson.reflections = JSON.parse('{"__proto__": "x"}') as Json)],
    ['a quick-check answer of an unknown kind', (p) => (p.checkAnswers[0] = { type: 'guess' })],
    ['a quick-check choice with no tries', (p) => delete p.firstCheck.tries],
    ['a self-check tick that is text', (p) => (p.writing.selfCheck = { 0: 'yes' })],
    ['a practice option that is not a whole number', (p) => (p.lesson.speak = { practisedHow: 1.5 })],
    ['no completed date (not even null)', (p) => delete p.lesson.completedAt],
    ['the same lesson twice', (p) => p.progress.push(p.lesson)],
    ['a section check for another learner', (p) => (p.quiz.learnerId = 'someone-else')],
    ['a score above the total', (p) => ((p.quiz.best as Json).score = 11)],
    ['no attempts', (p) => (p.quiz.attempts = 0)],
    ['a quiz answer keyed __proto__', (p) => (p.quiz.latest = { ...(p.quiz.latest as Json), answers: JSON.parse('{"__proto__": 1}') as Json })],
    ['the same section check twice', (p) => p.quizzes.push(p.quiz)],
  ])('refuses the whole file for %s', (_what, change) => {
    expect(problem(broken(change))).toBe('damaged');
  });

  it('refuses a huge string, and a string with control characters', () => {
    expect(problem(broken((p) => (p.writing.text = 'a'.repeat(MAX_TEXT_LENGTH + 1))))).toBe('damaged');
    expect(problem(broken((p) => (p.lesson.reflections = { 0: 'x'.repeat(1_000_000) })))).toBe('damaged');
    expect(problem(broken((p) => (p.writing.text = 'nul \u0000 here')))).toBe('damaged');
    // Line breaks and tabs in an answer are fine; so is text of exactly the longest length.
    expect(problem(broken((p) => (p.writing.text = 'Line one\nLine two\r\n\tIndented')))).toBe('ok');
    expect(problem(broken((p) => (p.writing.text = 'a'.repeat(MAX_TEXT_LENGTH))))).toBe('ok');
  });

  it('keeps text exactly as written, markup and all: it is only ever shown as text', () => {
    const result = checkWorkFile(broken((p) => (p.writing.text = '<img src=x onerror=alert(1)>')), known);
    expect(result.ok && result.file.learners[0]!.progress[0]!.writing.text).toBe('<img src=x onerror=alert(1)>');
  });

  it('leaves out lessons and section checks this version does not have, and counts them', () => {
    const file = goodFile();
    file.learners[0]!.progress.push(lesson('a-lesson-from-the-future'), lesson('finding-out-about-the-past'));
    file.learners[0]!.quizAttempts.push(quiz('geography'));
    const result = checkWorkFile(json(file), { ...known, sectionIds: new Set(['history']) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipped).toBe(2);
    expect(result.file.learners[0]!.progress.map((p) => p.lessonId)).toEqual(['towns-near-rivers', 'finding-out-about-the-past']);
    expect(result.file.learners[0]!.quizAttempts.map((q) => q.sectionId)).toEqual(['history']);
  });

  it('drops fields it does not know and repeated stages, and keeps a learner with no work', () => {
    const text = broken((p) => {
      p.file.extra = 'ignored';
      p.learner.isAdmin = true;
      p.lesson.stagesDone = ['read', 'read', 'write'];
      p.lesson.secret = 'x';
      p.learners.push({ learner: { ...AMINA, id: 'another-id', name: 'Yusuf' }, progress: [], quizAttempts: [] });
    });
    const result = checkWorkFile(text, known);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file).not.toHaveProperty('extra');
    expect(result.file.learners[0]!.learner).not.toHaveProperty('isAdmin');
    expect(result.file.learners[0]!.progress[0]).not.toHaveProperty('secret');
    expect(result.file.learners[0]!.progress[0]!.stagesDone).toEqual(['read', 'write']);
    expect(result.file.learners[1]).toEqual({ learner: { ...AMINA, id: 'another-id', name: 'Yusuf' }, progress: [], quizAttempts: [] });
  });

  it('never throws, whatever it is given', () => {
    const odd = ['{"format":"thinkerwell-work","version":1,"savedAt":"2026-09-28T07:30:00.000Z","learners":[null]}', '[[[[[[]]]]]]', '"text"', 'true', '{}', '{"format":"thinkerwell-work"}'];
    for (const text of odd) expect(() => checkWorkFile(text, known)).not.toThrow();
    expect(problem(odd[0]!)).toBe('damaged');
  });
});
