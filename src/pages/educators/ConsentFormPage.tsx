/**
 * The consent form for a learner's parent or guardian
 * (/educators/consent-form), in the language on screen, to print on A4 in
 * black and white: what the pilot collects (anonymous data only), what it
 * doesn't, who sees it, when it is deleted, that videos come from YouTube,
 * and that taking part is voluntary (docs/research/MEASUREMENT_PLAN.md,
 * "Privacy and consent").
 *
 * The organisation's name typed here goes into the form, and nowhere else:
 * it is kept in this page's state only, never saved or put in the address.
 * Left empty, the form prints a line to write it on. The staff note above
 * the form (a template, not legal advice) is on screen only; parents get
 * the form alone.
 */
import { useState, type ReactNode } from 'react';
import { educatorsPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Icon, TextField } from '../../components/ds';
import { useI18n, type MessageKey } from '../../i18n';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import './ConsentFormPage.css';

/** The form's parts, each a heading and a paragraph, in order. */
const PARTS: ReadonlyArray<{ title: MessageKey; body: MessageKey }> = [
  { title: 'pages.consentForm.collectTitle', body: 'pages.consentForm.collectBody' },
  { title: 'pages.consentForm.notTitle', body: 'pages.consentForm.notBody' },
  { title: 'pages.consentForm.whoTitle', body: 'pages.consentForm.whoBody' },
  { title: 'pages.consentForm.deleteTitle', body: 'pages.consentForm.deleteBody' },
  { title: 'pages.consentForm.videoTitle', body: 'pages.consentForm.videoBody' },
  { title: 'pages.consentForm.choiceTitle', body: 'pages.consentForm.choiceBody' },
];

/** A line to write on, with the words for it read out to screen readers. */
function Blank({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <span className={wide ? 'tw-consent-blank tw-consent-blank-wide' : 'tw-consent-blank'}>
      <span className="tw-visually-hidden">{label}</span>
    </span>
  );
}

export function ConsentFormPage() {
  const { t, tx } = useI18n();
  const title = t('pages.consentForm.title');
  usePageTitle(title);
  const [organisation, setOrganisation] = useState('');
  const name = organisation.trim();
  // A name, typed by the organisation: never translated, by us or by the browser.
  const org: ReactNode = name ? <strong translate="no">{name}</strong> : <Blank label={t('pages.consentForm.orgBlank')} />;

  return (
    <div className="tw-print-page tw-consent-page">
      <PrintToolbar backHref={educatorsPath()} backLabel={t('pages.teacherTools.back')} />

      <section className="tw-consent-setup tw-no-print" aria-labelledby="consent-title">
        <h1 id="consent-title" className="h1" tabIndex={-1}>
          {title}
        </h1>
        <p className="body-lg">{t('pages.consentForm.intro')}</p>
        <TextField
          label={t('pages.consentForm.orgLabel')}
          helper={t('pages.consentForm.orgHelper')}
          value={organisation}
          onValueChange={setOrganisation}
          maxLength={120}
        />
        <aside className="tw-consent-staff" aria-labelledby="consent-staff-title">
          <Icon name="Info" size={22} />
          <div>
            <h2 id="consent-staff-title" className="h3">
              {t('pages.consentForm.staffTitle')}
            </h2>
            <p>{t('pages.consentForm.staffBody')}</p>
          </div>
        </aside>
      </section>

      <article className="tw-print-sheet tw-consent" aria-labelledby="consent-form-title">
        <header className="tw-print-head">
          <p className="tw-print-brand">{t('print.brand')}</p>
          <h2 id="consent-form-title" className="tw-print-title">
            {t('pages.consentForm.formTitle')}
          </h2>
          <p className="tw-print-eyebrow">{t('pages.consentForm.formFor')}</p>
        </header>
        <p>{tx('pages.consentForm.formIntro', { organisation: org })}</p>
        <div className="tw-consent-parts">
          {PARTS.map((part) => (
            <section key={part.title} className="tw-consent-part">
              <h3>{t(part.title)}</h3>
              <p>{tx(part.body, { organisation: org })}</p>
            </section>
          ))}
        </div>
        <p>{tx('pages.consentForm.questions', { organisation: org })}</p>
        <p className="small">{t('pages.consentForm.honesty')}</p>

        <section className="tw-consent-answer" aria-labelledby="consent-answer-title">
          <h3 id="consent-answer-title">{t('pages.consentForm.answerTitle')}</h3>
          <ul className="tw-consent-choices">
            <li>
              <span className="tw-consent-box" aria-hidden="true" />
              {t('pages.consentForm.yes')}
            </li>
            <li>
              <span className="tw-consent-box" aria-hidden="true" />
              {t('pages.consentForm.no')}
            </li>
          </ul>
          <dl className="tw-consent-fields">
            {(
              [
                'pages.consentForm.childName',
                'pages.consentForm.childCode',
                'pages.consentForm.parentName',
                'pages.consentForm.signature',
                'pages.consentForm.date',
              ] as const
            ).map((key) => (
              <div key={key}>
                <dt>{t(key)}</dt>
                <dd>
                  <Blank label={t(key)} wide />
                </dd>
              </div>
            ))}
          </dl>
          <p className="small">{tx('pages.consentForm.keep', { organisation: org })}</p>
        </section>
      </article>
    </div>
  );
}
