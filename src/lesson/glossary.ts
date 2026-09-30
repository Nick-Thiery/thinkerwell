/**
 * Glossary marking for reading sections (CLAUDE.md: "Each glossary word is
 * marked on its first appearance in each section, in both the standard and
 * simpler text").
 *
 * markGlossary() splits one piece of text (one reading section, in one
 * version) into plain runs and glossary terms. A term matches the entry's
 * `word` or any of its `forms`, case-insensitively and as a whole word only
 * ("risk" matches "Risks" through its forms, never the "risk" inside
 * "brisk"). Only the first appearance of each entry is marked; later
 * appearances stay plain text. Call it once per section and version.
 *
 * `lang` is the language of the lesson text, used for case-insensitive
 * matching (Turkish-style dotted and dotless i, for example, fold
 * differently by language). Callers pass the lessons' language
 * (useI18n().contentLocale.code): English, or Indonesian for a learner whose
 * lessons are translated.
 */
import type { GlossaryEntry } from '../content';

/** The language of the English lesson files, when no language is given. */
export const CONTENT_LANG = 'en';

export type GlossarySegment =
  | { kind: 'text'; text: string }
  | {
      kind: 'term';
      /** The words exactly as written in the text ("Floods"). */
      text: string;
      entry: GlossaryEntry;
      /** The entry's index in lesson.read.glossary. */
      entryIndex: number;
    };

/** Every spelling that counts as this entry: the word, then its forms. */
export function glossaryForms(entry: GlossaryEntry): string[] {
  return [entry.word, ...(entry.forms ?? [])].map((form) => form.trim()).filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Letters (any script), combining marks and digits are "word" characters;
// anything else (space, punctuation, hyphen, apostrophe) is a boundary.
const WORD_CHAR = '[\\p{L}\\p{M}\\p{N}]';

/**
 * One regex matching every form of every entry as a whole word, longest
 * forms first so "flooding" wins over "flood" at the same position.
 */
function buildMatcher(
  glossary: readonly GlossaryEntry[],
  lang: string,
): { regex: RegExp; byForm: Map<string, number> } | null {
  const byForm = new Map<string, number>();
  glossary.forEach((entry, entryIndex) => {
    for (const form of glossaryForms(entry)) {
      const key = form.toLocaleLowerCase(lang);
      // If two entries share a spelling, the first entry keeps it.
      if (!byForm.has(key)) byForm.set(key, entryIndex);
    }
  });
  if (byForm.size === 0) return null;
  const alternatives = [...byForm.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const regex = new RegExp(`(?<!${WORD_CHAR})(?:${alternatives.join('|')})(?!${WORD_CHAR})`, 'giu');
  return { regex, byForm };
}

/** Splits `text` into plain runs and first-appearance glossary terms. */
export function markGlossary(text: string, glossary: readonly GlossaryEntry[], lang = CONTENT_LANG): GlossarySegment[] {
  const matcher = buildMatcher(glossary, lang);
  if (!matcher || !text) return text ? [{ kind: 'text', text }] : [];

  const segments: GlossarySegment[] = [];
  const marked = new Set<number>();
  let plainStart = 0;

  for (const match of text.matchAll(matcher.regex)) {
    const entryIndex = matcher.byForm.get(match[0].toLocaleLowerCase(lang));
    if (entryIndex === undefined || marked.has(entryIndex)) continue;
    const start = match.index;
    if (start > plainStart) segments.push({ kind: 'text', text: text.slice(plainStart, start) });
    segments.push({ kind: 'term', text: match[0], entry: glossary[entryIndex]!, entryIndex });
    marked.add(entryIndex);
    plainStart = start + match[0].length;
  }
  if (plainStart < text.length) segments.push({ kind: 'text', text: text.slice(plainStart) });
  return segments;
}

/** The indexes (in lesson.read.glossary) of every entry that appears in `text`. */
export function glossaryEntriesIn(text: string, glossary: readonly GlossaryEntry[], lang = CONTENT_LANG): number[] {
  return markGlossary(text, glossary, lang).flatMap((segment) => (segment.kind === 'term' ? [segment.entryIndex] : []));
}
