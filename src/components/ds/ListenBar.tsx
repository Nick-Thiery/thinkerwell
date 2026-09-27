import type { ReactElement } from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import { SegmentedControl } from './SegmentedControl';
import { cx } from './internal/cx';
import { useI18n } from '../../i18n';
import './ListenBar.css';

export type ListenSpeed = 'slow' | 'normal';

export interface ListenBarProps {
  state?: 'playing' | 'paused';
  speed?: ListenSpeed;
  /** Default "Reading aloud". */
  label?: string;
  onPlayPause?: () => void;
  onSpeedChange?: (speed: ListenSpeed) => void;
  onStop?: () => void;
  className?: string;
}

/**
 * The controls shown while a reading is read aloud (the Listen tool),
 * above the reading card. Uses the device's own voice, so it works offline.
 * State and callbacks only: the Read stage reads with speechSynthesis
 * (src/pages/lesson/read/useListen.ts).
 */
export function ListenBar({
  state,
  speed = 'normal',
  label,
  onPlayPause,
  onSpeedChange,
  onStop,
  className,
}: ListenBarProps): ReactElement {
  const { t } = useI18n();
  const playing = state !== 'paused';

  return (
    <div className={cx('tw-listen', className)} role="group" aria-label={label || t('ds.actions.listenBar.label')}>
      <span className="tw-listen-label">
        <Icon name="Volume2" />
        {label || t('ds.actions.listenBar.label')}
      </span>
      <div className="tw-listen-actions">
        <Button variant="secondary" icon={playing ? 'Pause' : 'Play'} onClick={onPlayPause}>
          {playing ? t('ds.actions.listenBar.pause') : t('ds.actions.listenBar.play')}
        </Button>
        <SegmentedControl
          label={t('ds.actions.listenBar.speedLabel')}
          value={speed}
          onChange={(value) => onSpeedChange?.(value as ListenSpeed)}
          options={[
            { label: t('ds.actions.listenBar.slow'), value: 'slow' },
            { label: t('ds.actions.listenBar.normal'), value: 'normal' },
          ]}
        />
        <Button variant="ghost" icon="Square" onClick={onStop}>
          {t('ds.actions.listenBar.stop')}
        </Button>
      </div>
    </div>
  );
}
