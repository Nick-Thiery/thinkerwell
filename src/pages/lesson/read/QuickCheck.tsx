import { useEffect, useId, useMemo, useRef, useState, type Ref } from 'react';
import { Button, QuestionCard, WritingBox } from '../../../components/ds';
import type { ChoiceCheck, ThinkCheck } from '../../../content';
import { useI18n } from '../../../i18n';
import { checkSeed, seededShuffle, useLessonPlayer } from '../../../lesson';
import { StageActionBar } from '../StageActionBar';
import { withoutVerdict } from './feedbackText';

export interface QuickCheckProps {
  /** The "Quick check" heading, focused when the learner arrives from the reading. */
  headingRef: Ref<HTMLHeadingElement>;
  /** Back to the last reading part. */
  onBack: () => void;
}

/**
 * Read's last part (docs/screens/LessonCheck.dc.html): the lesson's choice
 * questions and its think question. Nothing blocks: any answer can be
 * changed at any time, "Not quite" comes with the option's own hint, and
 * Continue is never disabled.
 */
export function QuickCheck({ headingRef, onBack }: QuickCheckProps) {
  const { t } = useI18n();
  const { lesson, stageEvent } = useLessonPlayer();
  const checks = lesson.read.checks;

  return (
    <div className="tw-read-check">
      <div className="tw-read-check-head">
        <div className="tw-read-check-titles">
          <span className="eyebrow tw-read-muted">{t('lessonPlayer.read.checkEyebrow')}</span>
          <h2 ref={headingRef} tabIndex={-1} className="tw-read-check-title">
            {t('lessonPlayer.read.checkTitle')}
          </h2>
        </div>
        <span className="tw-read-check-note">{t('lessonPlayer.read.checkRetryNote')}</span>
      </div>

      {checks.map((check, index) =>
        check.type === 'choice' ? (
          <ChoiceQuestion key={index} check={check} index={index} total={checks.length} />
        ) : (
          <ThinkQuestion key={index} check={check} index={index} total={checks.length} />
        ),
      )}

      <StageActionBar
        back={t('stages.read')}
        onBack={onBack}
        helper={t('lessonPlayer.read.checkHelper')}
        onNext={() => stageEvent({ stage: 'read', kind: 'continue' })}
      />
    </div>
  );
}

interface QuestionProps<C> {
  check: C;
  /** The question's index in lesson.read.checks (the key in progress.checkAnswers). */
  index: number;
  total: number;
}

function ChoiceQuestion({ check, index, total }: QuestionProps<ChoiceCheck>) {
  const { t } = useI18n();
  const { lesson, progress, update, stageEvent, seedOwner } = useLessonPlayer();
  const cardRef = useRef<HTMLDivElement>(null);
  // "Try again" hides the shown answer here only; the saved one stays until
  // the learner chooses again.
  const [cleared, setCleared] = useState(false);
  const focusFirst = useRef(false);

  // The same order every time for this learner and question (for a guest,
  // for this visit). Each entry keeps its index in the content file.
  const order = useMemo(
    () => seededShuffle(check.options, checkSeed(seedOwner, lesson.id, index)),
    [check.options, seedOwner, lesson.id, index],
  );

  const saved = progress.checkAnswers[index];
  const savedIndex = saved?.type === 'choice' && check.options[saved.selected] ? saved.selected : undefined;
  const shownIndex = cleared ? undefined : savedIndex;
  const shownOption = shownIndex === undefined ? undefined : check.options[shownIndex];
  const position = shownIndex === undefined ? undefined : order.findIndex((entry) => entry.index === shownIndex);
  const result = shownOption ? (shownOption.correct ? 'correct' : 'retry') : undefined;

  useEffect(() => {
    if (!cleared || !focusFirst.current) return;
    focusFirst.current = false;
    cardRef.current?.querySelector<HTMLElement>('[role="radio"]')?.focus();
  }, [cleared]);

  function choose(shownPosition: number) {
    const entry = order[shownPosition];
    if (!entry) return;
    if (!cleared && entry.index === savedIndex) return; // already the shown answer
    setCleared(false);
    const correct = entry.item.correct;
    update(
      (p) => {
        const previous = p.checkAnswers[index];
        const tries = (previous?.type === 'choice' ? previous.tries : 0) + 1;
        return {
          ...p,
          checkAnswers: { ...p.checkAnswers, [index]: { type: 'choice', selected: entry.index, correct, tries } },
        };
      },
      { immediate: true },
    );
    stageEvent({ stage: 'read', kind: 'check-answered' });
  }

  return (
    <div ref={cardRef}>
      <QuestionCard
        eyebrow={t('lessonPlayer.read.questionOf', { n: index + 1, total })}
        prompt={check.question}
        options={order.map((entry) => entry.item.text)}
        selected={position}
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
        {result === 'retry' ? (
          <div className="tw-read-retry">
            <Button
              variant="secondary"
              icon="RotateCcw"
              onClick={() => {
                focusFirst.current = true;
                setCleared(true);
              }}
            >
              {t('lessonPlayer.read.tryAgain')}
            </Button>
          </div>
        ) : null}
      </QuestionCard>
    </div>
  );
}

function ThinkQuestion({ check, index, total }: QuestionProps<ThinkCheck>) {
  const { t } = useI18n();
  const { progress, update } = useLessonPlayer();
  const headingId = useId();
  const saved = progress.checkAnswers[index];
  const text = saved?.type === 'think' ? saved.text : '';

  return (
    <section className="tw-read-think" aria-labelledby={headingId}>
      <div className="tw-read-think-head">
        <span className="eyebrow tw-read-muted">{t('lessonPlayer.read.thinkEyebrow', { n: index + 1, total })}</span>
        <h3 id={headingId} className="tw-read-think-title">
          {check.question}
        </h3>
      </div>
      <WritingBox
        aria-labelledby={headingId}
        placeholder={check.placeholder}
        rows={4}
        helper={check.optional ? t('lessonPlayer.read.thinkHelperOptional') : t('lessonPlayer.read.thinkHelper')}
        value={text}
        onValueChange={(value) =>
          update((p) => ({ ...p, checkAnswers: { ...p.checkAnswers, [index]: { type: 'think', text: value } } }))
        }
      />
    </section>
  );
}
