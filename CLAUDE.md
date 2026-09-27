# Thinkerwell

A free social-studies course, "Exploring Our World": 24 lessons in 4 sections, each lesson in five stages (Read, Write, Speak, Watch, Reflect), plus a short check at the end of each section. It is for refugee, displaced and under-served young people, about 10–17, most of them learning English. The first pilot is with HELP for Refugees, a refugee-led learning centre in Jakarta, on shared laptops and tablets with unreliable internet. The team is Justin Park (founder and director, content) and Nick (CTO, build). Background: `docs/PRODUCT.md`.

## Rules that are never traded away

1. **Privacy.** No accounts, no passwords, no email from learners, no ads, no third-party analytics, trackers or fonts loaded from other servers. Learner data stays on the device. Recordings are never uploaded. The site never asks learners about their journey, home country, family, religion or ethnicity.
2. **Works on bad internet.** After the first visit the whole course works offline. Every save is local first. Videos are optional and every video has a written version ("Read instead").
3. **Nothing is locked.** Any lesson and any stage can be opened in any order. Quick checks and section checks never block progress, have no timers and can be retried. Wrong answers say "Not quite" in burnt orange with a hint; there is no red anywhere in learning flows.
4. **Shared devices.** Home asks "Who's learning today?" with a tile per learner. Each learner's work is separate. Anyone can "Just look around" without saving.
5. **Accessible.** WCAG 2.2 AA. Tap targets at least 44px, visible focus on everything, full keyboard use, `prefers-reduced-motion` respected, nothing below 14px, reading text 20px/32px at most 68 characters wide.
6. **Plain words.** UI copy is short, sentence case, second person, no "please", no exclamation marks, no jargon. Lesson text follows `docs/content/SPEC.md`.
7. **Ready for other languages.** Every UI string lives in `src/i18n/messages/en.json`. Use CSS logical properties (`margin-inline-start`, not `margin-left`), set `lang` and `dir` on `<html>` per locale, and mirror direction icons in right-to-left. Dari/Farsi and Arabic (right-to-left) and Somali come later; the current fonts don't cover Arabic script, so a matching font will be added then.
8. **Honest.** Thinkerwell is a student-led project and is not a registered charity or nonprofit. Don't claim otherwise anywhere.

## Stack

