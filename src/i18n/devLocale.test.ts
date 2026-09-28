import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEV_LOCALE_STORAGE_KEY, isAutomated, readDevLocale, switchableLocales } from './devLocale';

beforeEach(() => sessionStorage.clear());
afterEach(() => sessionStorage.clear());

describe('readDevLocale', () => {
  it('does nothing in a production build for a learner, even with ?locale=', () => {
    expect(readDevLocale('?locale=en-XA', false, false)).toBeNull();
    sessionStorage.setItem(DEV_LOCALE_STORAGE_KEY, 'en-XA');
    expect(readDevLocale('', false, false)).toBeNull();
    expect(switchableLocales(false, false)).toEqual([]);
  });

  it('offers only the pseudo-languages in a production build driven by tests', () => {
    expect(switchableLocales(false, true)).toEqual(['en-XA', 'ar-XB']);
    expect(readDevLocale('?locale=en-XA', false, true)).toBe('en-XA');
    expect(readDevLocale('?locale=fa-AF', false, true)).toBe('en-XA');
    sessionStorage.clear();
    expect(readDevLocale('?locale=fa-AF', false, true)).toBeNull();
  });

  it('in development, takes any listed language, ready or not, and remembers it for the tab', () => {
    expect(readDevLocale('?locale=fa-af', true, false)).toBe('fa-AF');
    expect(sessionStorage.getItem(DEV_LOCALE_STORAGE_KEY)).toBe('fa-AF');
    expect(readDevLocale('', true, false)).toBe('fa-AF');
    expect(readDevLocale('?preview=true&locale=ar-XB', true, false)).toBe('ar-XB');
    expect(readDevLocale('?dir=rtl', true, false)).toBe('ar-XB');
  });

  it('turns off with ?locale=en or an empty ?locale=', () => {
    readDevLocale('?locale=en-XA', true, false);
    expect(readDevLocale('?locale=en', true, false)).toBeNull();
    expect(sessionStorage.getItem(DEV_LOCALE_STORAGE_KEY)).toBeNull();
    readDevLocale('?locale=en-XA', true, false);
    expect(readDevLocale('?locale=', true, false)).toBeNull();
    expect(readDevLocale('', true, false)).toBeNull();
  });

  it('ignores a language it does not know and keeps what was remembered', () => {
    readDevLocale('?locale=so', true, false);
    expect(readDevLocale('?locale=klingon', true, false)).toBe('so');
    sessionStorage.setItem(DEV_LOCALE_STORAGE_KEY, 'klingon');
    expect(readDevLocale('', true, false)).toBeNull();
  });

  it('still works for this page when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readDevLocale('?locale=en-XA', true, false)).toBe('en-XA');
    expect(readDevLocale('', true, false)).toBeNull();
  });

  it('knows a browser driven by tests', () => {
    const set = (value: boolean) => Object.defineProperty(navigator, 'webdriver', { value, configurable: true });
    set(true);
    expect(isAutomated()).toBe(true);
    set(false);
    expect(isAutomated()).toBe(false);
    Reflect.deleteProperty(navigator, 'webdriver');
    expect(isAutomated()).toBe(false);
  });
});
