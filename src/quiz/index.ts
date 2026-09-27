// Section checks (docs/BUILD_PLAN.md phase 7). Pure scoring logic lives here;
// the page itself is src/pages/SectionCheckPage.tsx and src/pages/quiz/.
export {
  missedQuestions,
  resultTier,
  scoreQuiz,
  skillBreakdown,
  type QuizAnswer,
  type QuizAnswers,
  type QuizScore,
  type ResultTier,
  type SkillScore,
} from './scoring';
