/**
 * What search engines and link previews read in each page's raw HTML
 * (docs/notes/seo.md): a title, a description, a canonical link, Open Graph
 * and Twitter tags, and, on the home page, a little structured data. The
 * app is drawn in the browser, so these have to be in the HTML file itself:
 * crawlers and link previews (WhatsApp, LinkedIn) read the file, and only
 * some of them run the app.
 *
 * Pure: vite.config.ts reads en.json and the content files and passes them
 * in (the `seoPages` plugin), and the tests do the same. The words come
 * from en.json (`seo.*`), so the app's own tab titles (usePageTitle) say
 * the same thing.
 */
import { lessonPublicFile, lessonPublicPath, PUBLIC_PAGES, SITE_ORIGIN, THINKERWELL_LINKEDIN } from './site.ts';

/** The fields of a lesson file the pages need. */
export interface SeoLesson {
  id: string;
  number: number;
  title: string;
  learningGoal: string;
}

export interface SeoInput {
  /** en.json, as parsed. */
  messages: unknown;
  /** content/course.json's course title ("Exploring Our World"). */
  courseTitle: string;
  /** Every lesson, in any order. */
  lessons: readonly SeoLesson[];
}

/** One indexable page: its address, the file the build writes and what its head says. */
export interface SeoPage {
  path: string;
  file: string;
  title: string;
  description: string;
  /** Absolute https address: SITE_ORIGIN plus `path`. */
  canonical: string;
  /** JSON-LD for the page, if any (the home page only). */
  structuredData?: unknown;
}

/** Where the page metadata sits in index.html; the build swaps what's between the two for each page. */
export const HEAD_START = '<!--page-metadata-->';
export const HEAD_END = '<!--/page-metadata-->';

/** The share picture (public/social-card.png, 1200 x 630) and the app icon Google may show for the site. */
const SOCIAL_CARD = `${SITE_ORIGIN}/social-card.png`;
const LOGO = `${SITE_ORIGIN}/icons/icon-512.png`;

function message(messages: unknown, key: string, params: Record<string, string | number> = {}): string {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined;
  }
  if (typeof node !== 'string') throw new Error(`en.json has no message ${key}`);
  return node.replace(/\{(\w+)\}/g, (_whole, name: string) => {
    if (!(name in params)) throw new Error(`${key}: no value for {${name}}`);
    return String(params[name]);
  });
}

/** Every page search engines should index, in sitemap order: the six public pages, then the lessons by number. */
export function seoPages({ messages, courseTitle, lessons }: SeoInput): SeoPage[] {
  const pages: SeoPage[] = PUBLIC_PAGES.map(({ key, path, file }) => ({
    path,
    file,
    title: message(messages, `seo.${key}.title`),
    description: message(messages, `seo.${key}.description`, { lessons: lessons.length }),
    canonical: `${SITE_ORIGIN}${path}`,
  }));
  pages[0]!.structuredData = homeStructuredData(messages);
  for (const lesson of [...lessons].sort((a, b) => a.number - b.number)) {
    const path = lessonPublicPath(lesson.id);
    pages.push({
      path,
      file: lessonPublicFile(lesson.id),
      title: message(messages, 'seo.lessonTitle', { number: lesson.number, title: lesson.title }),
      description: message(messages, 'seo.lessonDescription', { number: lesson.number, course: courseTitle, goal: lesson.learningGoal }),
      canonical: `${SITE_ORIGIN}${path}`,
    });
  }
  return pages;
}

/**
 * The home page's structured data: the site's name and address (WebSite),
 * and Thinkerwell as an Organization with its LinkedIn Page. Deliberately
 * nothing more: no NGO or nonprofit type, legal name, address, awards,
 * ratings or partners (CLAUDE.md rule 8).
 */
export function homeStructuredData(messages: unknown): unknown {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, name: 'Thinkerwell', url: `${SITE_ORIGIN}/` },
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: 'Thinkerwell',
        url: `${SITE_ORIGIN}/`,
        logo: LOGO,
        description: message(messages, 'seo.home.description'),
        sameAs: [THINKERWELL_LINKEDIN],
      },
    ],
  };
}

function escapeAttribute(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The share picture's tags, the same on every page. */
function shareImageTags(messages: unknown): string[] {
  const alt = escapeAttribute(message(messages, 'seo.imageAlt'));
  return [
    `<meta property="og:image" content="${SOCIAL_CARD}" />`,
    '<meta property="og:image:type" content="image/png" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${alt}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:image" content="${SOCIAL_CARD}" />`,
    `<meta name="twitter:image:alt" content="${alt}" />`,
  ];
}

/** One indexable page's head tags: title, description, canonical, Open Graph, Twitter, and its structured data. */
export function pageHead(page: SeoPage, messages: unknown): string {
  const title = escapeAttribute(page.title);
  const description = escapeAttribute(page.description);
  const tags = [
    `<title>${escapeText(page.title)}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${page.canonical}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Thinkerwell" />',
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${page.canonical}" />`,
    '<meta property="og:locale" content="en_GB" />',
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    ...shareImageTags(messages),
  ];
  if (page.structuredData) {
    // "<" escaped so the JSON can never close the script element early.
    tags.push(`<script type="application/ld+json">${JSON.stringify(page.structuredData).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.join('\n    ');
}

/**
 * The head of app.html, which every non-public address gets: `noindex`, no
 * canonical link, and the home page's words for anyone who shares such a
 * link (a share preview has to say something).
 */
export function shellHead(messages: unknown): string {
  const description = escapeAttribute(message(messages, 'seo.home.description'));
  return [
    '<title>Thinkerwell</title>',
    '<meta name="robots" content="noindex" />',
    `<meta name="description" content="${description}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Thinkerwell" />',
    '<meta property="og:title" content="Thinkerwell" />',
    `<meta property="og:description" content="${description}" />`,
    '<meta property="og:locale" content="en_GB" />',
    '<meta name="twitter:title" content="Thinkerwell" />',
    `<meta name="twitter:description" content="${description}" />`,
    ...shareImageTags(messages),
  ].join('\n    ');
}

/** index.html with its page metadata (between HEAD_START and HEAD_END, or at the bare HEAD_START marker) replaced by `head`. */
export function withHead(html: string, head: string): string {
  const block = `${HEAD_START}\n    ${head}\n    ${HEAD_END}`;
  const start = html.indexOf(HEAD_START);
  if (start === -1) throw new Error(`index.html has no ${HEAD_START} marker`);
  const end = html.indexOf(HEAD_END, start);
  return end === -1 ? html.replace(HEAD_START, block) : html.slice(0, start) + block + html.slice(end + HEAD_END.length);
}

/** sitemap.xml: every indexable page's canonical address, and nothing else. No <lastmod>: a build date isn't when a page changed. */
export function sitemapXml(pages: readonly SeoPage[]): string {
  const urls = pages.map((page) => `  <url><loc>${escapeText(page.canonical)}</loc></url>`);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
}
