import { useId, type ReactElement } from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import { cx } from './internal/cx';
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

  return (
    <div className={cx('tw-actionbar', className)}>
      {back ? (
        <Button variant="ghost" icon="ArrowLeft" onClick={onBack}>
          {back}
        </Button>
      ) : (
        <span />
      )}
      <div className="tw-actionbar-right">
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
    </div>
  );
}
