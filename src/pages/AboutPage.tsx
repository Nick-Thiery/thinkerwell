import { Link } from 'react-router';
import { creditsPath } from '../app/lessonUrls';
import { usePageTitle } from '../app/usePageTitle';
import { Icon, Mascot } from '../components/ds';
import { useCatalog } from '../content/useCatalog';
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

/**
 * About (docs/screens/About.dc.html): what Thinkerwell is, how it connects
 * to the UN goals, and who makes it. The wording follows the public copy
 * guide (docs/content/PUBLIC_COPY.md): one mission statement, the pilot
 * status, and that Thinkerwell is not a registered charity or nonprofit
 * (CLAUDE.md rule 8). The UN icons carry a no-endorsement note.
 *
 * Both team members are shown with their photos (public/images/, made
 * from the originals in docs/design-system/assets/ by
 * scripts/optimise_images.py).
 *
 * The page ends with a link to Credits (/credits), which lists the lessons'
 * sources, the videos, the fonts, the pictures and the software in full.
 */
export function AboutPage() {
  const { t, tx, contentLang } = useI18n();
  const catalog = useCatalog();
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

      <section aria-labelledby="about-what" className="tw-about-card tw-about-what">
        <h2 id="about-what" className="h2">
          {t('pages.about.whatTitle')}
        </h2>
        <p className="body-lg">
          {tx('pages.about.whatBody', {
            course: <span {...contentLang}>{catalog.getCourse().course.title}</span>,
            lessons: catalog.getLessons().length,
          })}
        </p>
        <p className="small tw-about-status">{t('pages.about.whatStatus')}</p>
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
