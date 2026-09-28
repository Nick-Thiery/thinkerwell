import { describe, expect, it } from 'vitest';
import en from './messages/en.json';
import {
  accentText,
  PSEUDO_CLOSE,
  PSEUDO_OPEN,
  PSEUDO_TRANSFORMS,
  pseudoLonger,
  pseudoMessages,
  pseudoRightToLeft,
  rightToLeftText,
} from './pseudo';

const placeholders = (text: string) => [...text.matchAll(/\{\w+\}/g)].map((match) => match[0]).sort();
/** Every string in a message file, with its dotted key. */
function leaves(node: unknown, prefix = ''): Array<[string, string]> {
  if (typeof node === 'string') return [[prefix, node]];
  if (node && typeof node === 'object') return Object.entries(node).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  return [];
}

describe('en-XA (longer)', () => {
  it('accents every letter, lengthens every word and wraps the message', () => {
    expect(pseudoLonger('Start Lesson 1')).toBe('⟦Šţåååŕţ Ļééššööñ 1⟧');
    expect(pseudoLonger('Why')).toBe('⟦Ŵĥýý⟧');
  });

  it('leaves {placeholders} exactly as they are', () => {
    expect(pseudoLonger('Hi {name}')).toBe('⟦Ĥîî {name}⟧');
    expect(pseudoLonger('{page} · Thinkerwell')).toMatch(/^⟦\{page\} · Ţĥ/);
  });

  it('leaves no plain English letters in any message', () => {
    for (const [key, value] of leaves(en)) {
      const pseudo = pseudoLonger(value).replace(/\{\w+\}/g, '');
      expect(pseudo, key).not.toMatch(/[A-Za-z]/);
      expect(pseudo.startsWith(PSEUDO_OPEN) && pseudo.endsWith(PSEUDO_CLOSE), key).toBe(true);
    }
  });

  it('makes the whole interface about a third longer', () => {
    const all = leaves(en).map(([, value]) => value);
    const before = all.join('').length;
    const after = all.map((value) => pseudoLonger(value).slice(1, -1)).join('').length;
    expect(after / before).toBeGreaterThan(1.25);
    expect(after / before).toBeLessThan(1.4);
  });

  it('accents formatted text without brackets', () => {
    expect(accentText('September 5, 2026')).toBe('Šééþţééɱƀééŕ 5, 2026');
  });
});

describe('ar-XB (right to left)', () => {
  it('turns each word round with right-to-left marks, keeping {placeholders}', () => {
    expect(pseudoRightToLeft('Hi {name}')).toBe('\u200F\u202EHi\u202C {name}\u200F');
    expect(rightToLeftText('5 September')).toBe('5 \u202ESeptember\u202C');
  });
});

describe('pseudoMessages', () => {
  it('changes every string of a file, plural forms included, and keeps its shape', () => {
    const file = { a: 'One', b: { one: '{count} lesson', other: '{count} lessons' } };
    expect(pseudoMessages(file, pseudoLonger)).toEqual({
      a: '⟦ÖÖñé⟧',
      b: { one: '⟦{count} ļééššööñ⟧', other: '⟦{count} ļééššööñš⟧' },
    });
  });

  it('keeps every key and placeholder of en.json in both pseudo-languages', () => {
    for (const [code, transform] of Object.entries(PSEUDO_TRANSFORMS)) {
      const pseudo = leaves(pseudoMessages(en, transform.message));
      const english = leaves(en);
      expect(pseudo.map(([key]) => key), code).toEqual(english.map(([key]) => key));
      pseudo.forEach(([key, value], index) => expect(placeholders(value), `${code} ${key}`).toEqual(placeholders(english[index]![1])));
    }
  });
});
