/**
 * <html lang> and <html dir>, plus the development-only right-to-left switch.
 *
 * In development, add ?dir=rtl to any URL to force dir="rtl" on <html> so
 * layouts can be checked in right-to-left. It is remembered for the browser
 * tab (sessionStorage) until you visit any URL with ?dir=ltr. In production
 * builds the switch does nothing.
 */
import type { Direction } from './core';

export const DEV_DIR_STORAGE_KEY = 'tw-dev-dir';

function safeSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/**
 * Returns the forced direction from ?dir= (remembering it), or the one saved
 * earlier in this tab, or null. Always null outside development.
 */
export function readDevDirection(search: string, isDev: boolean = import.meta.env.DEV): Direction | null {
  if (!isDev) return null;
  const store = safeSessionStorage();
  const fromUrl = new URLSearchParams(search).get('dir');
  if (fromUrl === 'rtl' || fromUrl === 'ltr') {
    try {
      if (fromUrl === 'rtl') store?.setItem(DEV_DIR_STORAGE_KEY, 'rtl');
      else store?.removeItem(DEV_DIR_STORAGE_KEY);
    } catch {
      // Storage can be blocked; the switch then lasts for this page only.
    }
    return fromUrl === 'rtl' ? 'rtl' : null;
  }
  try {
    return store?.getItem(DEV_DIR_STORAGE_KEY) === 'rtl' ? 'rtl' : null;
  } catch {
    return null;
  }
}

/** Sets lang and dir on <html>. */
export function applyDocumentLocale(lang: string, dir: Direction, doc: Document = document): void {
  const html = doc.documentElement;
  if (html.lang !== lang) html.lang = lang;
  if (html.dir !== dir) html.dir = dir;
}
