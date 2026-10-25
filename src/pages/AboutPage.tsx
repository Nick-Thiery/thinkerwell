import { faLinkedin } from '@fortawesome/free-brands-svg-icons/faLinkedin';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import words from 'virtual:thinkerwell/messages/aboutPage';
import { creditsPath } from '../app/lessonUrls';
import { useFullPageTitle } from '../app/usePageTitle';
import { Icon, Mascot, STAGE_ICON } from '../components/ds';
import { commonStages, type StageId } from '../content/stages';
import { useCatalog } from '../content/useCatalog';
import { useI18n, withWords } from '../i18n';
import type { I18nContextValue } from '../i18n/I18nProvider';
import './AboutPage.css';
import { SiteVideo } from './siteVideo/SiteVideo';

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

interface Goal {
  src: string;
  titleKey: 'goal4Title' | 'goal10Title' | 'goal16Title' | 'goal17Title';
  bodyKey: 'goal4Body' | 'goal10Body' | 'goal16Body' | 'goal17Body';
  altKey: 'goal4Alt' | 'goal10Alt' | 'goal16Alt' | 'goal17Alt';
}

const GOALS: Goal[] = [
  { src: '/images/sdg-04.png', titleKey: 'goal4Title', bodyKey: 'goal4Body', altKey: 'goal4Alt' },
  { src: '/images/sdg-10.png', titleKey: 'goal10Title', bodyKey: 'goal10Body', altKey: 'goal10Alt' },
  { src: '/images/sdg-16.png', titleKey: 'goal16Title', bodyKey: 'goal16Body', altKey: 'goal16Alt' },
  { src: '/images/sdg-17.png', titleKey: 'goal17Title', bodyKey: 'goal17Body', altKey: 'goal17Alt' },
];

/**
 * The research behind "How our lessons work", one study a step (the team's
 * brief, October 2026). Each summary in the language on screen says what the
 * study found and what it did not show (`aboutPage.studies`); the citation
 * stays as published, in English. None of them tested Thinkerwell, and the
 * card says so: never describe them as proof that it works.
 */
interface Study {
  authors: string;
  year: string;
  title: string;
  journal: string;
  /** The paper, or its authors' or university's copy. */
  url: string;
}

export const STUDIES: Record<StageId, Study> = {
  read: {
    authors: 'Connor, C. M., et al.',
    year: '2017',
    title:
      'Acquiring science and social studies knowledge in kindergarten through fourth grade: Conceptualization, design, implementation, and efficacy testing of content-area literacy instruction (CALI)',
    journal: 'Journal of Educational Psychology',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5415842/',
  },
  write: {
    authors: 'Arnold, K. M., et al.',
    year: '2017',
    title: 'Understanding the cognitive processes involved in writing to learn',
    journal: 'Journal of Experimental Psychology: Applied',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28447809/',
  },
  speak: {
    authors: 'Chi, M. T. H., de Leeuw, N., Chiu, M.-H., & LaVancher, C.',
    year: '1994',
    title: 'Eliciting self-explanations improves understanding',
    journal: 'Cognitive Science',
    url: 'https://education.asu.edu/lcl/publications/chi-m-t-h-de-leeuw-n-chiu-m-h-lavancher-c-1994-eliciting-self-explanations-0',
  },
  watch: {
    authors: 'Szpunar, K. K., Khan, N. Y., & Schacter, D. L.',
    year: '2013',
    title: 'Interpolated memory tests reduce mind wandering and improve learning of online lectures',
    journal: 'Proceedings of the National Academy of Sciences',
    url: 'https://dash.harvard.edu/entities/publication/70205cdf-1aaa-4b2e-892e-09f5da773e18',
  },
  reflect: {
    authors: 'Davis, E. A.',
    year: '2003',
    title: 'Prompting middle school science students for productive reflection: Generic and directed prompts',
    journal: 'Journal of the Learning Sciences',
    url: 'https://eric.ed.gov/?id=EJ661895',
  },
};

/** A link to another site, opening in a new tab (as on Credits). */
function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <span className="tw-visually-hidden"> {t('pages.teacherTools.newTab')}</span>
    </a>
  );
}

/**
 * "How our lessons work": the steps (five, or four without Watch), each with its icon, its name and
 * one sentence, then one quiet line on the research and, folded away, the
 * studies themselves (a native <details>, closed until opened).
 */
