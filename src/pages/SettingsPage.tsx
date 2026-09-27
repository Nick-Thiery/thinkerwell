import { usePageTitle } from '../app/usePageTitle';
import { useI18n } from '../i18n';
import { OfflineSetting } from './settings/OfflineSetting';
import { ReadingSetting } from './settings/ReadingSetting';
import { SpeechToTextSetting } from './settings/SpeechToTextSetting';
import { useDeviceSettings } from './settings/useDeviceSettings';
import './settings/SettingsPage.css';

/**
 * Settings for this device (/settings), for teachers and volunteers, linked
 * from the header menu: offline use and Save data, the reading level and
 * Listen speed, and Say it (phase 5). Everything here is a device setting
 * (settings store), shared by everyone who uses the device, and saved even
 * while looking around.
 */
export function SettingsPage() {
  const { t } = useI18n();
  usePageTitle(t('pages.settings.title'));
  const deviceSettings = useDeviceSettings();
  return (
    <div className="tw-settings">
      <header className="tw-settings-head">
        <h1 className="h1" tabIndex={-1}>
          {t('pages.settings.title')}
        </h1>
        <p className="body-lg">{t('pages.settings.intro')}</p>
      </header>
      <OfflineSetting deviceSettings={deviceSettings} />
      <ReadingSetting deviceSettings={deviceSettings} />
      <SpeechToTextSetting deviceSettings={deviceSettings} />
    </div>
  );
}
