import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { DefinitionCard, type DefinitionCardProps } from './DefinitionCard';
import './GlossaryTerm.css';

export interface GlossaryTermProps {
  /** Dictionary form, if different from the word as written (`children`). */
  word?: string;
  definition: string;
  example?: string;
  /** Initial state only: the component owns whether it is open after that. */
  open?: boolean;
  /** Called when the popover's "Hear it" toggle is pressed. Omit to hide it. */
  onListen?: () => void;
  /** Whether "Hear it" is mid-playback, reflected as its pressed state. */
  listening?: boolean;
  /** Not in the design-system docs: the word's meaning in the learner's own language (DefinitionCard). */
  meaning?: DefinitionCardProps['meaning'];
  children: ReactNode;
}

/**
 * A key word inside a reading. Tapping (or activating with Enter/Space,
 * since the trigger is a real `<button>`) opens its meaning underneath;
 * Escape, an outside click or the popover's own close button closes it
 * again and returns focus to the trigger.
 */
export function GlossaryTerm({ word, definition, example, open, onListen, listening, meaning, children }: GlossaryTermProps) {
  const [isOpen, setIsOpen] = useState(!!open);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const closeAndReturnFocus = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const wrap = wrapRef.current;

    function handlePointerDown(event: PointerEvent) {
      if (wrapRef.current && event.target instanceof Node && !wrapRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      // Scoped to this term: only react when focus is inside this term's
      // trigger or popover, so pressing Escape elsewhere on the page (for
      // example in a WritingBox) doesn't close a definition, and having two
      // terms open doesn't let one Escape close both or steal focus.
      const active = document.activeElement;
      if (!wrapRef.current || !(active instanceof Node) || !wrapRef.current.contains(active)) return;
      event.preventDefault();
      closeAndReturnFocus();
    }
    // A keyboard user can Tab out of the popover (past its Close and any
    // other buttons) without pressing Escape or clicking elsewhere. Left
    // open, the popover can sit on top of whatever they tabbed to next —
    // often the next glossary word in running text. Close as soon as focus
    // leaves this term's wrapper entirely, but don't move focus: it has
    // already moved on, to wherever the person tabbed.
    function handleFocusOut(event: FocusEvent) {
      const related = event.relatedTarget;
      // relatedTarget is null whenever focus lands on something that can't
      // take it (plain text, the popover's own padding) or the window loses
      // focus. Treat that as "still inside": a genuine click outside the
      // wrapper is already caught by handlePointerDown, and Tab to a real
      // next control always sets relatedTarget. Without this, tapping the
      // definition text itself (which can't take focus) blurs the trigger
      // with a null relatedTarget and closes the popover under the reader's
      // finger.
      if (!(related instanceof Node)) return;
      if (wrap?.contains(related)) return;
      setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    wrap?.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      wrap?.removeEventListener('focusout', handleFocusOut);
    };
  }, [isOpen, closeAndReturnFocus]);

  return (
    <span className="tw-term-wrap" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className="tw-term"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
      >
        {children}
      </button>
      {isOpen ? (
        <DefinitionCard
          id={popoverId}
          floating
          word={word ?? children}
          definition={definition}
          example={example}
          onClose={closeAndReturnFocus}
          onListen={onListen}
          listening={listening}
          meaning={meaning}
        />
      ) : null}
    </span>
  );
}
