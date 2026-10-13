import { describe, expect, it } from 'vitest';
import { cardPages, CARDS_PER_PAGE, isValidPrefix, learnerCodes, MAX_LEARNERS, normalisePrefix, parseCount } from './codeCards';

describe('code cards', () => {
  it('keeps capital letters and digits in the prefix, at most five', () => {
    expect(normalisePrefix('abc')).toBe('ABC');
    expect(normalisePrefix(' a-b c! ')).toBe('ABC');
    expect(normalisePrefix('abcdefgh')).toBe('ABCDE');
    expect(normalisePrefix('ÉCOLE')).toBe('COLE');
  });

  it('takes a prefix of 2 to 5 letters or digits', () => {
    expect(isValidPrefix('ABC')).toBe(true);
    expect(isValidPrefix('J2')).toBe(true);
    expect(isValidPrefix('H')).toBe(false);
    expect(isValidPrefix('')).toBe(false);
    expect(isValidPrefix('ABC-')).toBe(false);
  });

  it('takes a whole number of learners from 1 to the most', () => {
    expect(parseCount('20')).toBe(20);
    expect(parseCount(' 7 ')).toBe(7);
    expect(parseCount(String(MAX_LEARNERS))).toBe(MAX_LEARNERS);
    for (const bad of ['', '0', '-3', '2.5', 'ten', String(MAX_LEARNERS + 1)]) expect(parseCount(bad), bad).toBeNull();
  });

  it('numbers the codes with at least two digits', () => {
    expect(learnerCodes('ABC', 3)).toEqual(['ABC-01', 'ABC-02', 'ABC-03']);
    expect(learnerCodes('ABC', 12).at(-1)).toBe('ABC-12');
  });

  it('puts ten cards on each printed page', () => {
    const pages = cardPages(learnerCodes('ABC', 23));
    expect(pages.map((page) => page.length)).toEqual([CARDS_PER_PAGE, CARDS_PER_PAGE, 3]);
    expect(pages[1]![0]).toBe('ABC-11');
  });
});
