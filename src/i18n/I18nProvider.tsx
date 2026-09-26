import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { applyDocumentLocale } from './direction';
import {
  defaultLocale,
  locales,
  translate,
  type Direction,
  type Locale,
  type MessageKey,
  type MessageParams,
} from './core';

export interface I18nContextValue {
  locale: Locale;
  /** The BCP 47 tag on <html lang>. */
  lang: string;
  /** The effective direction, including the dev ?dir=rtl override. */
  dir: Direction;
  t: (key: MessageKey, params?: MessageParams) => string;
}

function makeValue(locale: Locale, dirOverride: Direction | null): I18nContextValue {
  const info = locales[locale];
  return {
    locale,
    lang: info.lang,
    dir: dirOverride ?? info.dir,
    t: (key, params) => translate(locale, key, params),
  };
}

const I18nContext = createContext<I18nContextValue>(makeValue(defaultLocale, null));

interface I18nProviderProps {
  locale?: Locale;
  /** Forces a direction (the dev right-to-left switch). */
  dirOverride?: Direction | null;
  children: ReactNode;
}

/** Provides t() and sets lang and dir on <html> for the current locale. */
export function I18nProvider({ locale = defaultLocale, dirOverride = null, children }: I18nProviderProps) {
  const value = useMemo(() => makeValue(locale, dirOverride), [locale, dirOverride]);

  useLayoutEffect(() => {
    applyDocumentLocale(value.lang, value.dir);
  }, [value.lang, value.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
