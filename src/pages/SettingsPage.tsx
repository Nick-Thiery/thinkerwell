import { usePageTitle } from '../app/usePageTitle';
import { useI18n } from '../i18n';
import { SpeechToTextSetting } from './settings/SpeechToTextSetting';
import './settings/SettingsPage.css';

/**
 * Settings for this device (/settings), for teachers and volunteers. Phase 5
 * adds the Say it settings; phase 6 adds the rest (save data, reading level
 * default, listening speed) and a link from the header menu.
 */
export function SettingsPage() {
  const { t } = useI18n();
  usePageTitle(t('pages.settings.title'));
  return (
    <div className="tw-settings">
      <header className="tw-settings-head">
        <h1 className="h1" tabIndex={-1}>
          {t('pages.settings.title')}
        </h1>
        <p className="body-lg">{t('pages.settings.intro')}</p>
      </header>
      <SpeechToTextSetting />
    </div>
  );
}
