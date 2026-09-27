/**
 * Adding a sentence starter to the learner's writing (docs/design-system/
 * components/Chip.md): the starter goes in at the caret and never replaces
 * text the learner already wrote.
 *
 * - With a selection, the starter goes in just after it (the selected text stays).
 * - A space is added before the starter when the text before it doesn't end
 *   in whitespace, and after it when the text after it doesn't start with one.
 * - A starter ending in "..." (docs/content/SPEC.md: "ending in '...' or a
 *   blank '___'") is inserted without the dots and with a trailing space, so
 *   the learner carries on typing straight after it: "One reason is |".
 * - A starter with a blank "___" is inserted as written, and the first blank
 *   is selected, so typing fills it in: "I would build the new town at the [___] site."
 */

export interface StarterInsertion {
  /** The whole text after the insertion. */
  text: string;
  /** What to select afterwards (equal numbers put the caret there). */
  selectionStart: number;
  selectionEnd: number;
}

const BLANK = '___';
const TRAILING_DOTS = /\s*(?:\.{3}|…)\s*$/;

/** The text a starter chip adds: its words without trailing dots (then a space), or as written when it has a blank. */
export function starterText(starter: string): string {
  const trimmed = starter.trim();
  if (trimmed.includes(BLANK)) return trimmed;
  if (TRAILING_DOTS.test(trimmed)) return `${trimmed.replace(TRAILING_DOTS, '')} `;
  return trimmed;
}

/**
 * Inserts `starter` into `text` at the caret (`at`, the end of the learner's
 * selection), or at the end when `at` is null (the box was never focused).
 */
export function insertStarter(text: string, starter: string, at: number | null): StarterInsertion {
  const position = at === null ? text.length : Math.max(0, Math.min(at, text.length));
  const before = text.slice(0, position);
  const after = text.slice(position);
  const words = starterText(starter);

  const lead = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
  const trail = after.length > 0 && !/^\s/.test(after) && !/\s$/.test(words) ? ' ' : '';
  const start = before.length + lead.length;
  const next = `${before}${lead}${words}${trail}${after}`;

  const blank = words.indexOf(BLANK);
  if (blank >= 0) {
    return { text: next, selectionStart: start + blank, selectionEnd: start + blank + BLANK.length };
  }
  const end = start + words.length;
  return { text: next, selectionStart: end, selectionEnd: end };
}
