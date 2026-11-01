import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge, Icon } from '../../components/ds';
import { PREVIEW_COURSES } from '../../content/courses';
import { useI18n } from '../../i18n';
import { useLearnerSession } from '../../session';
import { loadPreviewCourse } from '../preview';
import type { OurWorldName, PreviewCourseModule } from '../types';
import { usePreviewCourse } from './course';
import { useCourseTitle } from './Frame';
import { KitWords } from './i18n';

/** The code of every preview course this device has turned on, in course order, once each has loaded (one that can't load is left out). */
function useTurnedOnCourses(): PreviewCourseModule[] {
  const { previewCourses } = useLearnerSession();
  const ids = PREVIEW_COURSES.filter((course) => previewCourses.includes(course.id)).map((course) => course.id);
  const key = ids.join(' ');
  const [loaded, setLoaded] = useState<{ key: string; modules: PreviewCourseModule[] }>({ key: '', modules: [] });

  useEffect(() => {
    let live = true;
    void Promise.all(ids.map((id) => loadPreviewCourse(id).catch(() => null))).then((modules) => {
      if (live) setLoaded({ key, modules: modules.filter((module) => module !== null) });
    });
    return () => {
      live = false;
    };
    // `key` stands for `ids`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return loaded.key === key ? loaded.modules : [];
}

/**
 * The course choice ("Courses on this device"), on Our World's home and
 * course map and on each preview course's map: Our World first, then every
 * preview course this device has turned on, each marked as a draft. The
 * course shown is the current page. Nothing until the courses' code has
 * loaded.
 */
export function CourseChoice({ ourWorld, current }: { ourWorld: OurWorldName; current?: string }) {
  const courses = useTurnedOnCourses();
  if (courses.length === 0) return null;
  return (
    <KitWords>
      <CourseChoiceList ourWorld={ourWorld} current={current} courses={courses} />
    </KitWords>
  );
}

function CourseChoiceList({ ourWorld, current, courses }: { ourWorld: OurWorldName; current?: string; courses: PreviewCourseModule[] }) {
  const { t } = useI18n();
  const labelId = `tw-pc-choice-${current ?? 'home'}`;
  return (
    <nav className="tw-pc-choice tw-no-print" aria-labelledby={labelId}>
      <span id={labelId} className="eyebrow tw-pc-choice-label">
        {t('previewCourse.choice.label')}
      </span>
      <ul className="tw-pc-choice-list" role="list">
        <li>
          <Link to="/course" className="tw-pc-choice-link" aria-current={current === 'our-world' ? 'page' : undefined}>
            <Icon name="Globe" size={20} />
            <span {...ourWorld.lang}>{ourWorld.title}</span>
          </Link>
        </li>
        {courses.map((course) => (
          <li key={course.id}>
            <course.ChoiceLink current={current} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** One preview course in the course choice (inside its own PreviewCourseFrame, for its title and words). */
export function ChoiceLink({ current }: { current?: string }) {
  const { t, contentLang } = useI18n();
  const course = usePreviewCourse();
  const title = useCourseTitle();
  return (
    <Link to={course.path} className="tw-pc-choice-link" aria-current={current === course.id ? 'page' : undefined}>
      <Icon name={course.icon} size={20} />
      <span {...contentLang}>{title}</span>
      <Badge tone="outline">{t('previewCourse.choice.draft')}</Badge>
    </Link>
  );
}
