import { useId } from 'react';
import { Icon, TaskCard } from '../../../components/ds';
import { useI18n } from '../../../i18n';
import { useLessonPlayer } from '../../../lesson';
import { StageActionBar } from '../StageActionBar';
import { SpeakRecorder } from './SpeakRecorder';
import { useSpeakRecorder } from './useSpeakRecorder';
import './SpeakStage.css';

/**
 * Speak (docs/screens/LessonSpeak.dc.html): the partner task and the
 * on-your-own task from the lesson, then Continue.
 *
 * Done rule (src/lesson/progressRules.ts): Continue marks Speak done. Every
 * way of practising counts, so nothing is asked about how
 * (docs/notes/simpler-lessons.md: "How did you practise?" was taken out; a
 * choice saved before then still counts and is kept).
 *
 * "Record yourself" (./useSpeakRecorder.ts) sits after the tasks, where the
 * device can record. It is optional and private: clips stay on the device
 * and recording never counts towards Speak being done.
 *
 * Not shown on purpose: the screen's "Say it in three sentences" frames:
 * the lesson content has no field for them (speak has only partnerTask and
 * independentTask).
 */
export function SpeakStage() {
  const { t, contentLang } = useI18n();
  const { lesson, stageEvent } = useLessonPlayer();
  const partnerId = useId();
  const soloId = useId();
  const recorder = useSpeakRecorder();

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


      <StageActionBar onNext={() => stageEvent({ stage: 'speak', kind: 'continue' })} />
    </>
  );
}
