import { CONTACT_EMAIL } from '../app/contact';
import { useFullPageTitle } from '../app/usePageTitle';
import {
  allCertificatesPath,
  classPath,
  codeCardsPath,
  consentFormPath,
  contactPath,
  coursePath,
  guidesPath,
  informationSheetPath,
  learningCheckPath,
  lessonPrintPath,
  organisationsPath,
  sessionGuidePath,
  setupPath,
} from '../app/lessonUrls';
import { Button, Icon, type IconName } from '../components/ds';
import { useContent } from '../content/useContent';
import { useI18n } from '../i18n';
import './EducatorsPage.css';
import { LessonDisclosure } from './lesson/LessonDisclosure';
import { SiteVideo } from './siteVideo/SiteVideo';

/**
 * For educators (docs/screens/Educators.dc.html), a short start page
 * (October 2026, Justin's brief "simplify For Educators"): what a teacher or
 * volunteer needs, then how to run a session (with the video "Run a
 * session" folded away, ./siteVideo/), the teaching materials (one link to
 * every teacher guide, printable lesson and answer key: /educators/guides),
 * the class on this device, resources for running a group (For
 * organisations, the session guide, learner code cards), the optional
 * learning study folded away (information sheet, consent form, learning
 * check: never needed to teach a lesson), and how to reach the team.
 * Collects nothing itself: questions go to the contact form (/contact).
 */
