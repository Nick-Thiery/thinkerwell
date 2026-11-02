// What Listen reads, as the app splits it: every reading section of every
// Our World lesson, in each lessons' language (English, and each language
// whose lessons are translated, ready or still a hidden preview such as
// Vietnamese) and both reading levels, plus the
// Settings sample sentence (listenUtterances); and, kept apart, each preview
// course (Digital World and Southeast Asia Through Time, in content/courses/,
// src/content/courses.ts) in English and each ready language it is translated
// into (courseUtterances, November 2026), recorded into public/audio/<lang>/<course>/
// with timings of their own, so a device without the preview downloads
// nothing of them and Our World's recordings never change. Used by `npm run audio:generate` (to record it) and
// `npm run check:audio` (to find recordings that no longer match).
//
// Nothing here splits text itself: the lessons are read and checked the way
// the build reads them (src/content/load.ts, so zod trims them the same way),
// translations are laid over the English the way the app does
// (src/content/translation.ts), and the pieces are the Read stage's own
// (src/speech/sentences.ts). docs/notes/recorded-audio.md.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { textHash, piecesHash } from '../../src/audio/textHash.ts';
import { parseContentFile } from '../../src/content/load.ts';
import type { Lesson } from '../../src/content/schema.ts';
import { applyTranslation } from '../../src/content/translation.ts';
import { COURSES, DEFAULT_COURSE_ID, type CourseDefinition } from '../../src/content/courses.ts';
import { LOCALES } from '../../src/i18n/locales.ts';
import { LISTEN_SAMPLES } from '../../src/speech/sampleText.ts';
import { listenPieces, sentenceRanges, visibleSectionText } from '../../src/speech/sentences.ts';
import { NORMALISER_VERSION, speechInput } from './normalise.ts';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');

/** Courses with no recordings, on purpose (none since November 2026: every course is recorded). */
export const SKIPPED_COURSES: readonly string[] = [];

/** The preview courses, whose recordings are kept apart from Our World's (courseUtterances). */
export const RECORDED_COURSES: readonly CourseDefinition[] = COURSES.filter((course) => course.id !== DEFAULT_COURSE_ID);

/** What follows a piece in the recording: a heading's silence, a paragraph's, a sentence's, or the end. */
export type PieceGap = 'heading' | 'paragraph' | 'sentence' | 'end';

export interface Piece {
  /** What Listen says (and highlights): exactly the text on screen. Empty for a heading the first sentence repeats. */
  text: string;
  /** textHash(text). */
  hash: string;
  /** What the voice is given to say (./normalise.ts): the same words, with numbers and letters written out where needed. */
  speak: string;
  after: PieceGap;
}

export interface SectionUtterances {
  /** "<lesson id>/<standard|simpler>/<part>", or "sample" for Settings' sample sentence. */
  key: string;
  /** For people reading the manifest: "L10 part 2, simpler", "DW03 part 1, standard". */
  label: string;
  /** piecesHash of the pieces' texts: what the app compares before playing a recording. */
  hash: string;
  pieces: Piece[];
}

export interface LanguageUtterances {
  /** The recordings' language: "en", or a translated lessons' language ("id", "vi"). */
  lang: string;
  /**
   * True when learners can choose the language (src/i18n/locales.ts). A language that is
   * not ready (a hidden preview such as Vietnamese) is recorded only when asked for, and
   * `npm run check:audio` checks it only once it has recordings (./check.ts).
   */
  ready?: boolean;
  /** ./normalise.ts's NORMALISER_VERSION, for the record. */
  normaliser: number;
  sections: SectionUtterances[];
}

const LEVELS = ['standard', 'simpler'] as const;

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** A course's English lessons, parsed as the build parses them, by file name ("L01.json", "DW03.json"). */
function englishLessons(root: string, course: CourseDefinition = COURSES[0]!): Map<string, Lesson> {
  const folder = course.dir ? `content/${course.dir}/lessons` : 'content/lessons';
  const dir = path.join(root, folder);
  return new Map(
    readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => [name, parseContentFile('lesson', readJson(path.join(dir, name)), `${folder}/${name}`, course.id) as Lesson]),
  );
}

/** "DW" for Digital World's lessons ("dw-"), "SAT" for Southeast Asia Through Time's, "L" for Our World's. */
function labelPrefix(course: CourseDefinition): string {
  return course.lessonIdPrefix ? course.lessonIdPrefix.replace(/-$/, '').toUpperCase() : 'L';
}

/**
 * A preview course's recorded languages: English, and each ready language
 * its lessons are translated into (content/courses/<id>/<code>/lessons).
 */
