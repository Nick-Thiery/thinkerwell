/**
 * Pure scoring logic for a section check (content/quizzes/<section>.json),
 * shared by the check itself and its results screen. Nothing here touches
 * storage or React: callers pass in the answers the learner picked and get
 * plain numbers and lists back, the same shape src/lesson/progress.ts keeps
 * for the lesson player.
 */
import { QUIZ_SKILLS, type QuizFile, type QuizQuestion, type QuizSkill } from '../content';

/** One answered question: the option's index in the content file's order (not the shuffled order). */
export interface QuizAnswer {
  selected: number;
  correct: boolean;
}

/** Answers so far, keyed by question id. A question with no entry hasn't been answered yet. */
export type QuizAnswers = Record<string, QuizAnswer>;

export interface QuizScore {
  score: number;
  total: number;
}

/** How many of the quiz's questions have a correct saved answer, out of how many there are. */
export function scoreQuiz(quiz: QuizFile, answers: QuizAnswers): QuizScore {
  const total = quiz.questions.length;
  const score = quiz.questions.reduce((count, question) => count + (answers[question.id]?.correct ? 1 : 0), 0);
  return { score, total };
}

export type ResultTier = 'high' | 'middle' | 'low';

/**
 * The results message to show (docs/content/QUIZ_SPEC.md, CLAUDE.md): "high"
 * is at least 8 of 10 (or 10 of 12) — 80% of the questions, rounded up so a
 * 12-question check needs a whole extra correct answer, not a fraction of
 * one; "low" is under half; anything else is "middle".
 */
export function resultTier(score: number, total: number): ResultTier {
  if (total <= 0) return 'middle';
  if (score >= Math.ceil(total * 0.8)) return 'high';
  if (score < total / 2) return 'low';
  return 'middle';
}

export interface SkillScore {
  skill: QuizSkill;
  got: number;
  of: number;
}

/**
 * Correct/total per skill (vocabulary, understand, evidence, apply), for
 * ScoreSummary. In the fixed QUIZ_SKILLS order, and only for skills this
 * quiz actually has a question for.
 */
export function skillBreakdown(quiz: QuizFile, answers: QuizAnswers): SkillScore[] {
  const bySkill = new Map<QuizSkill, SkillScore>();
  for (const question of quiz.questions) {
    const entry = bySkill.get(question.skill) ?? { skill: question.skill, got: 0, of: 0 };
    entry.of += 1;
    if (answers[question.id]?.correct) entry.got += 1;
    bySkill.set(question.skill, entry);
  }
  return QUIZ_SKILLS.filter((skill) => bySkill.has(skill)).map((skill) => bySkill.get(skill)!);
}

/** Every question the learner answered wrong, in the quiz's own order, for "worth another look". */
export function missedQuestions(quiz: QuizFile, answers: QuizAnswers): QuizQuestion[] {
  return quiz.questions.filter((question) => !answers[question.id]?.correct);
}
