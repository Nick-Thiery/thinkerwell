/**
 * The consent form (/educators/consent-form), in the language on screen, to
 * print in black and white on two pages, A4 or Letter, each headed so it
 * stands alone (docs/notes/partner-kit.md):
 *
 *  1. For the parent or guardian: what the pilot study involves, what is
 *     kept and what isn't (the same words as the information sheet,
 *     ./pilotStudy.tsx), that it is their choice, and two separate yes/no
 *     answers (using Thinkerwell in class; the pilot study), with a
 *     signature or thumbprint. The organisation writes the learner's pilot
 *     code at the top of both pages.
 *  2. For staff: a script to read aloud to the learner and the learner's
 *     own yes or no (their no wins), and the witness line for a parent or
 *     guardian who can't read or write.
 *
 * Every promise follows docs/research/MEASUREMENT_PLAN.md ("Privacy and
 * consent"); the measurement build must keep to them, or the form changes
 * first. One page no longer held it all at the site's smallest text size
 * (14px, 10.5pt), so it is two.
 *
 * The organisation's name typed here goes into the form, and nowhere else:
 * it is kept in this page's state only, never saved or put in the address.
 * Left empty, the form prints a line to write it on. The staff note above
 * the form (a template, not legal advice; how to use it) is on screen only;
 * families get the form alone.
 */
import { useState, type ReactNode } from 'react';
import { CONTACT_EMAIL } from '../../app/contact';
import { educatorsPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Icon, TextField } from '../../components/ds';
import { useI18n, type MessageKey } from '../../i18n';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import './ConsentFormPage.css';
import { Blank, KeepList, StudyParts, typedOrBlank } from './pilotStudy';

const PAGES = 2;

/**
 * The top of each printed page: the form's title (which names Thinkerwell)
 * and the page number, who the page is for, and the learner's pilot code for
 * the organisation to write in, so either page can be matched to the learner.
 */
function SheetHead({ page, audience }: { page: number; audience: string }) {
  const { t, tx } = useI18n();
  return (
    <header className="tw-print-head">
      <div className="tw-consent-topline tw-consent-titleline">
        <h2 id={`consent-page-${page}-title`} className="tw-print-title">
          {t('pages.consentForm.formTitle')}
        </h2>
        <p className="tw-print-brand">{t('pages.consentForm.pageOf', { page, count: PAGES })}</p>
      </div>
      <div className="tw-consent-topline">
        <p id={`consent-page-${page}-for`} className="tw-print-eyebrow">
          {audience}
        </p>
        <p className="tw-consent-code-line">{tx('pages.consentForm.pilotCode', { code: <Blank label={t('pages.consentForm.codeBlank')} /> })}</p>
      </div>
    </header>
  );
}

