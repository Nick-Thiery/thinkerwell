import type { ReactElement, ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import { useI18n } from '../../i18n';
import './VoiceButton.css';

export interface VoiceButtonProps {
  state?: 'idle' | 'listening';
  /** Default "Say it". */
  children?: ReactNode;
  /** Default "Stop". */
  stopLabel?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * The "Say it" microphone button. Idle: a lavender mic disc and "Say it".
 * Listening: the button turns ink, the disc turns lemon and pulses, and the
 * label becomes "Stop". State and the click callback only: turning speech
 * into text is wired up in a later phase.
 */
export function VoiceButton({ state = 'idle', children, stopLabel, onClick, className }: VoiceButtonProps): ReactElement {
  const { t } = useI18n();
  const on = state === 'listening';
  return (
    <button
      type="button"
      className={cx('tw-voice', on && 'tw-voice-on', className)}
      aria-pressed={on}
      onClick={onClick}
    >
      <span className="tw-voice-dot" aria-hidden="true">
        <Icon name={on ? 'Square' : 'Mic'} size={18} />
      </span>
      <span>{on ? (stopLabel ?? t('ds.actions.voiceButton.stop')) : (children ?? t('ds.actions.voiceButton.sayIt'))}</span>
    </button>
  );
}
