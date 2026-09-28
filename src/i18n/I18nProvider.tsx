import { createContext, Fragment, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { applyDocumentLocale } from './direction';
import {
  ENGLISH,
  formatDateIn,
  formatListIn,
  formatMessageParts,
  formatNumberIn,
  resolveMessage,
  translate,
  type Direction,
  type LoadedLocale,
  type LocaleDefinition,
  type MessageKey,
  type MessageParams,
} from './core';
import { loadFont } from './fonts';
import { loadedLocale, loadLocale } from './load';
import { formatLocale, readyLocales, SOURCE_LOCALE } from './locales';

/** lang (and dir) for an element, or nothing at all while the interface is English. */
export interface LangProps {
  lang?: string;
  dir?: Direction;
}

export interface I18nContextValue {
  /** The language's code (a BCP 47 tag, also on <html lang>). */
  locale: string;
  /** The BCP 47 tag on <html lang>. */
  lang: string;
  /** The effective direction, including the dev ?dir=rtl override. */
  dir: Direction;
  definition: LocaleDefinition;
  /** The languages learners can choose. A language picker shows only when there is more than one. */
  offered: readonly LocaleDefinition[];
  t: (key: MessageKey, params?: MessageParams) => string;
  /**
   * A message whose params can be elements, such as a lesson title marked
   * as English with <En>: "Lesson {number}: {title}". Returns the pieces
   * to render in place.
   */
  tx: (key: MessageKey, params: Record<string, ReactNode>) => ReactNode;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** A date in the language's own words, calendar and digits. */
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  /** "A, B and C" in the language's own words. */
  formatList: (items: readonly string[], options?: Intl.ListFormatOptions) => string;
  /**
   * Spread on an element that holds English course text (anything from
   * content/): lang="en", and dir="ltr" in a right-to-left page, while the
   * interface is in another language, so screen readers and Listen read it
   * as English. Nothing while the interface is English.
   */
  contentLang: LangProps;
  /**
   * Spread on interface text that sits inside English course text (a
   * glossary word's popover in a reading), to put it back in the
   * interface's language and direction. Nothing while the interface is
   * English.
   */
  uiLang: LangProps;
}

function makeValue(active: LoadedLocale, dirOverride: Direction | null, offered: readonly LocaleDefinition[]): I18nContextValue {
  const definition = active.definition;
  const lang = definition.code;
  const dir = dirOverride ?? definition.dir;
  const intl = formatLocale(definition);
  const decorate = active.decorate ?? ((text: string) => text);
  const english = lang === SOURCE_LOCALE;
  return {
    locale: lang,
    lang,
    dir,
    definition,
    offered,
    t: (key, params) => translate(active, key, params),
    tx: (key, params) => {
      const { value, lang: messageLang } = resolveMessage(active, key);
      const parts = formatMessageParts(value, messageLang, params) ?? [key];
      return parts.map((part, index) => <Fragment key={index}>{part as ReactNode}</Fragment>);
    },
    formatNumber: (value, options) => formatNumberIn(intl, value, options),
    formatDate: (value, options) => decorate(formatDateIn(intl, value, options)),
    formatList: (items, options) => decorate(formatListIn(intl, items, options)),
    contentLang: english ? {} : dir === 'rtl' ? { lang: SOURCE_LOCALE, dir: 'ltr' } : { lang: SOURCE_LOCALE },
    uiLang: english ? {} : { lang, dir },
  };
}

const I18nContext = createContext<I18nContextValue>(makeValue(ENGLISH, null, readyLocales()));

interface I18nProviderProps {
  /**
   * The language to show, by code (src/i18n/locales.ts). A language that
   * isn't loaded yet is loaded first; until it arrives the language shown
   * before stays (English at first). An unknown code stays English.
   */
  locale?: string;
  /** Forces a direction (the dev right-to-left switch). */
  dirOverride?: Direction | null;
  /** Use this language as it is instead of loading `locale` (tests, with a fixture). */
  loaded?: LoadedLocale;
  /** The languages learners can choose; the ready ones unless a test passes a fixture. */
  offered?: readonly LocaleDefinition[];
  children: ReactNode;
}

/** Provides t() and the formatters, and sets lang and dir on <html> for the current language. */
export function I18nProvider({ locale = SOURCE_LOCALE, dirOverride = null, loaded, offered, children }: I18nProviderProps) {
  // Shown while the wanted language loads: the last one that finished loading.
  const [waiting, setWaiting] = useState<LoadedLocale>(ENGLISH);
  const wanted = loaded ?? loadedLocale(locale);
  const active = wanted ?? waiting;
  const offeredLocales = useMemo(() => offered ?? readyLocales(), [offered]);

  useEffect(() => {
    if (loaded || loadedLocale(locale)) return undefined;
    let current = true;
    loadLocale(locale).then(
      (next) => {
        if (current) setWaiting(next);
      },
      (error: unknown) => {
        if (import.meta.env.DEV) console.warn(`[i18n] Couldn't load ${locale}; the interface stays as it is.`, error);
      },
    );
    return () => {
      current = false;
    };
  }, [locale, loaded]);

  useEffect(() => {
    if (active.definition.font !== 'latin') void loadFont(active.definition.font);
  }, [active]);

  const value = useMemo(() => makeValue(active, dirOverride, offeredLocales), [active, dirOverride, offeredLocales]);

  useLayoutEffect(() => {
    applyDocumentLocale(value.lang, value.dir);
  }, [value.lang, value.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

/**
 * English course text inside interface text (a lesson title in "Lesson
 * {number}: {title}"): a <span lang="en">, with dir="ltr" in a right-to-left
 * page, while the interface is in another language. Just the text while
 * the interface is English, so English pages are exactly as before.
 */
export function En({ children }: { children: ReactNode }) {
  const { contentLang } = useI18n();
  if (!contentLang.lang) return <>{children}</>;
  return <span {...contentLang}>{children}</span>;
}
