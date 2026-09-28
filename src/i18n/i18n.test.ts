import { describe, expect, it, vi } from 'vitest';
import en from './messages/en.json';
import { ENGLISH, formatDateIn, formatListIn, formatMessage, formatMessageParts, formatNumberIn, t, translate, type LoadedLocale, type MessageKey } from './core';
import { findLocale } from './locales';

/** Every leaf string in a messages object, as [dotted key, value]. */
function leaves(node: unknown, prefix = ''): Array<[string, string]> {
  if (typeof node === 'string') return [[prefix, node]];
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

/** True when a dotted key names a string or a plural object in en.json. */
function hasKey(key: string): boolean {
  let node: unknown = en;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object' || !Object.prototype.hasOwnProperty.call(node, part)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' || (node !== null && typeof node === 'object' && 'other' in node);
}

describe('translate', () => {
  it('returns the English string', () => {
    expect(translate('en', 'nav.course')).toBe('Course');
    expect(t('nav.course')).toBe('Course');
  });

  it('fills in {params}', () => {
    expect(t('app.documentTitle', { page: 'Course map' })).toBe('Course map · Thinkerwell');
    expect(t('pages.lesson.title', { number: 10, stage: 'Read' })).toBe('Lesson 10: Read');
    expect(t('lesson.minutes', { min: 30, max: 50 })).toBe('About 30–50 min');
  });

  it('leaves a missing param as {name}', () => {
    expect(t('pages.lesson.title', { number: 3 })).toBe('Lesson 3: {stage}');
    expect(t('app.documentTitle')).toBe('{page} · Thinkerwell');
  });

  it('ignores params that are not in the message', () => {
    expect(t('nav.home', { extra: 'x' })).toBe('Home');
  });

  it('does not re-interpolate a param value that looks like a placeholder', () => {
    expect(t('pages.lesson.title', { number: '{stage}', stage: 'Read' })).toBe('Lesson {stage}: Read');
  });

  it('returns the key for a missing message, and warns in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(translate('en', 'nav.nope' as MessageKey)).toBe('nav.nope');
    expect(translate('en', 'nope.at.all' as MessageKey)).toBe('nope.at.all');
    expect(warn).toHaveBeenCalledWith('[i18n] Missing message: nav.nope');
  });

  it('returns the key when it names a group, not a message', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(translate('en', 'nav' as MessageKey)).toBe('nav');
  });

  it('knows English is left to right', () => {
    expect(findLocale('en')).toMatchObject({ code: 'en', dir: 'ltr', ready: true });
  });
});

describe('formatMessage', () => {
  const forms = { one: '{count} lesson done', other: '{count} lessons done' };

  it('formats a plain string', () => {
    expect(formatMessage('Hi {name}', 'en', { name: 'Amina' })).toBe('Hi Amina');
  });

  it('picks the plural form with Intl.PluralRules', () => {
    expect(formatMessage(forms, 'en', { count: 1 })).toBe('1 lesson done');
    expect(formatMessage(forms, 'en', { count: 0 })).toBe('0 lessons done');
    expect(formatMessage(forms, 'en', { count: 2 })).toBe('2 lessons done');
    expect(formatMessage(forms, 'en', { count: 24 })).toBe('24 lessons done');
  });

  it('uses "other" when there is no count', () => {
    expect(formatMessage(forms, 'en')).toBe('{count} lessons done');
    expect(formatMessage(forms, 'ar')).toBe('{count} lessons done');
    expect(formatMessage(forms, 'en', { count: '3' })).toBe('3 lessons done');
  });

  it("supports every plural category a language has (Arabic's six)", () => {
    const arabic = { zero: 'zero {count}', one: 'one {count}', two: 'two {count}', few: 'few {count}', many: 'many {count}', other: 'other {count}' };
    // Intl.NumberFormat('ar') may write Arabic-Indic digits; compare the category only.
    const category = (count: number) => formatMessage(arabic, 'ar', { count })!.split(' ')[0];
    expect([0, 1, 2, 3, 10, 11, 99, 100, 102].map(category)).toEqual(['zero', 'one', 'two', 'few', 'few', 'many', 'many', 'other', 'other']);
    expect(new Intl.PluralRules('ar').resolvedOptions().pluralCategories).toHaveLength(6);
  });

  it("writes numbers in the language's own digits", () => {
    expect(formatMessage('Lesson {number}', 'fa-AF', { number: 12 })).toBe('Lesson ۱۲');
    expect(formatMessage({ one: '{count} x', other: '{count} xs' }, 'fa-AF', { count: 3 })).toBe('۳ xs');
    expect(formatNumberIn('fa-AF', 1234)).toBe('۱٬۲۳۴');
  });

  it('writes English numbers just as before', () => {
    for (const n of [0, 1, 9, 10, 24, 99, 100, 999]) expect(formatMessage('{n}', 'en', { n })).toBe(String(n));
    expect(formatMessage('{n}', 'en', { n: 0.8 })).toBe('0.8');
  });

  it('passes other params (elements) through as pieces', () => {
    const title = { type: 'span', title: 'Rivers' };
    expect(formatMessageParts('Lesson {number}: {title}.', 'en', { number: 3, title })).toEqual(['Lesson ', '3', ': ', title, '.']);
    expect(formatMessageParts('No params', 'en')).toEqual(['No params']);
  });

  it('falls back to "other" when the language needs a form the message lacks', () => {
    // Arabic has a "two" form; this message only has "one" and "other".
    expect(formatMessage(forms, 'ar', { count: 2 })).toBe('2 lessons done');
    expect(formatMessage({ ...forms, two: 'both done' }, 'ar', { count: 2 })).toBe('both done');
  });

  it('returns undefined for anything that is not a message', () => {
    expect(formatMessage(undefined, 'en')).toBeUndefined();
    expect(formatMessage(3, 'en')).toBeUndefined();
    expect(formatMessage({ home: 'Home' }, 'en')).toBeUndefined();
  });
});

