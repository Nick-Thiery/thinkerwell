/**
 * Digital World's styles. The site has one stylesheet for every page
 * (vite.config.ts, cssCodeSplit: false), which would take in any CSS file
 * the code imports, even here, and every device would download it. So this
 * course's CSS is a file of its own (`?url`: built into
 * assets/preview/digital-world/, src/courses/build.ts), added with a <link>
 * when the course's code first loads. Its class names all start "tw-dw-",
 * and the build stops if one reaches the site's stylesheet
 * (keepFirstVisitLight in vite.config.ts).
 */
import href from './digitalWorld.css?url';

/** Adds the stylesheet once; resolves when it has loaded, or failed, or after a few seconds, so a page never waits for long. */
function addStylesheet(): Promise<void> {
  if (typeof document === 'undefined' || document.querySelector('link[data-course="digital-world"]')) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.course = 'digital-world';
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    document.head.append(link);
    // jsdom (the unit tests) never loads a stylesheet.
    if (navigator.userAgent.includes('jsdom')) resolve();
    else setTimeout(resolve, 4000);
  });
}

/** Resolves once Digital World's styles are on the page (or couldn't be). */
export const stylesheetReady: Promise<void> = addStylesheet();
