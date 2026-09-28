import { describe, expect, it } from 'vitest';
import en from './messages/en.json';
import { ENGLISH, translate } from './core';
import { loadedLocale, loadLocale, messageFileCodes } from './load';

describe('loadLocale', () => {
  it('has English already', async () => {
    expect(loadedLocale('en')).toBe(ENGLISH);
    await expect(loadLocale('en')).resolves.toBe(ENGLISH);
  });

  it('makes the pseudo-languages from en.json, once each', async () => {
    expect(loadedLocale('en-XA')).toBeUndefined();
    const first = loadLocale('en-XA');
    expect(loadLocale('en-XA')).toBe(first);
    const locale = await first;
    expect(loadedLocale('en-XA')).toBe(locale);
    expect(locale.definition.code).toBe('en-XA');
    expect(translate(locale, 'nav.course')).toBe('⟦Çööûûŕšé⟧');
    expect(translate(locale, 'lesson.number', { number: 10 })).toBe('⟦Ļééššööñ 10⟧');
    expect(Object.keys(locale.messages)).toEqual(Object.keys(en));
    expect(locale.decorate?.('September')).toBe('Šééþţééɱƀééŕ');
    const rtl = await loadLocale('ar-XB');
    expect(rtl.definition.dir).toBe('rtl');
    expect(rtl.decorate?.('May')).toBe('\u202EMay\u202C');
  });

  it('loads a listed language with no message file yet as empty, so it falls back to English', async () => {
    expect(messageFileCodes()).not.toContain('so');
    const somali = await loadLocale('so');
    expect(somali.messages).toEqual({});
    expect(translate(somali, 'nav.course')).toBe('Course');
  });

  it('refuses a language that is not listed', async () => {
    await expect(loadLocale('de')).rejects.toThrow('Unknown language: de');
    expect(loadedLocale('de')).toBeUndefined();
  });

  it('finds no message file but English and its notes today', () => {
    expect(messageFileCodes()).toEqual([]);
  });
});
