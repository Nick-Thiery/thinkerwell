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
| `npm run check:content` | Checks `content/lessons/*.json` against `docs/content/SPEC.md`; must report 0 errors |

To run the end-to-end tests against a server you already started, set `E2E_BASE_URL`, for example `E2E_BASE_URL=http://localhost:5301 npm run test:e2e`.

To run several dev servers at once, give each its own port and cache: `VITE_CACHE_DIR=.build-review/vite-cache-5301 npx vite --port 5301 --strictPort`.

## Checking right-to-left

In development, add `?dir=rtl` to any URL (for example http://localhost:5173/course?dir=rtl). The page switches to `dir="rtl"` and stays that way in that browser tab until you open any URL with `?dir=ltr`. A note under the header shows while it's on. Production builds ignore it.

Write CSS with logical properties (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`). Stylelint rejects `margin-left`, `left`, `float: left`, four-value `margin`/`padding` and the like.

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
e2e/                     Playwright tests
```

## Routes

`/`, `/course`, `/lesson/:id/:stage` (stages: read, write, speak, watch, reflect, plus `complete`), `/section/:id/check`, `/journal`, `/educators`, `/about`. `/lesson/:id` opens Read. Old Base44 links such as `/lesson/l6` or `/lesson/history-scale` redirect to the new lesson (`/lesson/l6` is Lesson 10, `/lesson/towns-near-rivers/read`), keeping any query string such as `?preview=true`. `/onboarding` goes to `/` and `/courses` to `/course`. Anything else shows a friendly "can't find that page".

## Deploying

The site is static and hosted on Vercel (`vercel.json` sends every path to `index.html` so deep links work).
