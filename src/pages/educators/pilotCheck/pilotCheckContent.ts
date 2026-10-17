/**
 * The before-and-after check's questions, writing task and confidence
 * statements (content/pilot-check/<lang>.json), in the language on screen.
 *
 * en.json is the source: it holds each question's lesson, whether that lesson
 * is taught in the pilot, its area and which option is correct. id.json and
 * ms.json hold only the words, in the same order, and are laid over it here
 * (pilotCheckContent.test.ts checks they match). Another language gets the
 * English, marked as English by the page.
 */

export type CheckArea = 'sources' | 'maps' | 'cause' | 'perspectives' | 'checking' | 'choices' | 'vocabulary';

export interface CheckQuestion {
  id: string;
  lesson: number;
  /** A lesson taught in the pilot (false: a check question from a lesson that isn't). */
  taught: boolean;
  area: CheckArea;
  stimulus: string | null;
  question: string;
  options: { text: string; correct: boolean }[];
}

export interface RubricRow {
  part: string;
  zero: string;
  one: string;
  two: string;
}

export interface PilotCheck {
  /** The language of the words: "en", "id" or "ms". */
  language: string;
  version: number;
  questions: CheckQuestion[];
  writing: { title: string; clues: string[]; prompt: string };
  confidence: string[];
  rubric: RubricRow[];
}

/** A translation: the words only, in the English file's order. */
export interface PilotCheckWords {
  language: string;
  version: number;
  questions: { id: string; stimulus: string | null; question: string; options: string[] }[];
  writing: PilotCheck['writing'];
  confidence: string[];
  rubric: RubricRow[];
}

/** The languages with their own words; any other gets the English. */
export const CHECK_LANGUAGES = ['en', 'id', 'ms'] as const;

/** Lays a translation's words over the English file. */
export function withWords(english: PilotCheck, words: PilotCheckWords | null): PilotCheck {
  if (!words) return english;
  return {
    ...english,
    language: words.language,
    questions: english.questions.map((question, index) => {
      const own = words.questions[index]!;
      return {
        ...question,
        stimulus: own.stimulus,
        question: own.question,
        options: question.options.map((option, n) => ({ ...option, text: own.options[n]! })),
      };
    }),
    writing: words.writing,
    confidence: words.confidence,
    rubric: words.rubric,
  };
}

/** Loads the check in a language (only that language's file is downloaded). */
export async function loadPilotCheck(language: string): Promise<PilotCheck> {
  const english = (await import('../../../../content/pilot-check/en.json')).default as PilotCheck;
  if (language === 'id') return withWords(english, (await import('../../../../content/pilot-check/id.json')).default);
  if (language === 'ms') return withWords(english, (await import('../../../../content/pilot-check/ms.json')).default);
  return english;
}

/** The letter printed beside each option: A, B, C. */
export const OPTION_LETTERS = ['A', 'B', 'C'] as const;

/** The correct option's letter. */
export function correctLetter(question: CheckQuestion): string {
  return OPTION_LETTERS[question.options.findIndex((option) => option.correct)]!;
}
