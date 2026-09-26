import { useId, type ReactElement, type TextareaHTMLAttributes } from 'react';
import { VoiceButton } from './VoiceButton';
import { cx } from './internal/cx';
import { useI18n } from '../../i18n';
import './WritingBox.css';

type ForwardedTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'value' | 'placeholder' | 'className' | 'rows' | 'aria-describedby'
>;

export interface WritingBoxProps extends ForwardedTextareaProps {
  id?: string;
  /** The prompt; also the textarea's label. */
  label?: string;
  /**
   * Accessible name for the textarea when there is no visible `label` — for
   * example an id pointing at a `QuestionCard`'s prompt. Required when
   * `label` is left out, so the field is never unlabelled.
   */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  optional?: boolean;
  placeholder?: string;
  value?: string;
  /** Controlled usage: fires with the new text on every keystroke. */
  onValueChange?: (value: string) => void;
  rows?: number;
  /** How much is enough ("4–6 sentences is plenty"), never a word-count gate. */
  helper?: string;
  /** true shows a "Say it" `VoiceButton` beside the label; 'listening' shows it recording. */
  dictate?: boolean | 'listening';
  /** Fires when the Say it / Stop button is pressed. Dictation itself is wired up in a later phase. */
  onDictateClick?: () => void;
  className?: string;
}

/**
 * A labelled text area for writing and reflections, with a helper line.
 * Controlled when `onValueChange` is given (so a draft loaded from
 * IndexedDB after the first render still shows); uncontrolled otherwise.
 */
export function WritingBox({
  id,
  label,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  optional,
  placeholder,
  value,
  onValueChange,
  rows = 5,
  helper,
  dictate,
  onDictateClick,
  className,
  ...rest
}: WritingBoxProps): ReactElement {
  const { t } = useI18n();
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helperId = helper ? `${fieldId}-help` : undefined;
  const labelNode = label ? (
    <label htmlFor={fieldId}>
      {label}
      {optional ? <span className="tw-optional"> {t('ds.actions.writingBox.optional')}</span> : null}
    </label>
  ) : null;

  if (import.meta.env.DEV && !label && !ariaLabel && !ariaLabelledby) {
    console.warn('WritingBox: pass `label`, `aria-label` or `aria-labelledby` so the textarea has an accessible name.');
  }

  return (
    <div className={cx('tw-writing', className)}>
      {dictate ? (
        <div className="tw-writing-head">
          {labelNode || <span />}
          <VoiceButton state={dictate === 'listening' ? 'listening' : 'idle'} onClick={onDictateClick} />
        </div>
      ) : (
        labelNode
      )}
      <textarea
        id={fieldId}
        rows={rows}
        placeholder={placeholder}
        aria-label={!label ? ariaLabel : undefined}
        aria-labelledby={!label ? ariaLabelledby : undefined}
        aria-describedby={helperId}
        {...(onValueChange ? { value: value ?? '' } : { defaultValue: value })}
        onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
        {...rest}
      />
      {helper ? (
        <span className="tw-help" id={helperId}>
          {helper}
        </span>
      ) : null}
    </div>
  );
}
