/**
 * A preview course's styles. The site has one stylesheet for every page
 * (vite.config.ts, cssCodeSplit: false), which would take in any CSS file
 * the code imports, even here, and every device would download it. So the
 * kit's CSS (./previewCourse.css) and each course's own are files of their
 * own (`?url`: built into assets/preview/, src/courses/build.ts), added with
 * a <link> when a course's code first loads. Their class names start
 * "tw-pc-" (the kit) or the course's own prefix ("tw-dw-"), and the build
 * stops if one reaches the site's stylesheet (keepFirstVisitLight in
 * vite.config.ts).
 */
import kitHref from './previewCourse.css?url';

const added = new Map<string, Promise<void>>();

/**
 * Adds a stylesheet once (by `key`); resolves when it has loaded, or failed,
 * or after a few seconds, so a page never waits for long.
 */
export function addStylesheet(href: string, key: string): Promise<void> {
  const known = added.get(key);
  if (known) return known;
  if (typeof document === 'undefined' || document.querySelector(`link[data-course="${key}"]`)) return Promise.resolve();
  const ready = new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.course = key;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    document.head.append(link);
    // jsdom (the unit tests) never loads a stylesheet.
    if (navigator.userAgent.includes('jsdom')) resolve();
    else setTimeout(resolve, 4000);
  });
  added.set(key, ready);
  return ready;
}

/** Resolves once the kit's styles and a course's own (if it has any) are on the page, or couldn't be. */
export function courseStylesheetsReady(course?: { href: string; key: string }): Promise<void> {
  return Promise.all([addStylesheet(kitHref, 'preview-kit'), course ? addStylesheet(course.href, course.key) : undefined]).then(() => undefined);
}
