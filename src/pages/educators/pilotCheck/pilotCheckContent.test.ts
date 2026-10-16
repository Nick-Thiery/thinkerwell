import { describe, expect, it } from 'vitest';
import en from '../../../../content/pilot-check/en.json';
import id from '../../../../content/pilot-check/id.json';
import ms from '../../../../content/pilot-check/ms.json';
import { getLessons } from '../../../content';
import { correctLetter, loadPilotCheck, withWords, type PilotCheck } from './pilotCheckContent';

// The before-and-after check's content (content/pilot-check/): what
// docs/research/MEASUREMENT_PLAN.md asks of it, and translations that match the English.

/** The lessons the pilot teaches (docs/notes/pilot-check.md; agreed with the partner). */
const PILOT_LESSONS = [1, 2, 11, 12, 16, 23];

const english = en as PilotCheck;

describe('the before-and-after check', () => {
  it('has 16 questions: 2 from each pilot lesson and 4 from lessons the pilot does not teach', () => {
    expect(english.questions).toHaveLength(16);
    const taught = english.questions.filter((question) => question.taught);
    const untaught = english.questions.filter((question) => !question.taught);
    expect(taught).toHaveLength(12);
    for (const lesson of PILOT_LESSONS) expect(taught.filter((question) => question.lesson === lesson)).toHaveLength(2);
    expect(untaught).toHaveLength(4);
    for (const question of untaught) expect(PILOT_LESSONS).not.toContain(question.lesson);
    // Lessons 4 and 19 are sensitive: never in a test.
    for (const question of english.questions) expect([4, 19]).not.toContain(question.lesson);
    const numbers = new Set(getLessons().map((lesson) => lesson.number));
    for (const question of english.questions) expect(numbers.has(question.lesson)).toBe(true);
  });

  it('gives every question three options and one right answer, spread across A, B and C', () => {
    const ids = new Set<string>();
    for (const question of english.questions) {
      expect(ids.has(question.id)).toBe(false);
      ids.add(question.id);
      expect(question.options).toHaveLength(3);
      expect(question.options.filter((option) => option.correct)).toHaveLength(1);
    }
    const letters = english.questions.map(correctLetter);
    for (const letter of ['A', 'B', 'C']) expect(letters.filter((l) => l === letter).length).toBeGreaterThanOrEqual(5);
  });

  it('has the writing task with two clues, 5 confidence statements and a 3-part rubric', () => {
    expect(english.writing.clues).toHaveLength(2);
    expect(english.confidence).toHaveLength(5);
    expect(english.rubric).toHaveLength(3);
  });

  for (const [name, words] of [
    ['Indonesian', id],
    ['Malay', ms],
  ] as const) {
    it(`has ${name} words for every part, in the English order`, () => {
      const translation = words;
      expect(translation.version).toBe(english.version);
      expect(translation.questions.map((question) => question.id)).toEqual(english.questions.map((question) => question.id));
      translation.questions.forEach((question, index) => {
        const source = english.questions[index]!;
        expect(question.options).toHaveLength(source.options.length);
        expect(question.stimulus === null).toBe(source.stimulus === null);
        for (const text of [question.question, ...question.options]) expect(text.trim()).not.toBe('');
      });
      expect(translation.writing.clues).toHaveLength(english.writing.clues.length);
      expect(translation.confidence).toHaveLength(english.confidence.length);
      expect(translation.rubric).toHaveLength(english.rubric.length);
    });
  }

  it('lays a translation over the English, keeping which answer is right', async () => {
    const indonesian = withWords(english, id);
    expect(indonesian.language).toBe('id');
    expect(indonesian.questions.map(correctLetter)).toEqual(english.questions.map(correctLetter));
    expect(indonesian.questions[5]!.options.find((option) => option.correct)!.text).toBe('Legenda');
    expect((await loadPilotCheck('ms')).questions[5]!.options[2]!.text).toBe('Petunjuk');
    // A language without its own words gets the English.
    expect((await loadPilotCheck('vi')).language).toBe('en');
  });
});
