/**
 * The translator kit's shared parts (docs/TRANSLATING.md): reading message
 * files, their {placeholders} and plural forms, the spreadsheet (CSV) the
 * helpers at the centre work in, and the checks. Used by export.ts,
 * import.ts and check.ts in this folder, and tested in catalog.test.ts.
 * Plain Node, no dependencies.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { findLocale, formatLocale, LOCALES, SOURCE_LOCALE, type LocaleDefinition } from '../../src/i18n/locales.ts';

export const MESSAGES_DIR = path.join(import.meta.dirname, '..', '..', 'src', 'i18n', 'messages');

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>;
export type Message = string | PluralForms;
export interface MessageTree {
  [key: string]: string | MessageTree;
}

const CATEGORIES: readonly Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

/**
 * An object meant as plural forms: all text, and at least one key a CLDR
 * category name ("one", "other" ...). Whether it is a usable one is for
 * isPlural and the check to say.
 */
function looksPlural(value: unknown): value is PluralForms {
  if (!value || typeof value !== 'object') return false;
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.every(([, form]) => typeof form === 'string') &&
    entries.some(([key]) => (CATEGORIES as readonly string[]).includes(key))
  );
}

/** A usable plural message: only plural forms, one of them "other". */
export function isPlural(value: unknown): value is PluralForms {
  return (
    looksPlural(value) &&
    typeof (value as { other?: unknown }).other === 'string' &&
    Object.keys(value).every((key) => (CATEGORIES as readonly string[]).includes(key))
  );
}

/** Every message in a file, by dotted key, in the file's order. */
export function flatten(tree: unknown, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (!tree || typeof tree !== 'object') return out;
  for (const [key, value] of Object.entries(tree)) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' || looksPlural(value) || !value || typeof value !== 'object') out.set(dotted, value);
    else for (const [inner, message] of flatten(value, dotted)) out.set(inner, message);
  }
  return out;
}

/** A message file from dotted keys, its groups in the order of `order` (en.json's). */
export function unflatten(messages: ReadonlyMap<string, Message>, order: readonly string[]): MessageTree {
  const tree: MessageTree = {};
  const keys = [...messages.keys()].sort((a, b) => indexOf(order, a) - indexOf(order, b));
  for (const key of keys) {
    const parts = key.split('.');
    let node = tree;
    for (const part of parts.slice(0, -1)) {
      if (typeof node[part] !== 'object') node[part] = {};
      node = node[part];
    }
    node[parts[parts.length - 1]!] = messages.get(key) as string | MessageTree;
  }
  return tree;
}

function indexOf(order: readonly string[], key: string): number {
  const index = order.indexOf(key);
  return index === -1 ? order.length : index;
}

/** The {placeholders} in a text, each once, sorted. */
export function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!))].sort();
}

/** Every placeholder in a message, across its plural forms. */
export function messagePlaceholders(message: Message): string[] {
  return typeof message === 'string' ? placeholders(message) : [...new Set(Object.values(message).flatMap((form) => placeholders(form)))].sort();
}

/** The plural categories a language uses, in CLDR's order ("one", "other"; Arabic has all six). */
export function pluralCategories(locale: LocaleDefinition): Intl.LDMLPluralRule[] {
  const used = new Intl.PluralRules(formatLocale(locale)).resolvedOptions().pluralCategories;
  return CATEGORIES.filter((category) => used.includes(category));
}

/** Some whole numbers that take a plural category in a language, for the translator's note ("3, 4, 5 …"). */
export function exampleCounts(locale: LocaleDefinition, category: Intl.LDMLPluralRule, limit = 6): number[] {
  const rules = new Intl.PluralRules(formatLocale(locale));
  const found: number[] = [];
  for (let n = 0; n <= 1000 && found.length < limit; n++) if (rules.select(n) === category) found.push(n);
  return found;
}

/**
 * What's wrong with one translated text, compared with the English: a
 * placeholder the English doesn't have, or one it has that is missing.
 * In a plural form other than "other", {count} may be left out ("one
 * lesson" in words). Returns [] when it is fine.
 */
export function placeholderProblems(english: Message, text: string, category?: Intl.LDMLPluralRule): string[] {
  const wanted = messagePlaceholders(english);
  const got = placeholders(text);
  const problems: string[] = [];
  const unknown = got.filter((name) => !wanted.includes(name));
  if (unknown.length) problems.push(`has ${unknown.map((name) => `{${name}}`).join(', ')}, which the English doesn't`);
  const optional = category && category !== 'other' ? ['count'] : [];
  const missing = wanted.filter((name) => !got.includes(name) && !optional.includes(name));
  if (missing.length) problems.push(`is missing ${missing.map((name) => `{${name}}`).join(', ')}`);
  return problems;
}

export interface FileReport {
  code: string;
  errors: string[];
  missing: string[];
  translated: number;
}

