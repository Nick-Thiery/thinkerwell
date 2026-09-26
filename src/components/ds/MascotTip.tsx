import type { ReactNode } from 'react';
import { Mascot } from './Mascot';
import { cx } from './internal/cx';
import './MascotTip.css';

export interface MascotTipProps {
  src: string;
  /** Pixel size. Default 88. */
  size?: number;
  tone?: 'lavender' | 'lemon' | 'paper';
  float?: boolean;
  /** One or two short sentences: a gentle hint or encouragement, never an instruction the learner must read. */
  children: ReactNode;
}

/** The mascot with a short speech bubble. At most one per screen; never covers the task. */
export function MascotTip({ src, size = 88, tone, float, children }: MascotTipProps) {
  return (
    <div className={cx('tw-tip', tone && `tw-tip-${tone}`)}>
      <Mascot src={src} size={size} float={float !== false} />
      <div className="tw-tip-bubble">{children}</div>
    </div>
  );
}
