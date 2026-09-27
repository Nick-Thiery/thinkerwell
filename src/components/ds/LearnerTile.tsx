import { Icon } from './Icon';
import { cx } from './internal/cx';
import './LearnerTile.css';

/**
 * Small copy of bundle.js's internal `Avatar` helper, for LearnerTile only
 * (SiteHeader's learner chip needs its own instance too; components don't
 * share this across files, per the phase-2 split).
 */
function Avatar({ name, tone, large }: { name?: string; tone?: string; large?: boolean }) {
  return (
    <span className={cx('tw-avatar', large && 'tw-avatar-lg', `tw-tone-${tone || 'lavender'}`)} aria-hidden="true">
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  );
}

export interface LearnerTileProps {
  name: string;
  tone?: string;
  meta?: string;
  selected?: boolean;
  variant?: 'person' | 'new' | 'guest';
  className?: string;
  /** Not in the reference's index.d.ts; added so a caller (phase 3) can wire the tile up. */
  onClick?: () => void;
  /**
   * Not in the reference's index.d.ts; added so the "Who's learning?" picker
   * can offer to remove a learner. Only meaningful for variant="person".
   * Rendered as its own button beside the tile, never inside it — a button
   * can't nest inside another button — so the tile itself stays one single
   * tap target and this is a clearly separate, smaller one. The caller
   * builds the actual confirmation (CLAUDE.md rule 3: no bare window.confirm).
   */
  onRemove?: () => void;
  /** Accessible label for the remove button, e.g. "Remove Amina". Required whenever `onRemove` is given. */
  removeLabel?: string;
}

/**
 * A big tap target on the "Who's learning?" screen: a learner on this
 * device, "I'm new", or "Just look around" (docs/design-system/components/LearnerTile.md).
 * Shows a first name only: no photos, no surnames.
 */
export function LearnerTile({ name, tone, meta, selected, variant = 'person', className, onClick, onRemove, removeLabel }: LearnerTileProps) {
  const avatar =
    variant === 'new' ? (
      <span className="tw-avatar tw-avatar-lg">
        <Icon name="Plus" size={30} />
      </span>
    ) : variant === 'guest' ? (
      <span className="tw-avatar tw-avatar-lg tw-tone-lemon">
        <Icon name="Eye" size={28} />
      </span>
    ) : (
      <Avatar large tone={tone} name={name} />
    );
  const tile = (
    <button
      type="button"
      className={cx('tw-tile', variant === 'new' && 'tw-tile-new', className)}
      aria-pressed={selected ? 'true' : undefined}
      onClick={onClick}
    >
      {avatar}
      <span className="tw-tile-name">{name}</span>
      {meta ? <span className="tw-tile-meta">{meta}</span> : null}
    </button>
  );

  if (variant !== 'person' || !onRemove) return tile;

  return (
    <span className="tw-tile-wrap">
      {tile}
      <button type="button" className="tw-menu-btn tw-tile-remove" aria-label={removeLabel} onClick={onRemove}>
        <Icon name="Trash2" size={18} />
      </button>
    </span>
  );
}
