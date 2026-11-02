/**
 * What every preview course gives the shared kit (src/courses/kit/): its
 * id, its content, its own words and how its lessons add to the shared
 * pages. A course's index.tsx makes one and hands it to createPreviewCourse
 * (./index.tsx); every kit page reads it from PreviewCourseContext.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { IconName } from '../../components/ds/icons';
import type { LessonContent } from '../../content/courseContent';
import type { CourseLesson } from '../../content';
import type { MessageKey, MessageTree } from '../../i18n';
import type { LessonSlotName } from '../../lesson/extras';

export interface PreviewCourseConfig {
  /** Its id in src/content/courses.ts ('digital-world'). */
  readonly id: string;
  /** Its lessons and sections (createCourseContent). */
  readonly content: LessonContent;
  /** Its own words (virtual:thinkerwell/course-messages/<id>), by language. */
  readonly words: Readonly<Record<string, MessageTree>>;
  /**
   * Its words that differ from course to course: the banner's sentence (in
   * English, and in a language whose lessons are still English), the switch
   * page's two paragraphs, and what its teacher guides hold.
   */
  readonly wordKeys: {
    readonly bannerBody: MessageKey;
    readonly bannerBodyEnglishLessons: MessageKey;
    readonly switchOnBody: MessageKey;
    readonly switchReviewNote: MessageKey;
    readonly forTeachersBody: MessageKey;
  };
  /** Its icon in the course choice. */
  readonly icon: IconName;
  /**
   * What its lessons add to the shared lesson pages beyond the draft note
   * and the notes for reviewers (Digital World's activities), by slot name,
   * or nothing.
   */
  readonly lessonSlot?: (lesson: CourseLesson, name: LessonSlotName) => ReactNode;
  /** More notes for reviewers at the end of a teacher guide (about an activity), or nothing. */
  readonly reviewerExtra?: (lesson: CourseLesson) => ReactNode;
  /** The course map: /course/<id>. */
  readonly path: string;
  /** Every lesson on paper. */
  readonly printPath: string;
}

export const PreviewCourseContext = createContext<PreviewCourseConfig | null>(null);

/** The preview course whose page this is (inside PreviewCourseFrame). */
export function usePreviewCourse(): PreviewCourseConfig {
  const course = useContext(PreviewCourseContext);
  if (!course) throw new Error('usePreviewCourse() needs a PreviewCourseFrame');
  return course;
}
