/**
 * Turns one reading section (in the version on screen) into paragraphs of
 * plain text and glossary terms, ready to render, with an optional range
 * to highlight; and into sentences, for Listen.
 *
 * - Glossary words are marked across the WHOLE section first
 *   (markGlossary: first appearance only, whole words, any form), then the
 *   text is split into paragraphs, so each word is marked once per section
 *   however many paragraphs it has.
 * - `highlight` is a character range in the section's text (the version on
 *   screen): Listen passes the sentence being read aloud. The pieces in
 *   that range come back grouped in runs with `highlighted: true`, which
 *   the renderer wraps in <mark class="tw-speaking">. A glossary word that
 *   the range only partly covers is highlighted whole, never split.
 * - sentenceRanges() gives the sentences Listen reads, one at a time, as
 *   ranges in the same text, so the one being read can be highlighted.
 *   listenPieces() turns the heading and those sentences into what Listen
 *   says (docs/notes/listen-voices.md). Both live in src/speech/sentences.ts
 *   (re-exported here), which the recorded-audio tools use too.
 */
import type { GlossaryEntry } from '../../../content';
import { markGlossary, type GlossarySegment } from '../../../lesson';
import { paragraphRanges, type TextRange } from '../../../speech/sentences';

// The sentences Listen reads live with the speech code, so the recorded-audio tools split the text the same way.
export {
  HEADING_PAUSE_MS,
  listenPieces,
  paragraphRanges,
  sentenceRanges,
  visibleSectionText,
  type TextRange,
} from '../../../speech/sentences';

export interface ReadingRun {
  highlighted: boolean;
  segments: GlossarySegment[];
}

export interface ReadingParagraph extends TextRange {
  runs: ReadingRun[];
}

interface Positioned extends TextRange {
  segment: GlossarySegment;
}

/** The segments with their positions in `text` (they cover the text in order). */
function positioned(segments: GlossarySegment[]): Positioned[] {
  let at = 0;
  return segments.map((segment) => {
    const start = at;
    at += segment.text.length;
    return { start, end: at, segment };
  });
}

/** Splits plain-text pieces at `cuts`; glossary terms stay whole. */
function cutAt(pieces: Positioned[], cuts: number[]): Positioned[] {
  const out: Positioned[] = [];
  for (const piece of pieces) {
    if (piece.segment.kind !== 'text') {
      out.push(piece);
      continue;
    }
    const inside = [...new Set(cuts)].filter((cut) => cut > piece.start && cut < piece.end).sort((a, b) => a - b);
    let from = piece.start;
    for (const cut of [...inside, piece.end]) {
      const text = piece.segment.text.slice(from - piece.start, cut - piece.start);
      out.push({ start: from, end: cut, segment: { kind: 'text', text } });
      from = cut;
    }
  }
  return out;
}

function overlaps(piece: TextRange, range: TextRange | undefined): boolean {
  return !!range && range.end > range.start && piece.start < range.end && piece.end > range.start;
}

/**
 * The section's paragraphs, each as runs of plain-text and glossary-term
 * segments; a run is highlighted when it falls inside `highlight`.
 */
export function buildReading(
  text: string,
  glossary: readonly GlossaryEntry[],
  highlight?: TextRange,
  /** The lesson's language, for matching key words case-insensitively. */
  lang?: string,
): ReadingParagraph[] {
  const paragraphs = paragraphRanges(text);
  const cuts = paragraphs.flatMap((p) => [p.start, p.end]);
  if (highlight) cuts.push(highlight.start, highlight.end);
  const pieces = cutAt(positioned(markGlossary(text, glossary, lang)), cuts);

  return paragraphs.map((paragraph) => {
    const runs: ReadingRun[] = [];
    for (const piece of pieces) {
      if (piece.start < paragraph.start || piece.end > paragraph.end || piece.end === piece.start) continue;
      const highlighted = overlaps(piece, highlight);
      const last = runs[runs.length - 1];
      if (last && last.highlighted === highlighted) last.segments.push(piece.segment);
      else runs.push({ highlighted, segments: [piece.segment] });
    }
    return { ...paragraph, runs };
  });
}

/** True when the section's text (in this version) has at least one glossary word. */
export function hasGlossaryTerms(text: string, glossary: readonly GlossaryEntry[], lang?: string): boolean {
  return markGlossary(text, glossary, lang).some((segment) => segment.kind === 'term');
}

