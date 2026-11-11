/**
 * Credits (/credits): everyone whose work Thinkerwell is built on, in
 * detail. Linked from About and from the footer of every page.
 *
 * - Lesson sources: every lesson's `sources`, lesson by lesson (the lessons
 *   are in Thinkerwell's own words; these are where the facts come from).
 * - Videos: each lesson's video, its channel and a link to it on YouTube,
 *   and, for a language with approved videos of its own (content/<code>/videos.json,
 *   docs/notes/local-language-videos.md), that language's video for the lesson
 *   too: every video a learner can be shown. Only links: nothing is embedded
 *   or fetched from YouTube here.
 * - Pictures and design, the UN goal icons (with the UN's own statement),
 *   the fonts, the open-source software the site ships, Listen's recorded
 *   voices with their licences (docs/notes/recorded-audio.md), and how the
 *   Bahasa Indonesia version was made.
 *
 * It reads the lessons (useContent), so it lives in the teacher pages'
 * chunk with the teacher guides, which read them too.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useFullPageTitle } from '../app/usePageTitle';
import { Icon, type IconName } from '../components/ds';
import { getLesson } from '../content';
import { courseSummaries } from '../content/catalog';
import { COURSES, DEFAULT_COURSE_ID } from '../content/courses';
import { loadLocalVideosFile } from '../content/localVideoFiles';
import { approvedLocalVideos } from '../content/localVideos';
import { useCourseCredits, useCourseOutlines } from '../content/outline';
import type { CreditedPicture, CreditPictureRecord, CreditSource, CreditVideo } from '../content/outlineTypes';
import type { ApprovedLocalVideo } from '../content/schema';
import { useContent } from '../content/useContent';
import { useI18n, type MessageKey } from '../i18n';
import { LOCALES, readyLocales } from '../i18n/locales';
import './CreditsPage.css';
import { SECTION_ICONS } from './course/sectionIcons';
import { youtubeWatchUrl } from './educators/TeacherGuidePage';
import { LessonDisclosure } from './lesson/LessonDisclosure';

const UN_SDG_URL = 'https://www.un.org/sustainabledevelopment';
const OFL_URL = 'https://openfontlicense.org';

const FONT_KEYS: readonly MessageKey[] = [
  'pages.credits.fontFunnel',
  'pages.credits.fontAtkinson',
  'pages.credits.fontEczar',
  'pages.credits.fontVazirmatn',
  'pages.credits.fontBeVietnam',
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

/**
 * The voice models Listen's recordings were made with (scripts/audio/generate.py).
 * MMS-TTS's licence (CC BY-NC 4.0) allows only non-commercial use: if
 * Thinkerwell ever charges for anything, it must be replaced (docs/PRODUCT.md).
 */
const VOICES = [
  {
    key: 'pages.credits.voiceEnglish',
    model: 'Kokoro-82M',
    url: 'https://huggingface.co/hexgrad/Kokoro-82M',
    licence: 'Apache License 2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    key: 'pages.credits.voiceIndonesian',
    model: 'MMS-TTS (facebook/mms-tts-ind)',
    url: 'https://huggingface.co/facebook/mms-tts-ind',
    licence: 'Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)',
    licenceUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
  },
  {
    key: 'pages.credits.voiceMalay',
    model: 'MMS-TTS (facebook/mms-tts-zlm)',
    url: 'https://huggingface.co/facebook/mms-tts-zlm',
    licence: 'Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)',
    licenceUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
  },
] as const satisfies ReadonlyArray<{ key: MessageKey; model: string; url: string; licence: string; licenceUrl: string }>;

const SECTIONS = ['sources', 'videos', 'pictures', 'fonts', 'software', 'voices', 'translation'] as const;

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <span className="tw-visually-hidden"> {t('pages.teacherTools.newTab')}</span>
    </a>
  );
}

/** A language's approved videos by lesson ("L05"), with the language's code and its own name. */
interface LocalVideoList {
  code: string;
  endonym: string;
  videos: ReadonlyMap<string, ApprovedLocalVideo>;
}

/**
 * The approved videos of every language that has some, whichever language is on
 * screen. Each language's list is its own small file (src/content/localVideoFiles.ts),
 * loaded here without that language's lessons; a file that can't be loaded is
 * left out, and the English videos are listed as always.
 */
function useLocalVideoLists(): readonly LocalVideoList[] {
  const [lists, setLists] = useState<readonly LocalVideoList[]>([]);
  useEffect(() => {
    let current = true;
    void Promise.all(
      readyLocales(LOCALES)
        .filter((locale) => locale.content)
        .map(async (locale): Promise<LocalVideoList | null> => {
          try {
            const videos = approvedLocalVideos(await loadLocalVideosFile(locale.code));
            return videos.size > 0 ? { code: locale.code, endonym: locale.endonym, videos } : null;
          } catch {
            return null;
          }
        }),
    ).then((found) => {
      const some = found.filter((list): list is LocalVideoList => list !== null);
      if (current && some.length > 0) setLists(some);
    });
    return () => {
      current = false;
    };
  }, []);
  return lists;
}

