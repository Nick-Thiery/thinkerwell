# Thinkerwell

A free social-studies course, "Exploring Our World", for refugee, displaced and under-served young people. It works offline after the first visit, has no accounts, and keeps every learner's work on the device.

- Project rules (privacy, offline, accessibility, copy): `CLAUDE.md`
- Who it's for and decisions so far: `docs/PRODUCT.md`
- How it gets built, phase by phase: `docs/BUILD_PLAN.md`

## Set up

You need Node.js 22 and Python 3. Vercel builds with Node 22 (`engines` in `package.json` is `22.x`, the version the tests ran on); a newer Node works locally, but npm warns about the engine.

```sh
npm install
npm run test:e2e:install     # Playwright's Chromium, installed inside node_modules
sh scripts/setup-python.sh   # .venv with wordfreq, for the lesson checker
```

`scripts/setup-python.sh` makes a gitignored `.venv` and installs `wordfreq` there. It exists because Homebrew's Python 3.14.7 on Nick's Mac can't run pip (its `pyexpat` is broken), so the script picks a Python that works and never touches the system one.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run build` | Type check, then build the static site into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint (TypeScript, React hooks, accessibility) and Stylelint (logical properties only) |
| `npm test` | Unit and content tests (Vitest); `npm run test:watch` reruns them as you edit |
| `npm run test:e2e` | End-to-end tests (Playwright) at 390, 820 and 1280px wide; builds and serves on port 4317 |
| `npm run test:e2e:dev` | End-to-end tests for the dev-only `/dev/*` routes (Playwright, `playwright.dev.config.ts`); runs `vite` itself on port 4318, since those routes don't exist in a production build |
| `npm run check:content` | Checks `content/lessons/*.json` against `docs/content/SPEC.md`; must report 0 errors |
| `npm run size` | After `npm run build`: what a new visitor downloads for the home page and for a lesson, and what the service worker precaches, gzipped and brotli (`tools/report-sizes.mjs`) |
| `npm run perf` | After `npm run build`: first paint, page ready and load for the home page and a lesson on Slow 3G, 3G and Slow 4G with a slow CPU, served with brotli as on Vercel (`tools/measure-slow.mjs`) |
| `npm run slow-internet` | After `npm run build`: every file a first visit fetches (by kind, before and after the first screen), the whole precache with its largest files, and first paint, page ready and "offline ready" on Slow 3G and a very poor connection (`tools/slow-internet.mjs`; `-- --bytes` for sizes only). See `docs/notes/slow-internet.md` |

To run the end-to-end tests against a server you already started, set `E2E_BASE_URL`, for example `E2E_BASE_URL=http://localhost:5301 npm run test:e2e`.

To run several dev servers at once, give each its own port and cache: `VITE_CACHE_DIR=.build-review/vite-cache-5301 npx vite --port 5301 --strictPort`.

## Checking right-to-left

