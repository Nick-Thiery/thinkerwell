import { Link } from 'react-router';
import { Icon, type IconName } from '../components/ds';
import { COURSES, DEFAULT_COURSE_ID } from '../content/courses';
import { courseSummaries } from '../content/catalog';
import { useCatalog } from '../content/useCatalog';
import { useI18n } from '../i18n';
import { useLearnerSession } from '../session';
import './CourseChoice.css';

/**
 * The course choice, at the top of the home page and of every course's map:
 * Our World first, then each other course this device shows (every course
 * marked `open` in src/content/courses.ts, and any a device turned on at
 * /preview/<id>). Names come from the build-time catalog
 * (src/content/catalogFields.ts, CourseSummary), so showing the choice
 * downloads no course. Nothing while Our World is the only course. A
 * course's name is in the language on screen where it is translated, and
 * English (marked) where it isn't.
 */
export function CourseChoice({ current }: { current?: string }) {
  const { t, contentLang, contentLocale } = useI18n();
  const { previewCourses } = useLearnerSession();
  const ourWorld = useCatalog().getCourse().course.title;
  const others = COURSES.filter((course) => course.id !== DEFAULT_COURSE_ID && previewCourses.includes(course.id) && courseSummaries[course.id]);
  if (others.length === 0) return null;
  const labelId = `tw-course-choice-${current ?? 'home'}`;
  return (
    <nav className="tw-course-choice tw-no-print" aria-labelledby={labelId}>
      <span id={labelId} className="eyebrow tw-course-choice-label">
        {t('courseChoice.label')}
      </span>
      <ul className="tw-course-choice-list" role="list">
        <li>
          <Link to="/course" className="tw-course-choice-link" aria-current={current === DEFAULT_COURSE_ID ? 'page' : undefined}>
            <Icon name="Globe" size={20} />
            <span {...contentLang}>{ourWorld}</span>
          </Link>
        </li>
        {others.map((course) => {
          const titles = courseSummaries[course.id]!.titles;
          const translated = titles[contentLocale.code];
          return (
            <li key={course.id}>
              <Link to={`/course/${course.id}`} className="tw-course-choice-link" aria-current={current === course.id ? 'page' : undefined}>
                <Icon name={(course.icon ?? 'BookOpen') as IconName} size={20} />
                <span {...(translated ? contentLang : {})}>{translated ?? titles.en}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
