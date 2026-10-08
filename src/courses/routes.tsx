/**
 * The pages a preview course adds (src/courses/preview.tsx), as routes:
 *
 *   /preview/:courseId          the hidden address that turns the preview on (never linked, noindex)
 *   /course/:courseId           its course map
 *   /course/:courseId/print     every lesson on paper
 *   /lesson/:id/:stage, /lesson/:id/print, /educators/lesson/:id
 *                               its lessons share Our World's addresses: their ids start with
 *                               the course's prefix ("dw-"), and the Our World routes hand them here
 *
 * None of them is a public page (src/seo/), so each address gets app.html
 * with noindex and is in no sitemap.
 */
import { useParams } from 'react-router';
import { useCatalog } from '../content/useCatalog';
import { previewCourseOfLesson, PREVIEW_COURSES } from '../content/courses';
import { useI18n } from '../i18n';
import { useLearnerSession } from '../session';
import { PreviewCourse } from './preview';

export function PreviewSwitchRoute() {
  const { courseId } = useParams();
  return (
    <PreviewCourse courseId={courseId} whenOff="load">
      {(course) => <course.PreviewSwitchPage />}
    </PreviewCourse>
  );
}

export function PreviewCourseRoute() {
  const { courseId } = useParams();
  return <PreviewCourse courseId={courseId}>{(course) => <course.CourseMapPage />}</PreviewCourse>;
}

export function PreviewCoursePrintRoute() {
  const { courseId } = useParams();
  return <PreviewCourse courseId={courseId}>{(course) => <course.CoursePrintPage />}</PreviewCourse>;
}

/** A preview course's lesson at /lesson/:id/:stage (src/app/LessonRoute.tsx hands it over). */
export function PreviewLessonRoute({ lessonId, stage }: { lessonId: string; stage: string | undefined }) {
  return (
    <PreviewCourse courseId={previewCourseOfLesson(lessonId)?.id}>
      {(course) => <course.LessonRoute lessonId={lessonId} stage={stage} />}
    </PreviewCourse>
  );
}

/** A preview course's lesson on paper, /lesson/:id/print. */
export function PreviewLessonPrintRoute({ lessonId }: { lessonId: string }) {
  return <PreviewCourse courseId={previewCourseOfLesson(lessonId)?.id}>{(course) => <course.LessonPrintRoute lessonId={lessonId} />}</PreviewCourse>;
}

/** A preview course's teacher guide, /educators/lesson/:id. */
export function PreviewTeacherGuideRoute({ lessonId }: { lessonId: string }) {
  return <PreviewCourse courseId={previewCourseOfLesson(lessonId)?.id}>{(course) => <course.TeacherGuideRoute lessonId={lessonId} />}</PreviewCourse>;
}

/**
 * The course choice on Our World's home and course map (src/app/PreviewCourses.tsx
 * loads this only where a preview course is on): Our World first, then the
 * preview course. Nothing while its code loads, or if it can't.
 */
export function PreviewCourseChoice({ current }: { current?: string }) {
  const { previewCourses } = useLearnerSession();
  const { contentLang } = useI18n();
  const title = useCatalog().getCourse().course.title;
  // One preview course today; a second would need the choice to list both.
  const course = PREVIEW_COURSES.find((c) => previewCourses.includes(c.id));
  if (!course) return null;
  return (
    <PreviewCourse courseId={course.id} quiet>
      {(module) => <module.CourseChoice ourWorld={{ title, lang: contentLang }} current={current} />}
    </PreviewCourse>
  );
}
