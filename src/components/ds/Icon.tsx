import type { CSSProperties } from 'react';
import { DIRECTIONAL_ICONS, ICONS, type IconName } from './icons';
import { cx } from './internal/cx';
import './Icon.css';

export type { IconName };

export interface IconProps {
  name: IconName;
  /** Pixel size. Default 20; stage and section discs pass a larger value. */
  size?: number;
  /** Makes the icon announced on its own (role="img" + aria-label). Omit when text sits beside it. */
  label?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Outline icon on a 24px grid, names following Lucide (docs/design-system/README.md).
 * Icons that point along the reading direction (the arrows, ChevronRight, LogOut)
 * mirror automatically in dir="rtl"; nothing else needs to do that.
 */
export function Icon({ name, size = 20, label, strokeWidth = 2, className, style }: IconProps) {
  const Glyph = ICONS[name] ?? ICONS.HelpCircle;
  const mirrors = DIRECTIONAL_ICONS.has(name);
  return (
    <Glyph
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={cx('tw-icon', mirrors && 'tw-icon-directional', className)}
      style={style}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    />
  );
}
