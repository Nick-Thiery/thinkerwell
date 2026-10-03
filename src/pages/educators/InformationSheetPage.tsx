/**
 * The information sheet for families (/educators/information-sheet), given
 * with the consent form, in the language on screen, to print in black and
 * white on one page, A4 or Letter (docs/notes/partner-kit.md): what
 * Thinkerwell is, what will happen, the pilot study and what is kept (the
 * same words as the consent form, ./pilotStudy.tsx), saying yes or no, and
 * whom to ask.
 *
 * Staff can type the organisation's name, the dates, the number of sessions
 * and a contact person; each goes into the sheet and nowhere else (kept in
 * this page's state only, never saved or put in the address), and each left
 * empty prints a line to write it on, as on the consent form. The
 * Thinkerwell email shows only once there is one (CONTACT_EMAIL). The staff
 * note is on screen only.
 */
import { useState } from 'react';
import { CONTACT_EMAIL } from '../../app/contact';
import { educatorsPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Icon, TextField } from '../../components/ds';
import { useI18n, type MessageKey } from '../../i18n';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import './ConsentFormPage.css';
import './InformationSheetPage.css';
import { KeepList, StudyParts, typedOrBlank } from './pilotStudy';

type FieldName = 'organisation' | 'start' | 'end' | 'sessions' | 'contact';

/** What staff can fill in before printing, in order: its label, the screen-reader words for its empty line, and its longest length. */
const FIELDS: ReadonlyArray<{ name: FieldName; label: MessageKey; blank: MessageKey; maxLength: number }> = [
  { name: 'organisation', label: 'pages.consentForm.orgLabel', blank: 'pages.consentForm.orgBlank', maxLength: 60 },
  { name: 'start', label: 'pages.infoSheet.startLabel', blank: 'pages.infoSheet.startBlank', maxLength: 40 },
  { name: 'end', label: 'pages.infoSheet.endLabel', blank: 'pages.infoSheet.endBlank', maxLength: 40 },
  { name: 'sessions', label: 'pages.infoSheet.sessionsLabel', blank: 'pages.infoSheet.sessionsBlank', maxLength: 20 },
  { name: 'contact', label: 'pages.infoSheet.contactLabel', blank: 'pages.infoSheet.contactBlank', maxLength: 80 },
];

const EMPTY: Record<FieldName, string> = { organisation: '', start: '', end: '', sessions: '', contact: '' };

export function InformationSheetPage() {
  const { t, tx } = useI18n();
  const title = t('pages.infoSheet.title');
  usePageTitle(title);
  const [values, setValues] = useState(EMPTY);
  // What staff typed, never translated by us or by the browser; a line to write on where they typed nothing.
  const filled = Object.fromEntries(FIELDS.map((field) => [field.name, typedOrBlank(values[field.name], t(field.blank))])) as Record<
    FieldName,
    ReturnType<typeof typedOrBlank>
  >;
  const org = filled.organisation;

  return (
    <div className="tw-print-page tw-consent-page">
      <PrintToolbar backHref={educatorsPath()} backLabel={t('pages.teacherTools.back')} />

      <section className="tw-consent-setup tw-no-print" aria-labelledby="sheet-title">
        <h1 id="sheet-title" className="h1" tabIndex={-1}>
          {title}
        </h1>
        <p className="body-lg">{t('pages.infoSheet.intro')}</p>
        <fieldset className="tw-sheet-fields" aria-describedby="sheet-fields-help">
          <legend className="h3">{t('pages.infoSheet.fieldsTitle')}</legend>
          <p id="sheet-fields-help" className="tw-sheet-fields-help">
            {t('pages.infoSheet.fieldsHelper')}
          </p>
          <div className="tw-sheet-fields-grid">
            {FIELDS.map((field) => (
              <TextField
                key={field.name}
                label={t(field.label)}
                value={values[field.name]}
                onValueChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
                maxLength={field.maxLength}
                className={field.name === 'organisation' ? 'tw-sheet-field-wide' : undefined}
              />
            ))}
          </div>
        </fieldset>
        <aside className="tw-consent-staff" aria-labelledby="sheet-staff-title">
          <Icon name="Info" size={22} />
          <div>
            <h2 id="sheet-staff-title" className="h3">
              {t('pages.consentForm.staffTitle')}
            </h2>
            <p>{t('pages.infoSheet.staffBody')}</p>
          </div>
        </aside>
      </section>

      <article className="tw-print-sheet tw-consent tw-sheet" aria-labelledby="sheet-print-title">
        <header className="tw-print-head">
          <p className="tw-print-brand">{t('print.brand')}</p>
          <h2 id="sheet-print-title" className="tw-print-title">
            {t('pages.infoSheet.sheetTitle')}
          </h2>
          <p className="tw-print-eyebrow">{t('pages.infoSheet.sheetFor')}</p>
        </header>

        <div className="tw-consent-flow">
          <section className="tw-consent-part" aria-labelledby="sheet-what">
            <h3 id="sheet-what">{t('pages.infoSheet.whatTitle')}</h3>
            <p>{t('pages.infoSheet.whatBody')}</p>
          </section>
          <section className="tw-consent-part" aria-labelledby="sheet-happen">
            <h3 id="sheet-happen">{t('pages.infoSheet.happenTitle')}</h3>
            <p>
              {tx('pages.infoSheet.happenBody', { start: filled.start, end: filled.end, sessions: filled.sessions, organisation: org })}
            </p>
          </section>
          <section className="tw-consent-part" aria-labelledby="sheet-study">
            <h3 id="sheet-study">{t('pages.infoSheet.studyTitle')}</h3>
            <StudyParts />
          </section>
          <section className="tw-consent-part tw-consent-flow-long" aria-labelledby="sheet-keep">
            <h3 id="sheet-keep">{t('pages.pilotStudy.keepTitle')}</h3>
            <KeepList organisation={org} />
          </section>
          <section className="tw-consent-part" aria-labelledby="sheet-choice">
            <h3 id="sheet-choice">{t('pages.infoSheet.choiceTitle')}</h3>
            <p>{t('pages.infoSheet.choiceBody')}</p>
          </section>
          <section className="tw-consent-part" aria-labelledby="sheet-questions">
            <h3 id="sheet-questions">{t('pages.infoSheet.questionsTitle')}</h3>
            <p>
              {CONTACT_EMAIL
                ? tx('pages.infoSheet.questionsEmail', { contact: filled.contact, organisation: org, email: CONTACT_EMAIL })
                : tx('pages.infoSheet.questions', { contact: filled.contact, organisation: org })}
            </p>
            <p>{t('pages.infoSheet.runBy')}</p>
          </section>
        </div>
      </article>
    </div>
  );
}
