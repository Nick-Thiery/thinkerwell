import type { CourseLesson } from '../../content';
import { useI18n } from '../../i18n';
import { usePreviewCourse } from './course';

/**
 * At the end of a preview course's teacher guide, for the people reviewing
 * the draft: the writers' notes on what is new and what needs checking (the
 * lesson's `changes`), each picture still to draw (what it should show,
 * until its file exists), and the course's own notes (Digital World's, about
 * its activity). All of it is team text, English in every language, and
 * none of it is shown to learners.
 */
export function ReviewerNotes({ lesson }: { lesson: CourseLesson }) {
  const { t, englishLang } = useI18n();
  const course = usePreviewCourse();
  const { changes } = lesson;
  const toDraw = [lesson.visual, lesson.secondVisual].flatMap((visual) => (visual && !course.content.getVisualUrl(visual.src) ? [visual] : []));
  return (
    <section className="tw-print-part tw-pc-review-notes">
      <h2>{t('previewCourse.reviewer.title')}</h2>
      <p className="tw-print-muted">{t('previewCourse.reviewer.intro')}</p>
      {changes.length > 0 ? (
        <ul {...englishLang}>
          {changes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      ) : null}
      {toDraw.map((visual) => (
        <div key={visual.src} className="tw-print-keep">
          <h3>{t('previewCourse.reviewer.pictureTitle')}</h3>
          <p {...englishLang}>{visual.description}</p>
        </div>
      ))}
      {course.reviewerExtra?.(lesson)}
    </section>
  );
}
