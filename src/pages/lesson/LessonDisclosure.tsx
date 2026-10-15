import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from '../../components/ds';
import { cx } from '../../components/ds/internal/cx';
import './LessonDisclosure.css';

export interface LessonDisclosureProps {
  /** The words on the summary: what opening it gives ("Need help writing?", "Key words"). */
  summary: ReactNode;
  /** An icon before the words, after the chevron. */
  icon?: IconName;
  /**
   * Whether it starts open. Read on every render until the learner opens or
   * closes it themselves; from then on their choice stands (so saved work
   * arriving late can still open it, and nothing snaps shut while they work).
   */
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The lessons' one way of keeping optional help out of the way until it is
 * wanted (docs/notes/simpler-lessons.md): a native details element, so it
 * works by keyboard and screen reader with nothing added, and what is inside
 * stays mounted while closed (typing, ticks and a plan are never lost).
 * Plain words on the summary, never an icon alone.
 */
export function LessonDisclosure({ summary, icon, defaultOpen = false, className, children }: LessonDisclosureProps) {
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = chosen ?? defaultOpen;
  return (
    <details
      className={cx('tw-fold', className)}
      open={open}
      onToggle={(event) => {
        const isOpen = event.currentTarget.open;
        if (isOpen !== open) setChosen(isOpen);
      }}
    >
      <summary className="tw-fold-summary">
        <Icon name="ChevronDown" size={20} className="tw-fold-chevron" />
        {icon ? <Icon name={icon} size={20} /> : null}
        <span>{summary}</span>
      </summary>
      <div className="tw-fold-body">{children}</div>
    </details>
  );
}
