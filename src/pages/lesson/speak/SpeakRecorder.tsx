import { useEffect, useRef } from 'react';
import { VoiceRecorder } from '../../../components/ds';
import { useI18n, type MessageKey } from '../../../i18n';
import { formatDuration, useLessonPlayer } from '../../../lesson';
import type { SpeakRecorder as Recorder, SpeakRecorderProblem } from './useSpeakRecorder';

const PROBLEM_KEYS: Record<SpeakRecorderProblem, MessageKey> = {
  'mic-blocked': 'lessonPlayer.speak.recorder.micBlocked',
  'no-mic': 'lessonPlayer.speak.recorder.noMic',
  failed: 'lessonPlayer.speak.recorder.failed',
  playback: 'lessonPlayer.speak.recorder.playback',
  'not-saved': 'lessonPlayer.speak.recorder.notSaved',
};

/**
 * The optional private recorder on Speak (docs/screens/LessonSpeak.dc.html):
 * VoiceRecorder driven by useSpeakRecorder. Its main button is secondary so
 * the stage's Next stays the one ink primary button. When a button the
 * learner pressed is replaced (Start becomes Stop, Stop becomes Listen back,
 * Delete goes), focus moves to the new main button.
 */
export function SpeakRecorder({ recorder }: { recorder: Recorder }) {
  const { t } = useI18n();
  const { mode } = useLessonPlayer();
  const wrapper = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const { view, elapsedMs, clip, problem, lastEvent } = recorder;

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    wrapper.current?.querySelector<HTMLButtonElement>('.tw-rec-row button')?.focus();
  }, [view, problem]);

  const pressed = (action: () => void) => () => {
    moveFocus.current = true;
    action();
  };

  const note =
    mode === 'learner'
      ? undefined
      : mode === 'look-around'
        ? t('lessonPlayer.speak.recorder.noteLookAround')
        : t('lessonPlayer.speak.recorder.noteNoLearner');

  const announcement =
    lastEvent === 'started'
      ? t('lessonPlayer.speak.recorder.announceStarted')
      : lastEvent === 'stopped'
        ? t(mode === 'learner' ? 'lessonPlayer.speak.recorder.announceSaved' : 'lessonPlayer.speak.recorder.announceStopped')
        : lastEvent === 'deleted'
          ? t('lessonPlayer.speak.recorder.announceDeleted')
          : '';

  if (view === 'hidden') return null;

  const time =
    view === 'recording'
      ? formatDuration(Math.floor(elapsedMs / 1000))
      : clip
        ? formatDuration(Math.max(1, Math.round(clip.durationMs / 1000)))
        : undefined;

  return (
    <div ref={wrapper} className="tw-speak-recorder">
      <VoiceRecorder
        actionVariant="secondary"
        state={view}
        time={time}
        title={t('lessonPlayer.speak.recorder.title')}
        note={note}
        onStart={pressed(recorder.start)}
        onStop={pressed(recorder.stop)}
        onPlayback={recorder.playBack}
        onReRecord={pressed(recorder.start)}
        onDelete={pressed(recorder.remove)}
      >
        <p className="tw-speak-recorder-task">{t('lessonPlayer.speak.recorder.task')}</p>
        {problem ? <p className="tw-speak-recorder-problem">{t(PROBLEM_KEYS[problem])}</p> : null}
      </VoiceRecorder>
      <p className="tw-visually-hidden" aria-live="polite">
        {problem ? t(PROBLEM_KEYS[problem]) : announcement}
      </p>
    </div>
  );
}
