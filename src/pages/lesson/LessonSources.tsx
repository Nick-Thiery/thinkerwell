import { Icon } from '../../components/ds';
import type { CourseLesson } from '../../content';
import { useI18n } from '../../i18n';
import './LessonSources.css';

/**
 * "Sources", closed, at the bottom of every step of a lesson: the websites
 * the lesson draws on (lesson.sources), each a link that opens in a new
 * tab. The lesson is written in Thinkerwell's own words; this says where
 * its facts come from. Nothing is fetched until someone follows a link.
 */
export function LessonSources({ lesson }: { lesson: CourseLesson }) {
  const { t, contentLang } = useI18n();
  if (lesson.sources.length === 0) return null;
  return (
    <details className="tw-lesson-sources">
      <summary>
        <Icon name="BookOpen" size={20} />
        <span>{t('lessonPlayer.sources.title')}</span>
        <Icon name="ChevronDown" size={20} className="tw-lesson-sources-chevron" />
      </summary>
      <p className="small">{t('lessonPlayer.sources.intro')}</p>
      <ul>
        {lesson.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">
              <span {...contentLang}>{source.label}</span>
              <span className="tw-visually-hidden"> {t('pages.teacherTools.newTab')}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
