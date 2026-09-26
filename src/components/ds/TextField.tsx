import { useId, type InputHTMLAttributes } from 'react';
import { useI18n } from '../../i18n';
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
  className,
  ...rest
}: TextFieldProps) {
  const { t } = useI18n();
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helpId = helper ? `${fieldId}-help` : undefined;
  return (
    <div className={cx('tw-field', className)}>
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
        {...rest}
      />
      {helper ? (
        <span className="tw-help" id={helpId}>
          {helper}
        </span>
      ) : null}
    </div>
  );
}
