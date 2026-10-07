import { describe, expect, it } from 'vitest';
import { contentFor, getLessons, type GlossaryEntry } from '../../../content';
import { loadLocale } from '../../../i18n/load';
import { glossaryEntriesIn } from '../../../lesson';
import { buildReading, HEADING_PAUSE_MS, hasGlossaryTerms, listenPieces, paragraphRanges, sentenceRanges, visibleSectionText } from './readingPieces';

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
    // "flood. It" starts inside "flood", so the whole word is highlighted.
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

describe('sentenceRanges', () => {
  const slices = (text: string) => sentenceRanges(text).map((r) => text.slice(r.start, r.end));

  it('splits sentences within paragraphs, trimmed', () => {
    const text = 'Rivers give water. They also flood!  \n\nIs it safe? Yes.';
    expect(slices(text)).toEqual(['Rivers give water.', 'They also flood!', 'Is it safe?', 'Yes.']);
  });

  it("doesn't break after an initial followed by a lower-case word", () => {
    expect(slices('A notebook says Mina L. packed rice. The tin was old.')).toEqual([
      'A notebook says Mina L. packed rice.',
      'The tin was old.',
    ]);
  });

  it("keeps a title and its name together (\"Dr. Ahmed\"), and \"No. 5\", which the splitter would break", () => {
    expect(slices('Dr. Ahmed met Mr. Lee. They looked at map No. 5 together. Was it No. It was not.')).toEqual([
      'Dr. Ahmed met Mr. Lee.',
      'They looked at map No. 5 together.',
      'Was it No.',
      'It was not.',
    ]);
    expect(slices('Some rivers flood, e.g. The Nile. Bpk. Budi tahu.')).toEqual(['Some rivers flood, e.g. The Nile.', 'Bpk. Budi tahu.']);
  });

  it('gives the same sentences without Intl.Segmenter', () => {
    const intl = Intl as { Segmenter?: typeof Intl.Segmenter };
    const segmenter = intl.Segmenter;
    try {
      // Removed to test the fallback for browsers without it.
      delete intl.Segmenter;
      expect(slices('One. "Two," she said. Three?\n\nFour.')).toEqual(['One.', '"Two," she said.', 'Three?', 'Four.']);
      expect(slices('Mina L. packed rice.')).toEqual(['Mina L. packed rice.']);
      expect(slices('Dr. Ahmed came. He sat.')).toEqual(['Dr. Ahmed came.', 'He sat.']);
    } finally {
      intl.Segmenter = segmenter;
    }
  });

  it('covers every word of every lesson section, in order, in both versions', () => {
    for (const lesson of getLessons()) {
      for (const section of lesson.read.sections) {
        for (const level of ['standard', 'simpler'] as const) {
          const text = visibleSectionText(section, level);
          const ranges = sentenceRanges(text);
          expect(ranges.length).toBeGreaterThan(0);
          const words = (s: string) => s.split(/\s+/).filter(Boolean);
          expect(ranges.flatMap((r) => words(text.slice(r.start, r.end)))).toEqual(words(text));
          for (const [i, r] of ranges.entries()) {
            if (i > 0) expect(r.start).toBeGreaterThanOrEqual(ranges[i - 1]!.end);
          }
        }
      }
    }
  });
});

describe('listenPieces', () => {
  const pieces = (heading: string, text: string) => listenPieces(heading, text, sentenceRanges(text));

  it('says the heading as a finished phrase, with a short silence after it, then each sentence', () => {
    expect(pieces('Rivers give water and food', 'Every town needs water. Rivers give it.')).toEqual([
      { text: 'Rivers give water and food.', pauseAfterMs: HEADING_PAUSE_MS },
      'Every town needs water.',
      'Rivers give it.',
    ]);
    // A heading with its own mark keeps it.
    expect(pieces('What matters most?', 'Many things.')[0]).toEqual({ text: 'What matters most?', pauseAfterMs: HEADING_PAUSE_MS });
  });

  it("doesn't read the heading when the first sentence says the same words, so nothing is read twice", () => {
    expect(pieces('Each source answers different questions', 'Each source answers different questions. A map shows places.')).toEqual([
      { text: '', pauseAfterMs: 0 },
      'Each source answers different questions.',
      'A map shows places.',
    ]);
  });

  it('keeps piece n + 1 as sentence n (the one highlighted), in every lesson, in English and Indonesian', async () => {
    const indonesian = contentFor((await loadLocale('id')).content);
    for (const lessons of [getLessons(), indonesian.getLessons()]) {
      for (const lesson of lessons) {
        for (const section of lesson.read.sections) {
          for (const level of ['standard', 'simpler'] as const) {
            const text = visibleSectionText(section, level);
            const ranges = sentenceRanges(text);
            const said = listenPieces(section.heading, text, ranges);
            expect(said).toHaveLength(ranges.length + 1);
            expect(said.slice(1)).toEqual(ranges.map((r) => text.slice(r.start, r.end)));
            // No piece is said twice in a row (the heading and a first sentence that repeats it).
            const texts = said.map((piece) => (typeof piece === 'string' ? piece : piece.text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim());
            for (let i = 1; i < texts.length; i += 1) {
              if (texts[i]) expect(texts[i], `${lesson.id} ${level}: ${section.heading}`).not.toBe(texts[i - 1]);
            }
          }
        }
      }
    }
  });
});
