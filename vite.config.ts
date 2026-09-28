/// <reference types="vitest/config" />
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { loadContent, loadQuizzes, parseContentFile, type ContentFileKind } from './src/content/load.ts';
import {
  LANGUAGE_MODULE,
  languageAssetFileName,
  languageChunkFileName,
  languageChunkName,
  languagePrecacheIgnores,
} from './src/i18n/build.ts';
import { PSEUDO_LOCALES } from './src/i18n/locales.ts';
import { PSEUDO_TRANSFORMS, pseudoMessages } from './src/i18n/pseudo.ts';

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

const PSEUDO_PREFIX = 'virtual:tw-pseudo-locale/';
const PSEUDO_ID = '\0tw-pseudo-locale:';

/**
 * The pseudo-languages for testing (src/i18n/pseudo.ts), made from en.json
 * whenever the site is built, served or tested, so they always match it
 * and nobody writes them by hand. src/i18n/load.ts imports
 * virtual:tw-pseudo-locale/<code>. They become their own chunks, which the
 * service worker never precaches and learners are never offered.
 */
function pseudoLocales(): Plugin {
  let root = process.cwd();
  return {
    name: 'thinkerwell:pseudo-locales',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (!id.startsWith(PSEUDO_PREFIX)) return null;
      const code = id.slice(PSEUDO_PREFIX.length);
      return PSEUDO_LOCALES.some((locale) => locale.code === code) ? `${PSEUDO_ID}${code}` : null;
    },
    load(id) {
      if (!id.startsWith(PSEUDO_ID)) return null;
      const code = id.slice(PSEUDO_ID.length);
      const transform = PSEUDO_TRANSFORMS[code];
      if (!transform) return null;
      const file = path.join(root, 'src', 'i18n', 'messages', 'en.json');
      this.addWatchFile(file);
      const messages = pseudoMessages(JSON.parse(readFileSync(file, 'utf8')) as unknown, transform.message);
      const pseudoModule = JSON.stringify(path.join(root, 'src', 'i18n', 'pseudo.ts').replace(/\\/g, '/'));
      return [
        `import { PSEUDO_TRANSFORMS } from ${pseudoModule};`,
        `export default ${JSON.stringify(messages)};`,
        `export const decorate = PSEUDO_TRANSFORMS[${JSON.stringify(code)}].formatted;`,
      ].join('\n');
    },
  };
}

/** The pages that load when opened (src/app/routes.tsx), and what only they use. */
const LATER_PAGES =
  /[\\/]src[\\/](?:app[\\/](?:TeacherGuideRoute|AnswerKeyRoute|LessonPrintRoute|CertificateRoute)\.tsx|pages[\\/](?:SettingsPage|EducatorsPage)\.(?:tsx|css)|pages[\\/](?:settings|educators|print|certificate)[\\/])/;

/** Codes of the message files in src/i18n/messages (en, fa-AF, ...), not the translator notes. */
function messageFileCodes(): string[] {
  return readdirSync(path.join(import.meta.dirname, 'src', 'i18n', 'messages'))
    .filter((name) => name.endsWith('.json') && !name.endsWith('.notes.json'))
    .map((name) => name.slice(0, -'.json'.length));
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
 * - Other languages: only those learners can choose (`ready` in
 *   src/i18n/locales.ts), with the Arabic font only once a ready language
 *   needs it; never the pseudo-languages for testing
 *   (src/i18n/build.ts, languagePrecacheIgnores).
 * - Nothing else is cached at runtime: no runtimeCaching, so requests the
 *   precache doesn't hold (YouTube's player after a learner's tap, anything
 *   on another server) are never touched by the service worker at all.
 * - Page loads (navigations) get the precached index.html, so any address,
 *   /lesson/... included, opens offline. /api/ (measurement, later) and
 *   file addresses are left to the network.
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
      // Not precached: the app icons (the browser fetches them when the site
      // is installed), the flat mascots (for printouts and emails) and the
      // link-sharing picture (only apps previewing a link fetch it).
      globIgnores: [
        'icons/**',
        'images/thinkerwell-mascot-white-background.png',
        'images/thinkerwell-mascot-yellow-background.png',
        'social-card.png',
        ...languagePrecacheIgnores(messageFileCodes()),
      ],
      navigateFallback: '/index.html',
      // /api/ (measurement, later) and addresses of files (anything with an
      // extension, such as /icons/icon-512.png) go to the network.
      navigateFallbackDenylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
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
  plugins: [react(), checkContent(), stripTeamOnlyLessonFields(), keepZodOutOfTheBrowser(), pseudoLocales(), offline()],
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
    // No source maps in production: smaller downloads on bad connections.
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Each language (and the Arabic font) in its own folder, so the
        // service worker can leave out those learners can't choose yet
        // (src/i18n/build.ts).
        chunkFileNames: (chunk) => languageChunkFileName(chunk.name),
        assetFileNames: (asset) => languageAssetFileName(asset),
        // Separate chunks so an app update doesn't re-download the lesson
        // text or the libraries, and vice versa.
        codeSplitting: {
          groups: [
            // One chunk per language, loaded when someone picks it; English stays in the app.
            { name: languageChunkName, test: LANGUAGE_MODULE },
            { name: 'content', test: /[\\/]content[\\/].*\.json$/ },
            // Registering the service worker waits for the page to load
            // (src/offline/serviceWorker.ts), so its library comes after, too.
            { name: 'workbox-window', test: /[\\/]node_modules[\\/]workbox-window[\\/]/ },
            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
            // The pages for teachers and for paper load when opened
            // (src/app/routes.tsx); everything else the app needs is one
            // chunk, as before, rather than the handful of small shared
            // chunks the bundler would make otherwise.
            { name: (id) => (LATER_PAGES.test(id) ? null : 'app'), test: /[\\/]src[\\/]/ },
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
    include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.ts'],
    css: false,
    restoreMocks: true,
    // Component tests drive the real lesson player over fake-indexeddb with
    // userEvent; on a busy machine one can pass the 5 s default, and a timed-out
    // test keeps running into the next one. 15 s costs nothing when things are quick.
    testTimeout: 15_000,
  },
});
