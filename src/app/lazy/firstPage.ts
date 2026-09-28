/**
 * Which lazily loaded chunk (./lessonPages.ts, ./teacherPages.ts,
 * ./morePages.ts) a page address needs, as src/app/routes.tsx loads them, or
 * null for the home page, the course map and anything else.
 *
 * vite.config.ts (preloadFirstPage) copies this function, as it is, into a
 * tiny script index.html runs first, so a first visit straight to a lesson
 * starts downloading the lesson's code at once, alongside the app's, instead
 * of after it. It must stay self-contained: no imports, nothing from outside
 * the function. firstPage.test.ts checks it against the routes.
 */
export function lazyChunkFor(pathname: string): 'lessonPages' | 'teacherPages' | 'morePages' | null {
  const path = pathname.toLowerCase().replace(/\/+$/, '');
  if (/^\/lesson\/[^/]+\/print$/.test(path) || /^\/(journal|educators)(\/|$)/.test(path)) return 'teacherPages';
  if (/^\/lesson\/[^/]+(\/[^/]+)?$/.test(path) || /^\/section\/[^/]+\/check$/.test(path)) return 'lessonPages';
  if (/^\/(about|settings)$/.test(path) || /^\/certificate\/(course|section\/[^/]+)$/.test(path)) return 'morePages';
  return null;
}
