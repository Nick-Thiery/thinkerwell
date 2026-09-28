import { describe, expect, it } from 'vitest';
import { getLessons } from './index';
import { GLOSSARY_MEANING_LOCALES, GLOSSARY_MEANING_MAX, glossaryEntrySchema, lessonSchema } from './schema';

// A glossary word can carry short meanings in other languages, checked when
// the content is built like everything else. No lesson has any yet: these
// are fixtures, not translations.
const entry = { word: 'river', definition: 'A large stream of water.', example: 'The river is wide.' };

describe('glossary meanings in other languages', () => {
  it('are optional, and every lesson has none today', () => {
    expect(glossaryEntrySchema.safeParse(entry).success).toBe(true);
    for (const lesson of getLessons()) {
      for (const word of lesson.read.glossary) expect(word.translations, `${lesson.id}: ${word.word}`).toBeUndefined();
    }
  });

  it('can be in any listed language but English', () => {
    expect(GLOSSARY_MEANING_LOCALES).toEqual(['fa-AF', 'ar', 'so']);
    const parsed = glossaryEntrySchema.parse({ ...entry, translations: { 'fa-AF': ' FIXTURE-fa ', so: 'FIXTURE-so' } });
    expect(parsed.translations).toEqual({ 'fa-AF': 'FIXTURE-fa', so: 'FIXTURE-so' });
  });

  it.each([
    ['English', { en: 'A river.' }],
    ['a language that is not listed', { de: 'Ein Fluss.' }],
    ['a test language', { 'en-XA': 'Å ŕîîṽéŕ.' }],
    ['an empty meaning', { ar: '  ' }],
    ['more than one line', { ar: 'one\ntwo' }],
    ['a long meaning', { so: 'x'.repeat(GLOSSARY_MEANING_MAX + 1) }],
    ['a meaning that is not text', { so: 3 }],
  ])('refuses %s', (_what, translations) => {
    expect(glossaryEntrySchema.safeParse({ ...entry, translations }).success).toBe(false);
  });

  it('fails the whole lesson, as the build does', () => {
    const lesson = structuredClone(getLessons()[0]!) as unknown as { read: { glossary: Array<Record<string, unknown>> } };
    lesson.read.glossary[0]!.translations = { de: 'Vergangenheit' };
    const result = lessonSchema.safeParse(lesson);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('translations');
  });
});
