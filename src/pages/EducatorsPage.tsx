import { useSearchParams } from 'react-router';
import { CONTACT_EMAIL } from '../app/contact';
import { useFullPageTitle } from '../app/usePageTitle';
import {
  allCertificatesPath,
  answerKeyPath,
  classPath,
  codeCardsPath,
  consentFormPath,
  informationSheetPath,
  lessonPrintPath,
  organisationsPath,
  setupPath,
} from '../app/lessonUrls';
import { Badge, Button, Chip, Icon, type IconName } from '../components/ds';
import { type SectionId } from '../content';
import { useContent } from '../content/useContent';
import { En, useI18n } from '../i18n';
import './EducatorsPage.css';
import { EducatorLessonRow } from './educators/EducatorLessonRow';
import { SECTION_ICONS } from './course/sectionIcons';
import { SiteVideo } from './siteVideo/SiteVideo';

/**
 * For educators (docs/screens/Educators.dc.html): what a teacher or
 * volunteer needs to run a session, the tools for setting up this device and
 * following the group on it (under "Starting a pilot": For organisations,
 * the information sheet, the consent form, code cards and the setup
 * checklist; then the class view and every certificate to print), how a
 * session works (with the video "Run a session", ./siteVideo/), and every
 * lesson to preview,
 * each with its teacher guide, and each section's check with its answer key. Collects nothing: "Tell us what to fix" keeps the "[FEEDBACK
 * EMAIL]" placeholder visible rather than a form (CLAUDE.md's
 * no-accounts-no-collection rule).
 *
 * The chosen section is in the address (`?section=geography`), so "Back to
 * the educators page" on a teacher guide, and the browser's own Back, return
 * to the same list. Changing it replaces the address without scrolling.
 */
