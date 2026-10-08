/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEAD_END, HEAD_START, homeStructuredData, pageHead, seoPages, shellHead, sitemapXml, withHead, type SeoLesson } from './build';
import { lessonPublicFile, lessonPublicPath, PUBLIC_PAGES, SHELL_FILE, SITE_ORIGIN, THINKERWELL_LINKEDIN } from './site';

// Search engines and link previews (docs/notes/seo.md): each public page's
// head, the noindex shell for everything else, the sitemap, robots.txt and
// the vercel.json rules that serve them.

const root = path.join(import.meta.dirname, '..', '..');
const readText = (...parts: string[]) => readFileSync(path.join(root, ...parts), 'utf8');
const readJson = <T>(...parts: string[]) => JSON.parse(readText(...parts)) as T;

const messages = readJson<unknown>('src', 'i18n', 'messages', 'en.json');
const lessons = readdirSync(path.join(root, 'content', 'lessons'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => readJson<SeoLesson>('content', 'lessons', name));
const courseTitle = readJson<{ course: { title: string } }>('content', 'course.json').course.title;
const pages = seoPages({ messages, courseTitle, lessons });

describe('the indexable pages', () => {
  it('are the six public pages and every lesson’s Read step, nothing else', () => {
    expect(pages.map((page) => page.path)).toEqual([
      '/',
      '/about',
      '/course',
      '/educators',
      '/organisations',
      '/credits',
      ...[...lessons].sort((a, b) => a.number - b.number).map((lesson) => `/lesson/${lesson.id}/read`),
    ]);
    expect(pages).toHaveLength(6 + 24);
  });

  it('use the approved titles and descriptions (Thinkerwell_Google_SEO_and_LinkedIn_Handoff.md)', () => {
    const byPath = Object.fromEntries(pages.map((page) => [page.path, page]));
    expect(byPath['/']).toMatchObject({
      title: 'Thinkerwell | Free Social Studies Learning for Youth',
      description:
        'Free social studies learning for youth across Southeast Asia, especially those facing barriers to education. Explore history, geography, culture and civic life.',
    });
    expect(byPath['/about']).toMatchObject({
      title: 'About Thinkerwell | Our Mission',
      description:
        'Learn why Thinkerwell began and how its free digital platform makes social studies learning more accessible to youth facing barriers to education.',
    });
    expect(byPath['/course']).toMatchObject({
      title: 'Exploring Our World | Free Social Studies Course',
      description: "Explore Thinkerwell's 24 free lessons in history, geography, culture and civic life. Learn independently or with an educator.",
    });
    expect(byPath['/educators']).toMatchObject({
      title: 'For Educators | Thinkerwell',
      description: "Teach Thinkerwell's free social studies lessons with teacher guides, printable materials and flexible activities for shared devices.",
    });
    expect(byPath['/organisations']).toMatchObject({
      title: 'For Organisations | Thinkerwell',
      description: 'Learn how a pilot with Thinkerwell could support social studies learning for youth facing barriers to education.',
    });
    expect(byPath['/credits']).toMatchObject({
      title: 'Credits and Sources | Thinkerwell',
      description: "Explore the sources, videos, images and software behind Thinkerwell's free social studies lessons.",
    });
  });

  it('give each lesson its own title and its own learning goal as the description', () => {
    for (const lesson of lessons) {
      const page = pages.find((p) => p.path === lessonPublicPath(lesson.id))!;
      expect(page.file).toBe(lessonPublicFile(lesson.id));
      expect(page.title).toBe(`Lesson ${lesson.number}: ${lesson.title} | Thinkerwell`);
      expect(page.description).toBe(
        `Lesson ${lesson.number} of Exploring Our World, Thinkerwell's free social studies course. Learning goal: ${lesson.learningGoal}`,
      );
    }
    expect(pages.find((p) => p.path === '/lesson/finding-out-about-the-past/read')!.title).toBe(
      'Lesson 1: How can we find out about the past? | Thinkerwell',
    );
  });

  it('have unique titles and descriptions, and never call Thinkerwell a project', () => {
    expect(new Set(pages.map((page) => page.title)).size).toBe(pages.length);
    expect(new Set(pages.map((page) => page.description)).size).toBe(pages.length);
    for (const page of pages) {
      expect(`${page.title} ${page.description}`).not.toMatch(/\bprojects?\b/i);
      // No claims the site can't back (CLAUDE.md rule 8).
      expect(page.description).not.toMatch(/charity|nonprofit|non-profit|NGO|partner(s|ed)? with|results|AI-powered/i);
    }
  });

  it('have absolute https canonical addresses on the production site, without a trailing slash or a query', () => {
    for (const page of pages) {
      expect(page.canonical).toBe(`${SITE_ORIGIN}${page.path}`);
      const url = new URL(page.canonical);
      expect(url.protocol).toBe('https:');
      expect(url.host).toBe('thinkerwell.app');
      expect(url.search).toBe('');
      if (page.path !== '/') expect(url.pathname.endsWith('/')).toBe(false);
    }
  });
});

describe('the HTML heads', () => {
  const index = readText('index.html');

  it('index.html has one marker for them and no title, description or link-preview tags of its own', () => {
    expect(index.split(HEAD_START)).toHaveLength(2);
    expect(index).not.toMatch(/<title>|name="description"|property="og:|name="twitter:|rel="canonical"/);
  });

  it('a public page has its title, description, canonical link and matching link-preview tags, and no noindex', () => {
    const about = pages.find((page) => page.path === '/about')!;
    const html = withHead(index, pageHead(about, messages));
    expect(html).toContain('<title>About Thinkerwell | Our Mission</title>');
    expect(html).toContain(`<meta name="description" content="${about.description}" />`);
    expect(html).toContain('<link rel="canonical" href="https://thinkerwell.app/about" />');
    expect(html).toContain('<meta property="og:url" content="https://thinkerwell.app/about" />');
    expect(html).toContain('<meta property="og:title" content="About Thinkerwell | Our Mission" />');
    expect(html).toContain('<meta name="twitter:title" content="About Thinkerwell | Our Mission" />');
    expect(html).not.toContain('name="robots"');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    // Only the home page carries structured data.
    expect(html).not.toContain('application/ld+json');
  });

  it('escapes quotes, ampersands and angle brackets', () => {
    const head = pageHead({ ...pages[1]!, title: 'A "b" & <c>', description: 'd & "e"' }, messages);
    expect(head).toContain('<title>A "b" &amp; &lt;c&gt;</title>');
    expect(head).toContain('content="d &amp; &quot;e&quot;"');
  });

  it('app.html, for every other address, says noindex and has no canonical link', () => {
    const shell = withHead(index, shellHead(messages));
    expect(shell).toContain('<meta name="robots" content="noindex" />');
    expect(shell).not.toContain('rel="canonical"');
    expect(shell).not.toContain('og:url');
    expect(shell).toContain('<title>Thinkerwell</title>');
  });

  it('swapping a head twice leaves one head', () => {
    const once = withHead(index, pageHead(pages[0]!, messages));
    const twice = withHead(once, pageHead(pages[2]!, messages));
    expect(twice.split(HEAD_START)).toHaveLength(2);
    expect(twice.split(HEAD_END)).toHaveLength(2);
    expect(twice).toContain('<title>Exploring Our World | Free Social Studies Course</title>');
    expect(twice).not.toContain('Free Social Studies Learning for Youth</title>');
  });
});

describe('structured data (home page only)', () => {
  const data = homeStructuredData(messages) as { '@context': string; '@graph': Array<Record<string, unknown>> };

  it('is a WebSite and an Organization with the site address and the LinkedIn Page', () => {
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@graph'].map((node) => node['@type'])).toEqual(['WebSite', 'Organization']);
    for (const node of data['@graph']) {
      expect(node.name).toBe('Thinkerwell');
      expect(node.url).toBe(`${SITE_ORIGIN}/`);
    }
    expect(data['@graph'][1]!.sameAs).toEqual([THINKERWELL_LINKEDIN]);
  });

  it('claims nothing it can’t back: no nonprofit or NGO type, legal name, address, awards, ratings or partners', () => {
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/NGO|Nonprofit|legalName|address|award|aggregateRating|review|member|sponsor|funder/i);
  });

  it('is valid JSON inside its script tag on the home page', () => {
    const head = pageHead(pages[0]!, messages);
    const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(head)?.[1];
    expect(JSON.parse(json!)).toEqual(data);
  });
});

