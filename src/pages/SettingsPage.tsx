import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { usePageTitle } from '../app/usePageTitle';
import { useI18n } from '../i18n';
import { useLearnerSession } from '../session';
import { LanguageSetting } from './settings/LanguageSetting';
import { LessonAudioSetting } from './settings/LessonAudioSetting';
import { ListenVoiceSetting } from './settings/ListenVoiceSetting';
import { OfflineSetting } from './settings/OfflineSetting';
import { PilotResultsSetting } from './settings/PilotResultsSetting';
import { ReadingSetting } from './settings/ReadingSetting';
import { SpeechToTextSetting } from './settings/SpeechToTextSetting';
import { useDeviceSettings } from './settings/useDeviceSettings';
import { WorkFileSetting } from './settings/WorkFileSetting';
import './settings/SettingsPage.css';

/**
 * Settings for this device (/settings), for teachers and volunteers, linked
 * from the header menu. What anyone might change comes first: the interface
 * language (once a second one is ready), the reading level and Listen
 * speed, offline use and Save data. Then, under "For educators setting up
 * this device": moving learners' work to another device through a file,
 * Listen's voice, the lesson audio for Listen without the internet, Say it (phase 5) and, for a pilot only, "Share pilot results" (off unless an educator turns it on). Everything else here is a device setting (settings
 * store), shared by everyone who uses the device, and saved even while
 * looking around.
 *
 * Five parts have addresses of their own, for the educators' "Set up this
 * device" page and the pilot notes: /settings#listen-voice,
 * /settings#lesson-audio, /settings#say-it, /settings#move-work and
 * /settings#share-results (settingsPath()).
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
      {/* What anyone might change first; then what an educator sets up once (docs/notes/simpler-lessons.md). */}
      <LanguageSetting />
      <ReadingSetting deviceSettings={deviceSettings} />
      <OfflineSetting deviceSettings={deviceSettings} />
      <div className="tw-settings-more">
        <p className="eyebrow">{t('pages.settings.moreTitle')}</p>
        <p className="tw-settings-help">{t('pages.settings.moreIntro')}</p>
      </div>
      <WorkFileSetting />
      <ListenVoiceSetting deviceSettings={deviceSettings} />
      <LessonAudioSetting deviceSettings={deviceSettings} />
      <SpeechToTextSetting deviceSettings={deviceSettings} />
      <PilotResultsSetting deviceSettings={deviceSettings} />
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
