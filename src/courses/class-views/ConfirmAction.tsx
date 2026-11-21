import { useState, type ReactNode } from 'react';
import { ApiError } from '../../classes/client';
import { Button } from '../../components/ds';
import type { I18nContextValue } from '../../i18n';

type ButtonProps = Parameters<typeof Button>[0];

/**
 * A button whose action can't be taken back with one tap (a new link stops
 * the old one working; closing a class or switching off an organisation stops
 * its learners sharing), so it asks first, in place, like "Take out of class".
 * On a phone a mis-tap is easy, and the person who loses their link is
 * someone else. If the action fails, it says so instead of doing nothing.
 */
export function ConfirmAction({
  label,
  question,
  confirm,
  onConfirm,
  i18n,
  variant = 'secondary',
  icon,
}: {
  label: ReactNode;
  question: ReactNode;
  confirm: ReactNode;
  onConfirm: () => Promise<unknown>;
  i18n: I18nContextValue;
  variant?: ButtonProps['variant'];
  icon?: ButtonProps['icon'];
}) {
  const { t } = i18n;
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (!asking) {
    return (
      <Button variant={variant} icon={icon} onClick={() => (setAsking(true), setProblem(null))}>
        {label}
      </Button>
    );
  }
  return (
    <div className="tw-cv-confirm" role="group">
      <p>{question}</p>
      <div className="tw-cv-actions">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            onConfirm().then(
              () => (setBusy(false), setAsking(false)),
              (error: unknown) => (setBusy(false), setProblem(t(`classViews.problem.${error instanceof ApiError ? error.problem : 'failed'}`))),
            );
          }}
        >
          {confirm}
        </Button>
        <Button variant="ghost" onClick={() => setAsking(false)}>
          {t('classViews.common.notNow')}
        </Button>
      </div>
      {problem ? (
        <p className="small" role="alert">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
