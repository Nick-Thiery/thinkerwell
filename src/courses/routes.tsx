/**
 * The pages a preview course adds (src/courses/preview.tsx), as routes:
 *
 *   /preview/:courseId          the hidden address that turns the preview on (never linked, noindex)
 *   /course/:courseId           its course map
 *   /course/:courseId/print     every lesson on paper
 *   /lesson/:id/:stage, /lesson/:id/print, /educators/lesson/:id
 *                               its lessons share Our World's addresses: their ids start with
 *                               the course's prefix ("dw-"), and the Our World routes hand them here
 *   /section/:id/check, /educators/section/:id/answers
 *                               its section checks, the same way (its section ids are in
 *                               src/content/courses.ts)
 *
 *   /review/videos              for the people who review the local-language Watch videos
 *                               (src/courses/video-review/; never linked, noindex)
 *
 * None of them is a public page (src/seo/), so each address gets app.html
 * with noindex and is in no sitemap.
 */
import { lazy, Suspense } from 'react';
import { useParams } from 'react-router';
import { previewCourseOfLesson, previewCourseOfSection } from '../content/courses';
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

/** A preview course's section check, /section/:id/check (src/app/SectionCheckRoute.tsx hands it over). */
export function PreviewSectionCheckRoute({ sectionId }: { sectionId: string }) {
  return <PreviewCourse courseId={previewCourseOfSection(sectionId)?.id}>{(course) => <course.SectionCheckRoute sectionId={sectionId} />}</PreviewCourse>;
}

/** A preview course's answer key, /educators/section/:id/answers. */
export function PreviewAnswerKeyRoute({ sectionId }: { sectionId: string }) {
  return <PreviewCourse courseId={previewCourseOfSection(sectionId)?.id}>{(course) => <course.AnswerKeyRoute sectionId={sectionId} />}</PreviewCourse>;
}

/** A preview course's teacher guide, /educators/lesson/:id. */
export function PreviewTeacherGuideRoute({ lessonId }: { lessonId: string }) {
  return <PreviewCourse courseId={previewCourseOfLesson(lessonId)?.id}>{(course) => <course.TeacherGuideRoute lessonId={lessonId} />}</PreviewCourse>;
}

// The reviewers' page for local-language Watch videos: a chunk of its own in assets/preview/video-review/
// (src/courses/build.ts), loaded only when someone opens /review/videos.
// With the lessons' chunk, for the Watch step's player (src/courses/video-review/types.ts, LessonCode).
const VideoReviewPage = lazy(() =>
  Promise.all([import('./video-review/VideoReviewPage'), import('../app/lazy/lessonPages')]).then(([page, lessons]) => {
    const Page = page.VideoReviewPage;
    return { default: () => <Page lessonCode={lessons} /> };
  }),
);

/** /review/videos (src/courses/video-review/VideoReviewPage.tsx). */
export function VideoReviewRoute() {
  return (
    <Suspense fallback={null}>
      <VideoReviewPage />
    </Suspense>
  );
}