export function EducatorsPage() {
  const { t, tx, contentLang } = useI18n();
  const content = useContent();
  useFullPageTitle(t('seo.educators.title'));
  const sections = content.getSections();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionId: SectionId = content.getSection(searchParams.get('section') ?? '')?.id ?? sections[0]!.id;
  const section = content.getSection(sectionId)!;
  const quiz = content.getQuiz(sectionId);
  const lessons = content.getSectionLessons(sectionId);
  const firstInSection = section.lessons[0] ?? 0;
  const lastInSection = section.lessons[section.lessons.length - 1] ?? firstInSection;
  const range =
    firstInSection === lastInSection
      ? String(firstInSection)
      : t('pages.course.numberRange', { first: firstInSection, last: lastInSection });

  function chooseSection(id: SectionId): void {
    setSearchParams({ section: id }, { replace: true, preventScrollReset: true });
  }
  // Starting a pilot: the partner kit, and setting up each device.
  const pilot: Tool[] = [
    {
      icon: 'Info',
      title: t('pages.educators.pilotAboutTitle'),
      body: t('pages.educators.pilotAboutBody'),
      cta: t('pages.educators.pilotAboutCta'),
      href: organisationsPath(),
    },
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
      icon: 'User',
      title: t('pages.educators.pilotCodesTitle'),
      body: t('pages.educators.pilotCodesBody'),
      cta: t('pages.educators.pilotCodesCta'),
      href: codeCardsPath(),
    },
    {
      icon: 'ListChecks',
      title: t('pages.educators.setupTitle'),
      body: t('pages.educators.setupBody'),
      cta: t('pages.educators.setupCta'),
      href: setupPath(),
    },
  ];
  // Pilot-day tools for following the group on this device (docs/notes/pilot-day-tools.md).
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
            <Button variant="primary" size="lg" icon="Eye" href="#preview-lessons">
              {t('pages.educators.previewLesson')}
            </Button>
            <Button variant="secondary" size="lg" icon="Printer" href={lessonPrintPath(firstLessonId)}>
              {t('pages.educators.printLesson')}
            </Button>
          </div>
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
          <Button variant="ghost" icon="Settings" href="/settings" className="tw-edu-need-settings">
            {t('pages.educators.settingsLink')}
          </Button>
        </aside>
      </section>

      <section aria-labelledby="pilot-title" className="tw-edu-section">
        <h2 id="pilot-title" className="h2">
          {t('pages.educators.pilotTitle')}
        </h2>
        <p className="tw-edu-preview-intro">{t('pages.educators.pilotIntro')}</p>
        <ToolList tools={pilot} />
      </section>

      <section aria-labelledby="tools-title" className="tw-edu-section">
        <h2 id="tools-title" className="h2">
          {t('pages.educators.followTitle')}
        </h2>
        <p className="tw-edu-preview-intro">{t('pages.educators.toolsIntro')}</p>
        <ToolList tools={tools} />
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
        {/* "Run a session": the same, shown in about a minute. The hero has this page's one primary button. */}
        <SiteVideo video="session" watchVariant="secondary" wide />
      </section>

      <section id="preview-lessons" aria-labelledby="preview-title" className="tw-edu-section">
        <div className="tw-edu-section-head">
          <h2 id="preview-title" className="h2">
            {t('pages.educators.previewTitle')}
          </h2>
          <span className="small tw-edu-preview-note">{t('pages.educators.previewNote')}</span>
        </div>
        <p className="tw-edu-preview-intro">{t('pages.educators.previewIntro')}</p>
        <div role="radiogroup" aria-label={t('pages.educators.sectionLabel')} className="tw-edu-chips">
          {sections.map((option) => (
            <Chip
              key={option.id}
              role="radio"
              icon={SECTION_ICONS[option.id]}
              selected={option.id === sectionId}
              onClick={() => chooseSection(option.id)}
              {...contentLang}
            >
              {option.title}
            </Chip>
          ))}
        </div>
        <div className="tw-edu-lessons">
          {lessons.map((lesson) => (
            <EducatorLessonRow key={lesson.id} lesson={lesson} />
          ))}
          {quiz ? (
            <div className="tw-edu-check">
              <span className="tw-edu-check-icon">
                <Icon name="ClipboardCheck" size={22} />
              </span>
              <span className="tw-edu-check-text">
                <span className="tw-edu-check-title">{tx('pages.sectionCheck.title', { section: <En>{section.title}</En> })}</span>
                <span className="small tw-edu-check-meta">
                  {t('pages.sectionCheck.factQuestions', { count: quiz.questions.length, range })}
                </span>
              </span>
              <Button
                variant="secondary"
                icon="ClipboardCheck"
                href={answerKeyPath(sectionId)}
                aria-label={t('pages.educators.answerKeyLabel', { section: section.title })}
              >
                {t('pages.educators.answerKey')}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="tw-edu-cards">
        <section aria-labelledby="codes-title" className="tw-edu-card">
          <Badge tone="lavender">{t('pages.educators.codesTag')}</Badge>
          <h2 id="codes-title" className="h3">
            {t('pages.educators.codesTitle')}
          </h2>
          <p>{t('pages.educators.codesBody')}</p>
          <Button variant="secondary" icon="User" href={codeCardsPath()} className="tw-edu-card-action">
            {t('pages.educators.pilotCodesCta')}
          </Button>
        </section>
        {CONTACT_EMAIL ? (
          <section aria-labelledby="fb-title" className="tw-edu-card tw-edu-card-feedback">
            <h2 id="fb-title" className="h3">
              {t('pages.educators.feedbackTitle')}
            </h2>
            <p>
              {tx('pages.educators.feedbackBody', {
                email: (
                  <a href={`mailto:${CONTACT_EMAIL}`} className="tw-edu-feedback-email">
                    {CONTACT_EMAIL}
                  </a>
                ),
              })}
            </p>
          </section>
        ) : null}
      </div>
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

/** A list of tools, each with what it's for and a button to open it. */
function ToolList({ tools }: { tools: readonly Tool[] }) {
  return (
    <ul className="tw-edu-tools" role="list">
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
