import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { usePageTitle } from '../app/usePageTitle';
import { useI18n } from '../i18n';
import { useLearnerSession } from '../session';
import { LanguageSetting } from './settings/LanguageSetting';
import { ListenVoiceSetting } from './settings/ListenVoiceSetting';
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
 * device through a file, the reading level and Listen speed, Listen's
 * voice, and Say it (phase 5). Everything else here is a device setting (settings
 * store), shared by everyone who uses the device, and saved even while
 * looking around.
 *
 * Three parts have addresses of their own, for the educators' "Set up this
 * device" page: /settings#listen-voice, /settings#say-it and
 * /settings#move-work (settingsPath()).
 */
export function SettingsPage() {
  const { t } = useI18n();
  usePageTitle(t('pages.settings.title'));
  const deviceSettings = useDeviceSettings();
  useScrollToPart(deviceSettings.settings !== null);
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
      <ListenVoiceSetting deviceSettings={deviceSettings} />
      <SpeechToTextSetting deviceSettings={deviceSettings} />
    </div>
  );
}

/**
 * With a part in the address (#say-it), scrolls to it and moves focus to its
 * heading once the page has loaded. Scrolling as the page first draws (what
 * the router does by itself) lands in the wrong place, because the parts
 * above it grow once the settings and the learners are read.
 */
function useScrollToPart(settingsLoaded: boolean): void {
  const { hash } = useLocation();
  const { status } = useLearnerSession();
  const ready = settingsLoaded && status === 'ready';
  useEffect(() => {
    if (!ready || hash.length < 2) return undefined;
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return undefined;
    }
    const part = document.getElementById(id);
    if (!part) return undefined;
    const frame = requestAnimationFrame(() => {
      part.scrollIntoView({ block: 'start' });
      part.querySelector<HTMLElement>('h2[tabindex="-1"]')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, hash]);
}
