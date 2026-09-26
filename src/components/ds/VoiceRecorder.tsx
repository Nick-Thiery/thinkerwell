import type { ReactElement, ReactNode } from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import { cx } from './internal/cx';
import { useI18n } from '../../i18n';
import './VoiceRecorder.css';

export interface VoiceRecorderProps {
  state?: 'idle' | 'recording' | 'recorded';
  /** e.g. "0:42". */
  time?: string;
  /** Default "Record yourself". */
  title?: string;
  /** The privacy line; default explains the recording never leaves the device. */
  note?: string;
  /** The task, shown above the controls. */
  children?: ReactNode;
  onStart?: () => void;
  onStop?: () => void;
  onPlayback?: () => void;
  onReRecord?: () => void;
  onDelete?: () => void;
  className?: string;
  /**
   * The main action's `Button` variant (Start recording, Stop or Listen
   * back). Defaults to 'primary', matching the reference; not in the
   * reference's own index.d.ts. README: one ink primary button per view —
   * a page that already has one elsewhere (for example ActionBar's Next)
   * should pass 'secondary' here.
   */
  actionVariant?: 'primary' | 'secondary';
}

/**
 * A private practice recorder for the Speak stage: record, listen back,
 * record again or delete. Recordings stay on the device; keep only the
 * latest one per lesson. State and callbacks only: MediaRecorder itself is
 * wired up in a later phase.
 */
export function VoiceRecorder({
  state = 'idle',
  time,
  title,
  note,
  children,
  onStart,
  onStop,
  onPlayback,
  onReRecord,
  onDelete,
  className,
  actionVariant = 'primary',
}: VoiceRecorderProps): ReactElement {
  const { t } = useI18n();
  const heading = title || t('ds.actions.voiceRecorder.title');

  let row: ReactNode;
  if (state === 'recording') {
    row = (
      <>
        <span className="tw-rec-live">
          <span className="tw-rec-dot" aria-hidden="true" />
          {t('ds.actions.voiceRecorder.recording', { time: time ?? '0:00' })}
        </span>
        <Button variant={actionVariant} icon="Square" onClick={onStop}>
          {t('ds.actions.voiceRecorder.stop')}
        </Button>
      </>
    );
  } else if (state === 'recorded') {
    row = (
      <>
        <Button variant={actionVariant} icon="Play" onClick={onPlayback}>
          {t('ds.actions.voiceRecorder.listenBack')}
        </Button>
        {time ? <span className="tw-rec-time">{time}</span> : null}
        <Button variant="secondary" icon="Mic" onClick={onReRecord}>
          {t('ds.actions.voiceRecorder.recordAgain')}
        </Button>
        <Button variant="ghost" icon="Trash2" onClick={onDelete}>
          {t('ds.actions.voiceRecorder.delete')}
        </Button>
      </>
    );
  } else {
    row = (
      <Button variant={actionVariant} icon="Mic" onClick={onStart}>
        {t('ds.actions.voiceRecorder.startRecording')}
      </Button>
    );
  }

  return (
    <section className={cx('tw-rec', className)} aria-label={heading}>
      <div className="tw-rec-head">
        <h3 className="tw-rec-title">{heading}</h3>
        <p className="tw-rec-note">
          <Icon name="Lock" size={16} />
          {note || t('ds.actions.voiceRecorder.note')}
        </p>
      </div>
      {children}
      <div className="tw-rec-row">{row}</div>
    </section>
  );
}
