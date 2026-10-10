// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { findLocale, type LocaleDefinition } from '../../src/i18n/locales.ts';
import {
  checkMessages,
  CSV_COLUMNS,
  exampleCounts,
  exportRows,
  flatten,
  importRows,
  placeholderProblems,
  pluralCategories,
  readCsv,
  readEnglish,
  readNotes,
  translatableLocale,
  translatedCodes,
  unflatten,
  writeCsv,
} from './catalog.ts';

// Fixtures stand in for translations: no real Dari, Arabic or Somali here.
const arabic = findLocale('ar') as LocaleDefinition;
const somali = findLocale('so') as LocaleDefinition;
const english = flatten({
  nav: { course: 'Course', home: 'Home' },
  lesson: { number: 'Lesson {number}', minutes: 'About {min}–{max} min' },
  badge: { one: '{count} lesson', other: '{count} lessons' },
  done: { one: 'You have finished 1 lesson.', other: 'You have finished {count} lessons.' },
});

describe('the real message files', () => {
  it('has a note only for keys that exist', () => {
    const keys = readEnglish();
    for (const key of Object.keys(readNotes())) expect(keys.has(key), key).toBe(true);
  });

  it('has the Indonesian translation, and the Vietnamese preview', () => {
    expect(translatedCodes()).toEqual(['id', 'vi']);
  });
});

describe('placeholders', () => {
  it('must match the English', () => {
    expect(placeholderProblems('Lesson {number}', 'X {number}')).toEqual([]);
    expect(placeholderProblems('Lesson {number}', 'X {numero}')).toEqual(["has {numero}, which the English doesn't", 'is missing {number}']);
    expect(placeholderProblems('About {min}–{max} min', 'X {max} Y {min}')).toEqual([]);
    expect(placeholderProblems('About {min}–{max} min', 'X {min}')).toEqual(['is missing {max}']);
  });

  it('may leave out {count} in a plural form other than "other"', () => {
    expect(placeholderProblems({ one: '{count} lesson', other: '{count} lessons' }, 'one lesson', 'one')).toEqual([]);
    expect(placeholderProblems({ one: '{count} lesson', other: '{count} lessons' }, 'lessons', 'other')).toEqual(['is missing {count}']);
    // {count} may appear in a form even when the English form doesn't have it.
    expect(placeholderProblems({ one: 'You have finished 1 lesson.', other: 'You have finished {count} lessons.' }, '{count} X', 'one')).toEqual([]);
  });
});

describe('plural forms', () => {
  it("are the language's own", () => {
    expect(pluralCategories(arabic)).toEqual(['zero', 'one', 'two', 'few', 'many', 'other']);
    expect(pluralCategories(somali)).toEqual(['one', 'other']);
    expect(exampleCounts(arabic, 'few', 4)).toEqual([3, 4, 5, 6]);
    expect(exampleCounts(arabic, 'two')).toEqual([2]);
  });
});

