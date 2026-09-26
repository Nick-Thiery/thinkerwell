// Dev only: loads the ORIGINAL design-system reference bundle (never the
// ported src/components/ds/* code) into an isolated document — dev-screen.html
// or dev-reference.html — so a reviewer can see and screenshot the untouched
// reference next to the port. Nothing here is imported by the app itself, so
// it never reaches the production build (see README.md).
import * as ReactNS from 'react';
import * as ReactDOMClientNS from 'react-dom/client';
import type { ElementType } from 'react';
import bundleJsText from '../../../docs/design-system/reference/bundle.js?raw';
import bundleCssText from '../../../docs/design-system/reference/bundle.css?raw';
import tokensCssText from '../../../docs/design-system/tokens.css?raw';

declare global {
  interface Window {
    // Set here so bundle.js's IIFE (`var React = window.React;`) can run
    // unmodified. The self-hosted app never does this outside dev tooling.
    React?: typeof ReactNS;
    ReactDOM?: typeof ReactDOMClientNS;
    // Populated by bundle.js itself once it runs (docs/design-system/reference/index.d.ts).
    Thinkerwell?: Record<string, ElementType>;
  }
}

let loadPromise: Promise<void> | null = null;

/** Removes bundle.css's Google Fonts @import: the build self-hosts fonts instead. */
function stripGoogleFontsImport(css: string): string {
  return css.replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/, '');
}

function injectStyle(css: string, id: string): void {
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Loads tokens.css and bundle.css (Google Fonts import stripped; the page's
 * own import of src/styles/fonts.css supplies the self-hosted faces instead)
 * and runs bundle.js so it populates window.Thinkerwell. Safe to call more
 * than once; the bundle is only evaluated the first time.
 */
export function loadReferenceBundle(): Promise<void> {
  loadPromise ??= new Promise<void>((resolve, reject) => {
    try {
      window.React = ReactNS;
      window.ReactDOM = ReactDOMClientNS;
      injectStyle(tokensCssText, 'tw-dev-tokens-css');
      injectStyle(stripGoogleFontsImport(bundleCssText), 'tw-dev-bundle-css');
      // bundle.js is a plain IIFE (not an ES module) that reads window.React
      // and assigns window.Thinkerwell; evaluating its text is equivalent to
      // the reference docs loading it as a classic <script>.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval -- running the reference bundle's own source, not user input.
      const run = new Function(bundleJsText) as () => void;
      run();
      resolve();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
  return loadPromise;
}

/** The reference bundle's exported components, keyed by name (window.Thinkerwell). */
export function getReferenceRegistry(): Record<string, ElementType> | undefined {
  return window.Thinkerwell;
}
