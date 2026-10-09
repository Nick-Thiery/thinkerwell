/// <reference types="vitest/config" />
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { lazyChunkFor } from './src/app/lazy/firstPage.ts';
import { LESSON_CATALOG_FIELDS } from './src/content/catalogFields.ts';
import { COURSES, DEFAULT_COURSE_ID } from './src/content/courses.ts';
import {
  COURSE_MESSAGES_ID,
  COURSE_MESSAGES_PREFIX,
  PREVIEW_ASSET_DIR,
  PREVIEW_PRECACHE_IGNORES,
  isPreviewModule,
  previewAssetFileName,
  previewChunkFileName,
} from './src/courses/build.ts';
import { checkTranslation, loadContent, loadCourse, loadQuizzes, parseContentFile, type ContentFileKind } from './src/content/load.ts';
import type { Lesson, QuizFile } from './src/content/schema.ts';
import {
  LANGUAGE_MODULE,
  languageAssetFileName,
  languageChunkFileName,
  languageChunkName,
  languagePrecacheIgnores,
} from './src/i18n/build.ts';
import { LAZY_MESSAGE_GROUPS, LAZY_MESSAGES_ID, LAZY_MESSAGES_PREFIX } from './src/i18n/lazyGroups.ts';
import { LOCALES, PSEUDO_LOCALES, readyLocales } from './src/i18n/locales.ts';
import { PSEUDO_TRANSFORMS, pseudoMessages } from './src/i18n/pseudo.ts';
import { pageHead, seoPages, shellHead, sitemapXml, withHead, type SeoInput, type SeoLesson } from './src/seo/build.ts';
import { SHELL_FILE } from './src/seo/site.ts';

/**
 * Which kind of content file a module is, and which course's
 * (src/content/courses.ts), from its path, or null for anything else.
 * Our World's files are in content/; another course's in content/courses/<id>/.
 */
