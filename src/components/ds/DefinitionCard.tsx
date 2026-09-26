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

  // `.tw-def-float` is a fixed-width popover anchored to the start edge of an
  // inline trigger that can sit anywhere in a line of text. Left alone, it
  // regularly runs off a 390px screen (docs/design-system/reference/bundle.css
  // never accounts for viewport edges). Nudge it back on screen with a
  // physical translateX: this is a viewport-collision correction, not a
  // text-direction concern, so it works the same for ltr and rtl.
  useLayoutEffect(() => {
    if (!floating) return undefined;
    const el = rootRef.current;
    if (!el) return undefined;
    const margin = 8;
    function clamp() {
      if (!el) return;
      el.style.transform = '';
      const rect = el.getBoundingClientRect();
      let shift = 0;
      if (rect.right > window.innerWidth - margin) shift = window.innerWidth - margin - rect.right;
      else if (rect.left < margin) shift = margin - rect.left;
      if (shift !== 0) el.style.transform = `translateX(${shift}px)`;
    }
    clamp();
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
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