export function EducatorsPage() {
  const { t, tx } = useI18n();
  const content = useContent();
  useFullPageTitle(t('seo.educators.title'));
  // Resources for running a group: what it involves, the session guide and code cards.
  const group: Tool[] = [
    {
      icon: 'Info',
      title: t('pages.educators.pilotAboutTitle'),
      body: t('pages.educators.pilotAboutBody'),
      cta: t('pages.educators.pilotAboutCta'),
      href: organisationsPath(),
    },
    {
      icon: 'GraduationCap',
      title: t('pages.educators.pilotDayTitle'),
      body: t('pages.educators.pilotDayBody'),
      cta: t('pages.educators.pilotDayCta'),
      href: sessionGuidePath(),
    },
    {
      icon: 'User',
      title: t('pages.educators.pilotCodesTitle'),
      body: t('pages.educators.pilotCodesBody'),
      cta: t('pages.educators.pilotCodesCta'),
      href: codeCardsPath(),
    },
  ];
  // The optional learning study: only for an organisation taking part (docs/notes/partner-kit.md).
  const study: Tool[] = [
    {
      icon: 'BookOpen',
      title: t('pages.educators.pilotSheetTitle'),
      body: t('pages.educators.pilotSheetBody'),
      cta: t('pages.educators.pilotSheetCta'),
      href: informationSheetPath(),
    },
    {
      icon: 'FileText',
      title: t('pages.educators.pilotConsentTitle'),
      body: t('pages.educators.pilotConsentBody'),
      cta: t('pages.educators.pilotConsentCta'),
      href: consentFormPath(),
    },
    {
      icon: 'ClipboardCheck',
      title: t('pages.educators.pilotCheckTitle'),
      body: t('pages.educators.pilotCheckBody'),
      cta: t('pages.educators.pilotCheckCta'),
      href: learningCheckPath(),
    },
  ];
  // Following the group on this device (docs/notes/pilot-day-tools.md).
  const tools: Tool[] = [
    {
      icon: 'Users',
      title: t('pages.educators.classTitle'),
      body: t('pages.educators.classBody'),
      cta: t('pages.educators.classCta'),
      href: classPath(),
    },
    {
      icon: 'Award',
      title: t('pages.educators.certificatesTitle'),
      body: t('pages.educators.certificatesBody'),
      cta: t('pages.educators.certificatesCta'),
      href: allCertificatesPath(),
    },
  ];
  const allLessons = content.getLessons();
  const firstLessonId = allLessons[0]!.id;
  // The same range the course page shows ("About 25–50 min a lesson").
  const minMinutes = Math.min(...allLessons.map((lesson) => lesson.estimatedMinutes[0]));
  const maxMinutes = Math.max(...allLessons.map((lesson) => lesson.estimatedMinutes[1]));

  return (
    <div className="tw-edu-page">
      <section className="tw-edu-hero">
        <div className="tw-edu-hero-text">
          <span className="eyebrow">{t('pages.educators.eyebrow')}</span>
          <h1 className="h1" tabIndex={-1}>
            {t('pages.educators.title')}
          </h1>
          <p className="h2 tw-edu-tagline">{t('pages.educators.heroTitle')}</p>
          <p className="body-lg">{t('pages.educators.heroBody')}</p>
          <div className="tw-edu-hero-actions">
            <Button variant="primary" size="lg" icon="BookOpen" href={coursePath()}>
              {t('pages.educators.browseCourse')}
            </Button>
            <Button variant="secondary" size="lg" icon="ListChecks" href={setupPath()}>
              {t('pages.educators.setupDevice')}
            </Button>
          </div>
          <a className="tw-edu-paper-link" href={lessonPrintPath(firstLessonId)}>
            <Icon name="Printer" size={20} />
            {t('pages.educators.printLesson')}
          </a>
        </div>
        <aside aria-labelledby="need-title" className="tw-edu-need">
          <h2 id="need-title" className="h3">
            {t('pages.educators.needTitle')}
          </h2>
          <span className="tw-edu-need-item">
            <Icon name="Users" size={22} />
            {t('pages.educators.need1')}
          </span>
          <span className="tw-edu-need-item">
            <Icon name="Pencil" size={22} />
            {t('pages.educators.need2')}
          </span>
          <span className="tw-edu-need-item">
            <Icon name="Clock" size={22} />
            {t('pages.educators.need3', { min: minMinutes, max: maxMinutes })}
          </span>
          <span className="tw-edu-need-item">
            <Icon name="WifiOff" size={22} />
            {t('pages.educators.need4')}
          </span>
        </aside>
      </section>

      <section aria-labelledby="how-title" className="tw-edu-section">
        <h2 id="how-title" className="h2">
          {t('pages.educators.howTitle')}
        </h2>
        <ol className="tw-edu-steps">
          <li className="tw-edu-step">
            <span className="tw-edu-step-n">1</span>
            <span className="h3">{t('pages.educators.step1Title')}</span>
            <span>{t('pages.educators.step1Body')}</span>
          </li>
          <li className="tw-edu-step">
            <span className="tw-edu-step-n">2</span>
            <span className="h3">{t('pages.educators.step2Title')}</span>
            <span>{t('pages.educators.step2Body')}</span>
          </li>
          <li className="tw-edu-step">
            <span className="tw-edu-step-n">3</span>
            <span className="h3">{t('pages.educators.step3Title')}</span>
            <span>{t('pages.educators.step3Body')}</span>
          </li>
        </ol>
        {/* "Run a session", shown in about a minute: folded away, and nothing downloads before the tap. */}
        <LessonDisclosure icon="Play" summary={t('pages.educators.overview')} className="tw-edu-fold">
          <SiteVideo video="session" watchVariant="secondary" wide />
        </LessonDisclosure>
      </section>

      <div className="tw-edu-cards">
        <section aria-labelledby="materials-title" className="tw-edu-card">
          <h2 id="materials-title" className="h3">
            {t('pages.educators.materialsTitle')}
          </h2>
          <p className="tw-edu-card-lead">{t('pages.educators.guidesTitle')}</p>
          <p>{t('pages.educators.guidesBody')}</p>
          <Button variant="secondary" icon="GraduationCap" href={guidesPath()} className="tw-edu-card-action">
            {t('pages.educators.guidesCta')}
          </Button>
        </section>
        <section aria-labelledby="device-title" className="tw-edu-card">
          <h2 id="device-title" className="h3">
            {t('pages.educators.deviceTitle')}
          </h2>
          <p>{t('pages.educators.toolsIntro')}</p>
          <ToolList tools={tools} compact />
        </section>
      </div>

      <section aria-labelledby="group-title" className="tw-edu-section">
        <h2 id="group-title" className="h2">
          {t('pages.educators.groupTitle')}
        </h2>
        <p className="tw-edu-preview-intro">{t('pages.educators.groupIntro')}</p>
        <ToolList tools={group} />
        {/* The optional learning study: one clearly named fold, never in the way of teaching. */}
        <LessonDisclosure icon="FileText" summary={t('pages.educators.studyTitle')} className="tw-edu-fold tw-edu-study">
          <p className="tw-edu-preview-intro">{t('pages.educators.studyIntro')}</p>
          <ToolList tools={study} />
        </LessonDisclosure>
      </section>

      <section aria-labelledby="fb-title" className="tw-edu-card tw-edu-card-feedback">
        <h2 id="fb-title" className="h3">
          {t('pages.educators.feedbackTitle')}
        </h2>
        {CONTACT_EMAIL ? (
          <p>
            {tx('pages.educators.feedbackBody', {
              email: (
                <a href={`mailto:${CONTACT_EMAIL}`} className="tw-edu-feedback-email" translate="no">
                  {CONTACT_EMAIL}
                </a>
              ),
            })}
          </p>
        ) : null}
        <Button variant="secondary" icon="Mail" href={contactPath()} className="tw-edu-card-action">
          {t('pages.educators.sendEnquiry')}
        </Button>
      </section>
    </div>
  );
}

interface Tool {
  icon: IconName;
  title: string;
  body: string;
  cta: string;
  href: string;
}

/** A list of tools, each with what it's for and a button to open it; `compact` inside a card. */
function ToolList({ tools, compact }: { tools: readonly Tool[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'tw-edu-tools tw-edu-tools-compact' : 'tw-edu-tools'} role="list">
      {tools.map((tool) => (
        <li key={tool.href} className="tw-edu-check tw-edu-tool">
          <span className="tw-edu-check-icon">
            <Icon name={tool.icon} size={22} />
          </span>
          <span className="tw-edu-check-text">
            <span className="tw-edu-check-title">{tool.title}</span>
            <span className="small tw-edu-check-meta">{tool.body}</span>
          </span>
          <Button variant="secondary" icon={tool.icon} href={tool.href}>
            {tool.cta}
          </Button>
        </li>
      ))}
    </ul>
  );
}
