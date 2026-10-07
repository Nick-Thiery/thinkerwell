// What Listen reads, as the app splits it: every reading section of every
// lesson, in each lessons' language (English, and each ready language whose
// lessons are translated) and both reading levels, plus the Settings sample
// sentence. Used by `npm run audio:generate` (to record it) and
// `npm run check:audio` (to find recordings that no longer match).
//
// Nothing here splits text itself: the lessons are read and checked the way
// the build reads them (src/content/load.ts, so zod trims them the same way),
// translations are laid over the English the way the app does
// (src/content/translation.ts), and the pieces are the Read stage's own
// (src/speech/sentences.ts). docs/notes/recorded-audio.md.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { textHash, piecesHash } from '../../src/audio/textHash.ts';
import { parseContentFile } from '../../src/content/load.ts';
import type { Lesson } from '../../src/content/schema.ts';
import { applyTranslation } from '../../src/content/translation.ts';
import { LOCALES } from '../../src/i18n/locales.ts';
import { LISTEN_SAMPLES } from '../../src/speech/sampleText.ts';
import { listenPieces, sentenceRanges, visibleSectionText } from '../../src/speech/sentences.ts';
import { NORMALISER_VERSION, speechInput } from './normalise.ts';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');

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
  /** For people reading the manifest: "L10 part 2, simpler". */
  label: string;
  /** piecesHash of the pieces' texts: what the app compares before playing a recording. */
  hash: string;
  pieces: Piece[];
}

export interface LanguageUtterances {
  /** The recordings' language: "en", or a translated lessons' language ("id"). */
  lang: string;
  /** ./normalise.ts's NORMALISER_VERSION, for the record. */
  normaliser: number;
  sections: SectionUtterances[];
}

const LEVELS = ['standard', 'simpler'] as const;

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** The English lessons, parsed as the build parses them, by file name ("L01.json"). */
function englishLessons(root: string): Map<string, Lesson> {
  const dir = path.join(root, 'content', 'lessons');
  return new Map(
    readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => [name, parseContentFile('lesson', readJson(path.join(dir, name)), `content/lessons/${name}`) as Lesson]),
  );
}

/** The languages that get recordings: English, and every ready language whose lessons are translated. */
export function recordedLanguages(): string[] {
  return ['en', ...LOCALES.filter((locale) => locale.ready && locale.content).map((locale) => locale.code)];
}

/** One language's lessons, as the app shows them: English, or the translation laid over it. */
function lessonsIn(lang: string, english: Map<string, Lesson>, root: string): Lesson[] {
  if (lang === 'en') return [...english.values()];
  const dir = path.join(root, 'content', lang, 'lessons');
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

/** Everything Listen reads, by language. */
export function listenUtterances(root = ROOT): LanguageUtterances[] {
  const english = englishLessons(root);
  return recordedLanguages().map((lang) => {
    const sections: SectionUtterances[] = [];
    for (const lesson of lessonsIn(lang, english, root)) {
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
          sections.push(sectionOf(lang, `${lesson.id}/${level}/${part}`, `L${number} part ${part}, ${level}`, texts, gaps));
        }
      });
    }
    const sample = LISTEN_SAMPLES[lang];
    if (sample) sections.push(sectionOf(lang, 'sample', 'Settings sample', [sample], ['end']));
    return { lang, normaliser: NORMALISER_VERSION, sections };
  });
}