/** A Yes box and a No box to tick, after the question they answer. */
function YesNo() {
  const { t } = useI18n();
  return (
    <ul className="tw-consent-choices">
      {(['pages.consentForm.yes', 'pages.consentForm.no'] as const).map((key) => (
        <li key={key}>
          <span className="tw-consent-box" aria-hidden="true" />
          {t(key)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Labelled lines to fill in, two to a row (on paper, the parent's four go in
 * one row, so their page fits). A `box` one (a signature or thumbprint) is a
 * box to sign or press a thumb in.
 */
function Fields({ fields, four }: { fields: ReadonlyArray<{ key: MessageKey; box?: boolean }>; four?: boolean }) {
  const { t } = useI18n();
  return (
    <dl className={four ? 'tw-consent-fields tw-consent-fields-four' : 'tw-consent-fields'}>
      {fields.map(({ key, box }) => (
        <div key={key} className={box ? 'tw-consent-field-box' : undefined}>
          <dt>{t(key)}</dt>
          <dd>
            <Blank label={t(key)} wide />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ConsentFormPage() {
  const { t, tx } = useI18n();
  const title = t('pages.consentForm.title');
  usePageTitle(title);
  const [organisation, setOrganisation] = useState('');
  // A name, typed by the organisation: never translated, by us or by the browser.
  const org: ReactNode = typedOrBlank(organisation, t('pages.consentForm.orgBlank'));
  const keep = <p className="tw-consent-keep">{tx('pages.consentForm.keep', { organisation: org })}</p>;

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
          // The name is printed up to nine times on the first page: longer would push the form onto a third page.
          maxLength={60}
        />
        <aside className="tw-consent-staff" aria-labelledby="consent-staff-title">
          <Icon name="Info" size={22} />
          <div>
            <h2 id="consent-staff-title" className="h3">
              {t('pages.consentForm.staffTitle')}
            </h2>
            <p>{t('pages.consentForm.staffBody')}</p>
            <p>{t('pages.consentForm.staffUse')}</p>
          </div>
        </aside>
      </section>

      {/* Page 1: the parent or guardian. */}
      <article className="tw-print-sheet tw-consent" aria-labelledby="consent-page-1-title">
        <SheetHead page={1} audience={t('pages.consentForm.formFor')} />
        <p>{tx('pages.consentForm.formIntro', { organisation: org })}</p>
        <div className="tw-consent-flow">
          <section className="tw-consent-part" aria-labelledby="consent-study">
            <h3 id="consent-study">{t('pages.consentForm.studyTitle')}</h3>
            <StudyParts />
          </section>
          <section className="tw-consent-part tw-consent-flow-long" aria-labelledby="consent-keep">
            <h3 id="consent-keep">{t('pages.pilotStudy.keepTitle')}</h3>
            <KeepList organisation={org} />
          </section>
          <section className="tw-consent-part" aria-labelledby="consent-choice">
            <h3 id="consent-choice">{t('pages.consentForm.choiceTitle')}</h3>
            <p>{tx('pages.consentForm.choiceBody', { organisation: org })}</p>
          </section>
        </div>
        <div className="tw-consent-about">
          <p>
            {CONTACT_EMAIL
              ? tx('pages.consentForm.questionsEmail', { organisation: org, email: CONTACT_EMAIL })
              : tx('pages.consentForm.questions', { organisation: org })}
          </p>
          <p>{t('pages.consentForm.honesty')}</p>
        </div>

        <section className="tw-consent-answer" aria-labelledby="consent-answer-title">
          <h3 id="consent-answer-title">{t('pages.consentForm.answerTitle')}</h3>
          <ol className="tw-consent-questions">
            <li>
              <div className="tw-consent-question">
                <p>{tx('pages.consentForm.classQuestion', { organisation: org })}</p>
                <YesNo />
              </div>
            </li>
            <li>
              <div className="tw-consent-question">
                <p>{t('pages.consentForm.studyQuestion')}</p>
                <YesNo />
              </div>
            </li>
          </ol>
          <Fields
            four
            fields={[
              { key: 'pages.consentForm.childName' },
              { key: 'pages.consentForm.parentName' },
              { key: 'pages.consentForm.date' },
              { key: 'pages.consentForm.signature', box: true },
            ]}
          />
          {keep}
        </section>
      </article>

      {/* Page 2: staff, with the learner; and the witness line. Its own title, page number, code and name, so it stands alone. */}
      <article className="tw-print-sheet tw-consent tw-consent-second" aria-labelledby="consent-page-2-title consent-page-2-for">
        <SheetHead page={2} audience={t('pages.consentForm.learnerFor')} />
        <Fields fields={[{ key: 'pages.consentForm.childName' }]} />

        <section className="tw-consent-answer" aria-labelledby="consent-learner">
          <h3 id="consent-learner">{t('pages.consentForm.learnerTitle')}</h3>
          <p>{t('pages.consentForm.learnerIntro')}</p>
          <blockquote className="tw-consent-script">
            <p>{t('pages.consentForm.learnerScript')}</p>
          </blockquote>
          <div className="tw-consent-learner-answer">
            <p className="tw-consent-label">{t('pages.consentForm.learnerAnswer')}</p>
            <YesNo />
          </div>
          <Fields fields={[{ key: 'pages.consentForm.staffInitials' }, { key: 'pages.consentForm.date' }]} />
          <p className="tw-consent-rule">{t('pages.consentForm.learnerWins')}</p>
        </section>

        <section className="tw-consent-answer" aria-labelledby="consent-witness">
          <h3 id="consent-witness">{t('pages.consentForm.witnessTitle')}</h3>
          <p>{tx('pages.consentForm.witnessBody', { language: <Blank label={t('pages.consentForm.languageBlank')} /> })}</p>
          <Fields
            fields={[
              { key: 'pages.consentForm.staffName' },
              { key: 'pages.consentForm.staffSignature', box: true },
              { key: 'pages.consentForm.date' },
            ]}
          />
        </section>
        {keep}
      </article>
    </div>
  );
}