/** Checks one language's messages against the English (npm run check:i18n). */
export function checkMessages(code: string, tree: unknown, english: ReadonlyMap<string, unknown>): FileReport {
  const report: FileReport = { code, errors: [], missing: [], translated: 0 };
  const locale = findLocale(code, LOCALES);
  if (!locale || locale.code !== code) {
    report.errors.push(`${code}.json: "${code}" is not a language in src/i18n/locales.ts (codes are case-sensitive: ${LOCALES.map((l) => l.code).join(', ')})`);
    return report;
  }
  if (code === SOURCE_LOCALE) return report;
  const categories = pluralCategories(locale);
  const messages = flatten(tree);
  for (const [key, value] of messages) {
    const source = english.get(key);
    const where = `${code}.json: ${key}`;
    if (source === undefined) {
      const parent = key.slice(0, key.lastIndexOf('.'));
      if (isPlural(english.get(parent))) {
        report.errors.push(`${code}.json: ${parent}: "${key.slice(parent.length + 1)}" is not a plural form (${locale.englishName} has ${categories.join(', ')})`);
      } else report.errors.push(`${where}: not in en.json (a key that was renamed or removed)`);
      continue;
    }
    if (typeof source === 'string') {
      if (typeof value !== 'string') {
        report.errors.push(`${where}: should be text, like the English`);
        continue;
      }
      report.errors.push(...textProblems(where, source, value));
    } else if (isPlural(source)) {
      if (!value || typeof value !== 'object' || typeof value === 'string') {
        report.errors.push(`${where}: should have plural forms (${categories.join(', ')}), like the English`);
        continue;
      }
      const forms = value as Record<string, unknown>;
      const unknownForms = Object.keys(forms).filter((form) => !(categories as string[]).includes(form));
      if (unknownForms.length) report.errors.push(`${where}: ${locale.englishName} has no plural form ${unknownForms.join(', ')} (it has ${categories.join(', ')})`);
      const missingForms = categories.filter((form) => typeof forms[form] !== 'string');
      if (missingForms.length) report.errors.push(`${where}: missing plural form ${missingForms.join(', ')}`);
      for (const form of categories) {
        const text = forms[form];
        if (typeof text === 'string') report.errors.push(...textProblems(`${where}.${form}`, source, text, form));
      }
    }
    report.translated++;
  }
  report.missing = [...english.keys()].filter((key) => !messages.has(key));
  return report;
}

function textProblems(where: string, english: Message, text: string, category?: Intl.LDMLPluralRule): string[] {
  const problems: string[] = [];
  if (!text.trim()) problems.push(`${where}: empty`);
  else if (text.trim() !== text) problems.push(`${where}: has spaces at the start or end`);
  if (/[!¡！]/.test(text)) problems.push(`${where}: has an exclamation mark (docs/TRANSLATING.md: none)`);
  problems.push(...placeholderProblems(english, text, category).map((problem) => `${where}: ${problem}`));
  return problems;
}

/** en.json, flattened. */
export function readEnglish(dir = MESSAGES_DIR): Map<string, unknown> {
  return flatten(JSON.parse(readFileSync(path.join(dir, 'en.json'), 'utf8')));
}

/** The translator notes (en.notes.json): note by key. */
export function readNotes(dir = MESSAGES_DIR): Record<string, string> {
  return JSON.parse(readFileSync(path.join(dir, 'en.notes.json'), 'utf8')) as Record<string, string>;
}

/** Codes of the message files other than English (fa-AF.json, ...). */
export function translatedCodes(dir = MESSAGES_DIR): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json') && name !== 'en.json' && !name.endsWith('.notes.json'))
    .map((name) => name.slice(0, -'.json'.length))
    .sort();
}

// ------------------------------------------------------------ the spreadsheet

export const CSV_COLUMNS = ['key', 'English', 'Notes for the translator', 'Current translation', 'New translation'] as const;
const BOM = '\uFEFF';

