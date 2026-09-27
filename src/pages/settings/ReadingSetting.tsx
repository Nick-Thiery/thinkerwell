/**
 * "Reading and listening" in Settings: the reading level lessons open in
 * for anyone who hasn't chosen one (settings.preferredReadingLevel), and
 * Listen's speed (settings.listeningSpeed).
 */
import { useId } from 'react';
import { SegmentedControl } from '../../components/ds';
import { useI18n } from '../../i18n';
import { useListenVoice } from '../../speech';
import type { ListeningSpeed, ReadingLevel } from '../../storage';
import type { DeviceSettingsState } from './useDeviceSettings';

export function ReadingSetting({ deviceSettings }: { deviceSettings: DeviceSettingsState }) {
  const { t } = useI18n();
  const { settings, canSave, failed, save } = deviceSettings;
  const voice = useListenVoice();
  const headingId = useId();
  const levelHelpId = useId();
  const speedHelpId = useId();
  const disabled = !canSave || settings === null;
  const levelLabel = t('pages.settings.reading.level');
  const speedLabel = t('pages.settings.reading.speed');

  return (
    <section className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2">
        {t('pages.settings.reading.title')}
      </h2>

      <div className="tw-settings-field">
        <span className="tw-settings-label" aria-hidden="true">
          {levelLabel}
        </span>
        <SegmentedControl
          label={levelLabel}
          describedBy={levelHelpId}
          disabled={disabled}
          value={settings?.preferredReadingLevel}
          options={[
            { value: 'standard', label: t('lessonPlayer.read.levelStandard') },
            { value: 'simpler', label: t('lessonPlayer.read.levelSimpler') },
          ]}
          onChange={(value) => void save({ preferredReadingLevel: value as ReadingLevel })}
        />
        <p id={levelHelpId} className="tw-settings-help">
          {t('pages.settings.reading.levelHelp')}
          {failed === 'preferredReadingLevel' ? ` ${t('pages.settings.saveFailed')}` : ''}
        </p>
      </div>

      <div className="tw-settings-field">
        <span className="tw-settings-label" aria-hidden="true">
          {speedLabel}
        </span>
        <SegmentedControl
          label={speedLabel}
          describedBy={speedHelpId}
          disabled={disabled}
          value={settings?.listeningSpeed}
          options={[
            { value: 'slow', label: t('ds.actions.listenBar.slow') },
            { value: 'normal', label: t('ds.actions.listenBar.normal') },
          ]}
          onChange={(value) => void save({ listeningSpeed: value as ListeningSpeed })}
        />
        <p id={speedHelpId} className="tw-settings-help">
          {t('pages.settings.reading.speedHelp')}
          {voice ? '' : ` ${t('pages.settings.reading.noVoice')}`}
          {failed === 'listeningSpeed' ? ` ${t('pages.settings.saveFailed')}` : ''}
        </p>
      </div>

      {!canSave ? <p className="tw-settings-help">{t('pages.settings.noStorage')}</p> : null}
    </section>
  );
}
