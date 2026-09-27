/**
 * Turns one reading section (in the version on screen) into paragraphs of
 * plain text and glossary terms, ready to render, with an optional range
 * to highlight.
 *
 * - Glossary words are marked across the WHOLE section first
 *   (markGlossary: first appearance only, whole words, any form), then the
 *   text is split into paragraphs, so each word is marked once per section
 *   however many paragraphs it has.
 * - `highlight` is a character range in the section's text (the version on
 *   screen). Phase 5's Listen passes the sentence being read; the pieces in
 *   that range come back grouped in runs with `highlighted: true`, which the
 *   renderer wraps in <mark class="tw-speaking">. A glossary word that the
 *   range only partly covers is highlighted whole, never split.
 */
import type { GlossaryEntry, ReadSection } from '../../../content';
import { markGlossary, type GlossarySegment } from '../../../lesson';
import type { ReadingLevel } from '../../../storage';

/** A range of characters in a section's text: `start` inclusive, `end` exclusive. */
export interface TextRange {
  start: number;
  end: number;
}

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

/** The text of a section in the version on screen. Listen (phase 5) reads the same string. */
export function visibleSectionText(section: ReadSection, level: ReadingLevel): string {
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
 * The section's paragraphs, each as runs of segments; a run is highlighted
 * when it falls inside `highlight`.
 */
export function buildReading(
  text: string,
  glossary: readonly GlossaryEntry[],
  highlight?: TextRange,
): ReadingParagraph[] {
  const paragraphs = paragraphRanges(text);
  const cuts = paragraphs.flatMap((p) => [p.start, p.end]);
  if (highlight) cuts.push(highlight.start, highlight.end);
  const pieces = cutAt(positioned(markGlossary(text, glossary)), cuts);

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
export function hasGlossaryTerms(text: string, glossary: readonly GlossaryEntry[]): boolean {
  return markGlossary(text, glossary).some((segment) => segment.kind === 'term');
}