describe('sitemap.xml and robots.txt', () => {
  it('the sitemap lists exactly the indexable pages’ canonical addresses', () => {
    const xml = sitemapXml(pages);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toEqual(pages.map((page) => page.canonical));
  });

  it('robots.txt allows everything and points to the sitemap', () => {
    const robots = readText('public', 'robots.txt');
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).not.toMatch(/^Disallow:/m);
    expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });
});

describe('vercel.json serves each page its file', () => {
  type Rule = { source: string; destination: string; has?: Array<{ type: string; value: string }>; permanent?: boolean };
  const vercel = readJson<{ trailingSlash?: boolean; rewrites: Rule[]; redirects?: Rule[] }>('vercel.json');

  it('rewrites each public page to its own file, before the catch-all', () => {
    for (const { path: address, file } of PUBLIC_PAGES) {
      if (address === '/') continue;
      expect(vercel.rewrites).toContainEqual({ source: address, destination: `/${file}` });
    }
  });

  it('rewrites the Read step of exactly the lessons that exist', () => {
    const rule = vercel.rewrites.find((r) => r.destination === '/lesson/:id/read.html')!;
    const ids = /^\/lesson\/:id\(([^)]+)\)\/read$/.exec(rule.source)?.[1]?.split('|');
    expect(new Set(ids)).toEqual(new Set(lessons.map((lesson) => lesson.id)));
  });

  it('sends every other page address to the noindex shell, last', () => {
    const last = vercel.rewrites.at(-1)!;
    expect(last.destination).toBe(`/${SHELL_FILE}`);
    // Never an address with a file extension (robots.txt, sitemap.xml, assets).
    expect(new RegExp(`^${last.source.replace(/^\//, '/')}$`).test('/sitemap.xml')).toBe(false);
    expect(vercel.rewrites.some((r) => r.destination === '/index.html')).toBe(false);
  });

  it('drops a trailing slash and sends the old hosts to thinkerwell.app', () => {
    expect(vercel.trailingSlash).toBe(false);
    for (const host of ['thinkerwell.vercel.app', 'www.thinkerwell.app']) {
      expect(vercel.redirects).toContainEqual({
        source: '/:path(.*)',
        has: [{ type: 'host', value: host }],
        destination: 'https://thinkerwell.app/:path',
        permanent: true,
      });
    }
  });
});

