import { describe, expect, it } from 'vitest';
import { getLessons, type GlossaryEntry } from '../../../content';
import { glossaryEntriesIn } from '../../../lesson';
import { buildReading, hasGlossaryTerms, paragraphRanges, visibleSectionText } from './readingPieces';

const glossary: GlossaryEntry[] = [
  { word: 'flood', forms: ['floods'], definition: 'Water on dry land.', example: 'The river floods.' },
  { word: 'risk', definition: 'A chance of harm.', example: 'One risk is a flood.' },
];

function flatText(text: string) {
  return buildReading(text, glossary).map((p) =>
    p.segments.map((s) => (s.kind === 'term' ? `[${s.text}]` : s.text)).join(''),
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
    expect(flatText(text)).toEqual(['Rivers [flood].', 'A flood is a [risk]. Floods again.']);
  });

  it('keeps every character of every lesson section, in both versions', () => {
    for (const lesson of getLessons()) {
      for (const section of lesson.read.sections) {
        for (const level of ['standard', 'simpler'] as const) {
          const text = visibleSectionText(section, level);
          const paragraphs = buildReading(text, lesson.read.glossary);
          const rebuilt = paragraphs.map((p) => p.segments.map((s) => s.text).join('')).join('\n\n');
          expect(rebuilt).toBe(text.trim());
          const marked = paragraphs.flatMap((p) => p.segments.flatMap((s) => (s.kind === 'term' ? [s.entryIndex] : [])));
          expect(marked).toEqual(glossaryEntriesIn(text, lesson.read.glossary));
          expect(new Set(marked).size).toBe(marked.length);
          expect(hasGlossaryTerms(text, lesson.read.glossary)).toBe(marked.length > 0);
        }
      }
    }
  });
});
