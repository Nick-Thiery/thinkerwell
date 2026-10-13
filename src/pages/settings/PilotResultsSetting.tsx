/**
 * "Share pilot results" in Settings, for educators (docs/notes/pilot-measurement.md).
 * Off by default. Two things turn pilot measurement on for a device: an
 * organisation code (given by Thinkerwell) and this switch, which is only
 * offered once a valid code is saved. Even then nothing is queued or sent
 * for a learner who doesn't use a pilot code as their name, or for anyone
 * looking around.
 *
 * The words load with this page (`pilotResults` in src/i18n/lazyGroups.ts).
 * The queue's count is read only while sharing is on, and only here.
 */
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import words from 'virtual:thinkerwell/messages/pilotResults';
import { Button, Icon, TextField } from '../../components/ds';
import { useI18n, withWords } from '../../i18n';
import { isValidOrgCode, normaliseOrgCode, sharingOrg } from '../../measurement/gate';
import type { SettingsPart } from '../../app/lessonUrls';
import type { DeviceSettingsState } from './useDeviceSettings';

/** The part's address on the page (/settings#share-results). */
const SHARE_RESULTS_PART: SettingsPart = 'share-results';

interface QueueStatus {
  pending: number;
  pausedUntil: number | null;
}

/** What is waiting to be sent, while sharing is on; null before it is known (or when sharing is off). */
function useQueueStatus(on: boolean, refresh: number): QueueStatus | null {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  useEffect(() => {
    if (!on) return undefined;
    let alive = true;
    void import('../../measurement/measurementCollector')
      .then((collector) => collector.status())
      .then(
        (found) => {
          if (alive) setStatus(found);
        },
        () => undefined,
      );
    return () => {
      alive = false;
    };
  }, [on, refresh]);
  return on ? status : null;
}

export function PilotResultsSetting({ deviceSettings }: { deviceSettings: DeviceSettingsState }) {
  const parent = useI18n();
  const { t } = useMemo(() => withWords(parent, words), [parent]);
  const { settings, canSave, failed, save } = deviceSettings;
  const headingId = useId();
  const codeId = useId();
  const shareId = useId();
  const shareHelpId = useId();

  const savedCode = settings?.partner.organisationCode ?? '';
  const org = sharingOrg(settings?.partner);
  const sharing = org !== null;
  const hasCode = isValidOrgCode(savedCode);
  const [draft, setDraft] = useState<string | null>(null);
  const [codeSaved, setCodeSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const queue = useQueueStatus(sharing, refresh);

  const shownCode = draft ?? savedCode;
  const normalised = normaliseOrgCode(shownCode);
  const invalid = draft !== null && normalised !== '' && !isValidOrgCode(normalised);
  const disabled = !canSave || settings === null;

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    if (disabled || invalid) return;
    // An empty code switches sharing off with it: there is nothing to share with.
    const patch = normalised === '' ? { organisationCode: '', sharePilotResults: false } : { organisationCode: normalised };
    setCodeSaved(false);
    void save({ partner: patch }).then(() => {
      setDraft(null);
      setCodeSaved(true);
    });
  };

  const deleteWaiting = () => {
    void import('../../measurement/measurementCollector')
      .then((collector) => collector.purge())
      .then(() => {
        setDeleted(true);
        setRefresh((n) => n + 1);
      });
  };

  return (
    <section id={SHARE_RESULTS_PART} className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2" tabIndex={-1}>
        {t('pilotResults.title')}
      </h2>
      <p className="tw-settings-text">{t('pilotResults.intro')}</p>

      <form className="tw-settings-field" onSubmit={submitCode}>
        <TextField
          id={codeId}
          label={t('pilotResults.codeLabel')}
          helper={invalid ? t('pilotResults.codeInvalid') : t('pilotResults.codeHelp')}
          invalid={invalid}
          value={shownCode}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="none"
          onValueChange={(value) => {
            setDraft(value);
            setCodeSaved(false);
          }}
        />
        <div className="tw-settings-actions">
          <Button type="submit" variant="secondary" disabled={disabled || invalid || draft === null}>
            {t('pilotResults.codeSave')}
          </Button>
        </div>
        <p className="tw-settings-help" role="status">
          {codeSaved ? t('pilotResults.codeSaved') : ''}
          {failed === 'partner' ? ` ${t('pages.settings.saveFailed')}` : ''}
        </p>
      </form>

      <div className="tw-settings-option">
        <label className="tw-settings-check" htmlFor={shareId}>
          <input
            id={shareId}
            type="checkbox"
            className="tw-settings-checkbox"
            checked={settings?.partner.sharePilotResults === true && hasCode}
            disabled={disabled || !hasCode}
            aria-describedby={shareHelpId}
            onChange={(event) => void save({ partner: { sharePilotResults: event.currentTarget.checked } })}
          />
          <span>{t('pilotResults.shareLabel')}</span>
        </label>
        <p id={shareHelpId} className="tw-settings-help">
          {hasCode ? '' : `${t('pilotResults.shareNeedsCode')} `}
          {t('pilotResults.shareHelp')} {t('pilotResults.shareOffHelp')}
          {!canSave ? ` ${t('pages.settings.noStorage')}` : ''}
        </p>
      </div>

      <div className="tw-settings-status" role="status">
        <Icon name={sharing ? 'Check' : 'Info'} size={20} />
        <span>
          {sharing ? t('pilotResults.statusOn', { org: org }) : t('pilotResults.statusOff')}
          {queue ? ` ${t('pilotResults.waiting', { count: queue.pending })}.` : ''}
          {queue?.pausedUntil ? ` ${t('pilotResults.paused')}` : ''}
        </span>
      </div>

      {sharing ? (
        <div className="tw-settings-device">
          <div className="tw-settings-actions">
            <Button variant="ghost" icon="Trash2" aria-describedby={`${shareHelpId}-delete`} onClick={deleteWaiting}>
              {t('pilotResults.delete')}
            </Button>
          </div>
          <p id={`${shareHelpId}-delete`} className="tw-settings-help" role="status">
            {t('pilotResults.deleteHelp')}
            {deleted ? ` ${t('pilotResults.deleted')}` : ''}
          </p>
        </div>
      ) : null}
    </section>
  );
}
