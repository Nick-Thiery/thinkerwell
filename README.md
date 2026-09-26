# Thinkerwell

A free social-studies course, "Exploring Our World", for refugee, displaced and under-served young people. It works offline after the first visit, has no accounts, and keeps every learner's work on the device.

- Project rules (privacy, offline, accessibility, copy): `CLAUDE.md`
- Who it's for and decisions so far: `docs/PRODUCT.md`
- How it gets built, phase by phase: `docs/BUILD_PLAN.md`

## Set up

You need Node.js 22 or later (the build machine uses 25) and Python 3.

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

For each URL and width (390, 820 and 1280 by default) it saves a full-page screenshot and prints: horizontal overflow, console errors/warnings and uncaught page errors, every request to a host other than the page's own, every visible tap target under 44×44px, and every visible text node under 14px. `--rtl` adds `?dir=rtl` to each URL. The exit code is 0 unless a page fails to load — everything else is a report, not a failure.

## On-device storage

Learners' work is kept in IndexedDB on the device (through `idb`) and never leaves it. There are six stores: `learners`, `progress` (per learner and lesson), `quizAttempts` (per learner and section, keeping the best and the latest), `recordings` (per learner and lesson, the latest clip only), `settings` (one record for the device) and `device` (device-level values such as the current learner). Use `getStore()` from `src/storage` each time you need it rather than holding on to the store, so a connection closed by another tab's upgrade is replaced.

The schema version is `DB_VERSION` in `src/storage/db.ts`, and `migrations` there maps each version to the step that upgrades to it. To change the schema, bump `DB_VERSION`, add the next entry to `migrations` (never edit an earlier one), update `src/storage/types.ts`, and add a test to `src/storage/migrations.test.ts` that upgrades a database holding old data.

Removing a learner deletes their progress, quiz attempts and recordings in one transaction, so either all of it goes or none of it does.

## Where things live

```
content/                 lesson text and course structure (JSON), the source of truth
docs/                    product notes, build plan, design system, screen references, research
public/images/           mascot, UN goal icons, founder photo
scripts/                 lesson checker (check_lesson.py), check-content.sh, setup-python.sh
src/main.tsx             entry: router and global styles
src/app/                 routes, app shell, lesson URL handling (old Base44 ids redirect here)
src/pages/               one component per page (placeholders until later phases)
src/content/             zod schemas and typed getters for content/*.json
src/storage/             IndexedDB (idb): learners, progress, quiz attempts, recordings, settings
src/i18n/                message helper; every UI string is in src/i18n/messages/en.json
src/styles/              tokens.css (copied from the design system), fonts.css, global.css
src/components/ds/       the ported design-system components
src/dev/                 dev-only routes (/dev/components, /dev/reference, /dev/screens); never shipped
tools/shoot.mjs          screenshot + report tool (overflow, console errors, foreign requests, tap targets, text size)
dev-screen.html          dev-only, standalone: renders one docs/screens/*.dc.html with the original reference bundle
dev-reference.html       dev-only, standalone: renders the original reference bundle's own components
e2e/                     Playwright tests (production build)
e2e-dev/                 Playwright tests for the dev-only /dev/* routes (npm run test:e2e:dev)
```

## Routes

`/`, `/course`, `/lesson/:id/:stage` (stages: read, write, speak, watch, reflect, plus `complete`), `/section/:id/check`, `/journal`, `/educators`, `/about`. `/lesson/:id` opens Read. Old Base44 links such as `/lesson/l6` or `/lesson/history-scale` redirect to the new lesson (`/lesson/l6` is Lesson 10, `/lesson/towns-near-rivers/read`), keeping any query string such as `?preview=true`. `/onboarding` goes to `/` and `/courses` to `/course`. Anything else shows a friendly "can't find that page".

## Deploying

The site is static and hosted on Vercel (`vercel.json` sends every path to `index.html` so deep links work).
