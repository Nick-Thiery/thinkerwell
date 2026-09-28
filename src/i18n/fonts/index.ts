/**
 * Fonts a language needs beyond the site's own (src/styles/fonts.css), by
 * the font key in src/i18n/locales.ts. Each is its own stylesheet, fetched
 * the first time a language that needs it is shown, so an English visit
 * never downloads it. The service worker precaches it only once a language
 * that needs it is ready (vite.config.ts).
 */
import type { FontKey } from '../locales';

const fonts: Record<Exclude<FontKey, 'latin'>, () => Promise<unknown>> = {
  arabic: () => import('./arabic.css'),
};

const started = new Map<FontKey, Promise<void>>();

/** Adds the stylesheet for a font key once. The 'latin' fonts are always there. */
export function loadFont(key: FontKey): Promise<void> {
  if (key === 'latin') return Promise.resolve();
  let pending = started.get(key);
  if (!pending) {
    pending = fonts[key]().then(
      () => undefined,
      (error: unknown) => {
        // Offline before it was ever fetched: the browser's own Arabic-script font shows instead.
        started.delete(key);
        if (import.meta.env.DEV) console.warn(`[i18n] Couldn't load the ${key} font.`, error);
      },
    );
    started.set(key, pending);
  }
  return pending;
}
