/**
 * Digital World (docs/content/DIGITAL_WORLD_SPEC.md), a preview course
 * (src/content/courses.ts): the one entry to its code, loaded only by
 * src/courses/preview.tsx on a device that has turned the preview on. Its
 * pages are the preview kit's (src/courses/kit/) with its lessons, its
 * words and its activities. It and everything only it uses (its lessons,
 * activities, styles and words) are one chunk in
 * assets/preview/digital-world/, which the service worker never stores and
 * a first visit never downloads (src/courses/build.ts).
 */
// The course's pages are the shared lesson pages, print view and teacher
// guide: it depends on their chunks as wholes, so adding it doesn't split
// them into smaller files for everyone else (src/courses/build.ts).
import '../../app/lazy/lessonPages';
import '../../app/lazy/teacherPages';
import words from 'virtual:thinkerwell/course-messages/digital-world';
import { useI18n } from '../../i18n';
import type { CourseLesson } from '../../content';
import { createPreviewCourse } from '../kit';
import { courseStylesheetsReady } from '../kit/stylesheet';
import { ActivityOnPaper } from './activities/ActivityOnPaper';
import { ActivityPlayer } from './activities/ActivityPlayer';
import { COURSE_ID, COURSE_PATH, COURSE_PRINT_PATH, digitalWorld, digitalWorldIn } from './content';
import href from './digitalWorld.css?url';

/** About the activity, at the end of the notes for reviewers: what it saves and how it works offline. */
function ActivityNotes({ lesson }: { lesson: CourseLesson }) {
  const { t, englishLang } = useI18n();
  const { activity } = lesson;
  if (!activity) return null;
  return (
    <div className="tw-print-keep">
      <h3>{t('digitalWorld.reviewer.activityTitle')}</h3>
      <dl className="tw-dw-review-facts">
        <div>
          <dt>{t('digitalWorld.reviewer.saves')}</dt>
          <dd {...englishLang}>{activity.saves}</dd>
        </div>
        <div>
          <dt>{t('digitalWorld.reviewer.offline')}</dt>
          <dd {...englishLang}>{activity.offline}</dd>
        </div>
      </dl>
    </div>
  );
}

export const course = createPreviewCourse(
  {
    id: COURSE_ID,
    content: digitalWorld,
    contentFor: digitalWorldIn,
    words,
    wordKeys: {
      bannerBody: 'digitalWorld.banner.body',
      bannerBodyEnglishLessons: 'digitalWorld.banner.bodyEnglishLessons',
      switchOnBody: 'digitalWorld.switch.onBody',
      switchReviewNote: 'digitalWorld.switch.reviewNote',
      forTeachersBody: 'digitalWorld.map.forTeachersBody',
    },
    icon: 'Lightbulb',
    path: COURSE_PATH,
    printPath: COURSE_PRINT_PATH,
    // Its activity where the lesson file puts it, and on paper in the print view and (with what to expect) the teacher guide.
    lessonSlot: (lesson, name) => {
      const activity = lesson.activity;
      if (!activity) return null;
      if (name === `${activity.stage}:${activity.placement}`) return <ActivityPlayer activity={activity} />;
      if (name === 'print:after-evidence') return <ActivityOnPaper activity={activity} forTeachers={false} />;
      if (name === 'guide:after-evidence') return <ActivityOnPaper activity={activity} forTeachers />;
      return null;
    },
    reviewerExtra: (lesson) => <ActivityNotes lesson={lesson} />,
  },
  courseStylesheetsReady({ href, key: COURSE_ID }),
);
