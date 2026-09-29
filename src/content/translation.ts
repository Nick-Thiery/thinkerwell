/**
 * Translated content: which parts of a content file are translated, and how
 * a translation file is laid over the English one. Pure, with no imports,
 * so the build (vite.config.ts, through ./load.ts), the tests and the app
 * all use it.
 *
 * A translation file (content/<lang>/lessons/L01.json, content/<lang>/course.json,
 * content/<lang>/quizzes/history.json)
 * has the same shape as the English file but holds only the text learners
 * read (and teachers: their notes and the sources' titles). Everything else
 * (ids, numbers, correct flags, video ids, links, notes for the team) comes
 * from the English file, so a translation can never change which answer is
 * right or which video plays.
 *
 * - Objects: every key in the translation must exist in the English object.
 * - Arrays: the same length as the English array, merged item by item. The
 *   one exception is a glossary entry's `forms`, which is replaced whole
 *   (other languages have other word forms): it may be added where the
 *   English entry has none, and is dropped when the translation leaves it
 *   out, so English forms never mark translated text.
 * - Strings replace the English string. Only strings may be translated.
 *
 * scripts/i18n/translatable.py applies the same rules for the content
 * checker and the review spreadsheet; keep the two in step.
 */

type Path = ReadonlyArray<string | number>;

/** Keys that are never translated, wherever they appear. */
const FIXED_KEYS = new Set([
  'id',
  'oldId',
  'type',
  'color',
  'correct',
  'optional',
  'required',
  'fictional',
  'youtubeId',
  'src',
  'url',
  'schemaVersion',
  'number',
  'lessons',
  'totalLessons',
  'estimatedHours',
  'durationSeconds',
  'estimatedMinutes',
  // Section checks: which lesson a question is from, and the skill it tests.
  'skill',
  'lesson',
  // A glossary word's one-line meanings in learners' languages (for English lessons).
  'translations',
]);

/**
 * Whole branches that stay in English: notes for the team, and the video's
 * own title and channel (the video itself stays in English).
 */
const FIXED_PATHS: ReadonlyArray<Path> = [
  ['section'],
  ['changes'],
  ['watch', 'title'],
  ['watch', 'channel'],
  ['watch', 'replacementSuggestion'],
  ['visual', 'description'],
];

/** Arrays replaced whole rather than item by item. */
const WHOLE_LIST_KEYS = new Set(['forms']);

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function pathString(path: Path): string {
  return path.join('.');
}

function isFixed(path: Path): boolean {
  const last = path[path.length - 1];
  if (typeof last === 'string' && FIXED_KEYS.has(last)) return true;
  return FIXED_PATHS.some((fixed) => fixed.every((part, i) => path[i] === part));
}

function isWholeList(path: Path): boolean {
  const last = path[path.length - 1];
  return typeof last === 'string' && WHOLE_LIST_KEYS.has(last);
}

/** Every place a translation must cover, with the English text there. */
export function translatableStrings(english: unknown, path: Path = []): Array<{ path: Path; english: string | string[] }> {
  if (isFixed(path)) return [];
  if (typeof english === 'string') return [{ path, english }];
  if (Array.isArray(english)) {
    if (isWholeList(path)) return [{ path, english: english.map(String) }];
    return english.flatMap((item, i) => translatableStrings(item, [...path, i]));
  }
  if (isObject(english)) {
    return Object.entries(english).flatMap(([key, value]) => translatableStrings(value, [...path, key]));
  }
  return [];
}

function valueAt(data: unknown, path: Path): unknown {
  let node: unknown = data;
  for (const part of path) {
    if (Array.isArray(node) && typeof part === 'number') node = node[part];
    else if (isObject(node) && typeof part === 'string') node = node[part];
    else return undefined;
  }
  return node;
}

/** Structural problems with a translation file, as "path: problem" lines. */
export function translationProblems(english: unknown, translation: unknown, path: Path = []): string[] {
  const where = pathString(path) || '(root)';
  if (isObject(translation)) {
    if (!isObject(english)) return [`${where}: should not be an object`];
    return Object.entries(translation).flatMap(([key, value]) => {
      const sub = [...path, key];
      if (!(key in english) && !WHOLE_LIST_KEYS.has(key)) return [`${pathString(sub)}: not in the English file`];
      if (isFixed(sub)) return [`${pathString(sub)}: is not translated (it comes from the English file)`];
      return translationProblems(english[key] ?? [], value, sub);
    });
  }
  if (Array.isArray(translation)) {
    if (!Array.isArray(english)) return [`${where}: should not be a list`];
    if (isWholeList(path)) {
      return translation.every((v) => typeof v === 'string' && v.trim() !== '')
        ? []
        : [`${where}: every form must be a non-empty string`];
    }
    if (translation.length !== english.length) {
      return [`${where}: has ${translation.length} items, English has ${english.length}`];
    }
    return translation.flatMap((item, i) => translationProblems(english[i], item, [...path, i]));
  }
  if (typeof translation === 'string') {
    if (typeof english !== 'string') return [`${where}: English has no text here`];
    return translation.trim() === '' ? [`${where}: empty`] : [];
  }
  if (translation !== null && translation !== undefined) return [`${where}: only text can be translated`];
  return [];
}

/** Translatable places the translation doesn't cover (`forms` may be left out). */
export function missingTranslations(english: unknown, translation: unknown): string[] {
  return translatableStrings(english)
    .filter(({ path }) => !isWholeList(path))
    .filter(({ path }) => {
      const value = valueAt(translation, path);
      return typeof value !== 'string' || value.trim() === '';
    })
    .map(({ path }) => pathString(path));
}

/** The English content with the translation laid over it. Neither input is changed. */
export function applyTranslation<T>(english: T, translation: unknown): T {
  return merge(english as Json, translation) as T;
}

function merge(english: Json, translation: unknown): Json {
  if (translation === undefined || translation === null) return english;
  if (isObject(english) && isObject(translation)) {
    const out: { [key: string]: Json } = {};
    for (const [key, value] of Object.entries(english)) {
      if (WHOLE_LIST_KEYS.has(key) && Object.keys(translation).length > 0 && !(key in translation)) continue;
      out[key] = key in translation ? merge(value, translation[key]) : value;
    }
    for (const key of WHOLE_LIST_KEYS) {
      if (key in translation && !(key in english)) out[key] = translation[key] as Json;
    }
    return out;
  }
  if (Array.isArray(english) && Array.isArray(translation)) {
    if (translation.length !== english.length) return translation as Json;
    return english.map((item, i) => merge(item, translation[i]));
  }
  if (typeof english === 'string' && typeof translation === 'string') return translation;
  return english;
}