In development, add `?dir=rtl` to any URL (for example http://localhost:5173/course?dir=rtl). The page switches to `dir="rtl"` and stays that way in that browser tab until you open any URL with `?dir=ltr`. A note under the header shows while it's on. Production builds ignore it.

Write CSS with logical properties (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`). Stylelint rejects `margin-left`, `left`, `float: left`, four-value `margin`/`padding` and the like.

## Dev tooling

These exist only in `npm run dev` (they're gated by `import.meta.env.DEV`, which a production build resolves at compile time; `npm run build` and a `grep -r` of `dist/` for `ComponentsPage`, `docs/screens` or `dev-screen` should both come up empty). Nothing they load reaches a learner: the original reference bundle, `docs/screens/*.dc.html` and this tooling's own code never ship.

- **`/dev/components`** — every ported design-system component (`src/components/ds/`) in its main states.
- **`/dev/reference`** and **`/dev/screens`, `/dev/screens/<Name>`** — the same components and every screen in `docs/screens/*.dc.html`, rendered instead with the *original*, untouched `docs/design-system/reference/bundle.js`/`bundle.css`, for comparing the port against the source it was built from. Each opens the screen or component gallery inside an `<iframe>` pointing at a small standalone page — `dev-screen.html?name=<Name>` or `dev-reference.html` — so the reference bundle's own CSS (and its evaluated, un-typed JS) never touches the app's own pages. Those two HTML files sit next to `index.html` at the repo root but aren't registered as build entries, so `vite build` never discovers them either. Both pages also link to their standalone `dev-*.html` URL directly, which is the better URL to screenshot (no app chrome around it). `src/dev/screen-frame/` has the parsing (reads a `.dc.html` file's `<x-import>` markup and its `renderVals()` script, per `docs/screens/README.md`) and the bundle loader; `dcParser.ts` is unit-tested on its own, without loading the real bundle.
- A screen that fails to render (usually a component shape the port hasn't reconciled yet) shows the raw `.dc.html` source and the error instead of a blank frame.
- Each `.dc.html` screen keeps the fixed width it was designed at (1280, 820 or 390px; see `docs/screens/README.md`) — it's a reference, not a responsive page, so `/dev/screens/<Name>` puts it in a scrollable box rather than resizing it. `/dev/reference`'s own component gallery isn't a `.dc.html` screen and has no such fixed width; below about 1280px wide it can scroll sideways inside its box too, which is fine for a side-by-side comparison tool that never ships. It's also left-to-right only: the original bundle uses physical CSS properties, so it never mirrors for `?dir=rtl` the way the port does.
- No third-party requests, either: `bundle.css`'s Google Fonts `@import` and the screens' `<helmet>` font `<link>` are both stripped before the reference markup is rendered, and the isolated `dev-*.html` pages use this repo's own self-hosted fonts instead. `tools/shoot.mjs` below reports any request to a host other than the page's own, which is how this is checked in practice.

Try it: `VITE_CACHE_DIR=.build-review/vite-cache-5301 npx vite --port 5301 --strictPort`, then open `/dev/screens`, `/dev/screens/Main` and `/dev/reference`.

### tools/shoot.mjs

A screenshot-and-report tool for any URL, dev or production:

```sh
PLAYWRIGHT_BROWSERS_PATH=0 node tools/shoot.mjs <url> [more urls] \
  [--widths 390,820,1280] [--rtl] [--out .build-review/shots/<name>]
```

For each URL and width (390, 820 and 1280 by default) it saves a full-page screenshot and prints: horizontal overflow, console errors/warnings and uncaught page errors, every request to a host other than the page's own, every visible tap target under 44×44px, and every visible text node under 14px. Glossary words in running text (`.tw-term`) are left out of the tap-target count: WCAG 2.5.8 exempts inline targets, and `GlossaryTerm.css` gives each one a 44px-tall hit area with a `::before` that the element's own box doesn't show. `--rtl` adds `?dir=rtl` to each URL. The exit code is 0 unless a page fails to load — everything else is a report, not a failure.

## On-device storage

Learners' work is kept in IndexedDB on the device (through `idb`) and never leaves it. There are six stores: `learners`, `progress` (per learner and lesson), `quizAttempts` (per learner and section, keeping the best and the latest), `recordings` (per learner and lesson, the latest clip only), `settings` (one record for the device) and `device` (device-level values such as the current learner). Use `getStore()` from `src/storage` each time you need it rather than holding on to the store, so a connection closed by another tab's upgrade is replaced.

The schema version is `DB_VERSION` in `src/storage/db.ts`, and `migrations` there maps each version to the step that upgrades to it. To change the schema, bump `DB_VERSION`, add the next entry to `migrations` (never edit an earlier one), update `src/storage/types.ts`, and add a test to `src/storage/migrations.test.ts` that upgrades a database holding old data.

Removing a learner deletes their progress, quiz attempts and recordings in one transaction, so either all of it goes or none of it does.

## Learners, look-around and routing

`src/session/LearnerSessionProvider` (mounted once, in `AppLayout`) reads the device's learners and current learner from storage and keeps them, plus "just look around" mode, in memory for every page; `useLearnerSession()` reads it and `useLearnerProgress(learnerId)` loads one learner's saved progress into the shape `src/storage/progress.ts`'s helpers (`findContinueTarget`, `sectionProgress`, ...) take. Both effects use a `useRef` "still mounted" guard around their async storage reads — reset to `true` at the *start* of the effect, not only set to `false` in its cleanup, because React's `<StrictMode>` (which `src/main.tsx` wraps the app in) deliberately mounts, cleans up and remounts every effect once in development; a cleanup-only reset would leave the guard `false` forever and every real load would silently never finish.

`?preview=true` on any URL forces look-around mode (old Base44 educator links); "Just look around" saves nothing, not even the Listen speed. The one exception is the Settings page (`/settings`), where an educator deliberately sets up the device. Returning to the "who's learning" picker (the switcher's "I'm new here", or the look-around banner's "Choose a learner") always navigates to `/`, since the picker only exists there.

The phase-2 design-system components that link somewhere internally (`Button` with `href`, `LessonRow`, `StagePath`, `Logo`, `SiteHeader`'s nav) render a plain `<a>` by default, so a page can use them without a router. `src/components/ds/DsLinkProvider` is a small context those components check first; `AppLayout` mounts it once with `src/app/RouterDsLink.tsx`, which renders React Router's `Link` (so internal navigation doesn't reload the page or lose look-around state). A page can use the same context directly with `useDsLinkComponent()` when it needs a bespoke element to be a router-aware link too (see `LearnerDashboard`'s per-section rows, which render their own link rather than going through `Button` — `Button` wraps every child in one `<span>`, which is right for its usual icon-plus-label case but would collapse a row with several independent flex children).

## The lesson player

`/lesson/:id/:stage` is one template for all 24 lessons (phase 4). Every lesson string comes from `content/lessons/*.json` and `content/course.json`, every UI string from `en.json`; there is no per-lesson code.

- `src/app/LessonRoute.tsx` wraps the page in `LessonPlayerProvider` (keyed by lesson, so moving between stages keeps the loaded progress) and keys `LessonPage` by stage.
- `src/lesson/LessonPlayerContext.tsx` holds the lesson, the learner's progress, the reading level and the device settings; stages read them with `useLessonPlayer()` and change progress with `update(change)` (pure functions, queued), `stageEvent(event)` and `goTo(step)`.
- **Saving.** Typing is saved after 500 ms of quiet; choices, ticks, stage events and navigation save at once; blur, stage change and leaving the lesson flush. On `pagehide` and when the tab is hidden, the whole in-memory record is written in one request issued straight away (`store.putProgress`), since the page may be gone before a read could come back. That put can still be cut off at unload, so the same record is first copied synchronously to `localStorage` (`src/storage/unsavedProgress.ts`); the copy is removed once a write covering it lands, and if the page went away first, the next `getStore()` writes it back to IndexedDB before anything reads progress. IndexedDB stays the source of truth; removing a learner or all data removes their copies too. Look-around, `?preview=true` and "nobody chosen yet" keep everything in memory for the visit (`src/lesson/guestMemory.ts`) and write nothing.
- **When a stage counts as done** is written down in `src/lesson/progressRules.ts`: Read when every choice question is answered or on Continue from the quick check; Write on Continue with something written; Speak when the learner chooses how they practised; Watch when the after question is answered or on Continue; Reflect as soon as the required prompt has an answer (saved with the typing, so leaving without "Finish lesson" still counts), which also sets `completedAt`. The course map's stage dots, the learner home's continue card and the complete screen all read the same `stagesDone`, `currentStage` and `completedAt`.
- **Standard / Simpler** is remembered per learner (`Learner.readingLevel`), falling back to `settings.preferredReadingLevel`. The reading part, glossary marking and Listen follow the version on screen.
- Read's current part is in the URL (`?part=1..n`, `?part=check`), so reload and Back work without storage. Quick-check options are shuffled with a seed from the learner id, lesson and question (`src/lesson/shuffle.ts`); answers are stored by their index in the content file.
- Watch loads nothing from YouTube or Google until the learner taps "Watch the video". The poster is drawn from the content, and the `youtube-nocookie.com` iframe gets its own `referrerpolicy="strict-origin-when-cross-origin"` (the site's meta says `no-referrer`, and the player refuses to play without one). `settings.saveData` opens Watch on the written version.
- **Listen, Say it and Record yourself** (phase 5; browser support and decisions in `docs/notes/phase-5.md`). `src/speech/` wraps the browser APIs; each feature shows only where it works, so nothing broken or scary is ever on screen.
  - Listen (`src/pages/lesson/read/useListen.ts`): a local English voice (`voice.localService`) reads the part on screen, heading then one sentence per utterance, marking the sentence with `mark.tw-speaking`, and moves on part by part. Slow / Normal is `settings.listeningSpeed` (saved for a chosen learner via `setListeningSpeed`).
  - Say it (`src/pages/lesson/sayIt.tsx`, `SayItBox`): on Write's answer box, both Watch boxes and every Reflect box. On-device recognition is detected with `SpeechRecognition.available({ langs: ['en-US'], processLocally: true, quality: 'dictation' })` and run with `processLocally = true`; any other recognition may send audio online and is used only when `settings.partner.allowOnlineDictation` is on (Settings, for educators). Dictated words arrive through the box's own `onValueChange`, exactly like typing.
  - Record yourself (`src/pages/lesson/speak/useSpeakRecorder.ts`): `MediaRecorder`, microphone asked for only on Start, the latest clip per learner and lesson in the `recordings` store, never uploaded. Hidden where the device lists no microphone.
  - Tests mock `speechSynthesis`, `SpeechRecognition`, `getUserMedia` and `MediaRecorder` with `src/test/speechMocks.ts`.

## Where things live

```
content/                 lesson text and course structure (JSON), the source of truth
docs/                    product notes, build plan, design system, screen references, research
public/images/           mascot, UN goal icons, founder photo (small copies; originals in docs/design-system/assets/)
public/icons/            app icons for the web app manifest and iOS home screens
scripts/                 lesson checker (check_lesson.py), check-content.sh, setup-python.sh, optimise_images.py, subset_wordmark_font.py
src/main.tsx             entry: router and global styles
src/app/                 routes, app shell (header, learner switcher, phone nav), lesson URL handling (old Base44 ids redirect here); src/app/lazy/ holds the pages that load when first opened
src/pages/               one component per page: Home (picker/new learner/dashboard/guest), the course map, and placeholders for later phases
src/pages/lesson/        the lesson player's page (LessonPage, StageActionBar) and one folder per stage: read, write, speak, watch, reflect, complete, plus evidence and visual
src/speech/              Listen, Say it and Record yourself: local voice choice, read-aloud player, on-device speech recognition detection and dictation, MediaRecorder
src/lesson/              the lesson player's state and rules: LessonPlayerContext (progress, saving, reading level), progressRules (when a stage is done), shuffle, glossary marking, guest memory
src/session/             LearnerSessionProvider/useLearnerSession (learners, current learner, look-around) and useLearnerProgress, shared by Home and the course map
src/content/             zod schemas (schema.ts), the checks the build and tests run (load.ts), typed getters for content/*.json (index.ts, only for the pages that show lessons) and the lesson catalog every page can use (catalog.ts)
src/offline/             the service worker (sw.ts) and its page side, online status, the banners under the header, Save data
src/pages/print/         print views: a lesson (/lesson/:id/print) and the journal (/journal/print)
src/pages/certificate/   certificates: each section's (/certificate/section/:id) and the course's (/certificate/course)
src/storage/             IndexedDB (idb): learners, progress, quiz attempts, recordings, settings; src/storage/progress.ts has the pure progress-lookup helpers (continue target, per-section counts, ...)
src/i18n/                message helper; every UI string is in src/i18n/messages/en.json
src/styles/              tokens.css (copied from the design system), fonts.css, global.css, print.css
src/components/ds/       the ported design-system components
src/dev/                 dev-only routes (/dev/components, /dev/reference, /dev/screens); never shipped
tools/shoot.mjs          screenshot + report tool (overflow, console errors, foreign requests, tap targets, text size)
tools/report-sizes.mjs   npm run size: first load and precache, gzipped and brotli
tools/measure-slow.mjs   npm run perf: page timings on slow connections
tools/slow-internet.mjs  npm run slow-internet: first visit and precache bytes, and times on Slow 3G and a very poor connection
dev-screen.html          dev-only, standalone: renders one docs/screens/*.dc.html with the original reference bundle
dev-reference.html       dev-only, standalone: renders the original reference bundle's own components
e2e/                     Playwright tests (production build); lesson-player.spec.ts goes through Lesson 10 (every step of every lesson is checked in Vitest: src/pages/lesson/LessonPage.test.tsx)
e2e-dev/                 Playwright tests for the dev-only /dev/* routes (npm run test:e2e:dev)
```

## Routes

`/`, `/course`, `/lesson/:id/:stage` (stages: read, write, speak, watch, reflect, plus `complete`), `/section/:id/check`, `/journal`, `/journal/print`, `/educators`, `/about`, `/settings` (settings for this device, for educators, in the header menu), `/lesson/:id/print` (the lesson on paper), `/certificate/section/:id` and `/certificate/course` (printable certificates). `/lesson/:id` opens Read. Old Base44 links such as `/lesson/l6` or `/lesson/history-scale` redirect to the new lesson (`/lesson/l6` is Lesson 10, `/lesson/towns-near-rivers/read`), keeping any query string such as `?preview=true`. `/onboarding` goes to `/` and `/courses` to `/course`. Anything else shows a friendly "can't find that page".

## Offline

A production build has a service worker (`dist/sw.js`, built by vite-plugin-pwa from `src/offline/sw.ts` and `vite.config.ts`) that precaches the whole site after the first page loads, six files at a time. `npm run dev` has none, so nothing is ever served from an old copy while you work. To try it: `npm run build && npm run preview`, open the site once, then turn the network off in the browser's developer tools (Network, Offline) and reload or open any lesson. After a new build, reload once: the new version installs in the background and waits, and the page shows "A new version is ready" until you tap "Update now" (an open page also checks by itself every hour). To start again, unregister the worker and clear site data in the developer tools (Application). `docs/notes/phase-6.md` has the details; `docs/notes/slow-internet.md` has the sizes and times (`npm run slow-internet`).

## Deploying

The site is static and hosted on Vercel (`vercel.json` sends every page address to `index.html` so deep links work; files on disk, such as `sw.js`, are served first, and an address that ends in a file name is never answered with the page). `sw.js` and the manifest are sent with `Cache-Control: max-age=0, must-revalidate`, so browsers always see a new version; hashed files in `/assets/` are cached for a year. Every response carries the security headers in `vercel.json`, including a Content-Security-Policy that allows only this site and the youtube-nocookie.com player; `npm run preview` sends them too. The import steps and the checks to run after the first deploy are in `docs/LAUNCH_CHECKLIST.md`.
