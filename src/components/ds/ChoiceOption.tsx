import { useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import { handleRovingKeyDown, useRovingTabIndex } from './internal/rovingFocus';
import './ChoiceOption.css';

/**
 * The subset of a plain button's own attributes worth forwarding. `type`,
 * `role`, `aria-checked`, `disabled` and `className` stay the component's own.
 */
type ForwardedButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'role' | 'children' | 'disabled' | 'className'
>;

export interface ChoiceOptionProps extends ForwardedButtonProps {
  letter: string;
  state?: 'idle' | 'selected' | 'correct' | 'retry';
  /** Other options once a correct answer has been chosen. */
  muted?: boolean;
  disabled?: boolean;
  /**
   * 'radio' (the default): one answer per question, roving tabindex, arrow
   * keys move between siblings in a `role="radiogroup"`. 'checkbox': more
   * than one answer allowed, each option is its own tab stop, no roving.
   */
  type?: 'radio' | 'checkbox';
  children: ReactNode;
  className?: string;
}

/**
 * One answer in a quick check or section quiz. Real radio (or, with
 * `type="checkbox"`, checkbox) semantics: use inside a `role="radiogroup"`
 * (or `role="group"`; QuestionCard already renders one). In radio mode,
 * arrow keys move focus and selection between sibling options in that
 * group.
 */
export function ChoiceOption({
  letter,
  state = 'idle',
  muted,
  disabled,
  type = 'radio',
  children,
  className,
  onKeyDown,
  ...rest
}: ChoiceOptionProps) {
  const { t, contentLang } = useI18n();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const checked = state !== 'idle';
  const isRadio = type === 'radio';
  // Checkboxes are independently tabbable (no single roving tab stop): give
  // the hook a group selector that never matches, so its fallback applies
  // (every item keeps tabIndex 0).
  useRovingTabIndex(buttonRef, checked, {
    groupSelector: isRadio ? '[role="radiogroup"], [role="group"]' : '[data-roving-disabled]',
    itemSelector: '[role="radio"]',
  });

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (isRadio) {
      // Options stack vertically (QuestionCard's .tw-question-options is a
      // column), so the roving group answers to Up/Down per the WAI-ARIA
      // radio group pattern. Activation is manual: choosing an option shows
      // "Not quite" or "Correct" immediately and (in a real lesson) saves
      // the answer, so arrow keys must only move focus to let a learner
      // hear the other options — Space or Enter (the button's own default
      // behaviour) is what actually answers the question.
      handleRovingKeyDown(event, { orientation: 'vertical', itemSelector: '[role="radio"]', activation: 'manual' });
    }
    onKeyDown?.(event);
  }

  const stateEl =
    state === 'correct' ? (
      <span className="tw-option-state">
        <Icon name="Check" size={18} strokeWidth={3} />
        {t('ds.content.option.correct')}
      </span>
    ) : state === 'retry' ? (
      <span className="tw-option-state">
        <Icon name="RotateCcw" size={18} />
        {t('ds.content.option.notQuite')}
      </span>
    ) : null;

  return (
    <button
      ref={buttonRef}
      type="button"
      role={isRadio ? 'radio' : 'checkbox'}
      aria-checked={checked}
      className={cx(
        'tw-option',
        state === 'correct' && 'tw-option-correct',
        state === 'retry' && 'tw-option-retry',
        muted && 'tw-option-muted',
        className,
      )}
      disabled={disabled}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {/* The answer is course text, and so is its letter: both stay English. */}
      <span className="tw-option-letter" aria-hidden="true" {...contentLang}>
        {letter}
      </span>
      <span className="tw-option-text" {...contentLang}>
        {children}
      </span>
      {stateEl}
    </button>
  );
}
