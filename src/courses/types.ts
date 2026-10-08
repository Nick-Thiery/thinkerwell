import type { ComponentType } from 'react';
import type { LangProps } from '../i18n';

/** Our World's title in the language on screen, for a course choice drawn by a preview course's own code. */
export interface OurWorldName {
  title: string;
  /** Its lang and dir (contentLang where Our World is shown). */
  lang: LangProps;
}

/**
 * What a preview course's code (src/courses/<id>/index.tsx, a chunk of its
 * own) gives the app. src/courses/preview.tsx loads it, only on a device
 * that has turned the course on, and shows these pages.
 */
export interface PreviewCourseModule {
  /** Resolves once its stylesheet has loaded (or couldn't), so its pages never show unstyled. */
  readonly ready: Promise<void>;
  /** /course/<id>: the course map, with the course choice. */
  readonly CourseMapPage: ComponentType;
  /** /course/<id>/print: every lesson on paper. */
  readonly CoursePrintPage: ComponentType;
  /** /preview/<id>: turns the preview on, and says how to turn it off. */
  readonly PreviewSwitchPage: ComponentType;
  /** /lesson/:id/:stage for one of its lessons. */
  readonly LessonRoute: ComponentType<{ lessonId: string; stage: string | undefined }>;
  /** /lesson/:id/print for one of its lessons. */
  readonly LessonPrintRoute: ComponentType<{ lessonId: string }>;
  /** /educators/lesson/:id for one of its lessons. */
  readonly TeacherGuideRoute: ComponentType<{ lessonId: string }>;
  /** The course choice on Our World's home and course map: Our World first, then this course (`current`: the course map shown). */
  readonly CourseChoice: ComponentType<{ ourWorld: OurWorldName; current?: string }>;
}
