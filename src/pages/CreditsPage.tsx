/**
 * Credits (/credits): everyone whose work Thinkerwell is built on, in
 * detail. Linked from About and from the footer of every page.
 *
 * - Lesson sources: every lesson's `sources`, lesson by lesson (the lessons
 *   are in Thinkerwell's own words; these are where the facts come from).
 * - Videos: each lesson's video, its channel and a link to it on YouTube.
 *   Only links: nothing is embedded or fetched here.
 * - Pictures and design, the UN goal icons (with the UN's own statement),
 *   the fonts, the open-source software the site ships, and how the
 *   Bahasa Indonesia version was made.
 *
 * It reads the lessons (useContent), so it lives in the teacher pages'
 * chunk with the teacher guides, which read them too.
 */
import type { ReactNode } from 'react';
import { useFullPageTitle } from '../app/usePageTitle';
import { useContent } from '../content/useContent';
import { useI18n, type MessageKey } from '../i18n';
import './CreditsPage.css';

const UN_SDG_URL = 'https://www.un.org/sustainabledevelopment';
const OFL_URL = 'https://openfontlicense.org';

const FONT_KEYS: readonly MessageKey[] = [
  'pages.credits.fontFunnel',
  'pages.credits.fontAtkinson',
  'pages.credits.fontEczar',
  'pages.credits.fontVazirmatn',
];

/** The open-source libraries that reach the browser (package.json; licences from each package). */
const SOFTWARE: ReadonlyArray<{ name: string; licence: string; url: string }> = [
  { name: 'React', licence: 'MIT License', url: 'https://react.dev' },
  { name: 'React Router', licence: 'MIT License', url: 'https://reactrouter.com' },
  { name: 'Lucide icons', licence: 'ISC License', url: 'https://lucide.dev' },
  // The LinkedIn logo on About comes from Font Awesome Free's brand icons.
  { name: 'Font Awesome Free', licence: 'CC BY 4.0', url: 'https://fontawesome.com/license/free' },
  { name: 'idb', licence: 'ISC License', url: 'https://github.com/jakearchibald/idb' },
  { name: 'Workbox', licence: 'MIT License', url: 'https://developer.chrome.com/docs/workbox' },
  { name: 'Fontsource', licence: 'MIT License', url: 'https://fontsource.org' },
];

const SECTIONS = ['sources', 'videos', 'pictures', 'fonts', 'software', 'translation'] as const;

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <span className="tw-visually-hidden"> {t('pages.teacherTools.newTab')}</span>
    </a>
  );
}

export function CreditsPage() {
  const { t, tx, contentLang, englishLang } = useI18n();
  const content = useContent();
  const title = t('pages.credits.title');
  useFullPageTitle(t('seo.credits.title'));
  const lessons = content.getLessons();

  return (
    <div className="tw-credits-page">
      <header className="tw-credits-hero">
        <h1 className="h1" tabIndex={-1}>
          {title}
        </h1>
        <p className="body-lg">{t('pages.credits.intro')}</p>
        <nav aria-labelledby="credits-contents" className="tw-credits-contents">
          <h2 id="credits-contents" className="eyebrow">
            {t('pages.credits.contents')}
          </h2>
          <ul role="list">
            {SECTIONS.map((id) => (
              <li key={id}>
                <a href={`#credits-${id}`}>{t(`pages.credits.${id}Title`)}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section aria-labelledby="credits-sources" className="tw-credits-card">
        <h2 id="credits-sources" className="h2">
          {t('pages.credits.sourcesTitle')}
        </h2>
        <p>{t('pages.credits.sourcesBody')}</p>
        <div className="tw-credits-grid">
          {lessons.map((lesson) =>
            lesson.sources.length > 0 ? (
              <div className="tw-credits-lesson" key={lesson.id}>
                <h3 className="h3">
                  {tx('pages.credits.lessonHeading', { number: lesson.number, title: <span {...contentLang}>{lesson.title}</span> })}
                </h3>
                <ul>
                  {lesson.sources.map((source) => (
                    <li key={source.url}>
                      <ExternalLink href={source.url}>
                        <span {...contentLang}>{source.label}</span>
                      </ExternalLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      </section>

      <section aria-labelledby="credits-videos" className="tw-credits-card">
        <h2 id="credits-videos" className="h2">
          {t('pages.credits.videosTitle')}
        </h2>
        <p>{t('pages.credits.videosBody')}</p>
        <ul className="tw-credits-videos">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <span className="tw-credits-video-lesson">
                {tx('pages.credits.lessonHeading', { number: lesson.number, title: <span {...contentLang}>{lesson.title}</span> })}
              </span>
              <ExternalLink href={`https://www.youtube.com/watch?v=${encodeURIComponent(lesson.watch.youtubeId)}`}>
                <span {...englishLang}>{lesson.watch.title}</span>
              </ExternalLink>
              <span className="small tw-credits-muted">
                {tx('pages.credits.videoBy', { channel: <span {...englishLang}>{lesson.watch.channel}</span> })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="tw-credits-grid tw-credits-more">
        <section aria-labelledby="credits-pictures" className="tw-credits-card">
          <h2 id="credits-pictures" className="h2">
            {t('pages.credits.picturesTitle')}
          </h2>
          <p>{t('pages.credits.picturesBody')}</p>
          <h3 className="h3">{t('pages.credits.goalsTitle')}</h3>
          <p>{t('pages.credits.goalsBody')}</p>
          <p className="small tw-credits-muted">{t('pages.credits.goalsStatement')}</p>
          <p>
            <ExternalLink href={UN_SDG_URL}>{t('pages.credits.goalsLink')}</ExternalLink>
          </p>
        </section>

        <section aria-labelledby="credits-fonts" className="tw-credits-card">
          <h2 id="credits-fonts" className="h2">
            {t('pages.credits.fontsTitle')}
          </h2>
          <p>{t('pages.credits.fontsBody')}</p>
          <ul>
            {FONT_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <p>
            <ExternalLink href={OFL_URL}>{t('pages.credits.fontsLicenceLink')}</ExternalLink>
          </p>
        </section>

        <section aria-labelledby="credits-software" className="tw-credits-card">
          <h2 id="credits-software" className="h2">
            {t('pages.credits.softwareTitle')}
          </h2>
          <p>{t('pages.credits.softwareBody')}</p>
          <ul>
            {SOFTWARE.map((item) => (
              <li key={item.name}>
                {tx('pages.credits.softwareItem', {
                  name: (
                    <ExternalLink href={item.url}>
                      <span {...englishLang}>{item.name}</span>
                    </ExternalLink>
                  ),
                  licence: <span {...englishLang}>{item.licence}</span>,
                })}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="credits-translation" className="tw-credits-card">
          <h2 id="credits-translation" className="h2">
            {t('pages.credits.translationTitle')}
          </h2>
          <p>{t('pages.credits.translationBody')}</p>
        </section>
      </div>
    </div>
  );
}
