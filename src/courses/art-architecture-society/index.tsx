/**
 * Art, Architecture and Society (Justin's brief of 4 November 2026, expanded
 * on 7 November), a preview course (src/content/courses.ts): the one entry to
 * its code, loaded only by src/courses/preview.tsx on a device that has
 * turned the preview on. Its pages are the preview kit's (src/courses/kit/)
 * with its lessons and words; the shared lesson pages show each lesson's two
 * real images with their credits. It and everything only it uses (its
 * lessons, images and words) are one chunk in
 * assets/preview/art-architecture-society/, which the service worker never
 * stores and a first visit never downloads (src/courses/build.ts).
 */
// The course's pages are the shared lesson pages, print view and teacher
// guide: it depends on their chunks as wholes (src/courses/build.ts).
import '../../app/lazy/lessonPages';
import '../../app/lazy/teacherPages';
import words from 'virtual:thinkerwell/course-messages/art-architecture-society';
import { createPreviewCourse } from '../kit';
import { courseStylesheetsReady } from '../kit/stylesheet';
import { artArchitecture, artArchitectureIn, COURSE_ID, COURSE_PATH, COURSE_PRINT_PATH } from './content';

export const course = createPreviewCourse(
  {
    id: COURSE_ID,
    content: artArchitecture,
    contentFor: artArchitectureIn,
    words,
    wordKeys: {
      reviewNote: 'artArchitecture.reviewNote',
      switchOnBody: 'artArchitecture.switch.onBody',
      switchReviewNote: 'artArchitecture.switch.reviewNote',
      forTeachersBody: 'artArchitecture.map.forTeachersBody',
    },
    icon: 'Palette',
    path: COURSE_PATH,
    printPath: COURSE_PRINT_PATH,
  },
  // No styles of its own: the kit's.
  courseStylesheetsReady(),
);
