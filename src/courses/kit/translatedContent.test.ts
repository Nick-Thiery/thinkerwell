import { describe, expect, it } from 'vitest';
import { STAGES_WITHOUT_WATCH } from '../../content/stages';
import { digitalWorld, digitalWorldIn } from '../digital-world/content';
import { artArchitecture, artArchitectureIn } from '../art-architecture-society/content';
import { southeastAsia, southeastAsiaIn } from '../southeast-asia-through-time/content';

// The preview courses in Indonesian and Malay (content/courses/<id>/<code>/,
// AI drafts flagged for native-speaker review): laid over the English as Our
// World's translations are, with no Watch step (no approved video in either
// language), and English in every other language.

describe.each([
  ['Digital World', digitalWorld, digitalWorldIn],
  ['Southeast Asia Through Time', southeastAsia, southeastAsiaIn],
  ['Art, Architecture and Society', artArchitecture, artArchitectureIn],
] as const)('%s in other languages', (_name, english, inLanguage) => {
  it.each(['id', 'ms'])('is translated into %s, lesson by lesson, with the same ids, numbers and sections', (code) => {
    const translated = inLanguage(code);
    expect(translated).toBeDefined();
    if (!translated) return;
    expect(translated.getCourse().course.title).not.toBe(english.getCourse().course.title);
    const lessons = translated.getLessons();
    expect(lessons.map((l) => [l.id, l.number, l.section])).toEqual(english.getLessons().map((l) => [l.id, l.number, l.section]));
    for (const lesson of lessons) {
      const original = english.getLesson(lesson.id);
      expect(lesson.title, lesson.id).not.toBe(original?.title);
      expect(lesson.read.sections.length, lesson.id).toBe(original?.read.sections.length);
    }
  });

  it.each(['id', 'ms'])('has no Watch step in %s, as Our World without an approved video', (code) => {
    const translated = inLanguage(code);
    for (const lesson of translated?.getLessons() ?? []) expect(translated?.stagesFor(lesson)).toEqual(STAGES_WITHOUT_WATCH);
  });

  it.each(['en', 'vi', 'en-XA'])('is English in %s', (code) => {
    expect(inLanguage(code)).toBeUndefined();
  });
});

describe('Southeast Asia Through Time in Indonesian and Malay', () => {
  it.each(['id', 'ms'])('has its section checks in %s, with the same answers', (code) => {
    const translated = southeastAsiaIn(code);
    for (const section of southeastAsia.getSections()) {
      const quiz = translated?.getQuiz?.(section.id);
      const original = southeastAsia.getQuiz?.(section.id);
      expect(quiz, section.id).toBeDefined();
      expect(quiz?.title).not.toBe(original?.title);
      expect(quiz?.questions.map((q) => q.options.map((o) => o.correct))).toEqual(original?.questions.map((q) => q.options.map((o) => o.correct)));
    }
  });

  it.each(['id', 'ms'])('uses its own diagrams in %s and the English photos', (code) => {
    const translated = southeastAsiaIn(code);
    const lesson = translated?.getLessonByNumber(1);
    const diagram = lesson?.visual?.src ?? '';
    expect(translated?.getVisualUrl(diagram)).not.toBe(southeastAsia.getVisualUrl(diagram));
    const photo = lesson?.secondVisual?.src ?? '';
    expect(photo).toMatch(/\.jpg$/);
    expect(translated?.getVisualUrl(photo)).toBe(southeastAsia.getVisualUrl(photo));
  });
});

describe('Art, Architecture and Society in Indonesian and Malay', () => {
  it.each(['id', 'ms'])('keeps its real images and their credits as they are in %s', (code) => {
    const translated = artArchitectureIn(code);
    for (const lesson of artArchitecture.getLessons()) {
      const other = translated?.getLesson(lesson.id);
      for (const key of ['visual', 'secondVisual'] as const) {
        const picture = lesson[key];
        expect(other?.[key]?.src, lesson.id).toBe(picture.src);
        expect(translated?.getVisualUrl(other![key]!.src), lesson.id).toBe(artArchitecture.getVisualUrl(picture.src));
        expect((other?.[key] as { credit?: unknown }).credit, lesson.id).toEqual((picture as { credit?: unknown }).credit);
      }
      expect(other?.read.checks, lesson.id).toEqual([]);
    }
  });
});
