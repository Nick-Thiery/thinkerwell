/**
 * The reviewers' page's styles, a file of its own (`?url`: built into
 * assets/preview/video-review/, src/courses/build.ts) added with a <link>
 * when the page first loads, so the site's one stylesheet, which every
 * learner downloads, never carries them. Like Digital World's
 * (src/courses/digital-world/stylesheet.ts).
 */
import href from './videoReview.css?url';

function addStylesheet(): Promise<void> {
  if (typeof document === 'undefined' || document.querySelector('link[data-course="video-review"]')) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.course = 'video-review';
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    document.head.append(link);
    // jsdom (the unit tests) never loads a stylesheet.
    if (navigator.userAgent.includes('jsdom')) resolve();
    else setTimeout(resolve, 4000);
  });
}

/** Resolves once the page's styles are on the page (or couldn't be). */
export const stylesheetReady: Promise<void> = addStylesheet();
