/**
 * For organisations (/organisations): for a learning organisation thinking
 * of using Thinkerwell with its learners, now (October 2026, Justin's brief
 * "remove pilot framing": the page no longer presents the platform as a
 * pilot). What Thinkerwell offers, a short video of a session (the site's
 * own file, played only when tapped: ./siteVideo/), what you get and what
 * you need to run a group, using the course and its privacy, the optional
 * learning study and its data sharing (only for an organisation taking
 * part, with the consent form's promise kept word for word), getting ready,
 * who runs Thinkerwell, and getting in touch (the contact form, /contact,
 * and the team's address). Linked from the Educators page and the footer.
 *
 * Honest about scope (CLAUDE.md rule 8): a student-led platform, not a
 * registered charity. Honest about data too: learners' work and progress
 * stay on the device; the study's coded data is not called anonymous. The
 * wording follows docs/content/PUBLIC_COPY.md.
 */
import { CONTACT_EMAIL } from '../app/contact';
import {
  codeCardsPath,
  consentFormPath,
  contactPath,
  coursePath,
  informationSheetPath,
  learningCheckPath,
  sessionGuidePath,
  setupPath,
} from '../app/lessonUrls';
import { useFullPageTitle } from '../app/usePageTitle';
import { Button, Icon, type IconName } from '../components/ds';
import { useContent } from '../content/useContent';
import { useI18n, type MessageKey } from '../i18n';
import './OrganisationsPage.css';
import { SiteVideo } from './siteVideo/SiteVideo';

const GET: readonly MessageKey[] = [
  'pages.organisations.get1',
  'pages.organisations.get2',
  'pages.organisations.get3',
  'pages.organisations.get4',
];

/** Using the course: what stays on the device, codes instead of names, and the optional videos. */
const PRIVACY: ReadonlyArray<{ icon: IconName; key: MessageKey }> = [
  { icon: 'User', key: 'pages.organisations.privacy1' },
  { icon: 'Lock', key: 'pages.organisations.privacy2' },
  { icon: 'Play', key: 'pages.organisations.privacy4' },
];

export function OrganisationsPage() {
  const { t } = useI18n();
  const content = useContent();
  const title = t('pages.organisations.title');
  useFullPageTitle(t('seo.organisations.title'));
  const lessons = content.getLessons();
  // The same range the course and Educators pages show.
  const min = Math.min(...lessons.map((lesson) => lesson.estimatedMinutes[0]));
  const max = Math.max(...lessons.map((lesson) => lesson.estimatedMinutes[1]));
  const ask = [
    t('pages.organisations.ask1'),
    t('pages.organisations.ask2'),
    t('pages.organisations.ask3', { min, max }),
    t('pages.organisations.ask4'),
  ];

  return (
    <div className="tw-org-page">
      <header className="tw-org-hero">
        <span className="eyebrow">{t('pages.organisations.eyebrow')}</span>
        <h1 className="h1" tabIndex={-1}>
          {title}
        </h1>
        <p className="body-lg">{t('pages.organisations.intro')}</p>
        <div className="tw-org-hero-actions">
          <Button variant="primary" icon="Mail" href={contactPath()}>
            {t('pages.organisations.getInTouch')}
          </Button>
          <Button variant="secondary" icon="BookOpen" href={coursePath()}>
            {t('pages.educators.browseCourse')}
          </Button>
        </div>
      </header>

      <section aria-labelledby="org-what" className="tw-org-card">
        <h2 id="org-what" className="h2">
          {t('pages.organisations.whatTitle')}
        </h2>
        <p>{t('pages.organisations.whatBody', { lessons: lessons.length })}</p>
      </section>

      {/* "Run a session": what a session with a group looks like. */}
      <SiteVideo video="session" wide />

      <div className="tw-org-pair">
        <section aria-labelledby="org-get" className="tw-org-card">
          <h2 id="org-get" className="h2">
            {t('pages.organisations.getTitle')}
          </h2>
          <ul className="tw-org-list" role="list">
            {GET.map((key) => (
              <li key={key}>
                <Icon name="Check" size={22} />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="org-ask" className="tw-org-card">
          <h2 id="org-ask" className="h2">
            {t('pages.organisations.askTitle')}
          </h2>
          <ul className="tw-org-list" role="list">
            {ask.map((text) => (
              <li key={text}>
                <Icon name="ArrowRight" size={22} className="tw-org-direction" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="org-privacy" className="tw-org-card">
        <h2 id="org-privacy" className="h2">
          {t('pages.organisations.privacyTitle')}
        </h2>
        <ul className="tw-org-list" role="list">
          {PRIVACY.map((item) => (
            <li key={item.key}>
              <Icon name={item.icon} size={22} />
              <span>{t(item.key)}</span>
            </li>
          ))}
        </ul>
        <p className="tw-org-now">{t('pages.organisations.privacyNow')}</p>
      </section>

      <section aria-labelledby="org-start" className="tw-org-card">
        <h2 id="org-start" className="h2">
          {t('pages.organisations.startTitle')}
        </h2>
        <p>{t('pages.organisations.startBody')}</p>
        <div className="tw-org-actions">
          <Button variant="secondary" icon="ListChecks" href={setupPath()}>
            {t('pages.educators.setupCta')}
          </Button>
          <Button variant="secondary" icon="User" href={codeCardsPath()}>
            {t('pages.educators.pilotCodesCta')}
          </Button>
          <Button variant="secondary" icon="GraduationCap" href={sessionGuidePath()}>
            {t('pages.educators.pilotDayCta')}
          </Button>
        </div>
      </section>

      {/* The optional learning study: only for an organisation taking part. The consent form's promise, kept as it is. */}
      <section aria-labelledby="org-study" className="tw-org-card tw-org-study">
        <h2 id="org-study" className="h2">
          {t('pages.organisations.studyTitle')}
        </h2>
        <p>{t('pages.organisations.studyIntro')}</p>
        <ul className="tw-org-list" role="list">
          <li>
            <Icon name="FileText" size={22} />
            <span>{t('pages.organisations.privacy3')}</span>
          </li>
          <li>
            <Icon name="Lock" size={22} />
            <span>{t('pages.organisations.studyShare')}</span>
          </li>
        </ul>
        <div className="tw-org-actions">
          <Button variant="secondary" icon="BookOpen" href={informationSheetPath()}>
            {t('pages.educators.pilotSheetCta')}
          </Button>
          <Button variant="secondary" icon="FileText" href={consentFormPath()}>
            {t('pages.educators.pilotConsentCta')}
          </Button>
          <Button variant="secondary" icon="ClipboardCheck" href={learningCheckPath()}>
            {t('pages.educators.pilotCheckCta')}
          </Button>
        </div>
      </section>

      <section aria-labelledby="org-who" className="tw-org-card tw-org-who">
        <h2 id="org-who" className="h2">
          {t('pages.organisations.whoTitle')}
        </h2>
        <p>{t('pages.organisations.honesty')}</p>
      </section>

      <section aria-labelledby="org-contact" className="tw-org-card tw-org-contact">
        <h2 id="org-contact" className="h2">
          {t('pages.organisations.contactTitle')}
        </h2>
        <p>{t('pages.organisations.contactBody')}</p>
        <div className="tw-org-actions">
          <Button variant="secondary" icon="Mail" href={contactPath()}>
            {t('pages.organisations.getInTouch')}
          </Button>
          {CONTACT_EMAIL ? (
            <a href={`mailto:${CONTACT_EMAIL}`} className="tw-org-email" translate="no">
              {CONTACT_EMAIL}
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