/** One CSV cell: quoted when it holds a comma, a quote or a line break (RFC 4180). */
function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** A CSV file, UTF-8 with a byte-order mark so Excel and Google Sheets read its letters right, with Windows line ends. */
export function writeCsv(rows: ReadonlyArray<readonly string[]>): string {
  return BOM + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** Reads a CSV file as spreadsheets save it (quoted cells, line breaks inside quotes, a BOM or none). */
export function readCsv(text: string): string[][] {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  if (value !== '' || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((one) => one.trim() !== ''));
}

// ------------------------------------------------------------ export and import

/** A short label: a length hint goes in its note. */
function isShort(text: string): boolean {
  return text.length <= 24 && !/[.?]$/.test(text);
}

/** What the placeholders stand for, when en.notes.json doesn't say. */
function placeholderNote(english: Message): string {
  const names = messagePlaceholders(english);
  if (names.length === 0) return '';
  return `Keep ${names.map((name) => `{${name}}`).join(' ')} exactly as written: the site puts ${names.length === 1 ? 'a value' : 'values'} there.`;
}

/** The spreadsheet for one language: one row per message, and one per plural form the language has. */
export function exportRows(
  locale: LocaleDefinition,
  english: ReadonlyMap<string, unknown>,
  notes: Readonly<Record<string, string>>,
  current: ReadonlyMap<string, unknown>,
): string[][] {
  const rows: string[][] = [[...CSV_COLUMNS]];
  const categories = pluralCategories(locale);
  for (const [key, value] of english) {
    const note = notes[key] ?? '';
    if (typeof value === 'string') {
      const hints = [
        note,
        note.includes('{') ? '' : placeholderNote(value),
        isShort(value) ? `Short label: keep it about as short as the English (${value.length} letters and spaces).` : '',
      ];
      const now = current.get(key);
      rows.push([key, value, hints.filter(Boolean).join(' '), typeof now === 'string' ? now : '', '']);
    } else if (isPlural(value)) {
      const now = current.get(key);
      for (const category of categories) {
        const englishForm = value[category] ?? value.other!;
        const examples = exampleCounts(locale, category);
        const hints = [
          note,
          `Plural form "${category}": used when the number is ${examples.join(', ')}${examples.length === 6 ? ' and so on' : ''}.`,
          value[category] ? '' : `English has no "${category}" form, so the English column shows its "other" form.`,
          note.includes('{') ? '' : placeholderNote(value),
          category === 'other' ? '' : 'In this form you may write the number in words instead of {count}.',
        ];
        const nowForm = now && typeof now === 'object' ? (now as Record<string, unknown>)[category] : undefined;
        rows.push([`${key}.${category}`, englishForm, hints.filter(Boolean).join(' '), typeof nowForm === 'string' ? nowForm : '', '']);
      }
    }
  }
  return rows;
}

export interface ImportResult {
  messages: Map<string, Message>;
  refused: string[];
  imported: number;
}

/**
 * Reads a filled-in spreadsheet: for each row, the new translation, or the
 * current one if the new one is blank. Rows whose key isn't in en.json, or
 * whose placeholders don't match the English, are refused and listed.
 */
export function importRows(locale: LocaleDefinition, english: ReadonlyMap<string, unknown>, rows: string[][]): ImportResult {
  const result: ImportResult = { messages: new Map(), refused: [], imported: 0 };
  const [header, ...body] = rows;
  const column = (name: (typeof CSV_COLUMNS)[number]) => header?.findIndex((title) => title.trim().toLowerCase() === name.toLowerCase()) ?? -1;
  const keyAt = column('key');
  const currentAt = column('Current translation');
  const newAt = column('New translation');
  if (keyAt === -1 || newAt === -1) {
    result.refused.push(`The first row must be the column names: ${CSV_COLUMNS.join(', ')}.`);
    return result;
  }
  const categories = pluralCategories(locale);
  const plurals = new Map<string, PluralForms>();
  for (const [index, cells] of body.entries()) {
    const line = index + 2;
    const rowKey = (cells[keyAt] ?? '').trim();
    const text = normalise(cells[newAt] ?? '') || normalise(currentAt === -1 ? '' : (cells[currentAt] ?? ''));
    if (!rowKey || !text) continue;
    let key = rowKey;
    let category: Intl.LDMLPluralRule | undefined;
    let source = english.get(key);
    if (source === undefined) {
      const dot = rowKey.lastIndexOf('.');
      const form = rowKey.slice(dot + 1) as Intl.LDMLPluralRule;
      if (isPlural(english.get(rowKey.slice(0, dot)))) {
        key = rowKey.slice(0, dot);
        category = form;
        source = english.get(key);
        if (!categories.includes(form)) {
          result.refused.push(`Row ${line} (${rowKey}): ${locale.englishName} has no plural form "${form}".`);
          continue;
        }
      }
    }
    if (source === undefined) {
      result.refused.push(`Row ${line} (${rowKey}): no such key in en.json.`);
      continue;
    }
    if (isPlural(source) && !category) {
      result.refused.push(`Row ${line} (${rowKey}): this message has plural forms; use the rows ${categories.map((form) => `${rowKey}.${form}`).join(', ')}.`);
      continue;
    }
    const problems = placeholderProblems(source as Message, text, category);
    if (problems.length) {
      result.refused.push(`Row ${line} (${rowKey}): ${problems.join('; ')}. Keep the {placeholders} as in the English.`);
      continue;
    }
    if (category) plurals.set(key, { ...plurals.get(key), [category]: text });
    else result.messages.set(key, text);
    result.imported++;
  }
  for (const [key, forms] of plurals) result.messages.set(key, forms);
  return result;
}

/** Spreadsheet text as a message: trimmed, with Windows and old Mac line ends made plain. */
function normalise(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim();
}

/** A language the kit can work on: listed, not English, not a test language. */
export function translatableLocale(code: string | undefined): LocaleDefinition {
  const locale = findLocale(code, LOCALES);
  if (!code || !locale || locale.code === SOURCE_LOCALE) {
    const codes = LOCALES.filter((one) => one.code !== SOURCE_LOCALE).map((one) => `${one.code} (${one.englishName})`);
    throw new Error(`Give a language code: ${codes.join(', ')}. To add a language, see docs/notes/languages.md.`);
  }
  return locale;
}