describe('the spreadsheet', () => {
  it('survives a round trip, commas, quotes, line breaks and every script included', () => {
    const rows = [
      ['key', 'English', 'x'],
      ['a', 'One, two', 'She said "hi"'],
      ['b', 'Line one\nline two', 'دری Soomaali ۱۲'],
    ];
    const text = writeCsv(rows);
    expect(text.startsWith('\uFEFF')).toBe(true);
    expect(text).toContain('"One, two"');
    expect(text).toContain('"She said ""hi"""');
    expect(readCsv(text)).toEqual(rows);
    // As a spreadsheet saves it: no BOM, bare line ends, a blank last line.
    expect(readCsv('key,English\na,b\n\n')).toEqual([
      ['key', 'English'],
      ['a', 'b'],
    ]);
  });

  it('has a row per message, and one per plural form the language has, with notes', () => {
    const rows = exportRows(arabic, english, { 'nav.course': 'The course page.' }, flatten({ nav: { course: 'FIXTURE' } }));
    expect(rows[0]).toEqual([...CSV_COLUMNS]);
    const keys = rows.slice(1).map((row) => row[0]);
    expect(keys).toEqual([
      'nav.course',
      'nav.home',
      'lesson.number',
      'lesson.minutes',
      ...['zero', 'one', 'two', 'few', 'many', 'other'].map((form) => `badge.${form}`),
      ...['zero', 'one', 'two', 'few', 'many', 'other'].map((form) => `done.${form}`),
    ]);
    const course = rows[1]!;
    expect(course.slice(0, 2)).toEqual(['nav.course', 'Course']);
    expect(course[2]).toMatch(/^The course page\. Short label: keep it about as short as the English \(6 letters and spaces\)\.$/);
    expect(course.slice(3)).toEqual(['FIXTURE', '']);
    const minutes = rows.find((row) => row[0] === 'lesson.minutes')!;
    expect(minutes[2]).toContain('Keep {max} {min} exactly as written');
    const few = rows.find((row) => row[0] === 'badge.few')!;
    expect(few[1]).toBe('{count} lessons');
    expect(few[2]).toContain('Plural form "few": used when the number is 3, 4, 5, 6, 7, 8 and so on.');
    expect(few[2]).toContain('English has no "few" form');
    expect(rows.find((row) => row[0] === 'badge.one')![1]).toBe('{count} lesson');
  });

  it('reads back the new translations, or the current ones, and builds the message file', () => {
    const rows = [
      [...CSV_COLUMNS],
      ['nav.course', 'Course', '', 'OLD', 'NEW'],
      ['nav.home', 'Home', '', 'KEPT', ''],
      ['lesson.number', 'Lesson {number}', '', '', ''],
      ['badge.one', '{count} lesson', '', '', 'ONE'],
      ['badge.other', '{count} lessons', '', '', '{count} OTHER'],
    ];
    const result = importRows(somali, english, rows);
    expect(result.refused).toEqual([]);
    expect(result.imported).toBe(4);
    const tree = unflatten(result.messages, [...english.keys()]);
    expect(tree).toEqual({ nav: { course: 'NEW', home: 'KEPT' }, badge: { one: 'ONE', other: '{count} OTHER' } });
    expect(checkMessages('so', tree, english)).toEqual({ code: 'so', errors: [], missing: ['lesson.number', 'lesson.minutes', 'done'], translated: 3 });
  });

  it('refuses rows whose placeholders do not match, unknown keys and forms the language lacks', () => {
    const rows = [
      [...CSV_COLUMNS],
      ['lesson.number', 'Lesson {number}', '', '', 'Casharka {lambar}'],
      ['lesson.minutes', 'About {min}–{max} min', '', '', 'X {min}'],
      ['nav.gone', 'Gone', '', '', 'X'],
      ['badge.few', '{count} lessons', '', '', 'X'],
      ['badge', '{count} lessons', '', '', 'X'],
      ['nav.home', 'Home', '', '', 'OK'],
    ];
    const result = importRows(somali, english, rows);
    expect(result.imported).toBe(1);
    expect(result.messages).toEqual(new Map([['nav.home', 'OK']]));
    expect(result.refused).toEqual([
      "Row 2 (lesson.number): has {lambar}, which the English doesn't; is missing {number}. Keep the {placeholders} as in the English.",
      'Row 3 (lesson.minutes): is missing {max}. Keep the {placeholders} as in the English.',
      'Row 4 (nav.gone): no such key in en.json.',
      'Row 5 (badge.few): Somali has no plural form "few".',
      'Row 6 (badge): this message has plural forms; use the rows badge.one, badge.other.',
    ]);
  });

  it('refuses a spreadsheet without the column names', () => {
    expect(importRows(somali, english, [['a', 'b']]).refused).toEqual([`The first row must be the column names: ${CSV_COLUMNS.join(', ')}.`]);
  });
});

describe('the check', () => {
  it('fails on unknown keys, placeholder mismatches, broken plurals, empty text and exclamation marks', () => {
    const report = checkMessages(
      'ar',
      {
        nav: { course: 'X!', gone: 'X', home: ' ' },
        lesson: { number: 'X {num}', minutes: { one: 'X', other: 'Y' } },
        badge: { one: '{count} X', other: '{count} Y', plural: 'Z' },
        done: 'X',
      },
      english,
    );
    expect(report.errors).toEqual([
      'ar.json: nav.course: has an exclamation mark (docs/TRANSLATING.md: none)',
      'ar.json: nav.gone: not in en.json (a key that was renamed or removed)',
      'ar.json: nav.home: empty',
      "ar.json: lesson.number: has {num}, which the English doesn't",
      'ar.json: lesson.number: is missing {number}',
      'ar.json: lesson.minutes: should be text, like the English',
      'ar.json: badge: Arabic has no plural form plural (it has zero, one, two, few, many, other)',
      'ar.json: badge: missing plural form zero, two, few, many',
      'ar.json: done: should have plural forms (zero, one, two, few, many, other), like the English',
    ]);
  });

  it("wants every form the language has, and no other", () => {
    const report = checkMessages('ar', { badge: { one: 'X', other: '{count} Y' }, done: { one: 'X', few: '{count} Y', other: '{count} Z' } }, english);
    expect(report.errors).toEqual(['ar.json: badge: missing plural form zero, two, few, many', 'ar.json: done: missing plural form zero, two, many']);
    const somaliReport = checkMessages('so', { badge: { one: 'X', few: 'Y', other: '{count} Z' } }, english);
    expect(somaliReport.errors).toEqual(['so.json: badge: Somali has no plural form few (it has one, other)']);
  });

  it('refuses a file for a language that is not listed', () => {
    expect(checkMessages('de', {}, english).errors[0]).toMatch(/"de" is not a language in src\/i18n\/locales\.ts/);
    expect(checkMessages('fa-af', {}, english).errors[0]).toMatch(/case-sensitive/);
  });

  it('counts what is still missing without failing', () => {
    const report = checkMessages('so', { nav: { course: 'X' } }, english);
    expect(report.errors).toEqual([]);
    expect(report.translated).toBe(1);
    expect(report.missing).toEqual(['nav.home', 'lesson.number', 'lesson.minutes', 'badge', 'done']);
  });
});

describe('translatableLocale', () => {
  it('takes a listed language other than English', () => {
    expect(translatableLocale('fa-af').code).toBe('fa-AF');
    expect(() => translatableLocale('en')).toThrow(/Give a language code: fa-AF \(Dari\), ar \(Arabic\), so \(Somali\)/);
    expect(() => translatableLocale('en-XA')).toThrow();
    expect(() => translatableLocale(undefined)).toThrow();
  });
});
