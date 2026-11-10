import { useFullPageTitle } from '../app/usePageTitle';
import { useCatalog } from '../content/useCatalog';
import { useI18n } from '../i18n';
import { CourseOverview } from './course/CourseOverview';

/**
 * The Exploring Our World overview (/course): the reference every course's
 * overview follows (./course/CourseOverview.tsx). Its lessons come from the
 * build-time catalog, so it needs no lesson text.
 */
export function CoursePage() {
  const { t } = useI18n();
  const catalog = useCatalog();
  const course = catalog.getCourse();
  useFullPageTitle(t('seo.course.title'));
  const sections = catalog.getSections();
  return (
    <CourseOverview
      courseId="our-world"
      title={course.course.title}
      description={course.course.description}
      sections={sections}
      lessons={catalog.getLessons()}
      sectionLessons={catalog.getSectionLessons}
      checkCount={sections.length}
      certificates
    />
  );
}
