/**
 * The pilot day guide for staff (/educators/pilot-day): one page, for screen
 * and paper, for the adults running a session at a partner organisation. It
 * says what to do before the session, at its start, what learners do, what
 * to do when something goes wrong, which topics need care, and what to do
 * at the end (docs/notes/pilot-day-tools.md).
 *
 * - Everything on it is true of Thinkerwell today. It names the buttons and
 *   pages as the app does, from the app's own messages, so a label that
 *   changes changes here too, in every language.
 * - Its own words are the `pilotDay` group (src/i18n/lazyGroups.ts): they
 *   load with this page, not with the app.
 * - It names no organisation and no place, and says nothing about
 *   measurement beyond what the consent form says (pages.pilotStudy).
 * - Who to contact: shown only once there is an address (CONTACT_EMAIL in
 *   src/app/contact.ts), with the Educators page's own words. Never a
 *   placeholder.
 * - Prints on one page, A4 or Letter, black on white, nothing under 14px
 *   (10.5pt), on the consent form's sheet (./ConsentFormPage.css).
 */
import { useMemo, type ReactNode } from 'react';
import words from 'virtual:thinkerwell/messages/pilotDay';
import { CONTACT_EMAIL } from '../../app/contact';
import { educatorsPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { commonStages } from '../../content/stages';
import { useContent } from '../../content/useContent';
import { useI18n, withWords } from '../../i18n';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import './ConsentFormPage.css';
import './PilotDayPage.css';
import { SESSION_MINUTES, SHORT_SESSION_MINUTES } from './sessionPlan';

/**
 * The lessons whose teacher guides ask for a local educator to review them
 * before they are used (their first `sensitiveNotes`). PilotDayPage.test.tsx
 * checks the lesson files still say so.
 */
export const REVIEW_FIRST_LESSONS = [4, 19] as const;

/** A name the app shows (a button, a page), set in bold so staff can find it on the screen. */
function ui(label: string): ReactNode {
  return <strong>{label}</strong>;
}

export function PilotDayPage() {
  const parent = useI18n();
  const { t, tx } = useMemo(() => withWords(parent, words), [parent]);
  const content = useContent();
  const title = t('pilotDay.title');
  usePageTitle(title);

  const lessons = content.getLessons();
  const minMinutes = Math.min(...lessons.map((lesson) => lesson.estimatedMinutes[0]));
  const maxMinutes = Math.max(...lessons.map((lesson) => lesson.estimatedMinutes[1]));
  // Every lesson's steps in the language on screen: four without Watch where the lessons are translated.
  const lessonStages = commonStages(lessons, content.stagesFor);
  const stages = parent.formatList(
    lessonStages.map((stage) => parent.t(`stages.${stage}`)),
    { type: 'conjunction' },
  );

  // The names the app gives its pages and buttons, in the language on screen.
  const educators = ui(parent.t('nav.educators'));
  const settings = ui(parent.t('nav.settings'));

  return (
    <div className="tw-print-page tw-consent-page">
      <PrintToolbar backHref={educatorsPath()} backLabel={parent.t('pages.teacherTools.back')} />

      <section className="tw-consent-setup tw-no-print" aria-labelledby="pilotday-title">
        <h1 id="pilotday-title" className="h1" tabIndex={-1}>
          {title}
        </h1>
        <p className="body-lg">{t('pilotDay.intro')}</p>
      </section>

      <article className="tw-print-sheet tw-consent tw-pilotday" aria-labelledby="pilotday-sheet-title">
        <header className="tw-print-head">
          <p className="tw-print-brand">{parent.t('print.brand')}</p>
          <h2 id="pilotday-sheet-title" className="tw-print-title">
            {t('pilotDay.sheetTitle')}
          </h2>
          <p className="tw-print-eyebrow">{t('pilotDay.sheetFor')}</p>
        </header>

        <div className="tw-consent-flow">
          <section className="tw-consent-part" aria-labelledby="pilotday-before">
            <h3 id="pilotday-before">{t('pilotDay.beforeTitle')}</h3>
            <ul className="tw-consent-list">
              <li>{tx('pilotDay.beforeSetup', { educators, setup: ui(parent.t('pages.setup.title')) })}</li>
              <li>{tx('pilotDay.beforeCodes', { educators })}</li>
              <li>{t('pilotDay.beforeConsent')}</li>
            </ul>
          </section>

          <section className="tw-consent-part" aria-labelledby="pilotday-start">
            <h3 id="pilotday-start">{t('pilotDay.startTitle')}</h3>
            <ul className="tw-consent-list">
              <li>{tx('pilotDay.startWho', { who: ui(parent.t('pages.home.title')) })}</li>
              <li>{tx('pilotDay.startNew', { new: ui(parent.t('pages.home.newLearnerTile')) })}</li>
              <li>{tx('pilotDay.startLook', { look: ui(parent.t('header.lookAroundTile')) })}</li>
            </ul>
          </section>

          <section className="tw-consent-part" aria-labelledby="pilotday-learn">
            <h3 id="pilotday-learn">{t('pilotDay.learnTitle')}</h3>
            <ul className="tw-consent-list">
              <li>{tx(lessonStages.includes('watch') ? 'pilotDay.learnStages' : 'pilotDay.learnStagesNoWatch', { stages: ui(stages), reflect: ui(parent.t('stages.reflect')) })}</li>
              <li>{t('pilotDay.learnOrder')}</li>
              <li>
                {t('pilotDay.learnTime', {
                  min: minMinutes,
                  max: maxMinutes,
                  full: SESSION_MINUTES,
                  short: SHORT_SESSION_MINUTES,
                })}
              </li>
            </ul>
          </section>

          <section className="tw-consent-part tw-consent-flow-long" aria-labelledby="pilotday-wrong">
            <h3 id="pilotday-wrong">{t('pilotDay.wrongTitle')}</h3>
            <ul className="tw-consent-list">
              <li>
                <strong>{t('pilotDay.wrongDownloadLead')}</strong>{' '}
                {tx('pilotDay.wrongDownload', { retry: ui(parent.t('pageNotDownloaded.retry')) })}
              </li>
              <li>
                <strong>{t('pilotDay.wrongOfflineLead')}</strong> {t('pilotDay.wrongOffline')}
              </li>
              <li>
                <strong>{t('pilotDay.wrongSharedLead')}</strong> {t('pilotDay.wrongShared')}
              </li>
              <li>
                <strong>{t('pilotDay.wrongLostLead')}</strong>{' '}
                {tx('pilotDay.wrongLost', {
                  settings,
                  load: ui(parent.t('pages.settings.transfer.load.button')),
                  file: <strong translate="no">thinkerwell</strong>,
                })}
              </li>
              {/* Lessons without a Watch step (Indonesian, Malay) have no videos to go wrong. */}
              {lessonStages.includes('watch') ? (
                <li>
                  <strong>{t('pilotDay.wrongVideoLead')}</strong>{' '}
                  {tx('pilotDay.wrongVideo', { readInstead: ui(parent.t('lessonPlayer.watch.readInstead')) })}
                </li>
              ) : null}
              <li>
                <strong>{t('pilotDay.wrongSoundLead', { sayIt: parent.t('ds.actions.voiceButton.sayIt') })}</strong>{' '}
                {tx('pilotDay.wrongSound', {
                  listen: ui(parent.t('lessonPlayer.read.listen')),
                  sayIt: ui(parent.t('ds.actions.voiceButton.sayIt')),
                })}
              </li>
            </ul>
          </section>

          <section className="tw-consent-part" aria-labelledby="pilotday-topics">
            <h3 id="pilotday-topics">{t('pilotDay.topicsTitle')}</h3>
            <ul className="tw-consent-list">
              <li>{t('pilotDay.topicsNever')}</li>
              <li>{tx(lessonStages.includes('watch') ? 'pilotDay.topicsGuide' : 'pilotDay.topicsGuideNoWatch', { sensitive: ui(parent.t('pages.teacherGuide.sensitiveTitle')) })}</li>
              <li>{t('pilotDay.topicsReview', { first: REVIEW_FIRST_LESSONS[0], second: REVIEW_FIRST_LESSONS[1] })}</li>
              <li>{t('pilotDay.topicsShare')}</li>
            </ul>
          </section>

          <section className="tw-consent-part" aria-labelledby="pilotday-end">
            <h3 id="pilotday-end">{t('pilotDay.endTitle')}</h3>
            <ul className="tw-consent-list">
              <li>
                {tx('pilotDay.endSave', {
                  settings,
                  transfer: ui(parent.t('pages.settings.transfer.title')),
                  save: ui(parent.t('pages.settings.transfer.save.button')),
                })}
              </li>
              <li>{tx('pilotDay.endCertificates', { educators, certificates: ui(parent.t('pages.educators.certificatesCta')) })}</li>
              <li>{tx('pilotDay.endClass', { educators, class: ui(parent.t('pages.educators.classTitle')) })}</li>
            </ul>
          </section>

          {CONTACT_EMAIL ? (
            <section className="tw-consent-part" aria-labelledby="pilotday-contact">
              <h3 id="pilotday-contact">{parent.t('pages.educators.feedbackTitle')}</h3>
              <p>
                {parent.tx('pages.educators.feedbackBody', {
                  email: (
                    <a href={`mailto:${CONTACT_EMAIL}`} translate="no">
                      {CONTACT_EMAIL}
                    </a>
                  ),
                })}
              </p>
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
}
