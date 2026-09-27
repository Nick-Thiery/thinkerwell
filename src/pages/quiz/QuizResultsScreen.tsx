import { Link } from 'react-router';
import { Button, Icon, Mascot, ScoreSummary, SectionBadge } from '../../components/ds';
import { getLessonByNumber, type QuizFile, type Section } from '../../content';
import { useI18n } from '../../i18n';
import { lessonPath } from '../../app/lessonUrls';
import { missedQuestions, resultTier, skillBreakdown, type QuizAnswers } from '../../quiz';

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

export interface QuizResultsScreenProps {
  section: Section;
  quiz: QuizFile;
  answers: QuizAnswers;
  score: number;
  total: number;
  /** True while looking around or with nobody chosen: this attempt wasn't saved. */
  isGuest: boolean;
  onRetry: () => void;
}

/**
 * docs/screens/QuizResults.dc.html: the score, a warm message chosen by
 * score (docs/content/QUIZ_SPEC.md), how the learner did skill by skill, and
 * which lessons are worth another look for any missed question.
 */
export function QuizResultsScreen({ section, quiz, answers, score, total, isGuest, onRetry }: QuizResultsScreenProps) {
  const { t } = useI18n();
  const tier = resultTier(score, total);
  const skills = skillBreakdown(quiz, answers).map((s) => ({
    name: t(`pages.sectionCheck.skill.${s.skill}`),
    got: s.got,
    of: s.of,
  }));
  const missed = missedQuestions(quiz, answers).map((question) => ({
    question,
    position: quiz.questions.indexOf(question) + 1,
    lesson: getLessonByNumber(question.lesson),
  }));

  return (
    <div className="tw-quiz-page">
      <div className="tw-quiz-results">
        <section aria-labelledby="quiz-score-title" className="tw-quiz-score-panel">
          <Mascot src={MASCOT_SRC} size={120} />
          <span className="eyebrow">{t('pages.sectionCheck.resultsEyebrow', { title: section.title })}</span>
          <h1 id="quiz-score-title" className="tw-quiz-score-heading" tabIndex={-1}>
            {t('pages.sectionCheck.scoreHeading', { score, total })}
          </h1>
          <p className="body-lg">{quiz.results[tier]}</p>
          <div className="tw-quiz-score-actions">
            <Button variant="primary" size="lg" block icon="RotateCcw" onClick={onRetry}>
              {t('pages.sectionCheck.retry')}
            </Button>
            <Button variant="secondary" size="lg" block href={`/course#${section.id}`}>
              {t('pages.sectionCheck.backToCourse')}
            </Button>
          </div>
          <span className="tw-quiz-score-note">
            <Icon name={isGuest ? 'Eye' : 'Lock'} size={16} />
            {isGuest ? t('pages.sectionCheck.notSavedNote') : t('pages.sectionCheck.savedNote')}
          </span>
        </section>
        <div className="tw-quiz-results-side">
          {skills.length > 0 ? (
            <section aria-labelledby="quiz-skills-title" className="tw-quiz-card">
              <h2 id="quiz-skills-title" className="h2">
                {t('pages.sectionCheck.skillsTitle')}
              </h2>
              <ScoreSummary skills={skills} />
            </section>
          ) : null}
          {missed.length > 0 ? (
            <section aria-labelledby="quiz-review-title" className="tw-quiz-card">
              <h2 id="quiz-review-title" className="h2">
                {t('pages.sectionCheck.reviewTitle')}
              </h2>
              {missed.map(({ question, position, lesson }) => (
                <Link key={question.id} className="tw-quiz-review-row" to={lesson ? lessonPath(lesson.id) : `/course#${section.id}`}>
                  <SectionBadge section={section.id} showName={false} size={44} />
                  <span className="tw-quiz-review-text">
                    <span className="tw-quiz-review-question">
                      {t('pages.sectionCheck.reviewQuestion', { n: position, question: question.question })}
                    </span>
                    {lesson ? (
                      <span className="tw-quiz-review-lesson">
                        {t('pages.sectionCheck.reviewLesson', { number: lesson.number, question: lesson.essentialQuestion })}
                      </span>
                    ) : null}
                  </span>
                  <Icon name="ChevronRight" size={20} />
                </Link>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
