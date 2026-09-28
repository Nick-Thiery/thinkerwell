/// <reference types="vitest/config" />
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { lazyChunkFor } from './src/app/lazy/firstPage.ts';
import { LESSON_CATALOG_FIELDS } from './src/content/catalogFields.ts';
import { loadContent, loadQuizzes, parseContentFile, type ContentFileKind } from './src/content/load.ts';
import type { Lesson, QuizFile } from './src/content/schema.ts';

/** Which kind of content file a module is, from its path, or null for anything else. */
function contentKind(id: string): ContentFileKind | null {
  // An id with a query (?raw, ?url) isn't the JSON module itself.
  if (id.includes('?')) return null;
  const file = id.replace(/\\/g, '/');
  if (/\/content\/course\.json$/.test(file)) return 'course';
  if (/\/content\/lessons\/[^/]+\.json$/.test(file)) return 'lesson';
  if (/\/content\/quizzes\/[^/]+\.json$/.test(file)) return 'quiz';
  return null;
}

/**
 * Checks the content (content/*.json) against the zod schemas in
 * src/content/schema.ts, so the browser doesn't have to: the app uses the
 * files as they come (src/content/index.ts) and zod stays out of the
 * bundle (about 25 kB gzipped). A problem stops the build, and shows in
 * the dev server and in Vitest.
 * - Each file as it is loaded: parsed by its schema, and passed on in its
 *   parsed form (zod trims stray spaces).
 * - At the start: all of them against each other (every section's lessons
 *   exist, ids are unique, pictures exist, section checks point at real
 *   lessons), as src/content/load.ts does for the tests.
 */
function checkContent(): Plugin {
  let root = process.cwd();
  return {
    name: 'thinkerwell:check-content',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
    },
    buildStart() {
      const dir = (sub: string) => path.join(root, 'content', sub);
      const readAll = (sub: string): Record<string, unknown> =>
        Object.fromEntries(
          readdirSync(dir(sub))
            .filter((name) => name.endsWith('.json'))
            .map((name) => [`content/${sub}/${name}`, JSON.parse(readFileSync(path.join(dir(sub), name), 'utf8')) as unknown]),
        );
      const course = JSON.parse(readFileSync(path.join(root, 'content', 'course.json'), 'utf8')) as unknown;
      const visuals = new Set(readdirSync(dir('visuals')).filter((name) => name.endsWith('.svg')).map((name) => `visuals/${name}`));
      try {
        const { lessons } = loadContent(course, readAll('lessons'), visuals);
        loadQuizzes(readAll('quizzes'), lessons);
      } catch (error) {
        this.error(`The content has problems:\n${error instanceof Error ? error.message : String(error)}`);
      }
    },
    transform(code, id) {
      const kind = contentKind(id);
      if (!kind) return null;
      const file = path.relative(root, id).replace(/\\/g, '/');
      try {
        return { code: JSON.stringify(parseContentFile(kind, JSON.parse(code), file)), map: null };
      } catch (error) {
        this.error(error instanceof Error ? error.message : String(error));
      }
    },
  };
}

const LESSON_CATALOG = 'virtual:thinkerwell/lesson-catalog';

/**
 * The lesson catalog (src/content/catalog.ts): each lesson's catalog fields
 * (src/content/catalogFields.ts) and each section check's number of
 * questions, made from the content files as they are checked and parsed
 * (zod trims stray spaces), so it always matches them. It lets the home
 * page and the course map list the lessons without loading their text.
 */
function lessonCatalog(): Plugin {
  let root = process.cwd();
  const resolved = `\0${LESSON_CATALOG}`;
  return {
    name: 'thinkerwell:lesson-catalog',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === LESSON_CATALOG ? resolved : null;
    },
    load(id) {
      if (id !== resolved) return null;
      const parsed = (sub: 'lessons' | 'quizzes', kind: ContentFileKind): unknown[] => {
        const dir = path.join(root, 'content', sub);
        return readdirSync(dir)
          .filter((name) => name.endsWith('.json'))
          .sort()
          .map((name) => {
            const file = path.join(dir, name);
            this.addWatchFile(file);
            return parseContentFile(kind, JSON.parse(readFileSync(file, 'utf8')), `content/${sub}/${name}`);
          });
      };
      const lessons = (parsed('lessons', 'lesson') as Lesson[]).map((lesson) =>
        Object.fromEntries(LESSON_CATALOG_FIELDS.map((field) => [field, lesson[field]])),
      );
      const quizQuestions = Object.fromEntries((parsed('quizzes', 'quiz') as QuizFile[]).map((quiz) => [quiz.section, quiz.questions.length]));
      return `export default ${JSON.stringify({ lessons, quizQuestions })};`;
    },
  };
}

