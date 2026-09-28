import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PSEUDO_TRANSFORMS } from '../src/i18n/pseudo.ts';

// Interface text as the app shows it, from src/i18n/messages/en.json, in
// English or in a pseudo-language (src/i18n/pseudo.ts), so the page tour
// (e2e/pageTour.ts) can find buttons and headings by name in any of them.
// Not a spec file itself: Playwright only runs *.spec.ts.

interface Tree {
  [key: string]: string | Tree;
}

const en = JSON.parse(readFileSync(path.join(import.meta.dirname, '..', 'src', 'i18n', 'messages', 'en.json'), 'utf8')) as Tree;

/** The languages the end-to-end tests can walk the site in. */
export type TestLocale = 'en' | 'en-XA' | 'ar-XB';

export type UiParams = Record<string, string | number>;

/** A message by its key in en.json, with its {placeholders} filled in, as the app shows it. */
export type UiText = (key: string, params?: UiParams) => string;

function lookup(key: string): string | Tree {
  let node: string | Tree | undefined = en;
  for (const part of key.split('.')) node = typeof node === 'object' ? node[part] : undefined;
  if (node === undefined) throw new Error(`No message ${key} in en.json`);
  return node;
}

const plural = new Intl.PluralRules('en');
const number = new Intl.NumberFormat('en');

function template(key: string, params: UiParams | undefined): string {
  const value = lookup(key);
  if (typeof value === 'string') return value;
  const count = params?.count;
  const form = typeof count === 'number' ? value[plural.select(count)] : undefined;
  const text = form ?? value.other;
  if (typeof text !== 'string') throw new Error(`${key} is a group, not a message`);
  return text;
}

function fill(text: string, params: UiParams | undefined): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) return match;
    const value = params[name]!;
    return typeof value === 'number' ? number.format(value) : value;
  });
}

/** Interface text in a language: English, or a pseudo-language made from English as the build makes it. */
export function uiText(locale: TestLocale = 'en'): UiText {
  const transform = locale === 'en' ? (text: string) => text : PSEUDO_TRANSFORMS[locale]!.message;
  return (key, params) => fill(transform(template(key, params)), params);
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A message as a pattern, any {placeholder} matching anything ("{score} out of {total}"). */
export function uiPattern(locale: TestLocale, key: string, params?: UiParams): RegExp {
  const text = uiText(locale)(key, params);
  return new RegExp(`^${text.split(/\{\w+\}/).map(escape).join('.+?')}$`);
}
