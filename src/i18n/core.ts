/**
 * A tiny typed message helper.
 *
 * Every UI string lives in src/i18n/messages/<locale>.json. Keys are dotted
 * paths ("nav.course") and are checked by TypeScript against en.json, so a
 * typo is a type error. Values may contain {placeholders}.
 *
 * A value can also be a plural object ({ "one": "...", "other": "..." }); pass
 * a numeric `count` param and the right form is picked with Intl.PluralRules.
 *
 * Usage in components: const { t } = useI18n(); t('nav.course')
 * Outside React (tests, utilities): translate('en', 'nav.course') or t('nav.course').
 */
import en from './messages/en.json';

export type Messages = typeof en;
export type Direction = 'ltr' | 'rtl';

type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/** Dotted paths to every leaf string (or plural object) in en.json. */
type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends PluralForms
      ? `${Prefix}${K}`
      : T[K] extends Record<string, unknown>
        ? Leaves<T[K], `${Prefix}${K}.`>
        : never;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type MessageParams = Record<string, string | number>;

export interface LocaleInfo {
  /** BCP 47 tag used for <html lang>. */
  lang: string;
  dir: Direction;
  /** Name of the language in that language, for a future language picker. */
  nativeName: string;
  messages: Messages;
}

/**
 * Supported locales. Dari/Farsi ('fa-AF', rtl), Arabic ('ar', rtl) and Somali
 * ('so', ltr) come later; add their message files and entries here.
 */
export const locales = {
  en: { lang: 'en', dir: 'ltr', nativeName: 'English', messages: en },
} satisfies Record<string, LocaleInfo>;

export type Locale = keyof typeof locales;
export const defaultLocale: Locale = 'en';

function lookup(messages: unknown, key: string): unknown {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

/**
 * Turns one message value (a string or a plural object) into text for a
 * language: picks the plural form for params.count with Intl.PluralRules,
 * then fills in {placeholders}. Returns undefined for anything else.
 * Pure, and exported for tests.
 */
export function formatMessage(value: unknown, lang: string, params?: MessageParams): string | undefined {
  if (typeof value === 'string') return interpolate(value, params);

  if (value && typeof value === 'object' && typeof (value as { other?: unknown }).other === 'string') {
    const forms = value as PluralForms;
    const count = typeof params?.count === 'number' ? params.count : 0;
    const rule = new Intl.PluralRules(lang).select(count);
    return interpolate(forms[rule] ?? forms.other, params);
  }

  return undefined;
}

/** Translate a key for a given locale. Falls back to English, then to the key itself. */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const info: LocaleInfo = locales[locale];
  const fallback: LocaleInfo = locales[defaultLocale];
  let value = lookup(info.messages, key);
  if (value === undefined && info !== fallback) value = lookup(fallback.messages, key);

  const text = formatMessage(value, info.lang, params);
  if (text !== undefined) return text;

  if (import.meta.env.DEV) console.warn(`[i18n] Missing message: ${key}`);
  return key;
}

/** English shortcut for code outside React. Components should use useI18n(). */
export function t(key: MessageKey, params?: MessageParams): string {
  return translate(defaultLocale, key, params);
}