/**
 * Stops the build if zod reaches the browser bundle. The content is checked
 * at build time (checkContent above), so the browser never needs zod; but
 * importing any value (not just a type) from src/content/schema.ts brings
 * all of it in: about 25 kB gzipped, and its feature check calls
 * Function(''), which the site's Content-Security-Policy blocks (phase 8
 * found QUIZ_SKILLS doing exactly this).
 */
function keepZodOutOfTheBrowser(): Plugin {
  return {
    name: 'thinkerwell:keep-zod-out-of-the-browser',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        const ids = output.moduleIds ?? Object.keys(output.modules);
        const zod = ids.find((id) => /[\\/]node_modules[\\/]zod[\\/]/.test(id));
        if (zod) {
          this.error(
            `zod is in the browser bundle (${output.fileName}, from ${zod}). Import only types from src/content/schema.ts in app code.`,
          );
        }
      }
    },
  };
}

/**
 * Stops the build if a first visit would download something it shouldn't
 * (docs/notes/slow-internet.md). "First visit" is the entry chunk and every
 * chunk it imports statically: what index.html loads before any page shows.
 * - No lesson or section check file: they load with the pages that show
 *   them (src/content/catalog.ts). A value imported from src/content/index.ts
 *   by any module on the home page or course map would bring all 24 back.
 * - No dev-only page (src/dev) in any chunk, and no source map anywhere.
 */
function keepFirstVisitLight(): Plugin {
  return {
    name: 'thinkerwell:keep-first-visit-light',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = new Map(
        Object.values(bundle)
          .filter((output) => output.type === 'chunk')
          .map((chunk) => [chunk.fileName, chunk]),
      );
      const firstVisit = new Set<string>();
      const visit = (fileName: string) => {
        if (firstVisit.has(fileName)) return;
        firstVisit.add(fileName);
        for (const imported of chunks.get(fileName)?.imports ?? []) visit(imported);
      };
      for (const chunk of chunks.values()) if (chunk.isEntry) visit(chunk.fileName);
      for (const fileName of firstVisit) {
        const chunk = chunks.get(fileName);
        if (chunk?.isDynamicEntry && !chunk.isEntry) {
          const by = [...firstVisit].filter((f) => chunks.get(f)?.imports.includes(fileName));
          this.error(
            `A lazily loaded chunk (${fileName}) is in what a first visit downloads, imported by ${by.join(', ')}: something on the home page or course map imports a file from src/app/pages/ or a module only those pages should use.`,
          );
        }
      }
      for (const chunk of chunks.values()) {
        const ids = chunk.moduleIds ?? Object.keys(chunk.modules);
        const lesson = ids.find((id) => /[\\/]content[\\/](lessons|quizzes)[\\/][^\\/]+\.json$/.test(id));
        if (lesson && firstVisit.has(chunk.fileName)) {
          this.error(
            `A lesson file is in what a first visit downloads (${chunk.fileName}, from ${lesson}). Pages on the first screen read src/content/catalog.ts; only lazy pages import values from src/content/index.ts.`,
          );
        }
        const dev = ids.find((id) => /[\\/]src[\\/]dev[\\/]/.test(id));
        if (dev) this.error(`A dev-only page is in the production build (${chunk.fileName}, from ${dev}).`);
      }
      const map = Object.keys(bundle).find((fileName) => fileName.endsWith('.map'));
      if (map) this.error(`A source map is in the production build (${map}).`);
    },
  };
}

/**
 * A first visit straight to a page that loads lazily (a lesson from a
 * shared link, say) would otherwise download the app, run it, and only then
 * ask for the lesson's code and the lessons: one more round trip, and more
 * than a second on a slow connection. index.html gets a tiny script (a
 * file, so the Content-Security-Policy allows it) that, before anything
 * else runs, starts downloading the chunks that page needs, alongside the
 * app's (modulepreload, so nothing is fetched twice). Which chunk a page
 * needs is src/app/lazy/firstPage.ts, copied in as it is.
 */