function contentKind(id: string): { kind: ContentFileKind; course: string } | null {
  // An id with a query (?raw, ?url) isn't the JSON module itself.
  if (id.includes('?')) return null;
  const file = id.replace(/\\/g, '/');
  if (/\/content\/course\.json$/.test(file)) return { kind: 'course', course: DEFAULT_COURSE_ID };
  if (/\/content\/lessons\/[^/]+\.json$/.test(file)) return { kind: 'lesson', course: DEFAULT_COURSE_ID };
  if (/\/content\/quizzes\/[^/]+\.json$/.test(file)) return { kind: 'quiz', course: DEFAULT_COURSE_ID };
  const other = /\/content\/courses\/([^/]+)\/(course\.json|lessons\/[^/]+\.json)$/.exec(file);
  if (other) return { kind: other[2] === 'course.json' ? 'course' : 'lesson', course: other[1]! };
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
 *   lessons), as src/content/load.ts does for the tests. Then each
 *   language whose lessons are translated (`content` in src/i18n/locales.ts):
 *   its content/<code>/ files against the English (checkTranslation).
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
        const lessonFiles = readAll('lessons');
        const quizFiles = readAll('quizzes');
        const { lessons } = loadContent(course, lessonFiles, visuals);
        loadQuizzes(quizFiles, lessons);
        for (const locale of LOCALES.filter((l) => l.content)) {
          const own = (sub: string) => (existsSync(dir(`${locale.code}/${sub}`)) ? readAll(`${locale.code}/${sub}`) : {});
          const coursePath = path.join(dir(locale.code), 'course.json');
          const pictures = existsSync(dir(`${locale.code}/visuals`)) ? readdirSync(dir(`${locale.code}/visuals`)) : [];
          checkTranslation(
            locale.code,
            { course, lessons: lessonFiles, quizzes: quizFiles },
            {
              course: existsSync(coursePath) ? (JSON.parse(readFileSync(coursePath, 'utf8')) as unknown) : {},
              lessons: own('lessons'),
              quizzes: own('quizzes'),
              visuals: new Set(pictures.filter((name) => name.endsWith('.svg')).map((name) => `visuals/${name}`)),
            },
          );
        }
        // Every other course (content/courses/<id>/): its own schemas, the
        // same checks, and each lesson's activity. A preview course's
        // pictures may not be drawn yet (src/content/load.ts, loadCourse).
        for (const course of COURSES.filter((c) => c.dir)) {
          const lessons = readAll(`${course.dir}/lessons`);
          const raw = JSON.parse(readFileSync(path.join(dir(course.dir), 'course.json'), 'utf8')) as unknown;
          const pictureDir = dir(`${course.dir}/visuals`);
          const pictures = existsSync(pictureDir) ? readdirSync(pictureDir).filter((name) => name.endsWith('.svg')).map((name) => `visuals/${name}`) : [];
          loadCourse(course.id, raw, lessons, { pictures: new Set(pictures), picturesRequired: !course.preview });
        }
      } catch (error) {
        this.error(`The content has problems:\n${error instanceof Error ? error.message : String(error)}`);
      }
    },
    transform(code, id) {
      const found = contentKind(id);
      if (!found) return null;
      const file = path.relative(root, id).replace(/\\/g, '/');
      try {
        return { code: JSON.stringify(parseContentFile(found.kind, JSON.parse(code), file, found.course)), map: null };
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
 * - No Arabic or Vietnamese font in the site's one stylesheet: each is a
 *   stylesheet of its own, added only while a language that needs it is shown
 *   (src/i18n/fonts/index.ts). Imported from code as CSS rather than as a
 *   file (`?url`), cssCodeSplit: false would take it into the site's.
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
            `A lazily loaded chunk (${fileName}) is in what a first visit downloads, imported by ${by.join(', ')}: something on the home page or course map imports a file from src/app/lazy/ or a module only those pages should use.`,
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
        // A preview course (src/content/courses.ts) is only for devices that turned it on:
        // its code, lessons and words, and the door to it, stay in assets/preview/, which nothing precaches.
        const preview = ids.find((id) => isPreviewModule(id));
        if (preview && (!chunk.fileName.startsWith(PREVIEW_ASSET_DIR) || firstVisit.has(chunk.fileName))) {
          this.error(
            `A preview course's module is in ${chunk.fileName} (from ${preview}), which ${firstVisit.has(chunk.fileName) ? 'a first visit downloads' : 'every device stores offline'}. Import src/courses/ only with import(): src/app/previewDoor.tsx and src/app/PreviewCourses.tsx (src/courses/build.ts).`,
          );
        }
      }
      const map = Object.keys(bundle).find((fileName) => fileName.endsWith('.map'));
      if (map) this.error(`A source map is in the production build (${map}).`);
    },
    // The site's stylesheet is made after the other plugins' generateBundle.
    writeBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'asset' || !output.fileName.endsWith('.css') || /^assets\/fonts-(arabic|vietnamese)\//.test(output.fileName)) continue;
        if (/vazirmatn/i.test(String(output.source))) {
          this.error(
            `The Arabic font is in the site's stylesheet (${output.fileName}). Import src/i18n/fonts/arabic.css only with ?url (src/i18n/fonts/index.ts).`,
          );
        }
        if (/be vietnam pro|be-vietnam-pro/i.test(String(output.source))) {
          this.error(
            `The Vietnamese font is in the site's stylesheet (${output.fileName}). Import src/i18n/fonts/vietnamese.css only with ?url (src/i18n/fonts/index.ts).`,
          );
        }
        if (!output.fileName.startsWith(PREVIEW_ASSET_DIR) && /\.tw-dw-/.test(String(output.source))) {
          this.error(
            `A preview course's styles are in the site's stylesheet (${output.fileName}). Import its CSS only with ?url (src/courses/digital-world/stylesheet.ts).`,
          );
        }
      }
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
        // The chunk that holds the page module. A preview course imports these chunks too
        // (src/courses/digital-world/index.tsx), so the module may not be the chunk's facade.
        const chunk = chunks.find((c) => (c.moduleIds ?? Object.keys(c.modules)).some((id) => id.replace(/\\/g, '/').endsWith(`/src/app/lazy/${name}.ts`)));
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
 * Leaves the words only the build uses out of the messages the browser
 * downloads: the pages' search descriptions and the share picture's
 * description (en.json and id.json, `seo.*.description`,
 * `seo.lessonDescription`, `seo.imageAlt`). seoFiles() writes them into
 * each page's HTML head from the files on disk; the app only shows the
 * search titles (useFullPageTitle). en.json is in the first chunk, so this
 * keeps about half a kilobyte off every first visit. The files themselves
 * are untouched, and tests and check:i18n read them whole.
 *
 * It also leaves out each preview course's own words (`digitalWorld`, its
 * `messages` in src/content/courses.ts) and the groups only lazily loaded
 * pages show (`LAZY_MESSAGE_GROUPS`, src/i18n/lazyGroups.ts): they reach
 * the browser only with the code that shows them, through lazyMessages()
 * below.
 */
