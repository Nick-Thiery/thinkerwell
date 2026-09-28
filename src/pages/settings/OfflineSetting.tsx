/**
 * "Offline and data" in Settings: whether the whole course is kept on this
 * device (the service worker, src/offline/serviceWorker.ts), and "Save
 * data", which turns the videos off (src/offline/saveData.ts).
 */
import { useId } from 'react';
import { Icon } from '../../components/ds';
import { getLessons } from '../../content';
import { useI18n } from '../../i18n';
import { browserAsksToSaveData, isSaveDataOn, useServiceWorker } from '../../offline';
import { OFFLINE_STATUS } from './offlineStatus';
import type { DeviceSettingsState } from './useDeviceSettings';

export function OfflineSetting({ deviceSettings }: { deviceSettings: DeviceSettingsState }) {
  const { t } = useI18n();
  const { offline } = useServiceWorker();
  const { settings, canSave, failed, save } = deviceSettings;
  const headingId = useId();
  const toggleId = useId();
  const helpId = useId();
  const status = OFFLINE_STATUS[offline];
  const choice = settings?.saveData ?? null;
  const followsBrowser = choice === null && browserAsksToSaveData();

  return (
    <section className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2">
        {t('pages.settings.offline.title')}
      </h2>
      <div className="tw-settings-status" role="status">
        <Icon name={status.icon} size={20} />
        <span>{t(status.key, { count: getLessons().length })}</span>
      </div>

      <div className="tw-settings-option">
        <label className="tw-settings-check" htmlFor={toggleId}>
          <input
            id={toggleId}
            type="checkbox"
            className="tw-settings-checkbox"
            checked={isSaveDataOn(choice)}
            disabled={!canSave || settings === null}
            aria-describedby={helpId}
            onChange={(event) => void save({ saveData: event.currentTarget.checked })}
          />
          <span>{t('pages.settings.offline.saveData')}</span>
        </label>
        <p id={helpId} className="tw-settings-help">
          {t('pages.settings.offline.saveDataHelp')}
          {followsBrowser ? ` ${t('pages.settings.offline.saveDataFromBrowser')}` : ''}
          {!canSave ? ` ${t('pages.settings.noStorage')}` : ''}
          {failed === 'saveData' ? ` ${t('pages.settings.saveFailed')}` : ''}
        </p>
      </div>
    </section>
  );
}
