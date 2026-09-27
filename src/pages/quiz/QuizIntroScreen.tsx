import { Button, Icon, MascotTip, SectionHeader } from '../../components/ds';
import type { QuizFile, Section } from '../../content';
import { useI18n } from '../../i18n';

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

/** Roughly 90 seconds a question, rounded to the nearest 5 minutes (at least 5). */
function estimatedMinutes(questionCount: number): number {
  return Math.max(5, Math.round((questionCount * 1.5) / 5) * 5);
}

export interface QuizIntroScreenProps {
  section: Section;
  quiz: QuizFile;
  /** True while looking around or with nobody chosen: nothing will be saved. */
  isGuest: boolean;
  onStart: () => void;
}

/**
 * docs/screens/QuizIntro.dc.html: what the check covers, that it never
 * blocks and can be retried, and (CLAUDE.md rule 4, and the phase 7 note on
 * look-around) whether this attempt will be saved.
 */
export function QuizIntroScreen({ section, quiz, isGuest, onStart }: QuizIntroScreenProps) {
  const { t } = useI18n();
  const first = section.lessons[0] ?? 0;
  const last = section.lessons[section.lessons.length - 1] ?? first;
  const range = first === last ? String(first) : t('pages.course.numberRange', { first, last });

  return (
    <div className="tw-quiz-page">
      <SectionHeader
        section={section.id}
        number={section.number}
        total={section.lessons.length}
        completed={section.lessons.length}
        question={section.question}
      />
      <div className="tw-quiz-intro-card">
        <div className="tw-quiz-intro-head">
          <span className="eyebrow">{t('pages.sectionCheck.eyebrow')}</span>
          <h1 className="h1" tabIndex={-1}>
            {t('pages.sectionCheck.title', { section: section.title })}
          </h1>
          <p className="h2 tw-quiz-intro-tagline">{t('pages.sectionCheck.introTitle', { title: section.title })}</p>
        </div>
        <ul className="tw-quiz-facts" role="list">
          <li className="tw-quiz-fact">
            <span className="tw-quiz-fact-icon">
              <Icon name="ClipboardCheck" size={20} />
            </span>
            {t('pages.sectionCheck.factQuestions', { count: quiz.questions.length, range })}
          </li>
          <li className="tw-quiz-fact">
            <span className="tw-quiz-fact-icon">
              <Icon name="Clock" size={20} />
            </span>
            {t('pages.sectionCheck.factTime', { minutes: estimatedMinutes(quiz.questions.length) })}
          </li>
          <li className="tw-quiz-fact">
            <span className="tw-quiz-fact-icon">
              <Icon name="RotateCcw" size={20} />
            </span>
            {t('pages.sectionCheck.factRetry')}
          </li>
          <li className="tw-quiz-fact">
            <span className="tw-quiz-fact-icon">
              <Icon name={isGuest ? 'Eye' : 'Lock'} size={20} />
            </span>
            {isGuest ? t('pages.sectionCheck.factGuest') : t('pages.sectionCheck.factPrivate')}
          </li>
        </ul>
        <MascotTip src={MASCOT_SRC}>{t('pages.sectionCheck.tip')}</MascotTip>
        <div className="tw-quiz-intro-actions">
          <Button variant="primary" size="lg" iconRight="ArrowRight" onClick={onStart}>
            {t('pages.sectionCheck.start')}
          </Button>
          <Button variant="secondary" size="lg" href={`/course#${section.id}`}>
            {t('pages.sectionCheck.lookAtLessons')}
          </Button>
        </div>
      </div>
    </div>
  );
}
