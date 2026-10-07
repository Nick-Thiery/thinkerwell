/**
 * Where Thinkerwell lives on the web, and which of its pages search engines
 * should index (docs/notes/seo.md). Pure data, shared by the app (the
 * footer's LinkedIn link) and the build (src/seo/build.ts, run from
 * vite.config.ts), so nothing here may import from the app.
 */

/** The production site. Canonical links, the sitemap and link previews use it. */
export const SITE_ORIGIN = 'https://thinkerwell.app';

/**
 * Thinkerwell's LinkedIn Page, linked from the footer and named in the home
 * page's Organization data (sameAs). The clean address, without LinkedIn's
 * tracking parameters (confirmed by the team, 8 October 2026).
 */
export const THINKERWELL_LINKEDIN = 'https://www.linkedin.com/company/thinkerwell/';

/** The public pages besides the lessons: their address, the file the build writes for it, and their key under `seo` in en.json. */
export const PUBLIC_PAGES = [
  { key: 'home', path: '/', file: 'index.html' },
  { key: 'about', path: '/about', file: 'about.html' },
  { key: 'course', path: '/course', file: 'course.html' },
  { key: 'educators', path: '/educators', file: 'educators.html' },
  { key: 'organisations', path: '/organisations', file: 'organisations.html' },
  { key: 'credits', path: '/credits', file: 'credits.html' },
] as const;

export type PublicPageKey = (typeof PUBLIC_PAGES)[number]['key'];

/**
 * A lesson's public, indexed address: its Read step, which carries the
 * lesson's reading, evidence, picture and key words. The other steps
 * (Write, Speak, Watch, Reflect), the print view and the bare /lesson/:id
 * are short or repeat it, so they are served the noindex shell instead.
 */
export function lessonPublicPath(lessonId: string): string {
  return `/lesson/${lessonId}/read`;
}

/** The file the build writes for a lesson's public address (served by the rewrite in vercel.json). */
export function lessonPublicFile(lessonId: string): string {
  return `lesson/${lessonId}/read.html`;
}

/**
 * The page every other address gets (vercel.json's last rewrite): the same
 * app, with `noindex` and no canonical link, so learners' journals,
 * Settings, teacher tools, certificates, section checks, print views, the
 * other lesson steps and unknown addresses stay out of search results.
 */
export const SHELL_FILE = 'app.html';
