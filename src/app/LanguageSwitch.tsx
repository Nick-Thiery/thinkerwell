import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../components/ds';
import { findLocale, useI18n } from '../i18n';
import { useLearnerSession } from '../session';
import { LanguageChoice } from './LanguageChoice';
import './LanguageSwitch.css';

/**
 * The language switch in the header, on every page, from the very first one:
 * a globe and the language on screen in its own name ("English", "Bahasa
 * Indonesia"; on a phone, its short code), which opens the languages, each
 * in its own name. Choosing one changes the app's one language setting
 * (useLearnerSession().setLanguage): every page changes at once, and it is
 * saved for the chosen learner, or for the device before anyone is chosen.
 * Renders nothing while only one language is offered.
 */
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { t, offered } = useI18n();
  const { language, setLanguage } = useLearnerSession();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = findLocale(language) ?? offered[0]!;

  // Closes on Escape (focus back on the button) and on a tap or click outside.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    // The chosen language's chip takes focus, so arrow keys move between them.
    rootRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  if (offered.length < 2) return null;

  return (
    <div ref={rootRef} className="tw-language-switch">
      <button
        ref={buttonRef}
        type="button"
        className="tw-language-switch-button"
        aria-label={t('header.language.button', { language: current.endonym })}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((was) => !was)}
      >
        <Icon name="Globe" size={20} />
        <span className="tw-language-switch-name" lang={current.code} dir={current.dir} aria-hidden="true">
          {compact ? current.code.toUpperCase() : current.endonym}
        </span>
        <Icon name="ChevronDown" size={16} className="tw-language-switch-chevron" />
      </button>
      {open ? (
        <div id={panelId} className="tw-language-switch-panel">
          <p className="tw-language-switch-title">
            <Icon name="Globe" size={18} />
            {t('header.language.title')}
          </p>
          <LanguageChoice
            label={t('header.language.title')}
            value={current.code}
            onChange={(code) => {
              setOpen(false);
              buttonRef.current?.focus();
              setLanguage(code).catch((error: unknown) => {
                // Still changed on screen; it just couldn't be kept on this device.
                if (import.meta.env.DEV) console.error(error);
              });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