function LessonSteps({ t }: { t: I18nContextValue['t'] }) {
  const { englishLang } = useI18n();
  // Every lesson's steps: four without Watch in a translated language with no videos of its own.
  const catalog = useCatalog();
  const stages = commonStages(catalog.getLessons(), catalog.stagesFor);
  const withWatch = stages.includes('watch');
  return (
    <section aria-labelledby="about-lessons" className="tw-about-card tw-about-lessons">
      <h2 id="about-lessons" className="h2">
        {t('aboutPage.lessonsTitle')}
      </h2>
      <p className="body-lg tw-about-lessons-intro">{t(withWatch ? 'aboutPage.lessonsIntro' : 'aboutPage.lessonsIntroNoWatch')}</p>
      <ol className="tw-about-steps">
        {stages.map((stage) => (
          <li key={stage} className="tw-about-step">
            <span className="tw-about-step-icon" aria-hidden="true">
              <Icon name={STAGE_ICON[stage]} size={22} />
            </span>
            <div>
              <h3 className="tw-about-step-name">{t(`stages.${stage}`)}</h3>
              <p>{t(`aboutPage.steps.${stage}`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="small tw-about-research-note">{t('aboutPage.researchNote')}</p>
      <details className="tw-about-research">
        <summary>
          <Icon name="ChevronRight" size={20} className="tw-about-research-chevron" />
          {t('aboutPage.researchTitle')}
        </summary>
        <div className="tw-about-research-body">
          <p>{t('aboutPage.researchIntro')}</p>
          <ul className="tw-about-studies">
            {stages.map((stage) => {
              const study = STUDIES[stage];
              return (
                <li key={stage}>
                  <strong>{t(`stages.${stage}`)}</strong>
                  <p className="small tw-about-study-cite">
                    <span {...englishLang}>
                      {study.authors} ({study.year}). <ExternalLink href={study.url}>{study.title}</ExternalLink>. <cite>{study.journal}</cite>.
                    </span>
                  </p>
                  <p className="small">{t(`aboutPage.studies.${stage}`)}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </details>
    </section>
  );
}

/** The team's LinkedIn profiles, shown under their names. */
const LINKEDIN = {
  justin: 'https://www.linkedin.com/in/justin-park-a567b03a5/',
  nick: 'https://www.linkedin.com/in/nicholasthiery/',
} as const;

/**
 * LinkedIn's logo, from Font Awesome Free's brand icons (CC BY 4.0, credited
 * on /credits). Drawn inline from the package's path, so nothing is fetched
 * from LinkedIn or anywhere else. In ink, one of the colours LinkedIn's
 * brand rules allow for its logo.
 */
function LinkedInLogo() {
  const [width, height, , , path] = faLinkedin.icon;
  return (
    <svg
      className="tw-about-linkedin-logo"
      viewBox={`0 0 ${width} ${height}`}
      width={20}
      height={20}
      aria-hidden="true"
      focusable="false"
    >
      <path d={Array.isArray(path) ? path.join(' ') : path} fill="currentColor" />
    </svg>
  );
}

/** "LinkedIn", under a team member's name; opens their profile in a new tab. */
function LinkedInLink({ href, name }: { href: string; name: string }) {
  const { t } = useI18n();
  return (
    <a href={href} target="_blank" rel="noreferrer" className="tw-about-linkedin" aria-label={t('pages.about.linkedinLabel', { name })}>
      <LinkedInLogo />
      <span translate="no">{t('pages.about.linkedin')}</span>
    </a>
  );
}

/**
 * About (docs/screens/About.dc.html): the mission, how a lesson works, how it
 * connects to the UN goals, and who makes it. The mission card carries the team's approved
 * mission statement and nothing else (October 2026); what the course is
 * lives on Home, the course page and For organisations, and the pilot status
 * and that Thinkerwell is not a registered charity or nonprofit (CLAUDE.md
 * rule 8) live on For organisations and the consent form. The UN icons
 * carry a no-endorsement note.
 *
 * Both team members are shown with their photos (public/images/, made
 * from the originals in docs/design-system/assets/ by
 * scripts/optimise_images.py) and a link to their LinkedIn profiles.
 *
 * Under the mission, "How our lessons work": the five steps, a line on the
 * research behind them and, folded away, the studies (the team's brief,
 * October 2026). Then Thinkerwell's video "Explore your world" under its own
 * heading (./siteVideo/, docs/notes/site-videos.md), played from this site
 * only when tapped, with its words as the written version, beside the UN
 * goals.
 *
 * The page ends with a link to Credits (/credits), which lists the lessons'
 * sources, the videos, the fonts, the pictures and the software in full.
 */
export function AboutPage() {
  // "How our lessons work" and the video's heading load with this page, not with the app (src/i18n/lazyGroups.ts).
  const parent = useI18n();
  const { t } = useMemo(() => withWords(parent, words), [parent]);
  useFullPageTitle(t('seo.about.title'));

  return (
    <div className="tw-about-page">
      <header className="tw-about-hero">
        <Mascot src={MASCOT_SRC} size={150} alt={t('app.mascotAlt')} />
        <div className="tw-about-hero-text">
          <h1 className="h1" tabIndex={-1}>
            {t('pages.about.title')}
          </h1>
          <p className="body-lg">{t('pages.about.tagline')}</p>
        </div>
      </header>

      {/*
        The mission, how a lesson works, then the video beside the UN goals. On a phone and a tablet they stack in
        that order; on a laptop the first two run across the page and the last two share a row (AboutPage.css).
      */}
      <div className="tw-about-cards">
        <section aria-labelledby="about-mission" className="tw-about-card tw-about-mission">
          <h2 id="about-mission" className="h2">
            {t('pages.about.missionTitle')}
          </h2>
          <p className="body-lg">{t('pages.about.missionBody')}</p>
        </section>
        <LessonSteps t={t} />
        <section aria-labelledby="about-video" className="tw-about-card tw-about-video">
          <h2 id="about-video" className="h2">
            {t('aboutPage.videoTitle')}
          </h2>
          <SiteVideo video="explore" compact />
        </section>
        <section aria-labelledby="about-goals" className="tw-about-card tw-about-goals">
          <h2 id="about-goals" className="h2">
            {t('pages.about.goalsTitle')}
          </h2>
          <div className="tw-about-goal-list">
            {GOALS.map((goal) => (
              <div className="tw-about-goal" key={goal.src}>
                <img src={goal.src} alt={t(`pages.about.${goal.altKey}`)} width={72} height={72} />
                <div>
                  <strong>{t(`pages.about.${goal.titleKey}`)}</strong>
                  <span>{t(`pages.about.${goal.bodyKey}`)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="small tw-about-status">{t('pages.about.goalsNote')}</p>
        </section>
      </div>

      <section aria-labelledby="about-team" className="tw-about-team">
        <h2 id="about-team" className="h2">
          {t('pages.about.teamTitle')}
        </h2>
        <div className="tw-about-team-grid">
          <article aria-labelledby="about-justin" className="tw-about-person">
            <img
              src="/images/founder-justin-park.jpg"
              alt={t('pages.about.justinAlt')}
              className="tw-about-photo"
              width={104}
              height={104}
            />
            <span className="eyebrow">{t('pages.about.justinRole')}</span>
            <h3 id="about-justin" className="h2">
              {t('pages.about.justinName')}
            </h3>
            <LinkedInLink href={LINKEDIN.justin} name={t('pages.about.justinName')} />
            <p>{t('pages.about.justinBio')}</p>
          </article>
          <article aria-labelledby="about-nick" className="tw-about-person">
            <img
              src="/images/nick-thiery.jpg"
              alt={t('pages.about.nickAlt')}
              className="tw-about-photo"
              width={104}
              height={104}
            />
            <span className="eyebrow">{t('pages.about.nickRole')}</span>
            <h3 id="about-nick" className="h2">
              {t('pages.about.nickName')}
            </h3>
            <LinkedInLink href={LINKEDIN.nick} name={t('pages.about.nickName')} />
            <p>{t('pages.about.nickBio')}</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="about-credits" className="tw-about-card tw-about-credits">
        <h2 id="about-credits" className="h2">
          {t('pages.about.creditsLinkTitle')}
        </h2>
        <p>{t('pages.about.creditsLinkBody')}</p>
        <p>
          <Link to={creditsPath()} className="tw-about-credits-link">
            {t('pages.about.creditsLinkCta')}
            <Icon name="ArrowRight" size={20} />
          </Link>
        </p>
      </section>
    </div>
  );
}
