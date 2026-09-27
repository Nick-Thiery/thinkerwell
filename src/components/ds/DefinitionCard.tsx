import { useLayoutEffect, useRef, type Ref, type ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import { ToolToggle } from './ToolToggle';
import './DefinitionCard.css';

export interface DefinitionCardProps {
  id?: string;
  word: ReactNode;
  definition: string;
  example?: string;
  /** Anchored under a `GlossaryTerm`, as a popover rather than a panel. */
  floating?: boolean;
  /** false hides the "Hear it" toggle even when `onListen` is given. */
  listen?: boolean;
  /** false hides the close button entirely; a function makes it call back on click. */
  onClose?: false | (() => void);
  /** Called when "Hear it" is pressed. The toggle only renders when this is given. */
  onListen?: () => void;
  /** Whether "Hear it" is mid-playback, reflected as its pressed state. */
  listening?: boolean;
  className?: string;
}

/** The space kept between a floating card and the screen edge: the phone page gutter (`--space-4`). */
export const FLOATING_GUTTER = 16;
/** The gap between the word and the card under it, as in DefinitionCard.css. */
const FLOATING_OFFSET = 8;

export interface FloatingShiftInput {
  /**
   * Where the card starts before any shift, in viewport px: its left edge
   * in left-to-right text, its right edge in right-to-left text.
   */
  start: number;
  /** The card's width in px. */
  width: number;
  /** The layout viewport's width (`document.documentElement.clientWidth`). */
  viewport: number;
  rtl: boolean;
  gutter?: number;
}

/**
 * How far (in physical px, positive = rightwards) to move a floating card so
 * it stays inside the viewport with `gutter` to spare on both sides. When
 * the card is wider than the space between the gutters, it lines up with
 * the start gutter (the CSS cap means this only happens on odd screens).
 */
export function floatingShift({ start, width, viewport, rtl, gutter = FLOATING_GUTTER }: FloatingShiftInput): number {
  const left = rtl ? start - width : start;
  const right = left + width;
  const min = gutter;
  const max = viewport - gutter;
  let shift = 0;
  if (width > max - min) shift = rtl ? max - right : min - left;
  else if (right > max) shift = max - right;
  else if (left < min) shift = min - left;
  // Avoid -0 and sub-pixel jitter.
  return Math.abs(shift) < 0.5 ? 0 : Math.round(shift * 100) / 100;
}

function wordText(word: ReactNode): string {
  return typeof word === 'string' ? word : '';
}

/**
 * The meaning of a glossary word, with an example and a "Hear it" toggle.
 * Used standalone (a Key words panel) or floating under a `GlossaryTerm`.
 */
export function DefinitionCard({
  id,
  word,
  definition,
  example,
  floating,
  listen,
  onClose,
  onListen,
  listening,
  className,
}: DefinitionCardProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLElement>(null);

  // `.tw-def-float` is a popover anchored to the start edge of an inline
  // trigger that can sit anywhere in a line of text, so near the end of a
  // line it would run off the screen. On a phone that is worse than it
  // looks: mobile browsers widen the layout viewport to fit anything that
  // overflows it, so the page starts to scroll sideways, and
  // `window.innerWidth` grows to match (the phase 2 bug: the old clamp
  // measured against innerWidth, which was already too wide). So:
  //  1. CSS caps the popover at the viewport width minus the page gutters,
  //     so it always fits somewhere.
  //  2. It is placed before it can overflow: while `data-placing` is set,
  //     CSS makes it `position: fixed` at the viewport's start and hidden,
  //     which can't widen the page. We measure its width and the anchor's
  //     start edge in that state.
  //  3. We measure against `document.documentElement.clientWidth` (the
  //     layout viewport the page was designed for), never innerWidth.
  //  4. The shift is a physical translateX, a viewport-collision fix rather
  //     than a text-direction concern, so it works for ltr and rtl alike.
  // It runs in a layout effect, so the reader never sees the unplaced card,
  // and again whenever the window or the visual viewport resizes.
  useLayoutEffect(() => {
    if (!floating) return undefined;
    const el = rootRef.current;
    if (!el) return undefined;
    const card = el;
    function place() {
      const anchor = card.parentElement;
      if (!anchor) return;
      card.style.transform = '';
      card.setAttribute('data-placing', '');
      const width = card.getBoundingClientRect().width;
      const rtl = getComputedStyle(card).direction === 'rtl';
      // The anchor's line boxes, skipping the empty one a browser can leave
      // at the start of the next line when the word ends a line.
      const lines = Array.from(anchor.getClientRects()).filter((rect) => rect.width > 0);
      const first = lines[0] ?? anchor.getBoundingClientRect();
      const last = lines[lines.length - 1] ?? first;
      const viewport = document.documentElement.clientWidth;
      card.removeAttribute('data-placing');
      if (!width || !viewport) return;
      // An absolutely positioned box inside an inline anchor starts at the
      // start edge of the anchor's first line box.
      let x = floatingShift({ start: rtl ? first.right : first.left, width, viewport, rtl });
      card.style.transform = x !== 0 ? `translateX(${x}px)` : '';
      const placed = card.getBoundingClientRect();
      // Safety net: if the browser put the card somewhere other than the
      // anchor's start edge (an unusual line break, say), correct the rest.
      x += floatingShift({ start: rtl ? placed.right : placed.left, width: placed.width, viewport, rtl });
      // Keep it just under the word's last line. When the word ends a line,
      // browsers can stretch the anchor onto the next line, which would
      // otherwise push the card a whole line further down.
      const y = Math.round(last.bottom + FLOATING_OFFSET - placed.top);
      const moveY = Math.abs(y) >= 1 && last.bottom > 0;
      if (x !== 0 || moveY) card.style.transform = `translate(${x}px, ${moveY ? y : 0}px)`;
      else card.style.transform = '';
    }
    place();
    const viewportApi = window.visualViewport;
    window.addEventListener('resize', place);
    viewportApi?.addEventListener('resize', place);
    return () => {
      window.removeEventListener('resize', place);
      viewportApi?.removeEventListener('resize', place);
    };
  }, [floating, word, definition, example]);

  // Floating (anchored under a GlossaryTerm) sits inline in a reading
  // paragraph, so it must be phrasing content: `<span>`, never `<div>` or
  // `<p>`, or the browser will close the paragraph early and React will log
  // invalid-nesting warnings. `.tw-def`/`.tw-def-word` are `display: flex`
  // and `.tw-def-text`/`.tw-def-ex` are `display: block` in CSS regardless
  // of tag, so this changes nothing visually. The standalone (Key words
  // panel) case keeps ordinary block elements.
  const Root = floating ? 'span' : 'div';
  const Row = floating ? 'span' : 'div';
  const Text = floating ? 'span' : 'p';

  return (
    <Root
      id={id}
      ref={rootRef as Ref<HTMLDivElement> & Ref<HTMLSpanElement>}
      className={cx('tw-def', floating && 'tw-def-float', className)}
      role={floating ? 'dialog' : undefined}
      // A floating popover is a dialog, so it should be focusable itself.
      // It also keeps GlossaryTerm's focusout handling correct: clicking
      // non-focusable content inside it (the definition text, the example)
      // would otherwise make the browser walk up to the nearest focusable
      // ancestor outside the popover (for example a route's `<main
      // tabindex="-1">`) and report that as focusout's relatedTarget,
      // which reads as "focus left the term" and closes the popover under
      // the reader's finger. With this root focusable, that walk stops
      // here, inside GlossaryTerm's wrapper.
      tabIndex={floating ? -1 : undefined}
      aria-label={floating ? t('ds.content.definition.meaningOf', { word: wordText(word) }) : undefined}
    >
      <Row className="tw-def-word">
        <span>{word}</span>
        {onClose !== false ? (
          // The reference caps this at 36x36; CLAUDE.md requires every tap target to
          // stay at least 44px, so this keeps .tw-menu-btn's own default size.
          <button type="button" className="tw-menu-btn" aria-label={t('ds.content.definition.close')} onClick={onClose}>
            <Icon name="X" size={18} />
          </button>
        ) : null}
      </Row>
      <Text className="tw-def-text">{definition}</Text>
      {example ? <Text className="tw-def-ex">{example}</Text> : null}
      {listen !== false && onListen ? (
        <ToolToggle icon="Volume2" className="tw-def-listen" pressed={listening} onClick={onListen}>
          {t('ds.content.definition.hearIt')}
        </ToolToggle>
      ) : null}
    </Root>
  );
}
