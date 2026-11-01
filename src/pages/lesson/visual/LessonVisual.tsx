import { useId, useRef } from 'react';
import { Button } from '../../../components/ds';
import { type CourseVisual, type SecondVisual } from '../../../content';
import { useLessonContent } from '../../../content/useContent';
import { useI18n } from '../../../i18n';
import './LessonVisual.css';

export interface LessonVisualProps {
  visual: CourseVisual | SecondVisual | null | undefined;
  /**
   * Offers "See it bigger" (default true). The print view turns it off:
   * paper has no buttons, and there the picture already fills the page.
   */
  enlargeable?: boolean;
}

/**
 * A lesson's picture (content/lessons/*.json `visual`): an SVG from
 * content/visuals/, as wide as the reading column, with the lesson's alt
 * text. The team-only `description` is never shown. The file is part of the
 * build (served from the site itself, never another server). Renders
 * nothing if a lesson has no picture. LessonEvidence places it.
 *
 * A preview course's pictures (Southeast Asia Through Time) can carry more:
 * a caption under the picture, a "Look closely" question, and for a real
 * photo or map (its `secondVisual`, which Read shows after the last part)
 * where it came from and its licence, as CC BY and CC BY-SA ask. Their
 * words are the preview courses' (`previewCourse.picture`), which only
 * those pages load.
 *
 * "See it bigger" (phase 8) opens the same picture in a modal <dialog>. On a
 * phone the picture is about 330px wide, so its labels (22 units of 960) are
 * about 8px high. In the dialog it is at least 640px wide, so labels are at
 * least 14px, and the learner drags to see the rest; pinch-zoom works as well
 * (nothing turns it off). The native dialog keeps focus inside, closes with
 * Escape or "Close", and focus goes back to the button.
 */
export function LessonVisual({ visual, enlargeable = true }: LessonVisualProps) {
  const { t, contentLang } = useI18n();
  const content = useLessonContent();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const url = visual ? content.getVisualUrl(visual.src) : undefined;
  if (!visual || !url) return null;
  const title = visual.type === 'photo' ? t('previewCourse.picture.photoTitle') : t(`lessonPlayer.visual.title.${visual.type}`);
  const credit = 'credit' in visual ? visual.credit : null;

  const opener = () => toolsRef.current?.querySelector('button') ?? null;

  function open() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    // Every browser the pilot uses has showModal (Safari 15.4 and later);
    // the fallback only keeps older ones (and jsdom) working.
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function close() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      opener()?.focus();
    }
  }

  return (
    <figure className="tw-lesson-visual">
      {/* Not lazy: it sits near the top of Read, and the warm-up often asks learners to look at it. */}
      <img src={url} alt={visual.alt} decoding="async" {...contentLang} />
      {visual.caption ? (
        <figcaption className="tw-lesson-visual-caption">
          <p {...contentLang}>{visual.caption}</p>
          {visual.lookClosely ? (
            <p className="tw-lesson-visual-look">
              <strong>{t('previewCourse.picture.lookClosely')}</strong> <span {...contentLang}>{visual.lookClosely}</span>
            </p>
          ) : null}
          {credit ? (
            <>
              <p className="tw-lesson-visual-look">{t('previewCourse.picture.limits')}</p>
              <PictureCredit credit={credit} />
            </>
          ) : null}
        </figcaption>
      ) : null}
      {enlargeable ? (
        <>
          <div ref={toolsRef} className="tw-lesson-visual-tools tw-no-print">
            <Button variant="secondary" icon="ImageIcon" aria-haspopup="dialog" onClick={open}>
              {t('lessonPlayer.visual.seeBigger')}
            </Button>
          </div>
          <dialog
            ref={dialogRef}
            className="tw-picture-dialog"
            aria-labelledby={titleId}
            // However it closes (Close, Escape), focus goes back to the button.
            onClose={() => opener()?.focus()}
          >
            <div className="tw-picture-dialog-head">
              <h2 id={titleId} className="h3">
                {title}
              </h2>
              <Button variant="secondary" icon="X" onClick={close}>
                {t('lessonPlayer.visual.close')}
              </Button>
            </div>
            {/* Touch screens only (LessonVisual.css): where the picture is wider than the screen, and where it fits. */}
            <p className="tw-picture-dialog-hint tw-picture-dialog-hint-narrow small">{t('lessonPlayer.visual.touchHintNarrow')}</p>
            <p className="tw-picture-dialog-hint tw-picture-dialog-hint-wide small">{t('lessonPlayer.visual.touchHintWide')}</p>
            {/*
              The picture can be wider than the screen here, so this area
              scrolls. Keyboard users must be able to reach it to scroll it
              with the arrow keys (WCAG 2.1.1), so it is a named region that
              takes focus.
            */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must be reachable by keyboard */}
            <div className="tw-picture-dialog-scroll" role="region" aria-label={t('lessonPlayer.visual.scrollLabel', { title })} tabIndex={0}>
              <img src={url} alt={visual.alt} decoding="async" {...contentLang} />
            </div>
          </dialog>
        </>
      ) : null}
    </figure>
  );
}

/**
 * Where a real picture came from: its title, maker and date, the licence
 * (linked, as CC BY and CC BY-SA ask) and the file's page, and what
 * Thinkerwell changed. Plain links, opened in a new tab only on a tap.
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
    <p className="tw-lesson-visual-credit">
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
