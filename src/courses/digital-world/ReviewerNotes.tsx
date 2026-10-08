import type { CourseLesson } from '../../content';
import { useI18n } from '../../i18n';

/**
 * At the end of a Digital World teacher guide, for the people reviewing the
 * draft (an AI researcher for accuracy, a partner for sensitive topics):
 * the writers' notes on what is new and what needs checking (the lesson's
 * `changes`), the picture still to draw, and how the activity saves and
 * works offline. All of it is team text, English in every language, and
 * none of it is shown to learners.
 */
export function ReviewerNotes({ lesson }: { lesson: CourseLesson }) {
  const { t, englishLang } = useI18n();
  const { activity, visual, changes } = lesson;
  return (
    <section className="tw-print-part tw-dw-review-notes">
      <h2>{t('digitalWorld.reviewer.title')}</h2>
      <p className="tw-print-muted">{t('digitalWorld.reviewer.intro')}</p>
      {changes.length > 0 ? (
        <ul {...englishLang}>
          {changes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      ) : null}
      {visual ? (
        <div className="tw-print-keep">
          <h3>{t('digitalWorld.reviewer.pictureTitle')}</h3>
          <p {...englishLang}>{visual.description}</p>
        </div>
      ) : null}
      {activity ? (
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
      ) : null}
    </section>
  );
}
