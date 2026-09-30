import { useId } from 'react';
import { Chip, Icon, TaskCard } from '../../../components/ds';
import { useContent } from '../../../content/useContent';
import { useI18n } from '../../../i18n';
import { useLessonPlayer } from '../../../lesson';
import { StageActionBar } from '../StageActionBar';
import { SpeakRecorder } from './SpeakRecorder';
import { useSpeakRecorder } from './useSpeakRecorder';
import './SpeakStage.css';

/**
 * Speak (docs/screens/LessonSpeak.dc.html): the partner task and the
 * on-your-own task from the lesson, then "How did you practise?".
 *
 * Done rule (src/lesson/progressRules.ts): choosing how you practised marks
 * Speak done. It is never required: Next is never disabled, and every way
 * of practising counts.
 *
 * "Record yourself" (./useSpeakRecorder.ts) sits between the tasks and the
 * choice, where the device can record. It is optional and private: clips
 * stay on the device and recording never counts towards Speak being done.
 *
 * Not shown on purpose: the screen's "Say it in three sentences" frames:
 * the lesson content has no field for them (speak has only partnerTask and
 * independentTask).
 */
export function SpeakStage() {
  const { t, contentLang } = useI18n();
  const content = useContent();
  const { lesson, progress, update, stageEvent } = useLessonPlayer();
  const { practiceOptions } = content.getCourse();
  const partnerId = useId();
  const soloId = useId();
  const legendId = useId();
  const helpId = useId();
  const chosen = progress.speak.practisedHow;
  const recorder = useSpeakRecorder();

  const choose = (index: number) => {
    update((p) => (p.speak.practisedHow === index ? p : { ...p, speak: { ...p.speak, practisedHow: index } }), {
      immediate: true,
    });
    stageEvent({ stage: 'speak', kind: 'practised' });
  };

  return (
    <>
      <TaskCard eyebrow={t('lessonPlayer.speak.eyebrow')} icon="MessageCircle">
        {t(recorder.view === 'hidden' ? 'lessonPlayer.speak.task' : 'lessonPlayer.speak.taskWithRecorder')}
      </TaskCard>

      <div className="tw-speak-tasks">
        <section className="tw-speak-card tw-speak-card-partner" aria-labelledby={partnerId}>
          <span className="tw-speak-icon tw-speak-icon-partner" aria-hidden="true">
            <Icon name="Users" size={22} />
          </span>
          <h3 id={partnerId} className="tw-speak-card-title">
            {t('lessonPlayer.speak.partnerTitle')}
          </h3>
          <p className="tw-speak-card-text" {...contentLang}>
            {lesson.speak.partnerTask}
          </p>
        </section>
        <section className="tw-speak-card tw-speak-card-solo" aria-labelledby={soloId}>
          <span className="tw-speak-icon tw-speak-icon-solo" aria-hidden="true">
            <Icon name="User" size={22} />
          </span>
          <h3 id={soloId} className="tw-speak-card-title">
            {t('lessonPlayer.speak.soloTitle')}
          </h3>
          <p className="tw-speak-card-text" {...contentLang}>
            {lesson.speak.independentTask}
          </p>
        </section>
      </div>

      <SpeakRecorder recorder={recorder} />

      <fieldset className="tw-speak-practised" aria-describedby={helpId}>
        <legend id={legendId} className="tw-speak-legend">
          {t('lessonPlayer.speak.practisedLegend')}
        </legend>
        <p id={helpId} className="tw-speak-help">
          {t('lessonPlayer.speak.practisedHelp')}
        </p>
        <div role="radiogroup" aria-labelledby={legendId} className="tw-speak-chips">
          {practiceOptions.map((option, index) => (
            // From content/course.json, so English like the lessons.
            <Chip key={option} role="radio" selected={chosen === index} onClick={() => choose(index)} {...contentLang}>
              {option}
            </Chip>
          ))}
        </div>
      </fieldset>

      <StageActionBar />
    </>
  );
}
