/**
 * Privacy & Child Safeguarding (/privacy-and-safeguarding), linked from the
 * footer on every page (Justin's brief of 11 November 2026). Public: nothing
 * about it needs a learner chosen, and it sends nothing anywhere (a plain
 * page of text and links).
 *
 * The policy text is Justin's, with the factual disclosure his brief asks
 * for in section 3 (who receives information today, and what stays on the
 * device), checked against the code on 11 November 2026:
 *   - Saved work lives in IndexedDB on the device (src/storage/), with a few
 *     small copies in localStorage (language, unsaved progress); no cookies.
 *   - The only requests that carry anything a person typed are the contact
 *     form's (/api/contact, then Resend, then the team's Gmail inbox).
 *   - Listen plays recordings from this site or an on-device voice
 *     (src/speech/), Say it is on-device unless an educator allows online
 *     speech-to-text, Record yourself never leaves the device.
 *   - No analytics are collected, so the usage statistics paragraph is
 *     labelled "Planned" and kept in the future tense; coded study
 *     collection is paused for everyone (src/measurement/paused.ts).
 *   - No AI service receives learner information.
 * When any of that changes, change this page in the same pull request.
 *
 * The dates are fixed (never today's date). The words are the lazily loaded
 * `privacy` group, in every ready language; the five guidance sources are
 * published in English only, so their titles carry lang="en" and a line
 * says so in the other languages.
 */
import { useMemo, type ReactNode } from 'react';
import words from 'virtual:thinkerwell/messages/privacy';
import { CONTACT_EMAIL } from '../../app/contact';
import { useFullPageTitle } from '../../app/usePageTitle';
import { Icon } from '../../components/ds';
import { useI18n, withWords, type MessageKey } from '../../i18n';
import './PrivacyPage.css';

/** When this policy took effect, and when it was last changed. Fixed on purpose: never a date that moves with the visitor. */
export const POLICY_EFFECTIVE = new Date(Date.UTC(2026, 10, 11));
export const POLICY_UPDATED = new Date(Date.UTC(2026, 10, 11));
const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };

const SERVICES: ReadonlyArray<{ id: 'vercel' | 'resend' | 'google' | 'youtube' | 'speech'; href: string | null }> = [
  { id: 'vercel', href: 'https://vercel.com/legal/privacy-policy' },
  { id: 'resend', href: 'https://resend.com/legal/privacy-policy' },
  { id: 'google', href: 'https://policies.google.com/privacy' },
  { id: 'youtube', href: 'https://policies.google.com/privacy' },
  { id: 'speech', href: null },
];

const DEVICE: readonly MessageKey[] = [
  'privacy.s3.device1',
  'privacy.s3.device2',
  'privacy.s3.device3',
  'privacy.s3.device4',
  'privacy.s3.device5',
];

const SOURCES: ReadonlyArray<{ id: 'pdpcChildren' | 'pdpcAnon' | 'unicefDigital' | 'kcs' | 'unicefToolkit'; href: string }> = [
  {
    id: 'pdpcChildren',
    href: 'https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/advisory-guidelines-on-the-pdpa-for-children%27s-personal-data-in-the-digital-environment_mar24.pdf',
  },
  { id: 'pdpcAnon', href: 'https://www.pdpc.gov.sg/help-and-resources/2018/01/basic-anonymisation' },
  { id: 'unicefDigital', href: 'https://www.unicef.org/documents/child-protection-digital-education' },
  { id: 'kcs', href: 'https://www.keepingchildrensafe.global/international-child-safeguarding-standards/' },
  { id: 'unicefToolkit', href: 'https://www.unicef.org/childrightsandbusiness/child-safeguarding-toolkit-business' },
];

