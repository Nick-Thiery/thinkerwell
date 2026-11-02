/**
 * Southeast Asia Through Time (Justin's brief of 28 October 2026), a preview
 * course (src/content/courses.ts): the one entry to its code, loaded only by
 * src/courses/preview.tsx on a device that has turned the preview on. Its
 * pages are the preview kit's (src/courses/kit/) with its lessons and words;
 * the shared lesson pages show each lesson's two pictures. It and everything
 * only it uses (its lessons, pictures and words) are one chunk in
 * assets/preview/southeast-asia-through-time/, which the service worker never
 * stores and a first visit never downloads (src/courses/build.ts).
 */
// The course's pages are the shared lesson pages, print view and teacher
// guide: it depends on their chunks as wholes (src/courses/build.ts).
import '../../app/lazy/lessonPages';
import '../../app/lazy/teacherPages';
import words from 'virtual:thinkerwell/course-messages/southeast-asia-through-time';
import { createPreviewCourse } from '../kit';
import { courseStylesheetsReady } from '../kit/stylesheet';
import { COURSE_ID, COURSE_PATH, COURSE_PRINT_PATH, southeastAsia, southeastAsiaIn } from './content';

export const course = createPreviewCourse(
  {
    id: COURSE_ID,
    content: southeastAsia,
    contentFor: southeastAsiaIn,
    words,
    wordKeys: {
      bannerBody: 'southeastAsia.banner.body',
      bannerBodyEnglishLessons: 'southeastAsia.banner.bodyEnglishLessons',
      switchOnBody: 'southeastAsia.switch.onBody',
      switchReviewNote: 'southeastAsia.switch.reviewNote',
      forTeachersBody: 'southeastAsia.map.forTeachersBody',
    },
    icon: 'Map',
    path: COURSE_PATH,
    printPath: COURSE_PRINT_PATH,
  },
  // No styles of its own: the kit's.
  courseStylesheetsReady(),
);
