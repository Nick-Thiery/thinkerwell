/**
 * A tiny typed message helper.
 *
 * Every UI string lives in src/i18n/messages/en.json. Keys are dotted paths
 * ("nav.course") and are checked by TypeScript against en.json, so a typo is
 * a type error. Values may contain {placeholders}.
 *
 * A value can also be a plural object ({ "one": "...", "other": "..." }); pass
 * a numeric `count` param and the form is picked with Intl.PluralRules for
 * the language, which may use any of CLDR's categories (Arabic has zero,
 * one, two, few, many and other). A form the message doesn't have falls back
 * to "other".
 *
 * Numbers in params are written with the language's own Intl.NumberFormat
 * (Dari uses Persian digits, for example), and dates and lists have their
 * own formatters (formatDateIn, formatListIn, and useI18n's formatDate and
 * formatList), so nothing is put together by hand in English.
 *
 * English is bundled. Other languages are loaded when a learner picks one
 * (./load.ts) and then passed around as a LoadedLocale. A key a language
 * doesn't have yet falls back to English.
 *
 * Usage in components: const { t } = useI18n(); t('nav.course')
 * Outside React (tests, utilities): translate('en', 'nav.course') or t('nav.course').
 */
import en from './messages/en.json';
import { findLocale, formatLocale, SOURCE_LOCALE, type LocaleDefinition } from './locales';

export type { Direction, LocaleDefinition } from './locales';

export type Messages = typeof en;

export type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/** A message file for any language: groups of strings and plural objects, perhaps not every key. */
export interface MessageTree {
  [key: string]: string | MessageTree;
}

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

/** A language ready to use: what it is, its messages, and how its formatted dates and lists are changed (pseudo-languages only). */
export interface LoadedLocale {
  definition: LocaleDefinition;
  messages: MessageTree;
  /** Changes a formatted date or list (a pseudo-language accents it, as it does its messages). */
  decorate?: (text: string) => string;
}

export const ENGLISH: LoadedLocale = {
  definition: findLocale(SOURCE_LOCALE)!,
  messages: en,
};

export const defaultLocale = SOURCE_LOCALE;

function lookup(messages: unknown, key: string): unknown {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** True for a plural object: an object whose "other" is a string. */
export function isPluralForms(value: unknown): value is PluralForms {
  return !!value && typeof value === 'object' && typeof (value as { other?: unknown }).other === 'string';
}

type IntlObject = Intl.PluralRules | Intl.NumberFormat | Intl.DateTimeFormat | Intl.ListFormat;

// Intl objects are slow to make, so each is made once and reused.
const cache = new Map<string, IntlObject>();

function cached<T extends IntlObject>(kind: string, lang: string, options: object | undefined, make: () => T): T {
  const id = `${kind}|${lang}|${options ? JSON.stringify(options) : ''}`;
  let value = cache.get(id) as T | undefined;
  if (!value) {
    value = make();
    cache.set(id, value);
  }
  return value;
}

export function pluralRules(lang: string): Intl.PluralRules {
  return cached('plural', lang, undefined, () => new Intl.PluralRules(lang));
}

/** A number as the language writes it ("12", "۱۲"). */
export function formatNumberIn(lang: string, value: number, options?: Intl.NumberFormatOptions): string {
  return cached('number', lang, options, () => new Intl.NumberFormat(lang, options)).format(value);
}

/** A date as the language writes it, in its own calendar and digits. */
export function formatDateIn(lang: string, value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const date = value instanceof Date ? value : new Date(value);
  return cached('date', lang, options, () => new Intl.DateTimeFormat(lang, options)).format(date);
}

/** "A, B and C" as the language writes it. Browsers without Intl.ListFormat get commas. */
export function formatListIn(lang: string, items: readonly string[], options?: Intl.ListFormatOptions): string {
  if (typeof Intl.ListFormat !== 'function') return items.join(', ');
  return cached('list', lang, options, () => new Intl.ListFormat(lang, options)).format(items);
}

/** The template for one message value: the string, or the plural form for params.count ("other" when there is no count). */
function pickForm(value: unknown, lang: string, params?: Record<string, unknown>): string | undefined {
  if (typeof value === 'string') return value;
  if (!isPluralForms(value)) return undefined;
  const count = params?.count;
  if (typeof count !== 'number') return value.other;
  return value[pluralRules(lang).select(count)] ?? value.other;
}

/**
 * One message as pieces: its text, with each {placeholder} replaced by its
 * param (numbers written with the language's digits; anything else, such
 * as a React element, passed through as it is). A placeholder with no param
 * stays as {name}. Pure, and exported for tests and for rich messages
 * (useI18n's tx).
 */
export function formatMessageParts(value: unknown, lang: string, params?: Record<string, unknown>): unknown[] | undefined {
  const template = pickForm(value, lang, params);
  if (template === undefined) return undefined;
  if (!params) return [template];
  const parts: unknown[] = [];
  let last = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    const name = match[1]!;
    if (!Object.prototype.hasOwnProperty.call(params, name)) continue;
    if (match.index > last) parts.push(template.slice(last, match.index));
    const param = params[name];
    parts.push(typeof param === 'number' ? formatNumberIn(lang, param) : param);
    last = match.index + match[0].length;
  }
  if (last < template.length) parts.push(template.slice(last));
  return parts;
}

/**
 * Turns one message value (a string or a plural object) into text for a
 * language (an Intl locale such as 'en' or 'ar'): picks the plural form for
 * params.count with Intl.PluralRules, then fills in {placeholders}.
 * Returns undefined for anything else. Pure, and exported for tests.
 */
export function formatMessage(value: unknown, lang: string, params?: MessageParams): string | undefined {
  return formatMessageParts(value, lang, params)?.map(String).join('');
}

/**
 * Where a key's text comes from: the language's own message, or English
 * when the language doesn't have it (formatted as English, so a stray
 * English string never gets another language's digits or plural forms).
 */
export function resolveMessage(locale: LoadedLocale, key: string): { value: unknown; lang: string } {
  const own = lookup(locale.messages, key);
  if (own !== undefined || locale === ENGLISH) return { value: own, lang: formatLocale(locale.definition) };
  return { value: lookup(ENGLISH.messages, key), lang: formatLocale(ENGLISH.definition) };
}

/**
 * Translate a key for a language. Falls back to English, then to the key
 * itself. The string 'en' names English (the only language bundled); pass
 * a LoadedLocale for any other.
 */
export function translate(locale: LoadedLocale | 'en', key: MessageKey, params?: MessageParams): string {
  const { value, lang } = resolveMessage(locale === 'en' ? ENGLISH : locale, key);
  const text = formatMessage(value, lang, params);
  if (text !== undefined) return text;

  if (import.meta.env.DEV) console.warn(`[i18n] Missing message: ${key}`);
  return key;
}

/** English shortcut for code outside React. Components should use useI18n(). */
export function t(key: MessageKey, params?: MessageParams): string {
  return translate(ENGLISH, key, params);
}
