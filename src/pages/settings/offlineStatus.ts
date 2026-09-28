/**
 * What to say about the offline copy of the course, for each state of the
 * service worker's download (src/offline/serviceWorker.ts). Shared by
 * Settings ("Offline and data") and the educators' "Set up this device"
 * page, so both say the same thing.
 */
import type { IconName } from '../../components/ds';
import type { MessageKey } from '../../i18n';
import type { OfflineStatus } from '../../offline';

export const OFFLINE_STATUS: Record<OfflineStatus, { icon: IconName; key: MessageKey }> = {
  checking: { icon: 'Clock', key: 'pages.settings.offline.checking' },
  preparing: { icon: 'Download', key: 'pages.settings.offline.preparing' },
  ready: { icon: 'Check', key: 'pages.settings.offline.ready' },
  failed: { icon: 'Info', key: 'pages.settings.offline.failed' },
  unsupported: { icon: 'Info', key: 'pages.settings.offline.unsupported' },
};