/** A lesson as Credits lists it, whichever course it is from. */
interface CreditsLesson {
  id: string;
  number: number;
  /** The title, marked with its language (course text). */
  title: ReactNode;
  sources: readonly CreditSource[];
  /** True when the labels are in the language on screen (or it is English); false for another course's English labels shown in another language. */
  labelsInLanguage: boolean;
  /** The English video, or null (a lesson without one). */
  video: CreditVideo | null;
  /** Our World's lessons key each language's approved videos ("L05"); another course has none. */
  localKey: string | null;
  /** The pictures that exist: made for Thinkerwell (no credit) or from another source (its credit). */
  pictures: readonly CreditPictureRecord[];
}

interface CreditsSection {
  id: string;
  title: ReactNode;
  range: string;
  icon: IconName;
  tone: string;
  lessons: readonly CreditsLesson[];
}

interface CreditsCourse {
  id: string;
  title: ReactNode;
  icon: IconName;
  lessonCount: number;
  sections: readonly CreditsSection[];
}

/**
 * One course's lessons grouped in its sections, each section folded (73
 * lessons would otherwise be one very long page). `render` gives what each
 * lesson has to list; a lesson with nothing to list is left out, and a
 * section with none, too.
 */
function CourseTree({ course, kind, render }: { course: CreditsCourse; kind: 'sources' | 'videos' | 'pictures'; render: (lesson: CreditsLesson) => ReactNode }) {
  const { t } = useI18n();
  const sections = course.sections
    .map((section) => ({ section, items: section.lessons.map((lesson) => ({ lesson, node: render(lesson) })).filter((item) => item.node !== null) }))
    .filter((entry) => entry.items.length > 0);
  if (sections.length === 0) return null;
  const id = `credits-${kind}-${course.id}`;
  return (
    <div className="tw-credits-course" id={id} role="group" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="h3 tw-credits-course-title">
        <Icon name={course.icon} size={22} />
        {course.title}
        <span className="small tw-credits-muted">{t('pages.course.lessonsBadge', { count: course.lessonCount })}</span>
      </h3>
      {sections.map(({ section, items }) => (
        <LessonDisclosure
          key={section.id}
          className={`tw-credits-section tw-guides-${section.tone}`}
          summary={
            <span className="tw-guides-summary">
              <span className="tw-guides-icon">
                <Icon name={section.icon} size={22} />
              </span>
              <span className="tw-guides-summary-text">
                <span className="tw-guides-section-title">{section.title}</span>
                <span className="small tw-guides-range">{t('pages.guides.lessons', { range: section.range })}</span>
              </span>
            </span>
          }
        >
          <div className="tw-credits-grid tw-credits-lessons">
            {items.map(({ lesson, node }) => (
              <div className="tw-credits-lesson" key={lesson.id}>
                {node}
              </div>
            ))}
          </div>
        </LessonDisclosure>
      ))}
    </div>
  );
}

/** One picture's credit: who made it, when, where it is held, its licence and what was changed. */
function PictureCreditLine({ record }: { record: CreditPictureRecord }) {
  const { t, tx, englishLang } = useI18n();
  const slot = t(record.slot === 'visual' ? 'pages.credits.pictureFirst' : 'pages.credits.pictureSecond');
  const credit: CreditedPicture | null = record.credit;
  if (!credit) return <li>{t('pages.credits.pictureOriginal', { slot })}</li>;
  return (
    <li className="tw-credits-picture">
      <span>
        {tx('pages.credits.pictureWork', {
          slot,
          title: <span {...englishLang}>{credit.title}</span>,
          creator: <span {...englishLang}>{credit.creator}</span>,
          created: <span {...englishLang}>{credit.created}</span>,
        })}
      </span>
      {credit.institution ? (
        <span className="small tw-credits-muted">{tx('pages.credits.pictureHeldBy', { institution: <span {...englishLang}>{credit.institution}</span> })}</span>
      ) : null}
      <ExternalLink href={credit.sourceUrl}>{t('pages.credits.pictureRecord')}</ExternalLink>
      <span className="small">
        {tx('pages.credits.pictureLicence', {
          licence: credit.licenceUrl ? (
            <ExternalLink href={credit.licenceUrl}>
              <span {...englishLang}>{credit.licence}</span>
            </ExternalLink>
          ) : (
            <span {...englishLang}>{credit.licence}</span>
          ),
        })}
      </span>
      <span className="small tw-credits-muted">{tx('pages.credits.pictureChanges', { changes: <span {...englishLang}>{credit.changes}</span> })}</span>
    </li>
  );
}