describe('another language', () => {
  const fixture: LoadedLocale = {
    definition: { code: 'fa-AF', englishName: 'Dari', endonym: 'Dari', dir: 'rtl', font: 'arabic', ready: true },
    messages: { nav: { course: 'TEST course' }, pages: { course: { lessonsBadge: { one: 'TEST {count} one', other: 'TEST {count} other' } } } },
  };

  it('uses its own messages, formatted in that language', () => {
    expect(translate(fixture, 'nav.course')).toBe('TEST course');
    expect(translate(fixture, 'pages.course.lessonsBadge', { count: 5 })).toBe('TEST ۵ other');
  });

  it('falls back to English, formatted as English, for a key it lacks', () => {
    expect(translate(fixture, 'nav.home')).toBe('Home');
    expect(translate(fixture, 'lesson.number', { number: 12 })).toBe('Lesson 12');
  });

  it('English is always there', () => {
    expect(translate(ENGLISH, 'nav.course')).toBe('Course');
  });
});

describe('formatters', () => {
  it('writes dates in the language, its calendar and its digits', () => {
    const day = new Date(2026, 8, 5);
    expect(formatDateIn('en', day, { day: 'numeric', month: 'long', year: 'numeric' })).toBe('September 5, 2026');
    expect(formatDateIn('en', day.toISOString(), { day: 'numeric', month: 'short' })).toBe('Sep 5');
    expect(formatDateIn('fa-AF', day, { day: 'numeric', month: 'long', year: 'numeric' })).toMatch(/^[۰-۹]+ \S+ [۰-۹]+$/);
  });

  it('joins lists in the language', () => {
    expect(formatListIn('en', ['Amina', 'Omar', 'Sara'])).toBe('Amina, Omar, and Sara');
    expect(formatListIn('en', ['Amina'])).toBe('Amina');
  });
});

describe('en.json copy rules (CLAUDE.md)', () => {
  const all = leaves(en);

  it('has messages', () => {
    expect(all.length).toBeGreaterThan(10);
  });

  it.each(all)('%s has no exclamation mark', (_key, value) => {
    expect(value).not.toContain('!');
  });

  it.each(all)('%s does not say "please"', (_key, value) => {
    expect(value).not.toMatch(/\bplease\b/i);
  });

  it('writes the number in plural forms as {count}, never as a digit (other languages use a form for more numbers than 1)', () => {
    const plurals = (node: unknown, prefix = ''): Array<[string, Record<string, string>]> =>
      node && typeof node === 'object'
        ? 'other' in node
          ? [[prefix, node as Record<string, string>]]
          : Object.entries(node).flatMap(([k, v]) => plurals(v, prefix ? `${prefix}.${k}` : k))
        : [];
    for (const [key, forms] of plurals(en)) {
      for (const [form, text] of Object.entries(forms)) expect(text, `${key}.${form}`).not.toMatch(/(^|\s)1(\s|$)/);
    }
  });

  it.each(all)('%s is not empty and has no stray spaces', (_key, value) => {
    expect(value.trim()).toBe(value);
    expect(value.length).toBeGreaterThan(0);
  });
});

describe('keys used in the source', () => {
  const sources = import.meta.glob<string>('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true });
  // t('key'), t("key") and t(`key`) without ${...}; also i18n helpers like translate(locale, 'key').
  const callPattern = /\bt\(\s*(['"`])([\w.]+)\1/g;
  const translatePattern = /\btranslate\(\s*[^,]+,\s*(['"`])([\w.]+)\1/g;

  const used: Array<[string, string]> = [];
  for (const [file, text] of Object.entries(sources)) {
    if (file.endsWith('.test.tsx')) continue;
    for (const pattern of [callPattern, translatePattern]) {
      for (const match of text.matchAll(pattern)) used.push([file, match[2]!]);
    }
  }

  it('finds t() calls to check', () => {
    expect(used.length).toBeGreaterThan(10);
  });

  it.each(used)('%s uses %s, which is in en.json', (_file, key) => {
    expect(hasKey(key)).toBe(true);
  });

  it('every template-literal key has a matching group in en.json', () => {
    // t(`stages.${step}`): the static prefix must be a group of messages.
    const templatePattern = /\bt\(\s*`([\w.]+)\.\$\{/g;
    for (const text of Object.values(sources)) {
      for (const match of text.matchAll(templatePattern)) {
        const group = match[1]!.split('.').reduce<unknown>(
          (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
          en,
        );
        expect(group, match[0]).toBeTypeOf('object');
      }
    }
  });
});
