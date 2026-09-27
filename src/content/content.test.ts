import courseJson from '../../content/course.json';
import {
  ContentError,
  courseFileSchema,
  getCourse,
  getLesson,
  getLessonByNumber,
  getLessonByOldId,
  getLessons,
  getLessonSection,
  getNextLesson,
  getPreviousLesson,
  getQuiz,
  getQuizzes,
  getSection,
  getSectionLessons,
  getSections,
  isLastLessonInSection,
  lessonSchema,
  loadContent,
  loadQuizzes,
  quizFileSchema,
  visualSchema,
} from './index';

const lessonFiles = import.meta.glob<unknown>('../../content/lessons/*.json', { eager: true, import: 'default' });
const quizFiles = import.meta.glob<unknown>('../../content/quizzes/*.json', { eager: true, import: 'default' });
const visualFiles = import.meta.glob('../../content/visuals/*.svg', { eager: true });
const validVisualSrcs = new Set(Object.keys(visualFiles).map((path) => path.replace(/^.*\/content\/visuals\//, 'visuals/')));

describe('content files match the schema', () => {
  it('finds all 24 lesson files', () => {
    expect(Object.keys(lessonFiles)).toHaveLength(24);
  });

  it('parses content/course.json', () => {
    const result = courseFileSchema.safeParse(courseJson);
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });

  it.each(Object.entries(lessonFiles).map(([path, data]) => [path.replace(/^.*\//, ''), data] as const))(
    'parses %s',
    (_file, data) => {
      const result = lessonSchema.safeParse(data);
      // Show every issue (path and message) when a file fails.
      expect(result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)).toEqual([]);
    },
  );

  it('loads the whole course with cross-file checks', () => {
    expect(() => loadContent(courseJson, lessonFiles)).not.toThrow();
  });

  it('loads the whole course including the visual.src check', () => {
    expect(() => loadContent(courseJson, lessonFiles, validVisualSrcs)).not.toThrow();
  });

  it.each(getLessons().map((l) => [l.id, l.visual] as const))('lesson %s points to a picture that exists', (_id, visual) => {
    if (visual) expect(validVisualSrcs.has(visual.src)).toBe(true);
  });
});

describe('quiz files match the schema', () => {
  it('finds all 4 quiz files', () => {
    expect(Object.keys(quizFiles)).toHaveLength(4);
  });

  it.each(Object.entries(quizFiles).map(([path, data]) => [path.replace(/^.*\//, ''), data] as const))(
    'parses %s',
    (_file, data) => {
      const result = quizFileSchema.safeParse(data);
      expect(result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)).toEqual([]);
    },
  );

  it('loads every quiz with cross-file checks against the lessons', () => {
    expect(() => loadQuizzes(quizFiles, getLessons())).not.toThrow();
  });
});

describe('loadQuizzes reports problems', () => {
  const clone = <T>(value: T): T => structuredClone(value);
  const [firstPath, firstQuiz] = Object.entries(quizFiles).find(([path]) => path.endsWith('history.json')) as [
    string,
    { questions: Array<{ id: string; lesson: number }> },
  ];

  it('rejects a question about a lesson from another section', () => {
    const quiz = clone(firstQuiz);
    quiz.questions[0]!.lesson = 24; // civics, not this quiz's section
    expect(() => loadQuizzes({ ...quizFiles, [firstPath]: quiz }, getLessons())).toThrow(/is in "civics"/);
  });

  it('rejects a question about a lesson that does not exist', () => {
    const quiz = clone(firstQuiz);
    quiz.questions[0]!.lesson = 999;
    expect(() => loadQuizzes({ ...quizFiles, [firstPath]: quiz }, getLessons())).toThrow(/no such lesson/);
  });

  it('rejects two questions with the same id in one file', () => {
    const quiz = clone(firstQuiz);
    quiz.questions[1]!.id = quiz.questions[0]!.id;
    expect(() => loadQuizzes({ ...quizFiles, [firstPath]: quiz }, getLessons())).toThrow(/two questions have id/);
  });
});

describe('loadContent reports problems', () => {
  const clone = <T>(value: T): T => structuredClone(value);
  const [firstPath, firstLesson] = Object.entries(lessonFiles)[0] as [string, Record<string, unknown>];

  it('rejects an unknown field', () => {
    const bad = { ...lessonFiles, [firstPath]: { ...clone(firstLesson), surprise: true } };
    expect(() => loadContent(courseJson, bad)).toThrow(ContentError);
  });

  it('rejects a choice check with two correct options', () => {
    const lesson = clone(firstLesson) as { read: { checks: Array<{ type: string; options?: Array<{ correct: boolean }> }> } };
    const choice = lesson.read.checks.find((c) => c.type === 'choice');
    choice?.options?.forEach((o) => (o.correct = true));
    expect(() => loadContent(courseJson, { ...lessonFiles, [firstPath]: lesson })).toThrow(/exactly one correct/);
  });

  it('rejects a lesson missing from course.json', () => {
    const course = clone(courseJson);
    course.sections[0]!.lessons = course.sections[0]!.lessons.slice(1);
    expect(() => loadContent(course, lessonFiles)).toThrow(/not listed in any section/);
  });

  it('rejects duplicate ids', () => {
    const entries = Object.entries(lessonFiles);
    const [, second] = entries[1] as [string, Record<string, unknown>];
    const dup = { ...clone(second), id: firstLesson.id };
    expect(() => loadContent(courseJson, { ...lessonFiles, [entries[1]![0]]: dup })).toThrow(/Two lessons have id/);
  });

  it('rejects a visual.src that has no matching file', () => {
    const lesson = clone(firstLesson) as { visual: { src: string } | null };
    if (lesson.visual) lesson.visual.src = 'visuals/does-not-exist.svg';
    expect(() => loadContent(courseJson, { ...lessonFiles, [firstPath]: lesson }, validVisualSrcs)).toThrow(/no such file exists/);
  });
});

describe('getters', () => {
  it('returns the course and four sections in order', () => {
    expect(getCourse().course.title).toBe('Exploring Our World');
    expect(getSections().map((s) => s.id)).toEqual(['history', 'geography', 'culture', 'civics']);
    expect(getSection('geography')?.number).toBe(2);
    expect(getSection('nope')).toBeUndefined();
  });

  it('returns lessons in course order', () => {
    const lessons = getLessons();
    expect(lessons).toHaveLength(24);
    expect(lessons.map((l) => l.number)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(getSectionLessons('geography').map((l) => l.number)).toEqual([10, 11, 12, 13, 14]);
    expect(getSectionLessons('nope')).toEqual([]);
  });

  it('finds lessons by id, old id and number', () => {
    expect(getLesson('towns-near-rivers')?.number).toBe(10);
    expect(getLesson('l6')).toBeUndefined();
    expect(getLessonByOldId('l6')?.id).toBe('towns-near-rivers');
    expect(getLessonByOldId('history-scale')?.number).toBe(3);
    expect(getLessonByOldId('towns-near-rivers')).toBeUndefined();
    expect(getLessonByNumber(24)?.id).toBe('young-people-contribute');
  });

  it('works out the next and previous lesson from the order', () => {
    expect(getNextLesson('finding-out-about-the-past')?.number).toBe(2);
    expect(getNextLesson('inventions-and-daily-life')?.number).toBe(10); // crosses into Geography
    expect(getNextLesson('young-people-contribute')).toBeUndefined(); // after the last lesson
    expect(getNextLesson('no-such-lesson')).toBeUndefined();
    expect(getPreviousLesson('finding-out-about-the-past')).toBeUndefined();
    expect(getPreviousLesson('towns-near-rivers')?.number).toBe(9);
  });

  it('knows each lesson section and the last lesson in a section', () => {
    const l10 = getLesson('towns-near-rivers')!;
    expect(getLessonSection(l10).id).toBe('geography');
    expect(isLastLessonInSection(l10)).toBe(false);
    expect(isLastLessonInSection(getLessonByNumber(14)!)).toBe(true);
  });

  it('keeps ids and old ids apart so redirects are never ambiguous', () => {
    const ids = new Set(getLessons().map((l) => l.id));
    for (const lesson of getLessons()) expect(ids.has(lesson.oldId)).toBe(false);
  });

  it('returns the four section checks', () => {
    expect(getQuizzes()).toHaveLength(4);
    expect(getQuiz('history')?.title).toContain('History');
    expect(getQuiz('geography')?.questions).toHaveLength(10);
    expect(getQuiz('nope')).toBeUndefined();
  });
});

describe('visual.src', () => {
  const base = { type: 'map', description: 'A map.', alt: 'A map of Riverlands.' } as const;

  it('accepts a picture in content/visuals/ and requires one', () => {
    expect(visualSchema.safeParse({ ...base, src: 'visuals/L10.svg' }).success).toBe(true);
    expect(visualSchema.safeParse(base).success).toBe(false);
  });

  it('rejects anything that would load from another server or leave the folder', () => {
    for (const src of [
      'https://example.com/L10.svg',
      '//example.com/L10.svg',
      'data:image/svg+xml,<svg/>',
      'visuals/../../L10.svg',
      'visuals/L10.png',
      '/images/visuals/L10.svg',
    ]) {
      expect(visualSchema.safeParse({ ...base, src }).success, src).toBe(false);
    }
  });
});