function preloadFirstPage(): Plugin {
  let fileName = '';
  return {
    name: 'thinkerwell:preload-first-page',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((output) => output.type === 'chunk');
      const byFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
      const closure = (start: string, into = new Set<string>()): Set<string> => {
        if (into.has(start)) return into;
        into.add(start);
        for (const imported of byFile.get(start)?.imports ?? []) closure(imported, into);
        return into;
      };
      const firstVisit = new Set(chunks.filter((chunk) => chunk.isEntry).flatMap((chunk) => [...closure(chunk.fileName)]));
      const files: Record<string, string[]> = {};
      for (const name of ['lessonPages', 'teacherPages', 'morePages']) {
        const chunk = chunks.find((c) => c.isDynamicEntry && c.facadeModuleId?.replace(/\\/g, '/').endsWith(`/src/app/lazy/${name}.ts`));
        if (!chunk) this.error(`No chunk for src/app/lazy/${name}.ts`);
        files[name] = [...closure(chunk.fileName)].filter((file) => !firstVisit.has(file)).map((file) => `/${file}`);
      }
      const source = `(()=>{const f=${JSON.stringify(files)}[(${lazyChunkFor.toString()})(location.pathname)]||[];for(const h of f){const l=document.createElement("link");l.rel="modulepreload";l.crossOrigin="";l.href=h;document.head.append(l)}})();\n`;
      fileName = this.getFileName(this.emitFile({ type: 'asset', name: 'first-page.js', source }));
    },
    transformIndexHtml: {
      order: 'post',
      handler: () => (fileName ? [{ tag: 'script', attrs: { src: `/${fileName}`, async: true }, injectTo: 'head' }] : []),
    },
  };
}

/**
 * Leaves team-only lesson fields out of the production bundle, so every
 * learner device doesn't download (and carry) notes that are never shown:
 * watch.replacementSuggestion (a possible better video, with a youtube.com
 * link) and `changes` (what changed from Base44). They are replaced with the
 * schema's own empty values (null and []), so the lesson still parses. The
 * files themselves are untouched, and tests and the content check read them
 * whole. sensitiveNotes, educatorNotes and sources stay: the educator pages
 * (the Educators page and each lesson's teacher guide) are where they are
 * meant to be shown.
 */
function stripTeamOnlyLessonFields(): Plugin {
  return {
    name: 'thinkerwell:strip-team-only-lesson-fields',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]content[\\/]lessons[\\/][^\\/]+\.json$/.test(id)) return null;
      const lesson = JSON.parse(code) as { watch?: { replacementSuggestion?: unknown }; changes?: unknown };
      if (lesson.watch && 'replacementSuggestion' in lesson.watch) lesson.watch.replacementSuggestion = null;
      if ('changes' in lesson) lesson.changes = [];
      return { code: JSON.stringify(lesson), map: null };
    },
  };
}

/**
 * Offline (CLAUDE.md rule 2): a Workbox service worker that precaches the
 * whole site at the first visit, so every lesson works without the internet
 * afterwards. See docs/notes/phase-6.md.
 *
 * - Precached: index.html, all JS (the app, the libraries and every lesson
 *   and section check, which are bundled into the `content` chunk), the CSS,
 *   the fonts (woff2 only; fonts.css asks for nothing else), the lesson
 *   pictures and public/images. Not the two flat mascot files (for
 *   printouts and emails; no page uses them) or the app icons (the browser
 *   fetches those itself when someone installs the app).
 * - Nothing else is cached at runtime, so requests the precache doesn't
 *   hold (YouTube's player after a learner's tap, anything on another
 *   server) are never touched by the service worker at all.
 * - Page loads (navigations) get the precached index.html, so any address,
 *   /lesson/... included, opens offline. /api/ (measurement, later) and
 *   file addresses are left to the network.
 * - registerType 'prompt': a new version installs in the background and
 *   then waits. It never takes over by itself; src/offline/serviceWorker.ts
 *   shows "New version ready" and switches only when someone taps it (or
 *   the next time Thinkerwell opens with no other tab on the old one).
 * - The app registers the worker itself (injectRegister: false), in
 *   production only.
 * - The worker is src/offline/sw.ts (injectManifest): the same Workbox
 *   precache and routes the generated worker had, but the first visit
 *   downloads the precache six files at a time instead of one after another
 *   (docs/notes/slow-internet.md).
 */
