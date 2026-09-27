import { useEffect, useRef, useState } from 'react';
import { usePageTitle } from '../app/usePageTitle';
import type { Section } from '../content';
import { getLessons, getQuiz } from '../content';
import { useI18n } from '../i18n';
import { VISIT_SEED } from '../lesson';
import { QuizIntroScreen } from './quiz/QuizIntroScreen';
import { QuizQuestionScreen } from './quiz/QuizQuestionScreen';
import { QuizResultsScreen } from './quiz/QuizResultsScreen';
import './quiz/SectionCheck.css';
import { scoreQuiz, type QuizAnswers } from '../quiz';
import { useLearnerProgress, useLearnerSession } from '../session';
import { getStore, sectionProgress } from '../storage';

interface SectionCheckPageProps {
  section: Section;
}

type Screen = 'intro' | 'question' | 'results';

/**
 * The section check for one section (docs/screens/QuizIntro.dc.html,
 * QuizQuestion.dc.html, QuizResults.dc.html, PhoneQuiz.dc.html): an intro,
 * one question at a time with immediate feedback, then results. Nothing is
 * ever locked and it can be retried (CLAUDE.md), so this is plain page
 * state, not separate routes: "Try the check again" just resets it.
 *
 * Only a completed attempt is ever saved (CLAUDE.md's on-device data keeps
 * the best and the latest of each section's attempts, not a draft), and
 * only for a chosen learner — "Save and stop" and every guest visit
 * (looking around, or nobody chosen yet) leave nothing behind.
 *
 * Unlike the course map or the dashboard, this shows its intro right away
 * rather than waiting for the learner session to load: the intro doesn't
 * depend on it, and by the time a real answer needs a seed to shuffle
 * options with (the question screen, reached only after "Start the check"),
 * the session has always long since resolved.
 */
export function SectionCheckPage({ section }: SectionCheckPageProps) {
  const { t } = useI18n();
  usePageTitle(t('pages.sectionCheck.title', { section: section.title }));
  const session = useLearnerSession();
  const learnerId = session.activeLearner?.id ?? null;
  const quiz = getQuiz(section.id);
  const learnerProgress = useLearnerProgress(learnerId);
  const lessonsDone =
    learnerId && learnerProgress.status === 'ready'
      ? sectionProgress(section, getLessons(), learnerProgress.progress).completed
      : undefined;

  const [screen, setScreen] = useState<Screen>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});

  // Focus (and announce) each screen's heading as it appears, the way a real
  // page navigation would — this route doesn't change between the intro,
  // each question and the results, so nothing else moves focus here. Skips
  // the very first render: AppLayout already focused the page's own h1 for
  // the navigation that landed here.
  const containerRef = useRef<HTMLDivElement>(null);
  const shownKey = useRef(`${screen}:${index}`);
  useEffect(() => {
    const key = `${screen}:${index}`;
    if (shownKey.current === key) return;
    shownKey.current = key;
    containerRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: false });
  }, [screen, index]);

  if (!quiz) {
    // Content always has one quiz per section (content.test.ts checks this);
    // this is just a safe fallback, never expected in practice.
    return (
      <div className="tw-quiz-page">
        <p className="body-lg">{t('pages.sectionCheck.noQuiz')}</p>
      </div>
    );
  }

  function restart(): void {
    setAnswers({});
    setIndex(0);
    setScreen('intro');
  }

  function finish(finalAnswers: QuizAnswers): void {
    setScreen('results');
    if (!learnerId || !quiz) return;
    const selected: Record<string, number> = {};
    for (const [questionId, answer] of Object.entries(finalAnswers)) selected[questionId] = answer.selected;
    const { score, total } = scoreQuiz(quiz, finalAnswers);
    void getStore()
      .then((store) =>
        store.recordQuizAttempt(learnerId, section.id, {
          answers: selected,
          score,
          total,
          finishedAt: new Date().toISOString(),
        }),
      )
      .catch((error) => {
        if (import.meta.env.DEV) console.error(error);
      });
  }

  return (
    <div ref={containerRef}>
      {screen === 'intro' ? (
        <QuizIntroScreen
          section={section}
          quiz={quiz}
          isGuest={!learnerId}
          lessonsDone={lessonsDone}
          onStart={() => setScreen('question')}
        />
      ) : screen === 'question' ? (
        (() => {
          const question = quiz.questions[index]!;
          return (
            <QuizQuestionScreen
              section={section}
              quiz={quiz}
              question={question}
              index={index}
              answer={answers[question.id]}
              answeredCount={Object.keys(answers).length}
              seedOwner={learnerId ?? VISIT_SEED}
              onAnswer={(selected, correct) =>
                setAnswers((prev) => ({ ...prev, [question.id]: { selected, correct } }))
              }
              onNext={() => {
                if (index + 1 < quiz.questions.length) {
                  setIndex((i) => i + 1);
                } else {
                  finish(answers);
                }
              }}
            />
          );
        })()
      ) : (
        <QuizResultsScreen
          section={section}
          quiz={quiz}
          answers={answers}
          score={scoreQuiz(quiz, answers).score}
          total={quiz.questions.length}
          isGuest={!learnerId}
          onRetry={restart}
        />
      )}
    </div>
  );
}
