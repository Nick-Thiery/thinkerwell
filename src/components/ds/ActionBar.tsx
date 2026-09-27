import { useId, type ReactElement } from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import { cx } from './internal/cx';
import { useMediaQuery } from './internal/useMediaQuery';
import { useI18n } from '../../i18n';
import './ActionBar.css';

export interface ActionBarProps {
  /** Label of the previous step; omit to hide the back button. */
  back?: string;
  /** Default "Continue". */
  next?: string;
  /** What to do to continue, shown when Next is disabled. */
  helper?: string;
  disabled?: boolean;
  onBack?: () => void;
  onNext?: () => void;
  className?: string;
}

/**
 * The bar at the bottom of each lesson stage: Back on the left, the next
 * step on the right, and a helper line when it is waiting. Only the current
 * step's required answer can disable Next; optional items never block.
 */
export function ActionBar({ back, next, helper, disabled, onBack, onNext, className }: ActionBarProps): ReactElement {
  const { t } = useI18n();
  const reactId = useId();
  const helperId = helper ? `actionbar-help-${reactId}` : undefined;

  // Below 600px the bar stacks with the next step on top (ActionBar.css).
  // The DOM order follows what is drawn, so Tab reaches the buttons top to
  // bottom there and start to end on wider screens (WCAG 2.4.3), rather than
  // a CSS reverse that would leave focus going bottom to top.
  const stacked = useMediaQuery(ACTIONBAR_STACKED_QUERY);

  const backButton = back ? (
    <Button key="back" variant="ghost" icon="ArrowLeft" onClick={onBack}>
      {back}
    </Button>
  ) : (
    <span key="back" />
  );
  const nextGroup = (
    <div key="next" className="tw-actionbar-right">
      {helper ? (
        <span className="tw-actionbar-help" id={helperId}>
          <Icon name="Info" size={18} />
          {helper}
        </span>
      ) : null}
      <Button
        variant="primary"
        size="lg"
        iconRight="ArrowRight"
        disabled={disabled}
        aria-describedby={helperId}
        onClick={onNext}
      >
        {next || t('ds.actions.actionBar.continue')}
      </Button>
    </div>
  );

  return (
    <div className={cx('tw-actionbar', className)}>{stacked ? [nextGroup, backButton] : [backButton, nextGroup]}</div>
  );
}

/** Where the bar stacks; keep in step with ActionBar.css. */
const ACTIONBAR_STACKED_QUERY = '(max-width: 600px)';
