import { describe, expect, it } from 'vitest';
import type { GlossaryEntry } from '../content';
import { findLocale } from '../i18n';
import { glossaryMeaning } from './glossaryMeaning';

const entry: GlossaryEntry = {
  word: 'river',
  definition: 'A large stream of water.',
  example: 'The river is wide.',
  translations: { 'fa-AF': 'FIXTURE-fa', so: 'FIXTURE-so' },
};

describe('glossaryMeaning', () => {
  it("gives the meaning in the learner's language, with its code, direction and own name", () => {
    expect(glossaryMeaning(entry, findLocale('fa-AF')!)).toEqual({ text: 'FIXTURE-fa', lang: 'fa-AF', dir: 'rtl', languageName: 'دری' });
    expect(glossaryMeaning(entry, findLocale('so')!)).toEqual({ text: 'FIXTURE-so', lang: 'so', dir: 'ltr', languageName: 'Soomaali' });
  });

  it('gives nothing in English, in a language the word has no meaning for, or in a test language', () => {
    expect(glossaryMeaning(entry, findLocale('en')!)).toBeUndefined();
    expect(glossaryMeaning(entry, findLocale('ar')!)).toBeUndefined();
    expect(glossaryMeaning({ ...entry, translations: undefined }, findLocale('fa-AF')!)).toBeUndefined();
    expect(glossaryMeaning(entry, findLocale('ar-XB')!)).toBeUndefined();
  });
});
