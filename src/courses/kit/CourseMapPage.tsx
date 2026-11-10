import { sectionCheckPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { CourseOverview } from '../../pages/course/CourseOverview';
import { useLessonContent } from '../../content/useContent';
import { usePreviewCourse } from './course';

/**
 * /course/<id>: another course's overview, the same page as Exploring Our
 * World's (src/pages/course/CourseOverview.tsx) over this course's own
 * sections and lessons (inside its PreviewCourseFrame). Section checks appear
 * where the course has them and nowhere else, and its teacher guides, print
 * view and answer keys are in the educators' list (/educators/guides), not
 * at the bottom of this page.
 */
export function CourseMap() {
  const preview = usePreviewCourse();
  const content = useLessonContent();
  const course = content.getCourse();
  usePageTitle(course.course.title);
  const sections = content.getSections();
  return (
    <CourseOverview
      courseId={preview.id}
      title={course.course.title}
      description={course.course.description}
      sections={sections}
      lessons={content.getLessons()}
      sectionLessons={content.getSectionLessons}
      looks={content.sectionLook}
      stagesFor={content.stagesFor}
      checkPathFor={(sectionId) => (content.getQuiz?.(sectionId) ? sectionCheckPath(sectionId) : null)}
      checkCount={sections.filter((section) => content.getQuiz?.(section.id)).length}
      certificates={content.hasCertificates}
    />
  );
}

