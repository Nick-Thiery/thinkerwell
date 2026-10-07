/**
 * For organisations (/organisations): what a partner organisation needs to
 * decide on a pilot. What Thinkerwell is, what partners get, what we ask,
 * how learners' privacy is kept, the tools to get ready, and how to
 * contact us. Linked from the Educators page ("Starting a pilot") and the
 * footer of every page.
 *
 * Honest about scope (CLAUDE.md rule 8): a student-led platform, not a
 * registered charity. Honest about data too: today learners' work and
 * progress aren't sent to Thinkerwell, YouTube and online speech-to-text are
 * the outside services a learner can reach, and the anonymous pilot data the
 * consent form describes comes later (docs/research/MEASUREMENT_PLAN.md).
 * The contact card shows only once there is a real address (CONTACT_EMAIL);
 * there is no form, so nothing is collected here. The wording follows
 * docs/content/PUBLIC_COPY.md.
 */
import { CONTACT_EMAIL } from '../app/contact';
import { codeCardsPath, consentFormPath, informationSheetPath, setupPath } from '../app/lessonUrls';
import { useFullPageTitle } from '../app/usePageTitle';
import { Button, Icon, type IconName } from '../components/ds';
import { useContent } from '../content/useContent';
import { useI18n, type MessageKey } from '../i18n';
import './OrganisationsPage.css';

const GET: readonly MessageKey[] = [
  'pages.organisations.get1',
  'pages.organisations.get2',
  'pages.organisations.get3',
  'pages.organisations.get4',
];

const PRIVACY: ReadonlyArray<{ icon: IconName; key: MessageKey }> = [
  { icon: 'User', key: 'pages.organisations.privacy1' },
  { icon: 'Lock', key: 'pages.organisations.privacy2' },
  { icon: 'FileText', key: 'pages.organisations.privacy3' },
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
        <p className="tw-org-honesty">{t('pages.organisations.honesty')}</p>
      </header>

      <section aria-labelledby="org-what" className="tw-org-card">
        <h2 id="org-what" className="h2">
          {t('pages.organisations.whatTitle')}
        </h2>
        <p>{t('pages.organisations.whatBody', { lessons: lessons.length })}</p>
      </section>

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
          <Button variant="secondary" icon="BookOpen" href={informationSheetPath()}>
            {t('pages.educators.pilotSheetCta')}
          </Button>
          <Button variant="secondary" icon="FileText" href={consentFormPath()}>
            {t('pages.educators.pilotConsentCta')}
          </Button>
          <Button variant="secondary" icon="User" href={codeCardsPath()}>
            {t('pages.educators.pilotCodesCta')}
          </Button>
          <Button variant="secondary" icon="ListChecks" href={setupPath()}>
            {t('pages.educators.setupCta')}
          </Button>
        </div>
      </section>

      {CONTACT_EMAIL ? (
        <section aria-labelledby="org-contact" className="tw-org-card tw-org-contact">
          <h2 id="org-contact" className="h2">
            {t('pages.organisations.contactTitle')}
          </h2>
          <p>{t('pages.organisations.contactBody')}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="tw-org-email">
            {CONTACT_EMAIL}
          </a>
        </section>
      ) : null}
    </div>
  );
}
