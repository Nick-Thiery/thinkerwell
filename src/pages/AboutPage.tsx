import { faLinkedin } from '@fortawesome/free-brands-svg-icons/faLinkedin';
import { Link } from 'react-router';
import { creditsPath } from '../app/lessonUrls';
import { usePageTitle } from '../app/usePageTitle';
import { Icon, Mascot } from '../components/ds';
import { useI18n } from '../i18n';
import './AboutPage.css';

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
 * About (docs/screens/About.dc.html): the mission, how it connects to the
 * UN goals, and who makes it. The mission card carries the team's approved
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
 * The page ends with a link to Credits (/credits), which lists the lessons'
 * sources, the videos, the fonts, the pictures and the software in full.
 */
export function AboutPage() {
  const { t } = useI18n();
  usePageTitle(t('pages.about.title'));

  return (
    <div className="tw-about-page">
      <header className="tw-about-hero">
        <Mascot src={MASCOT_SRC} size={150} />
        <div className="tw-about-hero-text">
          <h1 className="h1" tabIndex={-1}>
            {t('pages.about.title')}
          </h1>
          <p className="body-lg">{t('pages.about.tagline')}</p>
        </div>
      </header>

      <section aria-labelledby="about-mission" className="tw-about-card tw-about-mission">
        <h2 id="about-mission" className="h2">
          {t('pages.about.missionTitle')}
        </h2>
        <p className="body-lg">{t('pages.about.missionBody')}</p>
      </section>

      <section aria-labelledby="about-goals" className="tw-about-card tw-about-goals">
        <h2 id="about-goals" className="h2">
          {t('pages.about.goalsTitle')}
        </h2>
        {GOALS.map((goal) => (
          <div className="tw-about-goal" key={goal.src}>
            <img src={goal.src} alt={t(`pages.about.${goal.altKey}`)} width={72} height={72} />
            <div>
              <strong>{t(`pages.about.${goal.titleKey}`)}</strong>
              <span>{t(`pages.about.${goal.bodyKey}`)}</span>
            </div>
          </div>
        ))}
        <p className="small tw-about-status">{t('pages.about.goalsNote')}</p>
      </section>

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