function stripBuildOnlyMessages(): Plugin {
  return {
    name: 'thinkerwell:strip-build-only-messages',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]src[\\/]i18n[\\/]messages[\\/](?!.*\.notes\.json$)[^\\/]+\.json$/.test(id)) return null;
      const messages = JSON.parse(code) as { seo?: Record<string, unknown> } & Record<string, unknown>;
      for (const [key, value] of Object.entries(messages.seo ?? {})) {
        if (value && typeof value === 'object') delete (value as Record<string, unknown>).description;
        else if (key === 'lessonDescription' || key === 'imageAlt') delete messages.seo![key];
      }
      // A preview course's own words, and a lazily loaded group's, go with the code that shows them instead (lazyMessages below).
      for (const course of COURSES) if (course.messages) delete messages[course.messages];
      for (const group of LAZY_MESSAGE_GROUPS) delete messages[group];
      return { code: JSON.stringify(messages), map: null };
    },
  };
}

/**
 * Words that load with the code that shows them, not with the app: a
 * preview course's own interface words (src/content/courses.ts,
 * `messages`) and the lazily loaded groups (src/i18n/lazyGroups.ts). Each
 * is a top-level group of that name in every message file (en.json,
 * id.json, ...), which stripBuildOnlyMessages() leaves out of the app's
 * messages. The code that shows them imports
 * virtual:thinkerwell/course-messages/<course id> (src/courses/<id>/i18n.tsx)
 * or virtual:thinkerwell/messages/<group> (for example
 * src/pages/siteVideo/), so the words load with it: a course's only on a
 * device that has turned the preview on, never on a first visit or in the
 * precache; a group's with the lazily loaded pages that show it, never on
 * a first visit to the home page. In the dev server and in tests the app's
 * messages still have them too.
 */
