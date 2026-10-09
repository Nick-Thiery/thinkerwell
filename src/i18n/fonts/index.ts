/**
 * Fonts a language needs beyond the site's own (src/styles/fonts.css), by
 * the font key in src/i18n/locales.ts. Each is its own stylesheet, fetched
 * the first time a language that needs it is shown, so an English visit
 * never downloads it. The service worker precaches it only once a language
 * that needs it is ready (vite.config.ts).
 *
 * The site has one stylesheet for every page (vite.config.ts, cssCodeSplit
 * false), which takes in every CSS file the code imports, even one imported
 * on demand. So each font's stylesheet is imported as a file of its own
 * (`?url`: built, with its font files, into assets/fonts-arabic/ or assets/fonts-vietnamese/) and added
 * with a <link> when a language first needs it. The build stops if it ever
 * lands in the site's stylesheet (keepFirstVisitLight in vite.config.ts).
 */
import type { FontKey } from '../locales';
import arabicStylesheet from './arabic.css?url';
import vietnameseStylesheet from './vietnamese.css?url';

const stylesheets: Record<Exclude<FontKey, 'latin'>, string> = {
  arabic: arabicStylesheet,
  vietnamese: vietnameseStylesheet,
};

const started = new Map<FontKey, Promise<void>>();

/** Adds a stylesheet to the page; resolves once it has loaded, rejects (and takes it away) if it can't be fetched. */
function addStylesheet(key: FontKey, href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.font = key;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener(
      'error',
      () => {
        link.remove();
        reject(new Error(`Couldn't load ${href}`));
      },
      { once: true },
    );
    document.head.append(link);
  });
}

/** Adds the stylesheet for a font key once. The 'latin' fonts are always there. */
export function loadFont(key: FontKey): Promise<void> {
  if (key === 'latin') return Promise.resolve();
  let pending = started.get(key);
  if (!pending) {
    pending = addStylesheet(key, stylesheets[key]).catch((error: unknown) => {
      // Offline before it was ever fetched: the browser's own fonts show instead.
      started.delete(key);
      if (import.meta.env.DEV) console.warn(`[i18n] Couldn't load the ${key} font.`, error);
    });
    started.set(key, pending);
  }
  return pending;
}
