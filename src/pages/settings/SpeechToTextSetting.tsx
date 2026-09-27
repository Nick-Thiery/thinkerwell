/**
 * The "Say it" part of Settings, for educators: whether this browser can
 * turn speech into text on the device, a way to download what it needs
 * when it can, and "Allow online speech-to-text" (off by default).
 *
 * - The download (SpeechRecognition.install) is started only by an
 *   educator's tap here, never in a lesson: it comes from the browser's
 *   maker and can be large.
 * - The online switch is a device setting (settings.partner.
 *   allowOnlineDictation), saved through the page's useDeviceSettings().
 */
import { useEffect, useId, useState } from 'react';
import { Button, Icon } from '../../components/ds';
import type { IconName } from '../../components/ds';
import { useI18n, type MessageKey } from '../../i18n';
import { hasSpeechRecognition, installOnDeviceDictation, onDeviceDictationStatus } from '../../speech';
import type { DeviceSettingsState } from './useDeviceSettings';

type DeviceSpeech =
  | 'checking'
  | 'on-device'
  | 'downloadable'
  | 'downloading'
  | 'download-failed'
  | 'online-only'
  | 'none';

async function checkDeviceSpeech(): Promise<DeviceSpeech> {
  if (!hasSpeechRecognition()) return 'none';
  const status = await onDeviceDictationStatus();
  if (status === 'available') return 'on-device';
  if (status === 'downloadable' || status === 'downloading') return status;
  return 'online-only';
}

const STATUS: Record<Exclude<DeviceSpeech, 'checking'>, { icon: IconName; key: MessageKey }> = {
  'on-device': { icon: 'Check', key: 'pages.settings.sayIt.onDevice' },
  downloadable: { icon: 'Download', key: 'pages.settings.sayIt.downloadable' },
  downloading: { icon: 'Clock', key: 'pages.settings.sayIt.downloading' },
  'download-failed': { icon: 'Info', key: 'pages.settings.sayIt.downloadFailed' },
  'online-only': { icon: 'Info', key: 'pages.settings.sayIt.onlineOnly' },
  none: { icon: 'Info', key: 'pages.settings.sayIt.none' },
};

export function SpeechToTextSetting({ deviceSettings }: { deviceSettings: DeviceSettingsState }) {
  const { t } = useI18n();
  const { settings, canSave, failed, save } = deviceSettings;
  const [device, setDevice] = useState<DeviceSpeech>('checking');
  const headingId = useId();
  const toggleId = useId();
  const toggleHelpId = useId();

  useEffect(() => {
    let cancelled = false;
    void checkDeviceSpeech().then((next) => {
      if (!cancelled) setDevice(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const download = async () => {
    setDevice('downloading');
    const ok = await installOnDeviceDictation();
    const next = await checkDeviceSpeech();
    setDevice(ok || next === 'on-device' ? next : 'download-failed');
  };

  const checkAgain = async () => {
    setDevice('checking');
    setDevice(await checkDeviceSpeech());
  };

  const status = device === 'checking' ? null : STATUS[device];

  return (
    <section className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2">
        {t('pages.settings.sayIt.title')}
      </h2>
      <p className="tw-settings-text">{t('pages.settings.sayIt.intro')}</p>

      <div className="tw-settings-status" role="status">
        {status ? (
          <>
            <Icon name={status.icon} size={20} />
            <span>{t(status.key)}</span>
          </>
        ) : (
          <span>{t('pages.settings.sayIt.checking')}</span>
        )}
      </div>

      {device === 'downloadable' || device === 'download-failed' ? (
        <div className="tw-settings-actions">
          <Button variant="secondary" icon="Download" onClick={() => void download()}>
            {t('pages.settings.sayIt.download')}
          </Button>
        </div>
      ) : device === 'downloading' ? (
        <div className="tw-settings-actions">
          <Button variant="ghost" icon="RotateCcw" onClick={() => void checkAgain()}>
            {t('pages.settings.sayIt.checkAgain')}
          </Button>
        </div>
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