function courseLanguages(course: CourseDefinition, root: string): string[] {
  return [
    'en',
    ...LOCALES.filter((locale) => locale.code !== 'en' && !locale.pseudo && locale.ready && existsSync(path.join(root, 'content', course.dir, locale.code, 'lessons'))).map(
      (locale) => locale.code,
    ),
  ];
}

/** True when a language's lessons are translated: it is marked `content`, or has a content/<code>/lessons folder. */
function hasTranslatedLessons(code: string, root: string): boolean {
  return existsSync(path.join(root, 'content', code, 'lessons'));
}

/**
 * The languages Listen can have recordings in: English, and every language whose
 * lessons are translated, ready or not (Vietnamese is a hidden preview until a
 * native speaker has reviewed it). Whether one is recorded and checked is decided
 * by `ready` and by whether it has recordings (scripts/audio/generate.py, ./check.ts).
 */
export function recordedLanguages(root = ROOT): string[] {
  return [
    'en',
    ...LOCALES.filter((locale) => locale.code !== 'en' && !locale.pseudo && (locale.content || hasTranslatedLessons(locale.code, root))).map(
      (locale) => locale.code,
    ),
  ];
}

/** One language's lessons, as the app shows them: English, or the translation laid over it. */
function lessonsIn(lang: string, english: Map<string, Lesson>, root: string, course: CourseDefinition = COURSES[0]!): Lesson[] {
  if (lang === 'en') return [...english.values()];
  const dir = path.join(root, 'content', course.dir, lang, 'lessons');
  return [...english.entries()].map(([name, lesson]) => {
    let translation: unknown;
    try {
      translation = readJson(path.join(dir, name));
    } catch {
      translation = undefined;
    }
    return applyTranslation(lesson, translation);
  });
}

function sectionOf(lang: string, key: string, label: string, texts: readonly string[], gaps: readonly PieceGap[]): SectionUtterances {
  return {
    key,
    label,
    hash: piecesHash(texts),
    pieces: texts.map((text, i) => ({ text, hash: textHash(text), speak: text ? speechInput(text, lang) : '', after: gaps[i]! })),
  };
}

/** Every reading section of a course's lessons in one language, both levels. */
function lessonSections(lang: string, lessons: readonly Lesson[], course: CourseDefinition): SectionUtterances[] {
  const sections: SectionUtterances[] = [];
  const prefix = labelPrefix(course);
  for (const lesson of lessons) {
    lesson.read.sections.forEach((section, index) => {
      for (const level of LEVELS) {
        const text = visibleSectionText(section, level);
        const ranges = sentenceRanges(text);
        const items = listenPieces(section.heading, text, ranges);
        const texts = items.map((item) => (typeof item === 'string' ? item : item.text));
        // Piece 0 is the heading; piece n + 1 is sentence n.
        const gaps: PieceGap[] = texts.map((_, i) => {
          if (i === 0) return 'heading';
          const next = ranges[i];
          if (!next) return 'end';
          return /\n\s*\n/.test(text.slice(ranges[i - 1]!.end, next.start)) ? 'paragraph' : 'sentence';
        });
        const part = index + 1;
        const number = String(lesson.number).padStart(2, '0');
        sections.push(sectionOf(lang, `${lesson.id}/${level}/${part}`, `${prefix}${number} part ${part}, ${level}`, texts, gaps));
      }
    });
  }
  return sections;
}

/** Everything Listen reads in Our World, by language, with the Settings sample. */
export function listenUtterances(root = ROOT): LanguageUtterances[] {
  const ourWorld = COURSES[0]!;
  const english = englishLessons(root, ourWorld);
  return recordedLanguages(root).map((lang) => {
    const sections = lessonSections(lang, lessonsIn(lang, english, root, ourWorld), ourWorld);
    const sample = LISTEN_SAMPLES[lang];
    if (sample) sections.push(sectionOf(lang, 'sample', 'Settings sample', [sample], ['end']));
    const ready = LOCALES.find((locale) => locale.code === lang)?.ready ?? false;
    return { lang, ready, normaliser: NORMALISER_VERSION, sections };
  });
}

/** One preview course's sections in one language: recorded into public/audio/<lang>/<course>/. */
export interface CourseUtterances extends LanguageUtterances {
  /** Its id in src/content/courses.ts. */
  course: string;
}

/** Everything Listen reads in the preview courses, by course and language (English, and each ready language it is translated into). */
export function courseUtterances(root = ROOT): CourseUtterances[] {
  return RECORDED_COURSES.flatMap((course) => {
    const english = englishLessons(root, course);
    return courseLanguages(course, root).map((lang) => ({
      course: course.id,
      lang,
      ready: true,
      normaliser: NORMALISER_VERSION,
      sections: lessonSections(lang, lessonsIn(lang, english, root, course), course),
    }));
  });
}
