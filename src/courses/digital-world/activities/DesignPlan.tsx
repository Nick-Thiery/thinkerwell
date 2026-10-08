import { useEffect, useId, useRef, useState } from 'react';
import { Button, Icon, WritingBox } from '../../../components/ds';
import type { DesignPlanActivity } from '../../../content';
import { En, useI18n } from '../../../i18n';
import { useLessonPlayer } from '../../../lesson';
import { insertStarter } from '../../../pages/lesson/write/insertStarter';
import { AnswerLines } from '../../../pages/print/PrintToolbar';
import { useActivityState } from './state';

/**
 * `design-plan` (Lesson 11, in Write before the writing task): pick a
 * problem (or write one of your own), then plan an AI helper in steps. One
 * step shows at a time, and the step list goes to any step at any time, so
 * the learner can go back and change anything; nothing is locked. A choice
 * step is a design choice: every option has feedback and none is wrong.
 * What the learner writes is saved like the lesson's other writing (on this
 * device for a chosen learner, in memory while looking around). "Your plan"
 * shows it all together.
 */
export function DesignPlanPlayer({ activity }: { activity: DesignPlanActivity }) {
  const { t, contentLang } = useI18n();
  const { mode } = useLessonPlayer();
  const { answers, choose, write } = useActivityState();
  const [index, setIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const problemsId = useId();
  const planId = useId();
  const step = activity.steps[index];
  // Saved answers: the chosen problem, the learner's own problem, and each step's under "step:<id>".
  const stepKey = (id: string) => `step:${id}`;
  const own = activity.problems.find((problem) => problem.own);
  const chosenProblem = activity.problems.find((problem) => problem.id === answers.problem);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    headingRef.current?.focus();
  }, [index]);

  const go = (next: number) => {
    moved.current = true;
    setIndex(next);
  };

  const helper =
    mode === 'learner'
      ? t('digitalWorld.plan.helperSaving')
      : mode === 'look-around'
        ? t('digitalWorld.plan.helperLookAround')
        : t('digitalWorld.plan.helperNoLearner');

  if (!step) return null;
  const stepAnswer = answers[stepKey(step.id)];
  const chosenOption = step.kind === 'choice' && stepAnswer !== undefined ? step.options?.[Number(stepAnswer)] : undefined;

  return (
    <div className="tw-dw-plan">
      <fieldset className="tw-dw-card" aria-describedby={problemsId}>
        <legend className="tw-dw-sort-text">{t('digitalWorld.plan.problemTitle')}</legend>
        <p id={problemsId} className="small tw-dw-muted">
          {t('digitalWorld.plan.problemHelp')}
        </p>
        <div className="tw-dw-options tw-dw-options-stacked">
          {activity.problems.map((problem) => (
            <label key={problem.id} className="tw-dw-option">
              <input type="radio" name="tw-dw-plan-problem" value={problem.id} checked={answers.problem === problem.id} onChange={() => choose('problem', problem.id)} />
              <span {...contentLang}>{problem.text}</span>
            </label>
          ))}
        </div>
        {own && answers.problem === own.id ? (
          <WritingBox
            id="tw-dw-plan-own"
            label={t('digitalWorld.plan.ownLabel')}
            rows={2}
            value={answers.own ?? ''}
            helper={t('digitalWorld.plan.ownHelp')}
            onValueChange={(value) => write('own', value)}
          />
        ) : null}
      </fieldset>

      <nav aria-label={t('digitalWorld.plan.stepsLabel')}>
        <ol className="tw-dw-tm-steps" role="list">
          {activity.steps.map((s, i) => (
            <li key={s.id}>
              <button type="button" className="tw-dw-tm-step" aria-current={i === index ? 'step' : undefined} onClick={() => go(i)}>
                <span {...contentLang}>{s.title}</span>
                {answers[stepKey(s.id)] ? <Icon name="Check" size={16} label={t('digitalWorld.plan.stepAnswered')} /> : null}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className="tw-dw-card tw-dw-plan-step" aria-labelledby="tw-dw-plan-step-title">
        <p className="eyebrow tw-dw-muted">{t('digitalWorld.plan.stepOf', { n: index + 1, total: activity.steps.length })}</p>
        <h4 id="tw-dw-plan-step-title" ref={headingRef} className="h3" tabIndex={-1} {...contentLang}>
          {step.title}
        </h4>
        <p className="body-lg tw-dw-measure" {...contentLang}>
          {step.prompt}
        </p>
        {step.questions ? (
          <ul className="tw-dw-list" {...contentLang}>
            {step.questions.map((question, i) => (
              <li key={i}>{question}</li>
            ))}
          </ul>
        ) : null}

        {step.kind === 'text' ? (
          <>
            {step.starter ? (
              <div className="tw-dw-actions">
                <Button
                  variant="secondary"
                  icon="Plus"
                  onClick={() => {
                    write(stepKey(step.id), insertStarter(stepAnswer ?? '', step.starter ?? '', null).text);
                    document.getElementById(`tw-dw-plan-${step.id}`)?.focus();
                  }}
                >
                  {t('digitalWorld.plan.useStarter')}
                </Button>
                <p className="small tw-dw-muted">
                  <En>{step.starter}</En>
                </p>
              </div>
            ) : null}
            <WritingBox
              key={step.id}
              id={`tw-dw-plan-${step.id}`}
              label={t('digitalWorld.plan.answerLabel')}
              rows={4}
              value={stepAnswer ?? ''}
              helper={helper}
              onValueChange={(value) => write(stepKey(step.id), value)}
              {...contentLang}
            />
          </>
        ) : (
          <fieldset className="tw-dw-plan-choice">
            <legend className="tw-visually-hidden" {...contentLang}>
              {step.title}
            </legend>
            <div className="tw-dw-options tw-dw-options-stacked">
              {(step.options ?? []).map((option, i) => (
                <label key={i} className="tw-dw-option">
                  <input type="radio" name={`tw-dw-plan-${step.id}`} checked={stepAnswer === String(i)} onChange={() => choose(stepKey(step.id), String(i))} />
                  <span {...contentLang}>{option.text}</span>
                </label>
              ))}
            </div>
            <div aria-live="polite">
              {chosenOption ? (
                <p className="tw-dw-note">
                  <Icon name="Info" size={18} />
                  <span {...contentLang}>{chosenOption.feedback}</span>
                </p>
              ) : null}
            </div>
          </fieldset>
        )}

        <div className="tw-dw-actions tw-dw-plan-nav">
          {index > 0 ? (
            <Button variant="secondary" icon="ArrowLeft" onClick={() => go(index - 1)}>
              {t('digitalWorld.plan.back')}
            </Button>
          ) : null}
          {index < activity.steps.length - 1 ? (
            <Button variant="secondary" iconRight="ArrowRight" onClick={() => go(index + 1)}>
              {t('digitalWorld.plan.next')}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="tw-dw-summary" aria-labelledby={planId}>
        <h4 id={planId} className="tw-dw-summary-title">
          {t('digitalWorld.plan.yourPlan')}
        </h4>
        <dl className="tw-dw-facts">
          <div>
            <dt>{t('digitalWorld.plan.problemTitle')}</dt>
            <dd {...contentLang}>{chosenProblem ? (chosenProblem.own ? answers.own || chosenProblem.text : chosenProblem.text) : <NotYet />}</dd>
          </div>
          {activity.steps.map((s) => {
            const answer = answers[stepKey(s.id)];
            const shown = s.kind === 'choice' ? (answer !== undefined ? s.options?.[Number(answer)]?.text : undefined) : answer?.trim() ? answer : undefined;
            return (
              <div key={s.id}>
                <dt {...contentLang}>{s.title}</dt>
                <dd className="tw-dw-pre" {...contentLang}>
                  {shown ?? <NotYet />}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}

function NotYet() {
  const { t, uiLang } = useI18n();
  return (
    <span className="tw-dw-muted" {...uiLang}>
      {t('digitalWorld.plan.notYet')}
    </span>
  );
}

/** On paper: the problems to choose from and every step with lines to write on (or its choices); for teachers, each choice's feedback. */
export function DesignPlanOnPaper({ activity, forTeachers }: { activity: DesignPlanActivity; forTeachers: boolean }) {
  const { t, contentLang: en } = useI18n();
  return (
    <>
      <h4>{t('digitalWorld.plan.problemTitle')}</h4>
      <ul className="tw-print-boxes" {...en}>
        {activity.problems.map((problem) => (
          <li key={problem.id}>{problem.text}</li>
        ))}
      </ul>
      {activity.steps.map((step) => (
        <div key={step.id} className="tw-print-keep">
          <h4 {...en}>{step.title}</h4>
          <p {...en}>{step.prompt}</p>
          {step.questions ? (
            <ul {...en}>
              {step.questions.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
          ) : null}
          {step.kind === 'choice' ? (
            forTeachers ? (
              <ul {...en}>
                {(step.options ?? []).map((option, index) => (
                  <li key={index}>
                    <strong>{option.text}</strong> <em>{option.feedback}</em>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="tw-print-boxes" {...en}>
                {(step.options ?? []).map((option, index) => (
                  <li key={index}>{option.text}</li>
                ))}
              </ul>
            )
          ) : (
            <>
              {step.starter ? (
                <p className="tw-print-muted" {...en}>
                  {step.starter}
                </p>
              ) : null}
              {forTeachers ? null : <AnswerLines count={3} />}
            </>
          )}
        </div>
      ))}
    </>
  );
}
