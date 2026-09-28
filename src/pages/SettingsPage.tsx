import { usePageTitle } from '../app/usePageTitle';
import { useI18n } from '../i18n';
import { LanguageSetting } from './settings/LanguageSetting';
import { OfflineSetting } from './settings/OfflineSetting';
import { ReadingSetting } from './settings/ReadingSetting';
import { SpeechToTextSetting } from './settings/SpeechToTextSetting';
import { useDeviceSettings } from './settings/useDeviceSettings';
import { WorkFileSetting } from './settings/WorkFileSetting';
import './settings/SettingsPage.css';

/**
 * Settings for this device (/settings), for teachers and volunteers, linked
 * from the header menu: the interface language (once a second one is
 * ready), offline use and Save data, moving learners' work to another
 * device through a file, the reading level and Listen speed, and Say it
 * (phase 5). Everything else here is a device setting (settings
 * store), shared by everyone who uses the device, and saved even while
 * looking around.
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
      <LanguageSetting />
      <OfflineSetting deviceSettings={deviceSettings} />
      <WorkFileSetting />
      <ReadingSetting deviceSettings={deviceSettings} />
      <SpeechToTextSetting deviceSettings={deviceSettings} />
    </div>
  );
}
