import { cx } from './internal/cx';
import './Mascot.css';

export interface MascotProps {
  src: string;
  /** Pixel size. Default 160. Home hero 200-220, lesson complete 160, quiz results 140, tips 80-96. */
  size?: number;
  /** Default true; stops for prefers-reduced-motion. */
  float?: boolean;
  /** Empty by default: the mascot is decorative. */
  alt?: string;
}

/** The reader mascot at display size, with the gentle float. One per screen at most. */
export function Mascot({ src, size = 160, float = true, alt = '' }: MascotProps) {
  return (
    <div className={cx('tw-mascot', float !== false && 'tw-float')} style={{ width: size, height: size }}>
      <img src={src} alt={alt} width={size} height={size} />
    </div>
  );
}