export function PrivacyPage() {
  const parent = useI18n();
  const { t, tx, formatDate, lang, englishLang } = useMemo(() => withWords(parent, words), [parent]);
  const newTab = parent.t('pages.teacherTools.newTab');
  useFullPageTitle(parent.t('seo.privacy.title'));

  const external = (href: string, label: ReactNode, extra?: { lang?: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...extra}>
      {label}
      <span className="tw-visually-hidden"> {newTab}</span>
    </a>
  );
  const email = CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} translate="no">
      {CONTACT_EMAIL}
    </a>
  ) : (
    ''
  );

  return (
    <div className="tw-privacy-page">
      <header className="tw-privacy-head">
        <h1 className="h1" tabIndex={-1}>
          {t('privacy.title')}
        </h1>
        <p className="tw-privacy-dates small">
          {t('privacy.dates', {
            effective: formatDate(POLICY_EFFECTIVE, DATE_FORMAT),
            updated: formatDate(POLICY_UPDATED, DATE_FORMAT),
          })}
        </p>
        <p className="body-lg">{t('privacy.intro')}</p>
        <p className="tw-privacy-learners">
          <Icon name="Info" size={22} />
          <span>
            <strong>{t('privacy.learnersLead')}</strong> {t('privacy.learnersBody')}
          </span>
        </p>
      </header>

      <section aria-labelledby="privacy-s1" className="tw-privacy-section">
        <h2 id="privacy-s1" className="h2">
          {t('privacy.s1.title')}
        </h2>
        <p>{t('privacy.s1.p1')}</p>
        <p>{t('privacy.s1.p2')}</p>
      </section>

      <section aria-labelledby="privacy-s2" className="tw-privacy-section">
        <h2 id="privacy-s2" className="h2">
          {t('privacy.s2.title')}
        </h2>
        <p>{t('privacy.s2.p1')}</p>
        <p>
          <strong>{t('privacy.s2.statsLead')}</strong> {t('privacy.s2.stats')}
        </p>
        <p>{t('privacy.s2.statsNow')}</p>
        <p>{t('privacy.s2.coded')}</p>
        <p>{t('privacy.s2.p3')}</p>
      </section>

      <section aria-labelledby="privacy-s3" className="tw-privacy-section">
        <h2 id="privacy-s3" className="h2">
          {t('privacy.s3.title')}
        </h2>
        <p>{t('privacy.s3.p1')}</p>
        <h3 className="h3">{t('privacy.s3.whoTitle')}</h3>
        <p>{t('privacy.s3.whoIntro')}</p>
        <ul className="tw-privacy-services" role="list">
          {SERVICES.map((service) => (
            <li key={service.id} className="tw-privacy-service">
              <h4 className="tw-privacy-service-name">{t(`privacy.services.${service.id}.name`)}</h4>
              <dl>
                <dt>{t('privacy.services.purposeLabel')}</dt>
                <dd>{t(`privacy.services.${service.id}.purpose`)}</dd>
                <dt>{t('privacy.services.getsLabel')}</dt>
                <dd>{t(`privacy.services.${service.id}.gets`)}</dd>
                <dt>{t('privacy.services.whereLabel')}</dt>
                <dd>
                  {t(`privacy.services.${service.id}.where`)}
                  {service.href && service.id !== 'speech' ? (
                    <>
                      {' '}
                      {external(service.href, t(`privacy.services.${service.id}.link` as MessageKey))}
                    </>
                  ) : null}
                </dd>
              </dl>
            </li>
          ))}
        </ul>
        <p>{t('privacy.s3.retention')}</p>
        <h3 className="h3">{t('privacy.s3.deviceTitle')}</h3>
        <ul className="tw-privacy-list" role="list">
          {DEVICE.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="privacy-s4" className="tw-privacy-section">
        <h2 id="privacy-s4" className="h2">
          {t('privacy.s4.title')}
        </h2>
        <p>{t('privacy.s4.p1')}</p>
        <p>{t('privacy.s4.p2')}</p>
        <p>{t('privacy.s4.remove')}</p>
      </section>

      <section aria-labelledby="privacy-s5" className="tw-privacy-section">
        <h2 id="privacy-s5" className="h2">
          {t('privacy.s5.title')}
        </h2>
        <p>{t('privacy.s5.p1')}</p>
        <p>{t('privacy.s5.p2')}</p>
      </section>

      <section aria-labelledby="privacy-s6" className="tw-privacy-section">
        <h2 id="privacy-s6" className="h2">
          {t('privacy.s6.title')}
        </h2>
        <p>{t('privacy.s6.p1')}</p>
      </section>

      <section aria-labelledby="privacy-s7" className="tw-privacy-section">
        <h2 id="privacy-s7" className="h2">
          {t('privacy.s7.title')}
        </h2>
        <p>{tx('privacy.s7.p1', { email })}</p>
        <p>{t('privacy.s7.p2')}</p>
        <p>{t('privacy.s7.p3')}</p>
      </section>

      <section aria-labelledby="privacy-refs" className="tw-privacy-section tw-privacy-refs">
        <h2 id="privacy-refs" className="h2">
          {t('privacy.refs.title')}
        </h2>
        <p>{t('privacy.refs.intro')}</p>
        {lang !== 'en' ? <p>{t('privacy.refs.englishOnly')}</p> : null}
        <ul className="tw-privacy-list" role="list">
          {SOURCES.map((source) => (
            <li key={source.id}>
              <strong>{external(source.href, t(`privacy.refs.${source.id}.name` as MessageKey), englishLang)}</strong>{' '}
              {t(`privacy.refs.${source.id}.desc` as MessageKey)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
