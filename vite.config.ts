/// <reference types="vitest/config" />
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { loadContent, loadQuizzes, parseContentFile, type ContentFileKind } from './src/content/load.ts';

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

/**
 * Leaves team-only lesson fields out of the production bundle, so every
 * learner device doesn't download (and carry) notes that are never shown:
 * watch.replacementSuggestion (a possible better video, with a youtube.com
 * link) and `changes` (what changed from Base44). They are replaced with the
 * schema's own empty values (null and []), so the lesson still parses. The
 * files themselves are untouched, and tests and the content check read them
 * whole. educatorNotes and sources stay: the Educators page (phase 7) is
 * where they are meant to be shown.
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
 * - Nothing else is cached at runtime: no runtimeCaching, so requests the
 *   precache doesn't hold (YouTube's player after a learner's tap, anything
 *   on another server) are never touched by the service worker at all.
 * - Page loads (navigations) get the precached index.html, so any address,
 *   /lesson/... included, opens offline. /api/ (measurement, later) is left
 *   to the network.
 * - registerType 'prompt': a new version installs in the background and
 *   then waits. It never takes over by itself; src/offline/serviceWorker.ts
 *   shows "New version ready" and switches only when someone taps it (or
 *   the next time Thinkerwell opens with no other tab on the old one).
 * - The app registers the worker itself (injectRegister: false), in
 *   production only.
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
    workbox: {
      globPatterns: ['**/*.{html,js,css,woff2,svg,png,jpg}'],
      globIgnores: ['icons/**', 'images/thinkerwell-mascot-white-background.png', 'images/thinkerwell-mascot-yellow-background.png'],
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api\//],
      runtimeCaching: [],
      cleanupOutdatedCaches: true,
      // The first install takes charge of the open page at once, so its
      // pictures and fonts come from the precache offline straight away.
      // Updates still wait for a tap (skipWaiting stays off).
      clientsClaim: true,
      skipWaiting: false,
      sourcemap: false,
    },
    devOptions: { enabled: false },
  });
}

// VITE_CACHE_DIR lets several dev servers run at once, each with its own
// dependency cache (for example .build-review/vite-cache-5301).
export default defineConfig({
  plugins: [react(), checkContent(), stripTeamOnlyLessonFields(), offline()],
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
    // No source maps in production: smaller downloads on bad connections.
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Separate chunks so an app update doesn't re-download the lesson
        // text or the libraries, and vice versa.
        codeSplitting: {
          groups: [
            { name: 'content', test: /[\\/]content[\\/].*\.json$/ },
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
