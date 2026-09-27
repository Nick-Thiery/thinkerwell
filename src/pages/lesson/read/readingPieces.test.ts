import { describe, expect, it } from 'vitest';
import { getLessons, type GlossaryEntry } from '../../../content';
import { glossaryEntriesIn } from '../../../lesson';
import { buildReading, hasGlossaryTerms, paragraphRanges, visibleSectionText } from './readingPieces';

const glossary: GlossaryEntry[] = [
  { word: 'flood', forms: ['floods'], definition: 'Water on dry land.', example: 'The river floods.' },
  { word: 'risk', definition: 'A chance of harm.', example: 'One risk is a flood.' },
];

function flatText(text: string, highlight?: { start: number; end: number }) {
  return buildReading(text, glossary, highlight).map((p) =>
    p.runs.map((run) => ({
      highlighted: run.highlighted,
      text: run.segments.map((s) => (s.kind === 'term' ? `[${s.text}]` : s.text)).join(''),
    })),
  );
}

describe('paragraphRanges', () => {
  it('splits on blank lines and trims', () => {
    const text = 'One.\n\n  Two.  \n \nThree.';
    expect(paragraphRanges(text).map((r) => text.slice(r.start, r.end))).toEqual(['One.', 'Two.', 'Three.']);
  });

  it('gives one paragraph for text without blank lines', () => {
    expect(paragraphRanges('A line.\nAnother line.')).toEqual([{ start: 0, end: 21 }]);
  });
});

describe('buildReading', () => {
  it('marks each word once per section, even across paragraphs', () => {
    const text = 'Rivers flood.\n\nA flood is a risk. Floods again.';
    expect(flatText(text)).toEqual([
      [{ highlighted: false, text: 'Rivers [flood].' }],
      [{ highlighted: false, text: 'A flood is a [risk]. Floods again.' }],
    ]);
  });

  it('wraps a highlighted range in its own run, keeping glossary words whole', () => {
    const text = 'Rivers flood. It is a risk.';
    // "flood. It" — starts inside "flood", so the whole word is highlighted.
    expect(flatText(text, { start: 9, end: 16 })).toEqual([
      [
        { highlighted: false, text: 'Rivers ' },
        { highlighted: true, text: '[flood]. It' },
        { highlighted: false, text: ' is a [risk].' },
      ],
    ]);
  });

  it('ignores an empty highlight', () => {
    expect(flatText('Rivers flood.', { start: 3, end: 3 })).toEqual([[{ highlighted: false, text: 'Rivers [flood].' }]]);
  });

  it('keeps every character of every lesson section, in both versions', () => {
    for (const lesson of getLessons()) {
      for (const section of lesson.read.sections) {
        for (const level of ['standard', 'simpler'] as const) {
          const text = visibleSectionText(section, level);
          const paragraphs = buildReading(text, lesson.read.glossary);
          const rebuilt = paragraphs
            .map((p) => p.runs.flatMap((run) => run.segments.map((s) => s.text)).join(''))
            .join('\n\n');
          expect(rebuilt).toBe(text.trim());
          const marked = paragraphs.flatMap((p) =>
            p.runs.flatMap((run) => run.segments.flatMap((s) => (s.kind === 'term' ? [s.entryIndex] : []))),
          );
          expect(marked).toEqual(glossaryEntriesIn(text, lesson.read.glossary));
          expect(new Set(marked).size).toBe(marked.length);
          expect(hasGlossaryTerms(text, lesson.read.glossary)).toBe(marked.length > 0);
        }
      }
    }
  });
});
