import { useId, type InputHTMLAttributes } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from './Icon';
import { cx } from './internal/cx';
import './TextField.css';

type ForwardedInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'placeholder' | 'className' | 'type'>;

export interface TextFieldProps extends ForwardedInputProps {
  id?: string;
  label: string;
  optional?: boolean;
  placeholder?: string;
  value?: string;
  /** Controlled usage: fires with the new text on every keystroke. */
  onValueChange?: (value: string) => void;
  helper?: string;
  /**
   * Not in the reference's index.d.ts; added so a caller can flag a failed
   * check (an empty required field, a bad class code) the same way
   * everywhere: `aria-invalid`, a burnt-orange (never red) helper message
   * that's announced when it appears, and the field's border to match.
   */
  invalid?: boolean;
  className?: string;
}

/** A single-line answer, such as a learner's name or a class code. */
export function TextField({
  id,
  label,
  optional,
  placeholder,
  value,
  onValueChange,
  helper,
  invalid,
  className,
  ...rest
}: TextFieldProps) {
  const { t } = useI18n();
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helpId = helper ? `${fieldId}-help` : undefined;
  return (
    <div className={cx('tw-field', invalid && 'tw-field-invalid', className)}>
      <label htmlFor={fieldId}>
        {label}
        {optional ? <span className="tw-optional"> {t('ds.content.field.optional')}</span> : null}
      </label>
      <input
        id={fieldId}
        type="text"
        placeholder={placeholder}
        // Controlled when a change handler is given (so a value loaded from
        // IndexedDB after the first render still shows), uncontrolled
        // (defaultValue) otherwise.
        {...(onValueChange ? { value: value ?? '' } : { defaultValue: value })}
        onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
        autoComplete="off"
        aria-describedby={helpId}
        aria-invalid={invalid ? 'true' : undefined}
        {...rest}
      />
      {helper ? (
        <span className={cx('tw-help', invalid && 'tw-help-invalid')} id={helpId} role={invalid ? 'alert' : undefined}>
          {/* "Not quite" never relies on colour alone, and the message text
              itself is ink, not burnt orange: TextField can sit on lavender
              (NewLearner.dc.html's panel), where burnt-orange 14px text
              fails WCAG 1.4.3 (r2-rules-1) — the icon alone carries the
              colour, at a contrast level graphics are held to, not text. */}
          {invalid ? <Icon name="RotateCcw" size={14} strokeWidth={3} className="tw-help-invalid-icon" /> : null}
          {helper}
        </span>
      ) : null}
    </div>
  );
}
