/**
 * The kit every preview course is built from (src/content/courses.ts):
 * its frame (the draft banner, its words, its English lessons), its course
 * map, the switch page at /preview/<id>, its lessons in the shared lesson
 * pages, every lesson on paper, the notes for reviewers and the course
 * choice. A course's own code (src/courses/<id>/index.tsx) gives it a
 * PreviewCourseConfig and gets the pages src/courses/preview.tsx shows.
 *
 * Only preview courses' code imports it, so it is built into
 * assets/preview/ (src/courses/build.ts): never precached, never in a first
 * visit, and downloaded only on a device that has turned a preview on.
 */
import type { ComponentType, ReactNode } from 'react';
import { useLearnerSession } from '../../session';
import type { PreviewCourseModule } from '../types';
import { PreviewCourseContext, type PreviewCourseConfig } from './course';
import { ChoiceLink } from './CourseChoice';
import { CourseMap } from './CourseMapPage';
import { PreviewCourseFrame } from './Frame';
import { PreviewAnswerKeyRoute, PreviewSectionCheckRoute } from './checkPages';
import { AllLessons, PreviewLessonPrintRoute, PreviewLessonRoute, PreviewTeacherGuideRoute } from './lessonPages';
import { PreviewSwitch } from './PreviewSwitchPage';

export type { PreviewCourseConfig } from './course';

/** A preview course's pages, from its config. `ready` resolves once its styles are on the page (./stylesheet.ts). */
export function createPreviewCourse(course: PreviewCourseConfig, ready: Promise<void>): PreviewCourseModule {
  // Pages that wrap themselves in the frame only when they show a lesson (a redirect or "isn't here" has no banner).
  const withCourse = <P extends object>(Page: ComponentType<P>): ComponentType<P> =>
    function WithCourse(props: P) {
      return (
        <PreviewCourseContext.Provider value={course}>
          <Page {...props} />
        </PreviewCourseContext.Provider>
      );
    };
  const framed = (page: ReactNode, banner = true) => (
    <PreviewCourseFrame course={course} banner={banner}>
      {page}
    </PreviewCourseFrame>
  );
  return {
    id: course.id,
    ready,
    CourseMapPage: () => framed(<CourseMap />),
    CoursePrintPage: () => framed(<AllLessons />),
    PreviewSwitchPage: function PreviewSwitchPage() {
      // The banner only while the preview is on.
      const on = useLearnerSession().previewCourses.includes(course.id);
      return framed(<PreviewSwitch />, on);
    },
    LessonRoute: withCourse(PreviewLessonRoute),
    LessonPrintRoute: withCourse(PreviewLessonPrintRoute),
    TeacherGuideRoute: withCourse(PreviewTeacherGuideRoute),
    SectionCheckRoute: withCourse(PreviewSectionCheckRoute),
    AnswerKeyRoute: withCourse(PreviewAnswerKeyRoute),
    ChoiceLink: ({ current }) => framed(<ChoiceLink current={current} />, false),
  };
}
