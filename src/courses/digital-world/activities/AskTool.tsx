import { useId } from 'react';
import { Badge, Icon } from '../../../components/ds';
import type { AskToolActivity } from '../../../content';
import { useI18n } from '../../../i18n';
import { ActivityQuestion } from './ActivityQuestion';
import { OpenableCard } from './CheckClaim';
import { PaperQuestion } from './CompareResults';
import { useActivityState } from './state';

/**
 * `ask-tool` (Lesson 8): a pretend tool, always labelled as one (the
 * lesson's `toolLabel`, under a "Pretend tool" badge). Every prompt and
 * answer is written in the lesson file: no AI model runs, nothing is typed
 * into anything, nothing is sent anywhere (docs/content/DIGITAL_WORLD_SPEC.md
 * 5.6). First the learner picks a better prompt and sees the tool's answer
 * to it; then they check a sure-but-wrong answer against a trusted source
 * they open with a tap. Both questions are always there. Saves the answers.
 */
export function AskToolPlayer({ activity }: { activity: AskToolActivity }) {
  const { t, contentLang } = useI18n();
  const { answers } = useActivityState();
  const improveId = useId();
  const checkId = useId();
  const { improve, check } = activity;
  const chosen = answers.improve !== undefined ? improve.options[Number(answers.improve)] : undefined;
  return (
    <div className="tw-dw-tool">
      <p className="tw-dw-tool-label">
        <Badge tone="lavender" icon="Info">
          {t('digitalWorld.tool.badge')}
        </Badge>
        <span {...contentLang}>{activity.toolLabel}</span>
      </p>

      <section className="tw-dw-tool-part" aria-labelledby={improveId}>
        <h4 id={improveId} className="tw-dw-summary-title">
          {t('digitalWorld.tool.improveTitle')}
        </h4>
        <Exchange prompt={improve.start.prompt} answer={improve.start.answer} />
        <ActivityQuestion
          answerKey="improve"
          seedIndex={0}
          question={improve.question}
          options={improve.options.map((option) => ({ text: option.prompt, correct: option.correct, feedback: option.feedback }))}
        />
        <div aria-live="polite">{chosen ? <Exchange prompt={chosen.prompt} answer={chosen.answer} /> : null}</div>
      </section>

      <section className="tw-dw-tool-part" aria-labelledby={checkId}>
        <h4 id={checkId} className="tw-dw-summary-title">
          {t('digitalWorld.tool.checkTitle')}
        </h4>
        <Exchange prompt={check.prompt} answer={check.answer} />
        <OpenableCard id="trusted-source" name={check.trustedSource.name}>
          <p className="body" {...contentLang}>
            {check.trustedSource.says}
          </p>
        </OpenableCard>
        <ActivityQuestion answerKey="check" seedIndex={1} question={check.question} options={check.options} />
      </section>
    </div>
  );
}

/** One turn with the pretend tool: what "you" asked, and its pre-written answer. */
function Exchange({ prompt, answer }: { prompt: string; answer: string }) {
  const { t, contentLang } = useI18n();
  return (
    <div className="tw-dw-chat">
      <p className="tw-dw-chat-you">
        <span className="eyebrow">{t('digitalWorld.tool.youAsk')}</span>
        <span {...contentLang}>{prompt}</span>
      </p>
      <p className="tw-dw-chat-tool">
        <span className="eyebrow">
          <Icon name="MessageCircle" size={16} />
          {t('digitalWorld.tool.toolSays')}
        </span>
        <span {...contentLang}>{answer}</span>
      </p>
    </div>
  );
}

/** On paper: the label, each prompt with its answer, the trusted source, and both questions. */
export function AskToolOnPaper({ activity, forTeachers }: { activity: AskToolActivity; forTeachers: boolean }) {
  const { t, contentLang: en } = useI18n();
  const { improve, check } = activity;
  return (
    <>
      <p>
        <strong>{t('digitalWorld.tool.badge')}</strong> <span {...en}>{activity.toolLabel}</span>
      </p>
      <h4>{t('digitalWorld.tool.improveTitle')}</h4>
      <PaperExchange prompt={improve.start.prompt} answer={improve.start.answer} />
      <PaperQuestion
        question={improve.question}
        options={improve.options.map((option) => ({ text: option.prompt, correct: option.correct, feedback: option.feedback }))}
        forTeachers={forTeachers}
      />
      {forTeachers ? (
        <div className="tw-print-keep">
          <p>{t('digitalWorld.tool.paperAnswers')}</p>
          {improve.options.map((option, index) => (
            <PaperExchange key={index} prompt={option.prompt} answer={option.answer} />
          ))}
        </div>
      ) : null}
      <h4>{t('digitalWorld.tool.checkTitle')}</h4>
      <PaperExchange prompt={check.prompt} answer={check.answer} />
      <div className="tw-print-keep tw-dw-paper-card">
        <p>
          <strong {...en}>{check.trustedSource.name}</strong>
        </p>
        <p {...en}>{check.trustedSource.says}</p>
      </div>
      <PaperQuestion question={check.question} options={check.options} forTeachers={forTeachers} />
    </>
  );
}

function PaperExchange({ prompt, answer }: { prompt: string; answer: string }) {
  const { t, contentLang: en } = useI18n();
  return (
    <dl className="tw-dw-facts tw-print-keep">
      <div>
        <dt>{t('digitalWorld.tool.youAsk')}</dt>
        <dd {...en}>{prompt}</dd>
      </div>
      <div>
        <dt>{t('digitalWorld.tool.toolSays')}</dt>
        <dd {...en}>{answer}</dd>
      </div>
    </dl>
  );
}
