import { Chip } from '../components/ds';
import { useI18n } from '../i18n';
import './LanguageChoice.css';

export interface LanguageChoiceProps {
  /** The group's name for screen readers ("Your language"). */
  label: string;
  /** The chosen language's code. */
  value: string;
  onChange: (code: string) => void;
  /** The id of a line that explains the choice (aria-describedby). */
  describedBy?: string;
  disabled?: boolean;
}

/**
 * A row of one-tap chips, one per language learners are offered
 * (src/i18n/locales.ts, `ready`), each named in its own language and
 * marked with its own lang and dir, so a learner finds theirs whatever the
 * interface is in now. Renders nothing while only one language is offered
 * (English today), so nothing shows until a translation is ready.
 */
export function LanguageChoice({ label, value, onChange, describedBy, disabled }: LanguageChoiceProps) {
  const { offered } = useI18n();
  if (offered.length < 2) return null;
  return (
    <div role="radiogroup" aria-label={label} aria-describedby={describedBy} className="tw-language-choice">
      {offered.map((locale) => (
        <Chip
          key={locale.code}
          role="radio"
          lang={locale.code}
          dir={locale.dir}
          selected={locale.code === value}
          disabled={disabled}
          onClick={() => {
            if (locale.code !== value) onChange(locale.code);
          }}
        >
          {locale.endonym}
        </Chip>
      ))}
    </div>
  );
}

/** True when there is a language to choose, so a caller can leave out the heading and help around LanguageChoice too. */
export function useHasLanguageChoice(): boolean {
  return useI18n().offered.length > 1;
}
