/**
 * A glossary word's short meaning in the learner's own language, when the
 * lesson file has one (content schema: glossary[].translations). The lesson
 * stays English; this only helps with one word. English learners, and
 * languages the entry has no meaning for, get nothing.
 */
import type { GlossaryEntry } from '../content';
import type { Direction, LocaleDefinition } from '../i18n';

export interface GlossaryMeaning {
  text: string;
  /** The language's code, for lang on the meaning. */
  lang: string;
  dir: Direction;
  /** The language's own name, as the meaning's label. */
  languageName: string;
}

export function glossaryMeaning(entry: GlossaryEntry, locale: LocaleDefinition): GlossaryMeaning | undefined {
  if (locale.pseudo) return undefined;
  const text = entry.translations?.[locale.code];
  if (!text) return undefined;
  return { text, lang: locale.code, dir: locale.dir, languageName: locale.endonym };
}