- Vite, React and TypeScript (strict), with React Router. It is a static site hosted on Vercel, built with Node 22 (`engines` in `package.json`). `vercel.json` holds the build settings, the SPA rewrite (never for an address that ends in a file name), the caching headers and the security headers: a Content-Security-Policy that allows only this site plus the youtube-nocookie.com player in a frame, no referrer, no framing by other sites, and the microphone only here. `vite preview` sends the same headers, so the end-to-end tests run under the real policy. The import steps and every network request are in `docs/LAUNCH_CHECKLIST.md`.
- Plain CSS: `src/styles/tokens.css` (copied from `docs/design-system/tokens.css`) plus component CSS ported from `docs/design-system/reference/bundle.css`, keeping its `tw-` class names. No Tailwind, no CSS-in-JS.
- Icons: `lucide-react`. The design system uses Lucide names.
- Fonts, self-hosted (for example Fontsource packages): Funnel Display (headings), Atkinson Hyperlegible Next (everything else) and Eczar (the "Thinkerwell" wordmark only).
- On-device storage: IndexedDB through a small typed wrapper (`idb`).
- Offline: `vite-plugin-pwa` (Workbox) precaches the whole site (app, every lesson and check, fonts, pictures, images) after the first page loads; nothing is cached at runtime, so YouTube and other servers are never touched. The app registers the worker itself (`src/offline/serviceWorker.ts`, production only): a new version waits and only starts when someone taps "Update now" (or the next time the site opens). Never make it reload by itself. Details and sizes: `docs/notes/phase-6.md`; `npm run size` reports them.
- First paint: until the app starts, `index.html` shows the header's lemon bar with the mascot (inside `#root`, drawn by the site's own CSS; React replaces it). On Slow 3G that is 2 s instead of 6 s of blank page. Keep it without words (UI strings live in en.json) and without anything that fetches ahead of the scripts.
- Content validation: `zod` schemas in `src/content/schema.ts`, checked by a test and whenever the content is built, served or tested (the content plugin in `vite.config.ts`, using `src/content/load.ts`). A problem stops the build. The browser never runs zod: `src/content/index.ts` uses the checked files as they are. App code imports only types from `schema.ts`; a value from it would bring zod into the bundle (and zod's `Function('')` check breaks the Content-Security-Policy), so the build stops if zod reaches a browser chunk.
- Tests: Vitest for logic, content and component behaviour (Testing Library), Playwright for end-to-end runs at 390, 820 and 1280px wide. Playwright blocks the service worker except in `e2e/offline.spec.ts` (`test.use({ serviceWorkers: 'allow' })`). A second, dev-only Playwright config (`playwright.dev.config.ts`, `npm run test:e2e:dev`) checks the `/dev/*` routes, which exist only in `npm run dev` and never reach `dist/`.
- Checks on every page type (phase 8): `e2e/pageTour.ts` visits every kind of page in one visit, and the no-sideways-scroll (320 to 1280px), axe and focus-ring, right-to-left, tap-size, privacy and Content-Security-Policy specs walk it. Add a stop there when you add a kind of page. Tests that set their own window sizes are tagged `@own-size` and run in the laptop project only. Measure sideways scroll against `document.documentElement.clientWidth`, never `window.innerWidth` (an emulated phone zooms out to fit a page that is too wide).
- Later (not phase 1): Vercel Functions for `POST /api/events` and a Postgres database for pilot measurement. See `docs/research/MEASUREMENT_PLAN.md`.

Commands: `npm run dev` (dev server; add `?dir=rtl` to any URL to check right-to-left), `npm run build`, `npm run typecheck`, `npm run lint` (ESLint and Stylelint), `npm test` (Vitest), `npm run test:e2e` (Playwright; run `npm run test:e2e:install` once), `npm run test:e2e:dev` (Playwright against the dev-only `/dev/*` routes; see README.md), `npm run check:content` (lesson checker; run `sh scripts/setup-python.sh` once for wordfreq), `npm run size` (after a build: first load and precache sizes), `npm run perf` (after a build: page timings on Slow 3G, 3G and Slow 4G with a slow CPU).

## Where things live

```
content/course.json            course, 4 sections, "how I practised" options, fiction label
content/lessons/L01.json …     one file per lesson (source of truth for lesson text)
content/quizzes/               the four section checks (history, geography, culture, civics)
content/visuals/               one picture per lesson (SVG); a lesson's `visual.src` points here, relative to content/
docs/PRODUCT.md                who it's for, decisions made so far
docs/LAUNCH_CHECKLIST.md       phase 8: what was checked, Vercel import steps, every network request, what's left for people
docs/design-system/            brand book (README.md), tokens, component notes, reference implementation
docs/screens/                  every redesigned screen as source; see docs/screens/README.md
docs/content/SPEC.md           the rules lesson text is written to
docs/research/                 learner context, measurement plan, audit of the old Base44 site
public/images/                 mascot, UN goal icons, founder photo (small copies made by scripts/optimise_images.py)
docs/design-system/assets/     the full-size originals of those images
scripts/check_lesson.py        checks lesson files against the spec
scripts/check_quiz.py          checks section checks against docs/content/QUIZ_SPEC.md
scripts/render_svg.js          renders a picture to PNG and flags layout problems
scripts/optimise_images.py     makes public/images and public/icons from docs/design-system/assets
src/                           the app (created in phase 1)
src/offline/                   service worker registration, connection status, the banners under the header, Save data
src/pages/print/               print views: /lesson/:id/print and /journal/print
src/pages/educators/           teacher tools: /educators/lesson/:id (teacher guide) and /educators/section/:id/answers (answer key)
```

## Design system

- The brand book is `docs/design-system/README.md`; tokens are `docs/design-system/tokens.json` and `tokens.css`. Read the README before building any screen.
- `docs/design-system/reference/bundle.js` is a working reference implementation of every component (plain `React.createElement`), with its types in `index.d.ts` and notes in `docs/design-system/components/<Name>.md`. Port each one to a typed React component in `src/components/ds/` with the **same name, props and class names**. Behaviour the reference fakes (open states, pressed states) becomes real state and events.
- `docs/screens/*.dc.html` show every screen. Build pages to match them. If a screen and the design-system docs disagree, the docs win.
- Colour rules in short: lemon `#FFFF66` only for the header, the current step, the continue card and one highlight per screen, and never for text; one ink primary button per view; lavender means help; section colours (History amber, Geography sage, Culture rose, Civics sky) only in section places and always beside the section's icon and name; correct is teal, "not quite" is burnt orange. Cards use borders, not shadows. One exception, still to be confirmed: a learner's avatar colour is Yellow, Sand, Green, Blue or White, as on the NewLearner screen (see `docs/PRODUCT.md`).
- Don't redraw, recolour or crop the mascot. Use `public/images/thinkerwell-mascot-transparent.png` on coloured grounds.

## Content

- Lesson text comes only from `content/lessons/*.json`. Never hard-code lesson text in components, and don't edit it in code. To change a lesson, edit its JSON and run `python3 scripts/check_lesson.py content/lessons/*.json` (needs `pip install wordfreq`), which must report 0 errors. Quizzes: `python3 scripts/check_quiz.py content/quizzes/*.json`.
- `id` is a stable slug used in URLs: `/lesson/:id/:stage`. `oldId` is the Base44 id; redirect `/lesson/l6` and the other old ids to the new URLs.
- "Next lesson" is worked out from the order, not stored.
- Quick-check options carry their own `correct` flag and feedback. Shuffle options with a seed per learner and question so the order stays the same when the learner comes back.
- Each glossary word is marked on its first appearance in each section, in both the standard and simpler text; tapping it opens the definition (`GlossaryTerm`).
- Evidence with `fictional: true` shows its label ("Fictional example created for this lesson.").
- Notes for teachers are in two lists: `sensitiveNotes` (sensitive topics, what never to ask, which video to preview) and `educatorNotes` (everything else). Educator pages show the sensitive ones first, marked. Learners never see either.
- Write: show the example answer only after the learner has written something or asks to see one.
- Watch: embed from `youtube-nocookie.com`, only after the learner taps play, never autoplay. If the player hasn't loaded after 20 seconds, the device is offline, or "Save data" is on, show the written version. "Save data" is the Settings choice, or the browser's own data saver (`navigator.connection.saveData`) until someone chooses (`src/offline/saveData.ts`). Before the tap nothing may be requested from YouTube or Google (no thumbnails; the poster is drawn from the content). The iframe carries its own `referrerpolicy="strict-origin-when-cross-origin"`, because `index.html` sets `no-referrer` for the site and YouTube's player refuses to play without a referrer (Error 153). The content note goes only in a collapsed "For teachers" note.
- Reflect: the required prompt completes the lesson.
- When each stage counts as done is written down in `src/lesson/progressRules.ts`; change it there (and in `docs/PRODUCT.md`), not in the stage components. The course map, the learner home and the complete screen read the same saved `stagesDone`, `currentStage` and `completedAt`.
- The lesson player (`src/lesson/`, `src/pages/lesson/`) saves through `useLessonPlayer().update()`; never write lesson progress to IndexedDB from a stage directly. Look-around and "nobody chosen" keep work in memory only.
- `estimatedMinutes` is an estimate; show it as "About 30–50 min".
- Pictures: show `visual.src` inline in the Read stage near the evidence, with `visual.alt` as its alt text. They follow `docs/content/VISUALS_SPEC.md`; new pictures must too. "See it bigger" under each picture opens it in a native modal `<dialog>`, at least 640px wide (so its labels are at least 14px), with its area scrolling on a phone and pinch-zoom left on (`src/pages/lesson/visual/LessonVisual.tsx`). Never turn off pinch-zoom anywhere.
- Section checks (`content/quizzes/<section>.json`): one question at a time, shuffled options with per-option feedback, an optional `stimulus` (a short made-up example) shown above the question, and a results message chosen by score (high: at least 8 of 10 or 10 of 12; low: under half; otherwise middle). Questions are written to `docs/content/QUIZ_SPEC.md`.

## Data kept on the device

Version the schema and write migrations. Nothing leaves the device in phase 1.

- `learners`: id, name, colour, created date, optional class code, optional reading level (Standard or Simpler, last chosen).
- `progress` per learner and lesson: stages done, current stage, warm-up answer, check answers, writing and planning notes, self-check ticks, how they practised speaking, reflections, completed date.
- `quizAttempts` per learner and section: answers, score, date (keep the best and the latest).
- `recordings` per learner and lesson: the latest audio clip only. Delete it when the learner is removed or taps Delete.
- `settings` per device: save data (`null` until someone chooses), listening speed, preferred reading level, partner options, and the last "Check this device" result for Say it (`speechCheck`, `null` until someone checks).

The journal is built from saved writing and reflections (`journalByLesson` in `src/storage/progress.ts`); it is not stored separately. Its print view is `/journal/print`; the journal page's "Print my journal" links there.

## Listen, Say it and Record

The code is in `src/speech/`; browser support and the decisions behind it are in `docs/notes/phase-5.md`. Each feature shows only where it works; otherwise it is hidden, with no warning.

- **Listen** uses the browser's `speechSynthesis` with a voice that runs on the device (`voice.localService === true`); with no such English voice, it is hidden. It reads the version on screen from the first section to the last, one sentence per utterance, and marks the current sentence with `mark.tw-speaking`. Speeds: Slow (about 0.8) and Normal (`settings.listeningSpeed`, saved only for a chosen learner).
- **Say it** (dictation in Write, Watch and Reflect) uses speech recognition only when the browser can do it on the device: `SpeechRecognition.available({ processLocally: true })` must say `available`, and recognition then runs with `processLocally = true`. Other recognition may send audio to an online service. For children that is off unless an educator turns on "Allow online speech-to-text" on the Settings page (`/settings`, `settings.partner.allowOnlineDictation`). If neither applies, hide the button. The browser's one-time on-device download starts only from an educator's tap in Settings. Support changes often, so check it again when you touch this.
- **Never ask about speech recognition as a page opens.** Calling `available()` as Write, Watch, Reflect or Settings opened crashed the tab in Chromium 153 on touch devices. `available()` runs only when an educator taps "Check this device" in Settings, which saves the answer with the date (`settings.speechCheck`). Lessons decide from the saved settings alone (`dictationMode()`), and make a recognition object only when the learner taps Say it. `src/pages/speechOnOpen.test.tsx` checks this; end-to-end tests use the fake in `e2e/speechFake.ts` before tapping either.
- **Record yourself** (Speak) uses `MediaRecorder` and stores the latest clip per learner and lesson in IndexedDB. It is never uploaded. The microphone is asked for only when the learner taps Start, and the recorder is hidden where the device lists no microphone.
- Settings (`/settings`, in the header menu, outside the five main links) saves device settings even while looking around, because it sets up the device and isn't a learner's work. Inside lessons, look-around still saves nothing.

## Offline, Save data and print

Built in phase 6; see `docs/notes/phase-6.md`.

- After the first visit every lesson works offline. Under the header, `StatusBanner` says when the device is offline (tone offline) and, for five seconds, when it's back (tone back). Never tell a guest their work is saved.
- A new version shows "A new version is ready" with "Update now"; nothing reloads unless someone taps it.
- Settings for this device (`/settings`): offline status, Save data, the reading level for anyone who hasn't chosen one, the Listen speed, and Say it ("Check this device", the on-device download and "Allow online speech-to-text").
- Every lesson has a print view (`/lesson/:id/print`, linked from Read): both reading levels, key words, the picture, the quick check and every task, black text on white with no header. Printing any page leaves out the header, menus and banners (`src/styles/print.css`).
- Teacher tools (`docs/notes/teacher-tools.md`), linked from the Educators page: every lesson has a teacher guide (`/educators/lesson/:id`) and every section check an answer key (`/educators/section/:id/answers`). Each is one page for screen and paper, built on the print views' sheet. Everything in them comes from the content files. Correct answers are marked with a tick and the words "Correct answer", never by colour alone.

## Don't

- Add accounts, logins, a chatbot "Learning Guide", ads, analytics scripts or social embeds.
- Load anything at runtime from a third-party server except YouTube embeds the learner starts. Adding a host to the Content-Security-Policy in `vercel.json` needs saying so in the pull request.
- Use red, lock lessons, add timers, or show learners a leaderboard.
- Put English strings straight into components.
- Change lesson text, the design tokens or the brand rules without saying so in the pull request.

## How to work here

- GitHub Actions (`.github/workflows/checks.yml`) runs every check (types, lint, unit tests, content, build, and the end-to-end tests at all three sizes) on each push to `main` and on every pull request. Keep it green.

- Work in small steps: one feature per branch and pull request. Run the tests and the content check before committing.
- Test on narrow screens (390px) and with the keyboard as you go, not at the end.
- When a decision changes, update this file and `docs/PRODUCT.md` in the same pull request.
