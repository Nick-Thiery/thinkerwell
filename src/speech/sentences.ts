/**
 * What Listen reads, worked out from a reading section's text: its
 * paragraphs, its sentences (as character ranges in the text, so the one
 * being read can be highlighted) and the pieces Listen says, heading first
 * (docs/notes/listen-voices.md).
 *
 * Pure, with type imports only, so the app, the tests and the recorded-audio
 * tools (tools/audio/, which run in Node) split the text the same way: the
 * recordings (docs/notes/recorded-audio.md) are cut at exactly the sentences
 * the Read stage highlights. Changing anything here changes what Listen
 * reads, so `npm run check:audio` will ask for the recordings to be made again.
 */
import type { ReadSection } from '../content/schema';

/** A piece to read aloud, with an optional silence after it. */
export interface ListenPiece {
  text: string;
  pauseAfterMs?: number;
}

/** A piece to read: its text, or the text with a pause after it. */
export type ListenItem = string | ListenPiece;

/** A range of characters in a section's text: `start` inclusive, `end` exclusive. */
export interface TextRange {
  start: number;
  end: number;
}

/** The text of a section in the version on screen. Listen reads the same string. */
export function visibleSectionText(section: Pick<ReadSection, 'text' | 'simpler'>, level: 'standard' | 'simpler'): string {
  return level === 'simpler' ? section.simpler : section.text;
}

/** Paragraph ranges in `text`: split on blank lines, with surrounding space trimmed off. */
export function paragraphRanges(text: string): TextRange[] {
  const ranges: TextRange[] = [];
  const breaks = /\n\s*\n/g;
  let from = 0;
  const push = (start: number, end: number) => {
    let s = start;
    let e = end;
    while (s < e && /\s/.test(text[s]!)) s++;
    while (e > s && /\s/.test(text[e - 1]!)) e--;
    if (e > s) ranges.push({ start: s, end: e });
  };
  for (const match of text.matchAll(breaks)) {
    push(from, match.index);
    from = match.index + match[0].length;
  }
  push(from, text.length);
  return ranges;
}

/** Sentence ranges within one paragraph's text (relative to it), before trimming. */
function splitSentences(text: string): TextRange[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    return Array.from(segmenter.segment(text), (s) => ({ start: s.index, end: s.index + s.segment.length }));
  }
  // Browsers without Intl.Segmenter: break after . ! or ? (and any closing
  // quote or bracket) when a capital letter, digit or quote comes next.
  const ranges: TextRange[] = [];
  const breaks = /[.!?]+["'”’)\]]*\s+(?=["'“‘(]?[A-Z0-9])/g;
  let from = 0;
  for (const match of text.matchAll(breaks)) {
    const end = match.index + match[0].length;
    ranges.push({ start: from, end });
    from = end;
  }
  ranges.push({ start: from, end: text.length });
  return ranges;
}

/**
 * Short words with a full stop that don't end a sentence: titles before a
 * name ("Dr. Ahmed", "Bpk. Budi") and "e.g." before a capital. The sentence
 * splitter (Intl.Segmenter, like the fallback) breaks after them, which
 * would read "Dr." as a sentence of its own and highlight it alone. None is
 * in the lessons today; this keeps a future one whole. "etc." is left out:
 * it usually does end a sentence.
 */
const NOT_A_SENTENCE_END =
  /(?:^|[\s("“‘])(?:Mr|Mrs|Ms|Dr|Prof|St|Mt|Sr|Jr|Capt|Gen|Rev|Bpk|Sdr|Sdri|Ir|Hj|vs|approx|[Ee]\.g|[Ii]\.e)\.["'”’)\]]*\s*$/;
/** "No." ends a sentence, unless a number follows ("No. 5"). */
const NUMBER_SIGN = /(?:^|\s)No\.\s*$/;

/** Joins a piece that ends with one of those to the piece after it. */
function joinAbbreviations(text: string, pieces: TextRange[]): TextRange[] {
  const out: TextRange[] = [];
  for (const piece of pieces) {
    const last = out[out.length - 1];
    if (last) {
      const before = text.slice(last.start, last.end);
      const after = text.slice(piece.start, piece.end);
      if (NOT_A_SENTENCE_END.test(before) || (NUMBER_SIGN.test(before) && /^\s*\d/.test(after))) {
        last.end = piece.end;
        continue;
      }
    }
    out.push({ ...piece });
  }
  return out;
}

/**
 * The sentences of a section's text (the version on screen), in order, as
 * ranges in that text with surrounding space trimmed. A sentence never
 * crosses a paragraph break.
 */
export function sentenceRanges(text: string): TextRange[] {
  const out: TextRange[] = [];
  for (const paragraph of paragraphRanges(text)) {
    const inside = text.slice(paragraph.start, paragraph.end);
    for (const piece of joinAbbreviations(inside, splitSentences(inside))) {
      let start = piece.start;
      let end = piece.end;
      while (start < end && /\s/.test(inside[start]!)) start++;
      while (end > start && /\s/.test(inside[end - 1]!)) end--;
      if (end > start) out.push({ start: paragraph.start + start, end: paragraph.start + end });
    }
  }
  return out;
}

/** The silence after a part's heading, before its first sentence. */
export const HEADING_PAUSE_MS = 400;

/** Letters and digits only, in lower case: "Each source answers different questions." → "each source answers different questions". */
function wordsOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * What Listen says for one part: the heading, then each sentence of `text`
 * at `sentences` (so piece n + 1 is sentence n, the one highlighted).
 *
 * - The heading gets a full stop when it has no mark of its own, so voices
 *   say it as a finished phrase, and a short silence after it, so it is
 *   heard as a heading and not run into the first sentence.
 * - When the first sentence says the same words as the heading (some
 *   simpler texts open that way), the heading is an empty piece, which
 *   Listen skips: nothing is read twice.
 */
export function listenPieces(heading: string, text: string, sentences: readonly TextRange[]): ListenItem[] {
  const said = sentences.map((range) => text.slice(range.start, range.end));
  const title = heading.trim();
  const first = said[0];
  const repeated = first !== undefined && wordsOf(first) === wordsOf(title);
  const spoken = !title || repeated ? '' : /[.!?…:;]$/.test(title) ? title : `${title}.`;
  return [{ text: spoken, pauseAfterMs: spoken ? HEADING_PAUSE_MS : 0 }, ...said];
}
