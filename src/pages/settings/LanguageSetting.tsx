/**
 * "Language" in Settings: the app's one language setting, as in the
 * header's switch (useLearnerSession().language). It changes every page at
 * once, and is saved for the chosen learner, or for the device before
 * anyone is chosen (the first page, looking around). Shows only once a
 * second language is ready (src/i18n/locales.ts).
 */
import { useId, useState } from 'react';
import { LanguageChoice, useHasLanguageChoice } from '../../app/LanguageChoice';
import { useI18n } from '../../i18n';
import { useLearnerSession } from '../../session';

export function LanguageSetting() {
  const { t } = useI18n();
  const { storageAvailable, activeLearner, language, setLanguage } = useLearnerSession();
  const hasChoice = useHasLanguageChoice();
  const headingId = useId();
  const helpId = useId();
  const [failed, setFailed] = useState(false);
  if (!hasChoice) return null;
  const label = activeLearner ? t('pages.settings.language.labelLearner', { name: activeLearner.name }) : t('pages.settings.language.label');

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
          value={language}
          onChange={(code) => {
            setFailed(false);
            setLanguage(code).catch(() => setFailed(true));
          }}
        />
        <p id={helpId} className="tw-settings-help">
          {activeLearner ? t('pages.settings.language.helpLearner', { name: activeLearner.name }) : t('pages.settings.language.help')}
          {failed ? ` ${t('pages.settings.saveFailed')}` : ''}
        </p>
      </div>
      {!storageAvailable ? <p className="tw-settings-help">{t('pages.settings.noStorage')}</p> : null}
    </section>
  );
}
