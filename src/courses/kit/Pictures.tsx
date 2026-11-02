import type { CourseVisual, SecondVisual } from '../../content';
import { useI18n } from '../../i18n';
import { LessonVisual } from '../../pages/lesson/visual/LessonVisual';

/**
 * A preview course's pictures (Southeast Asia Through Time), shown through
 * the shared LessonVisual (src/lesson/extras.tsx): a caption under each,
 * with a "Look closely" question, and for a real photo or map (the lesson's
 * `secondVisual`) "What can this source show?" and where it came from, as
 * CC BY and CC BY-SA ask. Our World's pictures have none of this, so none of
 * it is in their code.
 */
export function PictureCaption({ visual }: { visual: CourseVisual | SecondVisual }) {
  const { t, contentLang } = useI18n();
  if (!visual.caption) return null;
  const credit = 'credit' in visual ? visual.credit : null;
  return (
    <div className="tw-pc-picture-caption">
      <p {...contentLang}>{visual.caption}</p>
      {visual.lookClosely ? (
        <p>
          <strong>{t('previewCourse.picture.lookClosely')}</strong> <span {...contentLang}>{visual.lookClosely}</span>
        </p>
      ) : null}
      {credit ? (
        <>
          <p>{t('previewCourse.picture.limits')}</p>
          <PictureCredit credit={credit} />
        </>
      ) : null}
    </div>
  );
}

/**
 * Where a real picture came from: its title, maker and date, the licence
 * (linked) and the file's page, and what Thinkerwell changed. Plain links,
 * opened in a new tab only on a tap.
 */
function PictureCredit({ credit }: { credit: NonNullable<SecondVisual['credit']> }) {
  const { t, tx, englishLang } = useI18n();
  const newTab = <span className="tw-visually-hidden">{t('pages.teacherTools.newTab')}</span>;
  const licence = credit.licenceUrl ? (
    <a href={credit.licenceUrl} target="_blank" rel="noreferrer">
      <span {...englishLang}>{credit.licence}</span> {newTab}
    </a>
  ) : (
    <span {...englishLang}>{credit.licence}</span>
  );
  return (
    <p className="tw-pc-picture-credit">
      {tx('previewCourse.picture.credit', {
        title: <span {...englishLang}>{credit.title}</span>,
        creator: <span {...englishLang}>{credit.creator}</span>,
        created: <span {...englishLang}>{credit.created}</span>,
        licence,
      })}{' '}
      <a href={credit.sourceUrl} target="_blank" rel="noreferrer">
        {t('previewCourse.picture.source')} {newTab}
      </a>{' '}
      {tx('previewCourse.picture.changes', { changes: <span {...englishLang}>{credit.changes}</span> })}
    </p>
  );
}

/** A lesson's second picture: after the last reading part, in the print view and in the teacher guide. */
export function SecondPicture({ visual, onPaper = false }: { visual: SecondVisual; onPaper?: boolean }) {
  const { t } = useI18n();
  const picture = (
    <LessonVisual visual={visual} enlargeable={!onPaper} title={visual.type === 'photo' ? t('previewCourse.picture.photoTitle') : undefined} />
  );
  return onPaper ? <section className="tw-print-part tw-print-evidence">{picture}</section> : picture;
}