function lazyMessages(): Plugin {
  let root = process.cwd();
  let building = false;
  const groupOf = (id: string): string | null => {
    if (id.startsWith(COURSE_MESSAGES_ID)) return COURSES.find((c) => c.id === id.slice(COURSE_MESSAGES_ID.length))?.messages ?? null;
    if (id.startsWith(LAZY_MESSAGES_ID)) {
      const group = id.slice(LAZY_MESSAGES_ID.length);
      return (LAZY_MESSAGE_GROUPS as readonly string[]).includes(group) ? group : null;
    }
    return null;
  };
  return {
    name: 'thinkerwell:lazy-messages',
    configResolved(config) {
      root = config.root;
      building = config.command === 'build';
    },
    resolveId(id) {
      if (id.startsWith(COURSE_MESSAGES_PREFIX)) {
        const course = COURSES.find((c) => c.messages && c.id === id.slice(COURSE_MESSAGES_PREFIX.length));
        return course ? `${COURSE_MESSAGES_ID}${course.id}` : null;
      }
      if (id.startsWith(LAZY_MESSAGES_PREFIX)) {
        const group = id.slice(LAZY_MESSAGES_PREFIX.length);
        return (LAZY_MESSAGE_GROUPS as readonly string[]).includes(group) ? `${LAZY_MESSAGES_ID}${group}` : null;
      }
      return null;
    },
    load(id) {
      const group = groupOf(id);
      if (!group) return null;
      const words: Record<string, unknown> = {};
      // In a production build a lazily loaded page's words (these chunks are precached) carry only
      // English and the languages learners can choose: a language that is not ready (the Vietnamese
      // preview) ships nothing to every device. A preview course's words are never precached anyway.
      const offered = new Set(['en', ...readyLocales().map((locale) => locale.code)]);
      for (const code of messageFileCodes()) {
        if (building && id.startsWith(LAZY_MESSAGES_ID) && !offered.has(code)) continue;
        const file = path.join(root, 'src', 'i18n', 'messages', `${code}.json`);
        this.addWatchFile(file);
        const messages = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
        if (messages[group]) words[code] = { [group]: messages[group] };
      }
      return `export default ${JSON.stringify(words)};`;
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

/**
 * Search engines and link previews (docs/notes/seo.md). The app is drawn in
 * the browser, and crawlers and link previews read the HTML file, so each
 * public page gets a file of its own with its own head: title, description,
 * canonical link, Open Graph and Twitter tags (src/seo/build.ts, words from
 * en.json's `seo`).
 * - index.html (the home page) gets the home page's head, in the dev server
 *   too, at its <!--page-metadata--> marker.
 * - about.html, course.html, educators.html, organisations.html,
 *   credits.html and lesson/<id>/read.html: the same file with that page's
 *   head. vercel.json rewrites each address to its file.
 * - app.html: the same file with `noindex` and no canonical link, for every
 *   other address (vercel.json's last rewrite): journals, Settings, teacher
 *   tools, certificates, checks, print views, the other lesson steps and
 *   unknown addresses.
 * - sitemap.xml: the public pages' canonical addresses (public/robots.txt
 *   points to it).
 * None of these is precached: the service worker answers every page load
 * with index.html, as before (`offline()`).
 *
 * `vite preview` serves them the way Vercel does, so the end-to-end tests
 * check the real thing: an address with a file of its own gets it, any other
 * page address gets app.html, and an address ending in "/" is redirected
 * without it (vercel.json's trailingSlash: false).
 */
function seoFiles(): Plugin {
  let root = process.cwd();
  const input = (): SeoInput => {
    const read = (...parts: string[]) => JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as unknown;
    const lessons = readdirSync(path.join(root, 'content', 'lessons'))
      .filter((name) => name.endsWith('.json'))
      .map((name) => read('content', 'lessons', name) as SeoLesson);
    const course = read('content', 'course.json') as { course: { title: string } };
    return { messages: read('src', 'i18n', 'messages', 'en.json'), courseTitle: course.course.title, lessons };
  };
  return {
    name: 'thinkerwell:seo-files',
    configResolved(config) {
      root = config.root;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const seo = input();
        return withHead(html, pageHead(seoPages(seo)[0]!, seo.messages));
      },
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const index = bundle['index.html'];
        if (!index || index.type !== 'asset') {
          this.error('thinkerwell:seo-files: index.html is not in the bundle yet');
        }
        const html = String(index.source);
        const seo = input();
        const pages = seoPages(seo);
        for (const page of pages) {
          if (page.file === 'index.html') continue;
          this.emitFile({ type: 'asset', fileName: page.file, source: withHead(html, pageHead(page, seo.messages)) });
        }
        this.emitFile({ type: 'asset', fileName: SHELL_FILE, source: withHead(html, shellHead(seo.messages)) });
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(pages) });
      },
    },
    configurePreviewServer(server) {
      const dist = path.resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const url = new URL(req.url ?? '/', 'http://preview');
        const pathname = decodeURIComponent(url.pathname);
        // The home page, files (anything with an extension) and anything odd go on as before.
        if (pathname === '/' || /\.[^/]+$/.test(pathname) || pathname.includes('..')) return next();
        if (pathname.endsWith('/')) {
          res.statusCode = 308;
          res.setHeader('Location', `${pathname.replace(/\/+$/, '')}${url.search}`);
          res.end();
          return;
        }
        if (existsSync(path.join(dist, `${pathname}.html`))) return next();
        req.url = `/${SHELL_FILE}${url.search}`;
        next();
      });
    },
  };
}

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
 * - Precached: index.html (not the other pages' HTML files or app.html,
 *   `seoFiles()`: page loads get index.html anyway), all JS (the app, the libraries and every lesson
 *   and section check, which are bundled into the `content` chunk), the CSS,
 *   the fonts (woff2 only; fonts.css asks for nothing else), the lesson
 *   pictures and public/images. Not the two flat mascot files (for
 *   printouts and emails; no page uses them) or the app icons (the browser
 *   fetches those itself when someone installs the app).
 * - Other languages: only those learners can choose (`ready` in
 *   src/i18n/locales.ts), with the Arabic or Vietnamese font only once a ready
 *   language needs it; never the pseudo-languages for testing
 *   (src/i18n/build.ts, languagePrecacheIgnores).
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
      description: 'Free social studies learning for youth across Southeast Asia, especially those facing barriers to education. Works offline, with no accounts.',
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
      // Of the HTML files, only index.html: every page load gets it (sw.ts).
      globPatterns: ['index.html', '**/*.{js,css,woff2,svg,png,jpg}'],
      // Not precached: the app icons (the browser fetches them when the site
      // is installed), the flat mascots (for printouts and emails), the
      // link-sharing picture (only apps previewing a link fetch it) and
      // Thinkerwell's own videos (public/video/: downloaded only when someone
      // taps Watch; the MP4 and caption files don't match the patterns
      // above, but anything else put there would).
      globIgnores: [
        'icons/**',
        'video/**',
        'images/thinkerwell-mascot-white-background.png',
        'images/thinkerwell-mascot-yellow-background.png',
        'social-card.png',
        ...languagePrecacheIgnores(messageFileCodes()),
        // Preview courses: only devices that turned one on load it (src/courses/build.ts).
        ...PREVIEW_PRECACHE_IGNORES,
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
  plugins: [
    react(),
    checkContent(),
    lessonCatalog(),
    stripTeamOnlyLessonFields(),
    stripBuildOnlyMessages(),
    lazyMessages(),
    keepZodOutOfTheBrowser(),
    pseudoLocales(),
    keepFirstVisitLight(),
    preloadFirstPage(),
    seoFiles(),
    offline(),
  ],
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
        // Each language (and the Arabic and Vietnamese fonts) in its own folder, so the
        // service worker can leave out those learners can't choose yet
        // (src/i18n/build.ts), and each preview course in assets/preview/,
        // which it never stores (src/courses/build.ts).
        chunkFileNames: (chunk) => previewChunkFileName(chunk) ?? languageChunkFileName(chunk.name),
        assetFileNames: (asset) => previewAssetFileName(asset) ?? languageAssetFileName(asset),
        // Separate chunks so an app update doesn't re-download the lesson
        // text or the libraries, and vice versa. The pages a first visit
        // to the home page or the course map doesn't show are in chunks of
        // their own (src/app/lazy/).
        codeSplitting: {
          groups: [
            // One chunk per language, loaded when someone picks it; English stays in the app.
            { name: languageChunkName, test: LANGUAGE_MODULE },
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
    include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.ts'],
    css: false,
    restoreMocks: true,
    // Component tests drive the real lesson player over fake-indexeddb with
    // userEvent; on a busy machine one can pass the 5 s default, and a timed-out
    // test keeps running into the next one. 15 s costs nothing when things are quick.
    testTimeout: 15_000,
  },
});
