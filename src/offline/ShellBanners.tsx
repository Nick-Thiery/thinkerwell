/**
 * The connection and update messages under the site header
 * (StatusBanner.md, docs/screens/TabletLesson.dc.html). None of them ever
 * blocks the page or moves focus; each is a polite status message.
 */
import { useEffect, useState } from 'react';
import { StatusBanner } from '../components/ds';
import { useI18n } from '../i18n';
import { applyServiceWorkerUpdate, useServiceWorker } from './serviceWorker';
import { useOnline } from './useOnline';

/** How long "You're back online." stays before it hides by itself. */
export const BACK_ONLINE_MS = 5000;

export interface ConnectionBannerProps {
  /** A learner is chosen, so their work is saved (not looking around, not nobody). */
  learner: boolean;
  /** On a lesson page (TabletLesson.dc.html's wording). */
  inLesson: boolean;
  className?: string;
}

/**
 * Offline: the ink banner, for as long as the device is offline. Back
 * online: the teal banner for a few seconds. Nothing on a page that has
 * been online all along.
 */
export function ConnectionBanner({ learner, inLesson, className }: ConnectionBannerProps) {
  const { t } = useI18n();
  const online = useOnline();
  const { offline: status } = useServiceWorker();
  const ready = status === 'ready';

  // "Back" shows only after being offline on this page, never on arrival.
  // Each return gets a new number, so the timer restarts if the connection
  // drops and comes back again while it shows.
  const [lastOnline, setLastOnline] = useState(online);
  const [back, setBack] = useState(0);
  if (online !== lastOnline) {
    setLastOnline(online);
    setBack(online ? back + 1 : 0);
  }
  useEffect(() => {
    if (back === 0) return undefined;
    const timer = setTimeout(() => setBack(0), BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [back]);

  if (!online) {
    const body = learner
      ? t(inLesson && ready ? 'offline.offlineLesson' : 'offline.offlineLearner')
      : t(ready ? 'offline.offlineGuest' : 'offline.offlineGuestNotReady');
    return (
      <StatusBanner className={className} tone="offline" title={t('offline.offlineTitle')}>
        {body}
      </StatusBanner>
    );
  }
  if (back > 0) {
    return (
      <StatusBanner className={className} tone="back" title={t('offline.backTitle')}>
        {learner ? t('offline.backLearner') : null}
      </StatusBanner>
    );
  }
  return null;
}

export interface UpdateBannerProps {
  learner: boolean;
  className?: string;
}

/** "A new version is ready", with "Update now". The new version never starts by itself while the page is open. */
export function UpdateBanner({ learner, className }: UpdateBannerProps) {
  const { t } = useI18n();
  const { updateReady } = useServiceWorker();
  if (!updateReady) return null;
  return (
    <StatusBanner
      className={className}
      tone="info"
      icon="RefreshCw"
      title={t('offline.updateTitle')}
      action={t('offline.updateAction')}
      onAction={applyServiceWorkerUpdate}
    >
      {t(learner ? 'offline.updateBodyLearner' : 'offline.updateBody')}
    </StatusBanner>
  );
}