function offline(): Plugin[] {
  return VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    includeManifestIcons: false,
    manifest: {
      id: '/',
      name: 'Thinkerwell: Exploring Our World',
      short_name: 'Thinkerwell',
      description: 'Exploring Our World: a free social-studies course. Works offline, with no accounts.',
      lang: 'en',
      dir: 'ltr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      // tokens.css: --canvas and --lemon.
      background_color: '#efedf4',
      theme_color: '#ffff66',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    // The worker is our own (src/offline/sw.ts): Workbox's precache and
    // routing, but downloading the precache several files at a time.
    strategies: 'injectManifest',
    srcDir: 'src/offline',
    filename: 'sw.ts',
    injectManifest: {
      globPatterns: ['**/*.{html,js,css,woff2,svg,png,jpg}'],
      // Not precached: the app icons (the browser fetches them when the site
      // is installed), the flat mascots (for printouts and emails) and the
      // link-sharing picture (only apps previewing a link fetch it).
      globIgnores: [
        'icons/**',
        'images/thinkerwell-mascot-white-background.png',
        'images/thinkerwell-mascot-yellow-background.png',
        'social-card.png',
      ],
      rollupFormat: 'iife',
      sourcemap: false,
    },
    devOptions: { enabled: false },
  });
}

/**
 * The headers Vercel sends with every response (vercel.json, the "/(.*)"
 * rule): the Content-Security-Policy and the other security headers. `vite
 * preview` sends them too, so the end-to-end tests run the production build
 * under the same policy as the real site. The dev server doesn't: Vite's hot
 * reload needs inline scripts.
 */
function siteHeaders(): Record<string, string> {
  const vercel = JSON.parse(readFileSync(path.join(import.meta.dirname, 'vercel.json'), 'utf8')) as {
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };
  const everywhere = vercel.headers.find((rule) => rule.source === '/(.*)');
  return Object.fromEntries((everywhere?.headers ?? []).map(({ key, value }) => [key, value]));
}

// VITE_CACHE_DIR lets several dev servers run at once, each with its own
// dependency cache (for example .build-review/vite-cache-5301).
export default defineConfig({
  plugins: [react(), checkContent(), lessonCatalog(), stripTeamOnlyLessonFields(), keepZodOutOfTheBrowser(), keepFirstVisitLight(), preloadFirstPage(), offline()],
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  server: {
    // Content lives outside src/ (content/*.json) and is read at build time.
    fs: { allow: ['.'] },
    watch: {
      // Other agents' scratch files (.build-review/) and build output
      // (dist/) aren't source: watching them causes unrelated full-page
      // reloads (and, worse, mid-render blanks) while several agents work
      // in this repo at once.
      ignored: ['**/.build-review/**', '**/dist/**'],
    },
  },
  preview: {
    headers: siteHeaders(),
  },
  // The dev-only reference viewer (src/dev) pulls in lucide-react (all its
  // icons are its own modules), which Vite only discovers by crawling — so
  // the first request to /dev/components or /dev/screens/* triggers a
  // dependency re-optimize and a full reload. Listing it here avoids that
  // reload racing a page's first render (and Playwright's wait for it).
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: {
    target: 'es2022',
    // Fonts are always files: the Content-Security-Policy allows fonts only
    // from this site (font-src 'self'), not data: URLs, and the small
    // wordmark font (src/styles/fonts/) would otherwise be inlined into the CSS.
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
    // No source maps in production: smaller downloads on bad connections.
    sourcemap: false,
    // One stylesheet for every page, as before the pages were split into
    // chunks: with a stylesheet per chunk, a page's styles could load in a
    // different order and one rule win over another (the print view's
    // evidence cards did). It is about 5 kB more on a first visit.
    cssCodeSplit: false,
    rolldownOptions: {
      output: {
        // Separate chunks so an app update doesn't re-download the lesson
        // text or the libraries, and vice versa. The pages a first visit
        // to the home page or the course map doesn't show are in chunks of
        // their own (src/app/pages/).
        codeSplitting: {
          groups: [
            // Every lesson and section check, in one file: the pages that
            // show them load it (src/content/catalog.ts). course.json stays
            // with the app: every page needs it.
            { name: 'content', test: /[\\/]content[\\/](lessons|quizzes)[\\/][^\\/]+\.json$/ },
            // Registering the service worker waits for the page to load
            // (src/offline/serviceWorker.ts), so its library comes after, too.
            { name: 'workbox-window', test: /[\\/]node_modules[\\/]workbox-window[\\/]/ },
            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
          ],
        },
      },
    },
    // The content chunk is all 24 lessons (~85 kB gzipped); it is expected.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
    // Component tests drive the real lesson player over fake-indexeddb with
    // userEvent; on a busy machine one can pass the 5 s default, and a timed-out
    // test keeps running into the next one. 15 s costs nothing when things are quick.
    testTimeout: 15_000,
  },
});
