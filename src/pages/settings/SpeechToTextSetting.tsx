/**
 * The "Say it" part of Settings, for educators: "Check this device", which
 * asks whether this browser can turn speech into text on the device and
 * saves the answer, a way to download what it needs when it can, and "Allow
 * online speech-to-text" (off by default).
 *
 * - Nothing asks the browser as the page opens. "Check this device" asks
 *   (SpeechRecognition.available) only when an educator taps it, and saves
 *   the answer with the date in settings.speechCheck. Lessons read that
 *   answer instead of asking: asking as a page opened crashed the tab in
 *   Chromium 153 on touch devices (docs/notes/phase-5.md).
 * - The download (SpeechRecognition.install) is started only by an
 *   educator's tap here, never in a lesson: it comes from the browser's
 *   maker and can be large. Its result is checked and saved the same way.
 * - The online switch is a device setting (settings.partner.
 *   allowOnlineDictation), saved through the page's useDeviceSettings().
 */
import { useId, useState } from 'react';
import { Button, Icon } from '../../components/ds';
import type { IconName } from '../../components/ds';
import { useI18n, type MessageKey } from '../../i18n';
import { hasSpeechRecognition, installOnDeviceDictation, onDeviceDictationStatus } from '../../speech';
import type { OnDeviceSpeechStatus, SpeechCheck } from '../../storage';
import type { DeviceSettingsState } from './useDeviceSettings';

type DeviceSpeech =
  | 'not-checked'
  | 'on-device'
  | 'downloadable'
  | 'downloading'
  | 'download-failed'
  | 'online-only'
  | 'none';

/** What to say about this device, from the last check (no check needed where the browser has no speech recognition at all). */
function deviceSpeech(check: SpeechCheck | null): DeviceSpeech {
  if (!hasSpeechRecognition()) return 'none';
  if (!check) return 'not-checked';
  if (check.status === 'available') return 'on-device';
  if (check.status === 'downloadable' || check.status === 'downloading') return check.status;
  return 'online-only';
}

const STATUS: Record<DeviceSpeech | 'checking', { icon: IconName; key: MessageKey }> = {
  'not-checked': { icon: 'Info', key: 'pages.settings.sayIt.notChecked' },
  checking: { icon: 'Clock', key: 'pages.settings.sayIt.checking' },
  'on-device': { icon: 'Check', key: 'pages.settings.sayIt.onDevice' },
  downloadable: { icon: 'Download', key: 'pages.settings.sayIt.downloadable' },
  downloading: { icon: 'Clock', key: 'pages.settings.sayIt.downloading' },
  'download-failed': { icon: 'Info', key: 'pages.settings.sayIt.downloadFailed' },
  'online-only': { icon: 'Info', key: 'pages.settings.sayIt.onlineOnly' },
  none: { icon: 'Info', key: 'pages.settings.sayIt.none' },
};

export function SpeechToTextSetting({ deviceSettings }: { deviceSettings: DeviceSettingsState }) {
  const { t, lang } = useI18n();
  const { settings, canSave, failed, save } = deviceSettings;
  /** The last check made on this page: shown even where it couldn't be saved. */
  const [checked, setChecked] = useState<SpeechCheck | null>(null);
  const [busy, setBusy] = useState<'checking' | 'downloading' | null>(null);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const headingId = useId();
  const checkHelpId = useId();
  const toggleId = useId();
  const toggleHelpId = useId();

  const check = checked ?? settings?.speechCheck ?? null;
  const device = deviceSpeech(check);
  const shown: DeviceSpeech | 'checking' =
    busy === 'checking' ? 'checking' : busy === 'downloading' ? 'downloading' : downloadFailed ? 'download-failed' : device;
  const status = STATUS[shown];

  /** Shows the browser's answer and saves it on the device, with the date. */
  const keep = async (answer: OnDeviceSpeechStatus) => {
    const result: SpeechCheck = { status: answer, checkedAt: new Date().toISOString() };
    setChecked(result);
    if (canSave) await save({ speechCheck: result });
  };

  const checkDevice = async () => {
    if (busy) return;
    setBusy('checking');
    setDownloadFailed(false);
    const answer = await onDeviceDictationStatus();
    await keep(answer);
    setBusy(null);
  };

  const download = async () => {
    if (busy) return;
    setBusy('downloading');
    setDownloadFailed(false);
    const ok = await installOnDeviceDictation();
    const answer = await onDeviceDictationStatus();
    await keep(answer);
    setBusy(null);
    setDownloadFailed(!ok && answer !== 'available');
  };

  const checkedOn =
    check && busy === null
      ? t('pages.settings.sayIt.checkedOn', {
          date: new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(check.checkedAt)),
        })
      : '';
  const offerDownload = busy === null && (shown === 'downloadable' || shown === 'download-failed');

  return (
    <section className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2">
        {t('pages.settings.sayIt.title')}
      </h2>
      <p className="tw-settings-text">{t('pages.settings.sayIt.intro')}</p>

      {/* Nothing until the saved check has loaded, so "not checked yet" never flashes up. */}
      {settings !== null || checked !== null ? (
        <>
          <div className="tw-settings-status" role="status">
            <Icon name={status.icon} size={20} />
            <span>
              {t(status.key)}
              {checkedOn && device !== 'none' ? ` ${checkedOn}` : ''}
            </span>
          </div>

          {device !== 'none' ? (
            <div className="tw-settings-device">
              <div className="tw-settings-actions">
                {offerDownload ? (
                  <Button variant="secondary" icon="Download" onClick={() => void download()}>
                    {t('pages.settings.sayIt.download')}
                  </Button>
                ) : null}
                <Button
                  variant={offerDownload ? 'ghost' : 'secondary'}
                  icon="Search"
                  aria-describedby={checkHelpId}
                  onClick={() => void checkDevice()}
                >
                  {t('pages.settings.sayIt.checkDevice')}
                </Button>
              </div>
              <p id={checkHelpId} className="tw-settings-help">
                {t('pages.settings.sayIt.checkHelp')}
                {!canSave ? ` ${t('pages.settings.noStorage')}` : ''}
                {failed === 'speechCheck' ? ` ${t('pages.settings.saveFailed')}` : ''}
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="tw-settings-option">
        <label className="tw-settings-check" htmlFor={toggleId}>
          <input
            id={toggleId}
            type="checkbox"
            className="tw-settings-checkbox"
            checked={settings?.partner.allowOnlineDictation === true}
            disabled={!canSave || settings === null}
            aria-describedby={toggleHelpId}
            onChange={(event) => void save({ partner: { allowOnlineDictation: event.currentTarget.checked } })}
          />
          <span>{t('pages.settings.sayIt.allowOnline')}</span>
        </label>
        <p id={toggleHelpId} className="tw-settings-help">
          {t('pages.settings.sayIt.allowOnlineHelp')}
          {!canSave ? ` ${t('pages.settings.noStorage')}` : ''}
          {failed === 'partner' ? ` ${t('pages.settings.saveFailed')}` : ''}
        </p>
      </div>

      <p className="tw-settings-note">
        <Icon name="Lock" size={18} />
        <span>{t('pages.settings.sayIt.recordingsNote')}</span>
      </p>
    </section>
  );
}
