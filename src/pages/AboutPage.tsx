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

/**
 * About (docs/screens/About.dc.html): what Thinkerwell is, the promise to
 * learners, the UN goals it works towards, and who makes it. Honest about
 * scope (CLAUDE.md rule 8): a student-led project getting ready for its
 * first pilot, never claimed as a registered charity.
 *
 * Justin Park has a real photo; Nick Thiery's is a placeholder (a dashed
 * box with a person icon) until his is ready, exactly as the screen shows.
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

      <section aria-labelledby="about-what" className="tw-about-card tw-about-what">
        <h2 id="about-what" className="h2">
          {t('pages.about.whatTitle')}
        </h2>
        <p className="body-lg">{t('pages.about.whatBody')}</p>
        <p className="small tw-about-honesty">{t('pages.about.whatHonesty')}</p>
      </section>

      <section aria-labelledby="about-promise" className="tw-about-card tw-about-promise">
        <h2 id="about-promise" className="h2">
          {t('pages.about.promiseTitle')}
        </h2>
        <span className="tw-about-promise-item">
          <Icon name="Check" size={24} />
          {t('pages.about.promise1')}
        </span>
        <span className="tw-about-promise-item">
          <Icon name="Check" size={24} />
          {t('pages.about.promise2')}
        </span>
        <span className="tw-about-promise-item">
          <Icon name="Check" size={24} />
          {t('pages.about.promise3')}
        </span>
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
            <div className="tw-about-photo tw-about-photo-placeholder" role="img" aria-label={t('pages.about.nickPhotoComing')}>
              <Icon name="User" size={32} />
              <span>{t('pages.about.nickPhotoLabel')}</span>
            </div>
            <span className="eyebrow">{t('pages.about.nickRole')}</span>
            <h3 id="about-nick" className="h2">
              {t('pages.about.nickName')}
            </h3>
            <p>{t('pages.about.nickBio')}</p>
          </article>
        </div>
      </section>
    </div>
  );
}
