import { describe, expect, it } from 'vitest';
import { cardPages, CARDS_PER_PAGE, isValidPrefix, learnerCodes, MAX_LEARNERS, normalisePrefix, parseCount } from './codeCards';

describe('code cards', () => {
  it('keeps capital letters and digits in the prefix, at most five', () => {
    expect(normalisePrefix('hlp')).toBe('HLP');
    expect(normalisePrefix(' h-l p! ')).toBe('HLP');
    expect(normalisePrefix('abcdefgh')).toBe('ABCDE');
    expect(normalisePrefix('ÉCOLE')).toBe('COLE');
  });

  it('takes a prefix of 2 to 5 letters or digits', () => {
    expect(isValidPrefix('HLP')).toBe(true);
    expect(isValidPrefix('J2')).toBe(true);
    expect(isValidPrefix('H')).toBe(false);
    expect(isValidPrefix('')).toBe(false);
    expect(isValidPrefix('HLP-')).toBe(false);
  });

  it('takes a whole number of learners from 1 to the most', () => {
    expect(parseCount('20')).toBe(20);
    expect(parseCount(' 7 ')).toBe(7);
    expect(parseCount(String(MAX_LEARNERS))).toBe(MAX_LEARNERS);
    for (const bad of ['', '0', '-3', '2.5', 'ten', String(MAX_LEARNERS + 1)]) expect(parseCount(bad), bad).toBeNull();
  });

  it('numbers the codes with at least two digits', () => {
    expect(learnerCodes('HLP', 3)).toEqual(['HLP-01', 'HLP-02', 'HLP-03']);
    expect(learnerCodes('HLP', 12).at(-1)).toBe('HLP-12');
  });

  it('puts ten cards on each printed page', () => {
    const pages = cardPages(learnerCodes('HLP', 23));
    expect(pages.map((page) => page.length)).toEqual([CARDS_PER_PAGE, CARDS_PER_PAGE, 3]);
    expect(pages[1]![0]).toBe('HLP-11');
  });
});
