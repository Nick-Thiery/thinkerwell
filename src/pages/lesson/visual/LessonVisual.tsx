import { useId, useRef } from 'react';
import { Button } from '../../../components/ds';
import { getVisualUrl, type Visual } from '../../../content';
import { useI18n } from '../../../i18n';
import './LessonVisual.css';

export interface LessonVisualProps {
  visual: Visual | null;
  /**
   * Offers "See it bigger" (default true). The print view turns it off:
   * paper has no buttons, and there the picture already fills the page.
   */
  enlargeable?: boolean;
}

/**
 * The lesson's one picture (content/lessons/*.json `visual`): an SVG from
 * content/visuals/, as wide as the reading column, with the lesson's alt
 * text. The team-only `description` is never shown. The file is part of the
 * build (served from the site itself, never another server). Renders
 * nothing if a lesson has no picture. LessonEvidence places it.
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const url = visual ? getVisualUrl(visual.src) : undefined;
  if (!visual || !url) return null;
  const title = t(`lessonPlayer.visual.title.${visual.type}`);

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
