/**
 * "Language" in Settings: the interface language for this device's home
 * screen, anyone looking around, and every learner who hasn't chosen their
 * own (settings.language). Shows only once a second language is ready
 * (src/i18n/locales.ts). Saved even while looking around, like every
 * device setting.
 */
import { useId, useState } from 'react';
import { LanguageChoice, useHasLanguageChoice } from '../../app/LanguageChoice';
import { useI18n } from '../../i18n';
import { useLearnerSession } from '../../session';

export function LanguageSetting() {
  const { t } = useI18n();
  const { storageAvailable, deviceLanguage, setDeviceLanguage } = useLearnerSession();
  const { offered } = useI18n();
  const hasChoice = useHasLanguageChoice();
  const headingId = useId();
  const helpId = useId();
  const [failed, setFailed] = useState(false);
  if (!hasChoice) return null;
  const label = t('pages.settings.language.label');
  // A saved language that isn't offered any more shows as English, as the pages do.
  const value = offered.some((locale) => locale.code === deviceLanguage) ? deviceLanguage! : 'en';

  return (
    <section className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2">
        {t('pages.settings.language.title')}
      </h2>
      <div className="tw-settings-field">
        <span className="tw-settings-label" aria-hidden="true">
          {label}
        </span>
        <LanguageChoice
          label={label}
          describedBy={helpId}
          disabled={!storageAvailable}
          value={value}
          onChange={(code) => {
            setFailed(false);
            setDeviceLanguage(code === 'en' ? null : code).catch(() => setFailed(true));
          }}
        />
        <p id={helpId} className="tw-settings-help">
          {t('pages.settings.language.help')}
          {failed ? ` ${t('pages.settings.saveFailed')}` : ''}
        </p>
      </div>
      {!storageAvailable ? <p className="tw-settings-help">{t('pages.settings.noStorage')}</p> : null}
    </section>
  );
}
