import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyDocumentLocale, DEV_DIR_STORAGE_KEY, readDevDirection } from './direction';

beforeEach(() => {
  sessionStorage.clear();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('lang');
});

afterEach(() => {
  sessionStorage.clear();
});

describe('readDevDirection', () => {
  it('does nothing outside development, even with ?dir=rtl', () => {
    expect(readDevDirection('?dir=rtl', false)).toBeNull();
    expect(sessionStorage.getItem(DEV_DIR_STORAGE_KEY)).toBeNull();
  });

  it('ignores a remembered switch outside development', () => {
    sessionStorage.setItem(DEV_DIR_STORAGE_KEY, 'rtl');
    expect(readDevDirection('', false)).toBeNull();
  });

  it('defaults to development in tests', () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(readDevDirection('?dir=rtl')).toBe('rtl');
  });

  it('returns null with no switch', () => {
    expect(readDevDirection('', true)).toBeNull();
    expect(readDevDirection('?preview=true', true)).toBeNull();
  });

  it('turns right-to-left on with ?dir=rtl and remembers it', () => {
    expect(readDevDirection('?dir=rtl', true)).toBe('rtl');
    expect(sessionStorage.getItem(DEV_DIR_STORAGE_KEY)).toBe('rtl');
    expect(readDevDirection('', true)).toBe('rtl');
    expect(readDevDirection('?preview=true', true)).toBe('rtl');
  });

  it('works alongside other query params', () => {
    expect(readDevDirection('?preview=true&dir=rtl', true)).toBe('rtl');
  });

  it('turns it off with ?dir=ltr and forgets it', () => {
    readDevDirection('?dir=rtl', true);
    expect(readDevDirection('?dir=ltr', true)).toBeNull();
    expect(sessionStorage.getItem(DEV_DIR_STORAGE_KEY)).toBeNull();
    expect(readDevDirection('', true)).toBeNull();
  });

  it('ignores other ?dir values and keeps what was remembered', () => {
    expect(readDevDirection('?dir=up', true)).toBeNull();
    readDevDirection('?dir=rtl', true);
    expect(readDevDirection('?dir=RTL', true)).toBe('rtl');
    expect(readDevDirection('?dir=', true)).toBe('rtl');
  });

  it('ignores anything else stored under the key', () => {
    sessionStorage.setItem(DEV_DIR_STORAGE_KEY, 'sideways');
    expect(readDevDirection('', true)).toBeNull();
  });

  it('still works for this page when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readDevDirection('?dir=rtl', true)).toBe('rtl');
    expect(readDevDirection('', true)).toBeNull();
  });
});

describe('applyDocumentLocale', () => {
  it('sets lang and dir on <html>', () => {
    applyDocumentLocale('en', 'ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');

    applyDocumentLocale('fa-AF', 'rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('fa-AF');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('works on another document', () => {
    const doc = document.implementation.createHTMLDocument('x');
    applyDocumentLocale('ar', 'rtl', doc);
    expect(doc.documentElement.lang).toBe('ar');
    expect(doc.documentElement.dir).toBe('rtl');
    expect(document.documentElement.hasAttribute('dir')).toBe(false);
  });

  it('does not touch the attributes when they already match', () => {
    applyDocumentLocale('en', 'ltr');
    const observer = new MutationObserver(() => undefined);
    observer.observe(document.documentElement, { attributes: true });
    applyDocumentLocale('en', 'ltr');
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });
});
