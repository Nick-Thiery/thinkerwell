/**
 * Putting dictated words into a writing box (Say it). Like sentence
 * starters (src/pages/lesson/write/insertStarter.ts), the words go in at
 * the learner's caret and never replace what they wrote. They stay plain,
 * editable text: a draft the learner can fix.
 *
 * - With a selection, the words go in just after it (the selected text stays).
 * - A space is added before the words when the text before them doesn't end
 *   in whitespace, and after them when the text after them doesn't start
 *   with whitespace or punctuation.
 * - At the start of the box or of a new sentence, the first letter is made
 *   a capital.
 */

/** The text either side of where dictated words go. */
export interface DictationAnchor {
  before: string;
  after: string;
}

/** Splits `text` at the caret, or at the end when the caret is unknown (the box was never focused). */
export function dictationAnchor(text: string, caret: number | null): DictationAnchor {
  const at = caret === null ? text.length : Math.max(0, Math.min(caret, text.length));
  return { before: text.slice(0, at), after: text.slice(at) };
}

/** Recognised pieces joined into one run of words, with spaces tidied. */
export function joinTranscript(pieces: readonly string[]): string {
  return pieces.join(' ').replace(/\s+/g, ' ').trim();
}

const SENTENCE_END = /[.!?]["'”’)\]]*\s*$/;

/** The box's text with `words` in place, and where the caret goes (just after them). */
export function composeDictation(anchor: DictationAnchor, words: string): { text: string; caret: number } {
  const { before, after } = anchor;
  const clean = words.replace(/\s+/g, ' ').trim();
  if (!clean) return { text: before + after, caret: before.length };

  const startsSentence = before.trim() === '' || SENTENCE_END.test(before);
  const inserted = startsSentence ? clean.charAt(0).toLocaleUpperCase('en') + clean.slice(1) : clean;
  const lead = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
  const trail = after.length > 0 && !/^[\s.,!?;:)\]”’]/.test(after) ? ' ' : '';
  const text = `${before}${lead}${inserted}${trail}${after}`;
  return { text, caret: before.length + lead.length + inserted.length };
}
