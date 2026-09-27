import { describe, expect, it } from 'vitest';
import type { QuizFile } from '../content';
import { missedQuestions, resultTier, scoreQuiz, skillBreakdown, type QuizAnswers } from './scoring';

function question(id: string, skill: QuizFile['questions'][number]['skill'], lesson = 1): QuizFile['questions'][number] {
  return {
    id,
    lesson,
    skill,
    stimulus: null,
    question: `Question ${id}?`,
    options: [
      { text: 'Right', correct: true, feedback: 'Yes. Right.' },
      { text: 'Wrong one', correct: false, feedback: 'Not quite. Look back at Lesson 1.' },
      { text: 'Wrong two', correct: false, feedback: 'Not quite. Look back at Lesson 1.' },
    ],
  };
}

function quizWith(questions: QuizFile['questions']): QuizFile {
  return {
    section: 'history',
    title: 'Section check: History',
    intro: 'Some questions.',
    questions,
    results: { high: 'High', middle: 'Middle', low: 'Low' },
  };
}

describe('scoreQuiz', () => {
  it('counts only correct saved answers', () => {
    const quiz = quizWith([question('a', 'vocabulary'), question('b', 'understand'), question('c', 'evidence')]);
    const answers: QuizAnswers = {
      a: { selected: 0, correct: true },
      b: { selected: 1, correct: false },
      // c not answered yet
    };
    expect(scoreQuiz(quiz, answers)).toEqual({ score: 1, total: 3 });
  });

  it('is 0 of N with no answers at all', () => {
    const quiz = quizWith([question('a', 'vocabulary')]);
    expect(scoreQuiz(quiz, {})).toEqual({ score: 0, total: 1 });
  });
});

describe('resultTier', () => {
  it('is high at exactly 8 of 10', () => {
    expect(resultTier(8, 10)).toBe('high');
    expect(resultTier(7, 10)).not.toBe('high');
  });

  it('is high at exactly 10 of 12', () => {
    expect(resultTier(10, 12)).toBe('high');
    expect(resultTier(9, 12)).not.toBe('high');
  });

  it('is low under half', () => {
    expect(resultTier(4, 10)).toBe('low');
    expect(resultTier(5, 10)).not.toBe('low');
  });

  it('is middle otherwise', () => {
    expect(resultTier(6, 10)).toBe('middle');
    expect(resultTier(7, 10)).toBe('middle');
  });

  it('never claims a tier for a quiz with no questions', () => {
    expect(resultTier(0, 0)).toBe('middle');
  });
});

describe('skillBreakdown', () => {
  it('groups by skill, in the fixed skill order, only for skills present', () => {
    const quiz = quizWith([
      question('a', 'apply'),
      question('b', 'vocabulary'),
      question('c', 'apply'),
      question('d', 'understand'),
    ]);
    const answers: QuizAnswers = {
      a: { selected: 0, correct: true },
      b: { selected: 0, correct: true },
      c: { selected: 1, correct: false },
      d: { selected: 0, correct: true },
    };
    expect(skillBreakdown(quiz, answers)).toEqual([
      { skill: 'vocabulary', got: 1, of: 1 },
      { skill: 'understand', got: 1, of: 1 },
      { skill: 'apply', got: 1, of: 2 },
    ]);
  });
});

describe('missedQuestions', () => {
  it('lists unanswered and wrongly-answered questions, in quiz order', () => {
    const q1 = question('a', 'vocabulary', 1);
    const q2 = question('b', 'understand', 2);
    const q3 = question('c', 'evidence', 3);
    const quiz = quizWith([q1, q2, q3]);
    const answers: QuizAnswers = { a: { selected: 0, correct: true }, b: { selected: 1, correct: false } };
    // c was never answered, so it counts as missed too.
    expect(missedQuestions(quiz, answers)).toEqual([q2, q3]);
  });

  it('is empty once every question is right', () => {
    const q1 = question('a', 'vocabulary');
    const quiz = quizWith([q1]);
    expect(missedQuestions(quiz, { a: { selected: 0, correct: true } })).toEqual([]);
  });
});
