import { describe, expect, it } from 'vitest';
import courseJson from '../../content/course.json';
import { loadLocale } from '../i18n/load';
import { markGlossary } from '../lesson/glossary';
import { CONTENT_VERDICTS_BY_LANG } from '../pages/lesson/read/feedbackText';
import { catalogFor, englishCatalog } from './catalog';
import { contentFor, englishContent } from './index';
import { checkTranslation } from './load';
import { applyTranslation, missingTranslations, translatableStrings, translationProblems } from './translation';
import type { Lesson, QuizFile } from './schema';

const englishLessons = import.meta.glob<unknown>('../../content/lessons/*.json', { eager: true, import: 'default' });
const englishQuizzes = import.meta.glob<unknown>('../../content/quizzes/*.json', { eager: true, import: 'default' });
const indonesianLessons = import.meta.glob<unknown>('../../content/id/lessons/*.json', { eager: true, import: 'default' });
const indonesianQuizzes = import.meta.glob<unknown>('../../content/id/quizzes/*.json', { eager: true, import: 'default' });
const indonesianCourse = import.meta.glob<unknown>('../../content/id/course.json', { eager: true, import: 'default' });
const indonesianPictures = Object.keys(import.meta.glob('../../content/id/visuals/*.svg')).map((path) => path.replace(/^.*\/visuals\//, 'visuals/'));
const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const byName = (files: Record<string, unknown>) => new Map(Object.entries(files).map(([path, raw]) => [fileName(path), raw]));

describe('applyTranslation', () => {
  const english = {
    id: 'a-lesson',
    title: 'Rivers',
    read: {
      glossary: [{ word: 'flood', forms: ['floods'], definition: 'Water over land.' }],
      checks: [{ type: 'choice', options: [{ text: 'Yes', correct: true }] }],
    },
  };

  it('replaces text and keeps everything else from English', () => {
    const merged = applyTranslation(english, {
      title: 'Sungai',
      read: { glossary: [{ word: 'banjir', definition: 'Air di atas daratan.' }], checks: [{ options: [{ text: 'Ya' }] }] },
    });
    expect(merged).toEqual({
      id: 'a-lesson',
      title: 'Sungai',
      read: {
        // English forms are dropped: they would never match Indonesian text.
        glossary: [{ word: 'banjir', definition: 'Air di atas daratan.' }],
        checks: [{ type: 'choice', options: [{ text: 'Ya', correct: true }] }],
      },
    });
    expect(english.title).toBe('Rivers');
  });

  it('takes forms whole, even where English has none', () => {
    expect(applyTranslation({ word: 'goods', definition: 'Things.' }, { word: 'barang', forms: ['barang-barang'] })).toEqual({
      word: 'barang',
      forms: ['barang-barang'],
      definition: 'Things.',
    });
  });

  it('leaves the English as it is without a translation', () => {
    expect(applyTranslation(english, undefined)).toBe(english);
  });
});

describe('translationProblems and missingTranslations', () => {
  const english = { id: 'x', title: 'T', items: ['a', 'b'], checks: [{ correct: true, text: 'c' }], changes: ['n'] };

  it('accept a translation of the text only', () => {
    expect(translationProblems(english, { title: 'U', items: ['p', 'q'], checks: [{ text: 'r' }] })).toEqual([]);
  });

  it('refuse anything that would change more than the text', () => {
    expect(translationProblems(english, { id: 'y' })).toEqual(['id: is not translated (it comes from the English file)']);
    expect(translationProblems(english, { checks: [{ correct: false }] })).toEqual([
      'checks.0.correct: is not translated (it comes from the English file)',
    ]);
    expect(translationProblems(english, { changes: ['m'] })).toEqual([
      'changes: is not translated (it comes from the English file)',
    ]);
    expect(translationProblems(english, { items: ['p'] })).toEqual(['items: has 1 items, English has 2']);
    expect(translationProblems(english, { extra: 'z' })).toEqual(['extra: not in the English file']);
    expect(translationProblems(english, { title: ' ' })).toEqual(['title: empty']);
  });

  it('find text left untranslated, and never ask for the team’s notes', () => {
    expect(missingTranslations(english, { title: 'U', items: ['p'] })).toEqual(['items.1', 'checks.0.text']);
  });
});

describe('checkTranslation', () => {
  const english = { course: courseJson, lessons: englishLessons, quizzes: englishQuizzes };
  const translation = {
    course: Object.values(indonesianCourse)[0],
    lessons: indonesianLessons,
    quizzes: indonesianQuizzes,
    visuals: new Set(indonesianPictures),
  };

  it('passes the Indonesian translation, as the build does', () => {
    expect(() => checkTranslation('id', english, translation)).not.toThrow();
  });

  it('stops on a missing file, a missing picture, a changed answer or untranslated text', () => {
    const lessons = { ...indonesianLessons };
    delete lessons['../../content/id/lessons/L02.json'];
    const l01 = structuredClone(indonesianLessons['../../content/id/lessons/L01.json']) as { read: { checks: Array<{ options?: unknown[] }> }; title?: string };
    delete l01.title;
    (l01.read.checks[0]!.options![0] as Record<string, unknown>).correct = true;
    lessons['../../content/id/lessons/L01.json'] = l01;
    const visuals = new Set(indonesianPictures.filter((src) => src !== 'visuals/L03.svg'));
    const run = () => checkTranslation('id', english, { ...translation, lessons, visuals });
    expect(run).toThrow(/content\/id\/lessons\/L02\.json is missing/);
    expect(run).toThrow(/content\/id\/visuals\/L03\.svg is missing/);
    expect(run).toThrow(/L01\.json: read\.checks\.0\.options\.0\.correct: is not translated/);
    expect(run).toThrow(/L01\.json: title: not translated/);
  });
});

describe('the Indonesian lessons and section checks', async () => {
  const indonesian = await loadLocale('id');
  const translation = indonesian.content!;
  const content = contentFor(translation);
  const lessons = byName(indonesianLessons);

  it('come with the Indonesian language', () => {
    expect(Object.keys(translation.lessons).sort()).toEqual([...byName(englishLessons).keys()].sort());
    expect(Object.keys(translation.quizzes).sort()).toEqual([...byName(englishQuizzes).keys()].sort());
    expect(content.getLessons()).toHaveLength(24);
    expect(content.getCourse().course.title).toBe('Menjelajahi Dunia Kita');
  });

  it('are English when no translation is given, and built once per language', () => {
    expect(contentFor(undefined)).toBe(englishContent);
    expect(catalogFor(undefined)).toBe(englishCatalog);
    expect(contentFor(translation)).toBe(content);
    expect(catalogFor(translation)).toBe(catalogFor(translation));
  });

  it('give the course map the same titles and questions as the lessons', () => {
    const catalog = catalogFor(translation);
    for (const lesson of content.getLessons()) {
      expect(catalog.getLesson(lesson.id)).toMatchObject({ title: lesson.title, essentialQuestion: lesson.essentialQuestion });
    }
    expect(catalog.getSections().map((section) => section.title)).toEqual(content.getSections().map((section) => section.title));
  });

  it('show the Indonesian pictures, and keep the English ones for English', () => {
    const lesson = content.getLesson('finding-out-about-the-past')!;
    expect(content.getVisualUrl(lesson.visual!.src)).toBe(translation.visuals['visuals/L01.svg']);
    expect(englishContent.getVisualUrl(lesson.visual!.src)).not.toBe(content.getVisualUrl(lesson.visual!.src));
  });

  for (const [name, english] of byName(englishLessons)) {
    it(`${name}: translates every learner-facing string and nothing else`, () => {
      expect(translationProblems(english, lessons.get(name))).toEqual([]);
      expect(missingTranslations(english, lessons.get(name))).toEqual([]);
    });
  }

  /** Everything in a file that isn't translated text: it must match English exactly. */
  function fixedParts(file: unknown): Record<string, unknown> {
    const translatable = new Set(translatableStrings(file).map(({ path }) => path.join('.')));
    const out: Record<string, unknown> = {};
    const walk = (node: unknown, path: string) => {
      if (translatable.has(path)) return;
      if (Array.isArray(node)) node.forEach((item, i) => walk(item, path ? `${path}.${i}` : String(i)));
      else if (node !== null && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) if (key !== 'forms') walk(value, path ? `${path}.${key}` : key);
      } else out[path] = node;
    };
    walk(file, '');
    return out;
  }

  const verdicts = CONTENT_VERDICTS_BY_LANG.id!;

  for (const lesson of content.getLessons()) {
    const english = englishContent.getLesson(lesson.id)!;

    it(`Lesson ${lesson.number}: keeps the ids, correct answers, videos and teachers' notes of the English`, () => {
      expect(fixedParts(lesson)).toEqual(fixedParts(english));
      // The teachers' notes and the sources' titles are translated too; their links aren't.
      expect(lesson.educatorNotes).toHaveLength(english.educatorNotes.length);
      expect(lesson.sources.map((source) => source.url)).toEqual(english.sources.map((source) => source.url));
      expect(lesson.watch.youtubeId).toBe(english.watch.youtubeId);
    });

    it(`Lesson ${lesson.number}: marks every key word in the standard and the simpler text of one part`, () => {
      lesson.read.glossary.forEach((entry, index) => {
        const inOnePart = lesson.read.sections.some((part) =>
          [part.text, part.simpler].every((text) =>
            markGlossary(text, lesson.read.glossary, 'id').some((segment) => segment.kind === 'term' && segment.entryIndex === index),
          ),
        );
        expect(inOnePart, `"${entry.word}" (key word ${index + 1})`).toBe(true);
      });
    });

    it(`Lesson ${lesson.number}: keeps the simpler text clearly shorter than the standard text`, () => {
      const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
      const standard = lesson.read.sections.reduce((n, part) => n + words(part.text), 0);
      const simpler = lesson.read.sections.reduce((n, part) => n + words(part.simpler), 0);
      expect(simpler).toBeLessThanOrEqual(0.85 * standard);
    });

    it(`Lesson ${lesson.number}: quick-check feedback starts with its verdict, and the options differ`, () => {
      for (const check of lesson.read.checks) {
        if (check.type !== 'choice') continue;
        for (const option of check.options) {
          expect(option.feedback.startsWith(option.correct ? verdicts.correct : verdicts.retry), option.feedback).toBe(true);
        }
        expect(new Set(check.options.map((o) => o.text.trim().toLowerCase())).size).toBe(check.options.length);
      }
    });
  }

  for (const quiz of content.getQuizzes() as QuizFile[]) {
    const english = englishContent.getQuiz(quiz.section)!;

    it(`the ${quiz.section} section check: keeps the English answers and lessons, with Indonesian feedback`, () => {
      expect(fixedParts(quiz)).toEqual(fixedParts(english));
      expect(quiz.title).not.toBe(english.title);
      for (const question of quiz.questions) {
        for (const option of question.options) {
          expect(option.feedback.startsWith(option.correct ? verdicts.correct : verdicts.retry), option.feedback).toBe(true);
        }
      }
    });
  }

  it('says every completion message in the words the complete screen expects', () => {
    const heading = (indonesian.messages.lessonPlayer as { complete: { title: string } }).complete.title;
    for (const lesson of content.getLessons() as Lesson[]) {
      expect(lesson.reflect.completionMessage.startsWith(heading.replace('{number}', String(lesson.number)))).toBe(true);
    }
  });
});
