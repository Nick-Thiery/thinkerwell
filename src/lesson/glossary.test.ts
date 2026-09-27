import { getLessons, type GlossaryEntry } from '../content';
import { glossaryEntriesIn, glossaryForms, markGlossary, type GlossarySegment } from './glossary';

const entry = (word: string, forms?: string[]): GlossaryEntry => ({
  word,
  ...(forms ? { forms } : {}),
  definition: `Meaning of ${word}.`,
  example: `An example with ${word}.`,
});

const terms = (segments: GlossarySegment[]) =>
  segments.flatMap((s) => (s.kind === 'term' ? [`${s.text}#${s.entryIndex}`] : []));
const joined = (segments: GlossarySegment[]) => segments.map((s) => s.text).join('');

describe('glossaryForms', () => {
  it('lists the word then its forms', () => {
    expect(glossaryForms(entry('flood', ['floods', 'flooded']))).toEqual(['flood', 'floods', 'flooded']);
    expect(glossaryForms(entry('fertile'))).toEqual(['fertile']);
  });
});

describe('markGlossary', () => {
  const glossary = [entry('flood', ['floods', 'flooding']), entry('risk', ['risks']), entry('crops', ['crop'])];

  it('marks the first appearance of each word, case-insensitively, keeping the text as written', () => {
    const segments = markGlossary('Floods are a risk. A flood can ruin crops. Risks remain.', glossary);
    expect(terms(segments)).toEqual(['Floods#0', 'risk#1', 'crops#2']);
    expect(joined(segments)).toBe('Floods are a risk. A flood can ruin crops. Risks remain.');
  });

  it('matches whole words only', () => {
    const segments = markGlossary('A brisk walk past the cropland. No risk.', glossary);
    expect(terms(segments)).toEqual(['risk#1']);
  });

  it('prefers the longest form at the same place', () => {
    expect(terms(markGlossary('The flooding stopped.', glossary))).toEqual(['flooding#0']);
  });

  it('treats punctuation, hyphens and apostrophes as word edges', () => {
    expect(terms(markGlossary('(flood) risk-free, crop’s', glossary))).toEqual(['flood#0', 'risk#1', 'crop#2']);
  });

  it('handles several-word glossary entries and regex characters in words', () => {
    const special = [entry('trade route'), entry('C++')];
    expect(terms(markGlossary('The old Trade Route was long.', special))).toEqual(['Trade Route#0']);
    expect(joined(markGlossary('No match (C) here.', special))).toBe('No match (C) here.');
  });

  it('gives a shared spelling to the first entry that lists it', () => {
    const shared = [entry('state', ['states']), entry('city-state', ['states'])];
    expect(terms(markGlossary('Early states grew.', shared))).toEqual(['states#0']);
  });

  it('returns plain text when nothing matches, and nothing for empty text', () => {
    expect(markGlossary('Nothing here.', glossary)).toEqual([{ kind: 'text', text: 'Nothing here.' }]);
    expect(markGlossary('', glossary)).toEqual([]);
    expect(markGlossary('Text', [])).toEqual([{ kind: 'text', text: 'Text' }]);
  });
});

describe('every lesson', () => {
  // docs/content/SPEC.md: each glossary word (or one of its forms) appears in
  // the text AND the simpler version of at least one section.
  it.each(getLessons().map((l) => [l.number, l] as const))('Lesson %i marks every glossary word in both versions', (_n, lesson) => {
    const { sections, glossary } = lesson.read;
    const inStandard = new Set(sections.flatMap((s) => glossaryEntriesIn(s.text, glossary)));
    const inSimpler = new Set(sections.flatMap((s) => glossaryEntriesIn(s.simpler, glossary)));
    glossary.forEach((g, i) => {
      expect({ word: g.word, standard: inStandard.has(i) }).toEqual({ word: g.word, standard: true });
      expect({ word: g.word, simpler: inSimpler.has(i) }).toEqual({ word: g.word, simpler: true });
    });
  });

  it('never marks the same word twice in one section and version', () => {
    for (const lesson of getLessons()) {
      for (const section of lesson.read.sections) {
        for (const text of [section.text, section.simpler]) {
          const marked = glossaryEntriesIn(text, lesson.read.glossary);
          expect(new Set(marked).size).toBe(marked.length);
          expect(joined(markGlossary(text, lesson.read.glossary))).toBe(text);
        }
      }
    }
  });
});
