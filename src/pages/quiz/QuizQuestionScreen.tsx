import { useMemo } from 'react';
import { Link } from 'react-router';
import { ActionBar, Button, EvidenceCard, Icon, ProgressBar, QuestionCard, SectionBadge } from '../../components/ds';
import { getLessonByNumber, type QuizFile, type QuizQuestion, type QuizStimulus, type Section } from '../../content';
import { useI18n } from '../../i18n';
import { checkSeed, seededShuffle } from '../../lesson';
import { lessonPath } from '../../app/lessonUrls';
import { withoutVerdict } from '../lesson/read/feedbackText';
import type { QuizAnswer } from '../../quiz';

/** The made-up example a question refers to (docs/content/QUIZ_SPEC.md), shown above it. */
function StimulusCard({ stimulus }: { stimulus: QuizStimulus }) {
  return stimulus.type === 'items' ? (
    <EvidenceCard title={stimulus.title} items={stimulus.items} className="tw-quiz-stimulus" />
  ) : (
    <EvidenceCard title={stimulus.title} text={stimulus.body} className="tw-quiz-stimulus" />
  );
}

export interface QuizQuestionScreenProps {
  section: Section;
  quiz: QuizFile;
  question: QuizQuestion;
  /** The question's position in quiz.questions (0-based) — also its seed and its progress-bar count. */
  index: number;
  answer: QuizAnswer | undefined;
  answeredCount: number;
  /** The learner, or a stable id for this visit while looking around (checkSeed's owner). */
  seedOwner: string;
  onAnswer: (selected: number, correct: boolean) => void;
  onNext: () => void;
}

/**
 * docs/screens/QuizQuestion.dc.html and PhoneQuiz.dc.html: one question, its
 * optional stimulus, immediate feedback and a link back to the lesson it
 * comes from. Options shuffle with a seed per learner and question
 * (CLAUDE.md), the same src/lesson/shuffle.ts the lesson player's quick
 * check uses, so the order is stable if the learner comes back.
 */
export function QuizQuestionScreen({
  section,
  quiz,
  question,
  index,
  answer,
  answeredCount,
  seedOwner,
  onAnswer,
  onNext,
}: QuizQuestionScreenProps) {
  const { t } = useI18n();
  const total = quiz.questions.length;
  const isLast = index === total - 1;
  const lesson = getLessonByNumber(question.lesson);

  const order = useMemo(
    () => seededShuffle(question.options, checkSeed(seedOwner, section.id, index)),
    [question.options, seedOwner, section.id, index],
  );
  const shownPosition = answer === undefined ? undefined : order.findIndex((entry) => entry.index === answer.selected);
  const shownOption = shownPosition === undefined || shownPosition < 0 ? undefined : order[shownPosition]!.item;
  const result = shownOption ? (shownOption.correct ? 'correct' : 'retry') : undefined;

  function choose(shownIndex: number) {
    const entry = order[shownIndex];
    if (!entry) return;
    onAnswer(entry.index, entry.item.correct);
  }

  return (
    <div className="tw-quiz-page">
      <div className="tw-quiz-bar">
        <SectionBadge section={section.id} number={section.number} name={t('pages.sectionCheck.title', { section: section.title })} />
        <ProgressBar
          value={answeredCount}
          max={total}
          label={t('pages.sectionCheck.questionOf', { n: index + 1, total })}
          valueLabel={t('pages.sectionCheck.answeredCount', { count: answeredCount })}
        />
        <Button variant="ghost" icon="LogOut" href={`/course#${section.id}`}>
          {t('pages.sectionCheck.stopCheck')}
        </Button>
      </div>
      <div className="tw-quiz-question-col">
        <div className="tw-quiz-question-main">
          {/* Visually hidden: the visible heading here is the question itself
              (QuestionCard's heading, an h2 here), but each question is its own "screen"
              within this one route, so a heading is still needed for focus to
              land on and for screen-reader users to hear that it changed. */}
          <h1 className="tw-visually-hidden" tabIndex={-1}>
            {t('pages.sectionCheck.questionOf', { n: index + 1, total })}
          </h1>
          {question.stimulus ? <StimulusCard stimulus={question.stimulus} /> : null}
          <QuestionCard
            id={question.id}
            headingLevel={2}
            eyebrow={t('pages.sectionCheck.questionEyebrow', { n: index + 1, skill: t(`pages.sectionCheck.skill.${question.skill}`) })}
            prompt={question.question}
            options={order.map((entry) => entry.item.text)}
            selected={shownPosition !== undefined && shownPosition >= 0 ? shownPosition : undefined}
            result={result}
            feedback={
              shownOption
                ? withoutVerdict(
                    shownOption.feedback,
                    t(shownOption.correct ? 'lessonPlayer.read.feedbackLead.correct' : 'lessonPlayer.read.feedbackLead.retry'),
                  )
                : undefined
            }
            onSelect={choose}
          >
            {lesson ? (
              <Link className="tw-quiz-from-lesson" to={lessonPath(lesson.id)}>
                <Icon name="BookOpen" size={16} />
                {t('pages.sectionCheck.fromLesson', { number: lesson.number, question: lesson.essentialQuestion })}
              </Link>
            ) : null}
          </QuestionCard>
        </div>
        <ActionBar
          next={isLast ? t('pages.sectionCheck.seeResults') : t('pages.sectionCheck.nextQuestion')}
          disabled={!answer}
          helper={answer ? undefined : t('pages.sectionCheck.chooseHelper')}
          onNext={onNext}
        />
      </div>
    </div>
  );
}