describe('the favicon', () => {
  // Google Search shows a favicon beside the site only if it's square
  // (docs/notes/seo.md). The mascot picture is 422 x 423, so it can't be one.
  const png = (file: string) => {
    const bytes = readFileSync(path.join(root, file));
    expect(bytes.subarray(1, 4).toString('ascii'), file).toBe('PNG');
    // The IHDR chunk: width and height, big-endian, at bytes 16 and 20.
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  };

  it('index.html links one square PNG, a multiple of 48px and larger than 48px, as Google recommends', () => {
    const links = [...readText('index.html').matchAll(/<link rel="icon"([^>]*)>/g)].map((match) => match[1]!);
    expect(links).toHaveLength(1);
    expect(links[0]).toContain('href="/icons/favicon-96.png"');
    expect(links[0]).toContain('sizes="96x96"');
    const [width, height] = png('public/icons/favicon-96.png');
    expect(width).toBe(height);
    expect(width).toBe(96);
    expect(width! % 48).toBe(0);
  });

  it('favicon.ico holds square 16, 32 and 48px icons', () => {
    const ico = readFileSync(path.join(root, 'public', 'favicon.ico'));
    // ICONDIR: reserved 0, type 1 (icon), then the number of images; each ICONDIRENTRY is 16 bytes (width, height; 0 means 256).
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]);
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => [ico[6 + i * 16]! || 256, ico[7 + i * 16]! || 256]);
    for (const [w, h] of sizes) expect(w).toBe(h);
    expect(sizes.map(([w]) => w).sort((a, b) => a! - b!)).toEqual([16, 32, 48]);
  });
});

describe('the LinkedIn Page', () => {
  it('is a LinkedIn company Page for thinkerwell', () => {
    const url = new URL(THINKERWELL_LINKEDIN);
    expect(url.host).toBe('www.linkedin.com');
    expect(url.pathname).toBe('/company/thinkerwell/');
    // The clean address: no tracking parameters in a permanent public link.
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  });
});