export function CreditsPage() {
  const { t, tx, contentLang, contentLocale, englishLang } = useI18n();
  const content = useContent();
  const { credits, failed: creditsFailed } = useCourseCredits();
  const { outlines } = useCourseOutlines();
  const localVideoLists = useLocalVideoLists();
  const title = t('pages.credits.title');
  useFullPageTitle(t('seo.credits.title'));

  const rangeOf = (numbers: readonly number[]): string => {
    const first = numbers[0] ?? 0;
    const last = numbers[numbers.length - 1] ?? first;
    return first === last ? String(first) : t('pages.course.numberRange', { first, last });
  };

  // Exploring Our World, from its lessons (this chunk loads them). Its pictures were all made for Thinkerwell.
  const ourWorld: CreditsCourse = {
    id: DEFAULT_COURSE_ID,
    title: <span {...contentLang}>{content.getCourse().course.title}</span>,
    icon: 'Globe',
    lessonCount: content.getLessons().length,
    sections: content.getSections().map((section) => ({
      id: section.id,
      title: <span {...contentLang}>{section.title}</span>,
      range: rangeOf(section.lessons),
      icon: SECTION_ICONS[section.id],
      tone: section.id,
      lessons: content.getSectionLessons(section.id).map((lesson) => ({
        id: lesson.id,
        number: lesson.number,
        title: <span {...contentLang}>{lesson.title}</span>,
        sources: lesson.sources,
        labelsInLanguage: true,
        // The English video of every lesson (the one a lesson shows unless its language has an approved video of its own).
        video: (getLesson(lesson.id) ?? lesson).watch,
        localKey: `L${String(lesson.number).padStart(2, '0')}`,
        pictures: lesson.visual && content.getVisualUrl(lesson.visual.src) ? [{ slot: 'visual' as const, credit: null }] : [],
      })),
    })),
  };

  // The other courses, from the build-time records (src/content/outline.ts): the same lesson files, read at build time.
  const outlineText = (titles: Readonly<Record<string, string>>): ReactNode => {
    const translated = titles[contentLocale.code];
    return <span {...(translated ? contentLang : englishLang)}>{translated ?? titles.en}</span>;
  };
  const others: CreditsCourse[] = credits && outlines
    ? COURSES.filter((course) => course.id !== DEFAULT_COURSE_ID && credits[course.id] && outlines[course.id]).map((course) => {
        const lessons = credits[course.id]!;
        const summary = courseSummaries[course.id];
        return {
          id: course.id,
          title: outlineText(summary?.titles ?? { en: course.id }),
          icon: (course.icon ?? 'BookOpen') as IconName,
          lessonCount: lessons.length,
          sections: outlines[course.id]!.sections.map((section) => ({
            id: section.id,
            title: outlineText(section.titles),
            range: rangeOf(section.lessons),
            icon: section.look.icon as IconName,
            tone: section.look.tone,
            lessons: lessons
              .filter((lesson) => lesson.section === section.id)
              .map((lesson) => ({
                id: lesson.id,
                number: lesson.number,
                title: outlineText(lesson.titles),
                sources: lesson.sources[contentLocale.code] ?? lesson.sources.en ?? [],
                labelsInLanguage: Boolean(lesson.sources[contentLocale.code]),
                video: lesson.video,
                localKey: null,
                pictures: lesson.pictures,
              })),
          })),
        };
      })
    : [];
  const courses = [ourWorld, ...others];

  const lessonHeading = (lesson: CreditsLesson) => <h4 className="tw-credits-lesson-heading">{tx('pages.credits.lessonHeading', { number: lesson.number, title: lesson.title })}</h4>;

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
          <h3 className="eyebrow tw-credits-contents-courses">{t('pages.credits.coursesContents')}</h3>
          <ul role="list">
            {COURSES.filter((course) => course.id === DEFAULT_COURSE_ID || course.open).map((course) => {
              const found = courses.find((c) => c.id === course.id);
              return (
                <li key={course.id}>
                  <a href={`#credits-sources-${course.id}`}>
                    {found ? found.title : outlineText(courseSummaries[course.id]?.titles ?? { en: course.id })}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <section aria-labelledby="credits-sources" className="tw-credits-card">
        <h2 id="credits-sources" className="h2">
          {t('pages.credits.sourcesTitle')}
        </h2>
        <p>{t('pages.credits.sourcesBody')}</p>
        {courses.map((course) => (
          <CourseTree
            key={course.id}
            course={course}
            kind="sources"
            render={(lesson) =>
              lesson.sources.length > 0 ? (
                <>
                  {lessonHeading(lesson)}
                  <ul>
                    {lesson.sources.map((source) => (
                      <li key={source.url}>
                        <ExternalLink href={source.url}>
                          <span {...(lesson.labelsInLanguage ? contentLang : englishLang)}>{source.label}</span>
                        </ExternalLink>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null
            }
          />
        ))}
        {(!credits || !outlines) && !creditsFailed ? <p className="small tw-credits-muted">{t('pages.guides.loading')}</p> : null}
        {creditsFailed ? <p className="body">{t('pages.guides.outlineFailed')}</p> : null}
      </section>

      <section aria-labelledby="credits-videos" className="tw-credits-card">
        <h2 id="credits-videos" className="h2">
          {t('pages.credits.videosTitle')}
        </h2>
        <p>{t('pages.credits.videosBody')}</p>
        {courses.map((course) => (
          <CourseTree
            key={course.id}
            course={course}
            kind="videos"
            render={(lesson) => {
              const video = lesson.video;
              if (!video) return null;
              const key = lesson.localKey;
              return (
                <>
                  <span className="tw-credits-video-lesson">{tx('pages.credits.lessonHeading', { number: lesson.number, title: lesson.title })}</span>
                  <ExternalLink href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.youtubeId)}`}>
                    <span {...englishLang}>{video.title}</span>
                  </ExternalLink>
                  <span className="small tw-credits-muted">{tx('pages.credits.videoBy', { channel: <span {...englishLang}>{video.channel}</span> })}</span>
                  {key
                    ? localVideoLists.map((list) => {
                        const local = list.videos.get(key);
                        return local ? (
                          <span className="tw-credits-local-video" key={list.code}>
                            <span className="small tw-credits-muted" lang={list.code}>
                              {list.endonym}
                            </span>
                            <ExternalLink href={youtubeWatchUrl(local.youtubeId, local.startSeconds)}>
                              <span lang={list.code}>{local.title}</span>
                            </ExternalLink>
                            <span className="small tw-credits-muted">
                              {tx('pages.credits.videoBy', {
                                // The publisher, linked to its channel when the entry gives it (docs/notes/local-language-videos.md).
                                channel: local.channelUrl ? (
                                  <ExternalLink href={local.channelUrl}>
                                    <span lang={list.code}>{local.channel}</span>
                                  </ExternalLink>
                                ) : (
                                  <span lang={list.code}>{local.channel}</span>
                                ),
                              })}
                            </span>
                          </span>
                        ) : null;
                      })
                    : null}
                </>
              );
            }}
          />
        ))}
      </section>

      <section aria-labelledby="credits-pictures" className="tw-credits-card">
        <h2 id="credits-pictures" className="h2">
          {t('pages.credits.picturesTitle')}
        </h2>
        <p>{t('pages.credits.picturesBody')}</p>
        {courses.map((course) => (
          <CourseTree
            key={course.id}
            course={course}
            kind="pictures"
            render={(lesson) =>
              lesson.pictures.length > 0 ? (
                <>
                  {lessonHeading(lesson)}
                  <ul>
                    {lesson.pictures.map((record) => (
                      <PictureCreditLine key={record.slot} record={record} />
                    ))}
                  </ul>
                </>
              ) : null
            }
          />
        ))}
        <h3 className="h3">{t('pages.credits.goalsTitle')}</h3>
        <p>{t('pages.credits.goalsBody')}</p>
        <p className="small tw-credits-muted">{t('pages.credits.goalsStatement')}</p>
        <p>
          <ExternalLink href={UN_SDG_URL}>{t('pages.credits.goalsLink')}</ExternalLink>
        </p>
      </section>

      <div className="tw-credits-grid tw-credits-more">
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

        <section aria-labelledby="credits-voices" className="tw-credits-card">
          <h2 id="credits-voices" className="h2">
            {t('pages.credits.voicesTitle')}
          </h2>
          <p>{t('pages.credits.voicesBody')}</p>
          <ul>
            {VOICES.map((voice) => (
              <li key={voice.model}>
                {tx(voice.key, {
                  model: (
                    <ExternalLink href={voice.url}>
                      <span {...englishLang}>{voice.model}</span>
                    </ExternalLink>
                  ),
                  licence: (
                    <ExternalLink href={voice.licenceUrl}>
                      <span {...englishLang}>{voice.licence}</span>
                    </ExternalLink>
                  ),
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
          <p>{t('pages.credits.translationBodyMalay')}</p>
          <p>{t('pages.credits.translationBodyVietnamese')}</p>
        </section>
      </div>
    </div>
  );
}
