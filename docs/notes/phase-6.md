# Phase 6: offline, Save data and print

Branch `phase-6-offline`. Built in September 2026.

## What was built

- **The whole course works offline after the first visit.** A Workbox service worker (vite-plugin-pwa, `vite.config.ts`) precaches the site in the background once the first page has loaded: `index.html`, all the JavaScript (the app, the libraries, and every lesson and section check, which live in the `content` chunk), the CSS, the fonts (woff2, latin and latin-ext), 22 lesson pictures (the other two are small enough to be inlined into the JavaScript) and `public/images`. Any address opens offline, `/lesson/...` included, because page loads get the cached `index.html`. Nothing is cached at runtime, so YouTube and every other server are never touched.
- **New versions never reload by themselves.** A new version downloads in the background and waits. The shell then shows "A new version is ready. It starts the next time Thinkerwell opens." with **Update now**. Only the tab where someone taps it reloads. An open page checks for a new version once an hour, when it is online and on screen. The code is in `src/offline/serviceWorker.ts`.
- **Messages under the header** (`src/offline/ShellBanners.tsx`). While the device is offline, the ink StatusBanner says "You're offline." A learner reads "Keep going: your work is saved on this device." In a lesson, once the course is saved, it says the lesson is saved too, as on TabletLesson. A guest is never told their work is saved. When the connection comes back, the teal "You're back online." shows for five seconds. These messages share one column with the look-around note and the update message. The column is now as wide as the page column; before, a short message shrank to fit its text.
- **Watch offline.** Opened while the device is offline, Watch starts on the written version with "You're offline, so the video can't load now." and offers "Try the video again". This isn't saved as the learner's choice. The "Slow internet?" note still shows whenever the video is offered.
- **Save data** now follows the browser's own data saver (`navigator.connection.saveData`) until someone chooses in Settings (`src/offline/saveData.ts`). With it on, Watch opens on the written version and doesn't offer the video.
- **Settings for this device** (`/settings`) is in the header menu, as an icon at the end of the full header and as an item under a line in the phone menu. The page now has three parts:
  - **Offline and data**: whether all 24 lessons are saved on this device (or still saving, or can't be), and the Save data switch.
  - **Reading and listening**: the reading level lessons open in for anyone who hasn't chosen one, and the Listen speed. It says when this browser has no voice for Listen.
  - **Say it**, from phase 5.
- **Learner home badge** (Dashboard.dc.html). It says "All 24 lessons work offline" once the course is saved, and "Saving lessons for offline use" during the first visit. Where this browser can't keep the course, it shows nothing.
- **Print views.**
  - `/lesson/:id/print` ("Print this lesson" under the time on Read) has the warm-up, the picture and evidence, the reading in Standard and then Simpler English with the key words in bold, the key words, the quick check and every task (Write with its starters, plan and self-check; Speak; the Watch questions and written version; Reflect). It has boxes to tick and lines to write on. Lesson 10 prints on 8 A4 pages.
  - `/journal/print` has everything the current learner wrote in Write and Reflect, grouped by lesson, the most recent first.
  - Printed, both are black text on white, with no header, menus, banners or fills. The two reading levels and the tasks each start on a new page, and cards, questions and writing lines are never split across pages. Printing any other page also leaves out the header and menus (`src/styles/print.css`).
- **A web app manifest**, so the site can be added to a home screen. Its icons are the mascot on lemon, made by `scripts/optimise_images.py`.
- **Vercel** (`vercel.json`): `sw.js` and the manifest are always revalidated (`max-age=0, must-revalidate`). Hashed files in `/assets/` and the Workbox runtime are cached for a year. The SPA rewrite is unchanged: files on disk are served first, so `/sw.js` is the real file, and it sits at the root, so its scope is the whole site. `src/offline/deploy.test.ts` checks these settings.

## Sizes

Measured with `npm run build && npm run size` (`tools/report-sizes.mjs`). The tool serves `dist/`, records what a fresh browser fetches, and reads the precache list from `dist/sw.js`. Each file is counted as it is on disk, gzipped and brotli-compressed, as Vercel sends text files. Fonts and images are already compressed, so they are counted as they are.

| | `main` before phase 6 (gzip / brotli) | Phase 6 (gzip / brotli) |
| --- | --- | --- |
| First load, home page | 420 kB / 379 kB | **333 kB / 295 kB** (13 files) |
| First load, Lesson 10 Read | 435 kB / 393 kB | **348 kB / 309 kB** (15 files) |
| Precache (the whole site) | none (nothing worked offline) | **534 kB / 482 kB** (50 files, 1.36 MB on disk) |
| Service worker (`sw.js` and Workbox) | none | 7 kB / 6 kB |

The first visit downloads about 545 kB gzipped in all. The page itself takes about 333 kB. The service worker then fetches about 210 kB more: the files the page didn't need yet, plus `index.html`, the images and the manifest again. Hashed files the page already has come from the browser's HTTP cache (Workbox fetches them with the default cache mode). After that, a visit downloads nothing. An update downloads only the files that changed: for example, the app code (about 56 kB) or the lessons (about 85 kB).

The precache by kind (gzip): fonts 138 kB, libraries 106 kB, images 76 kB, lessons and checks 85 kB, app code 58 kB, lesson pictures 58 kB, styles 12 kB.

What made it smaller:

1. **Images, 800 kB down to 120 kB** (`scripts/optimise_images.py`). The originals are kept in `docs/design-system/assets/`.
   - The mascot keeps its exact size and artwork as a 256-colour PNG, which takes it from 78 kB to 11 kB. The transparency is unchanged, and the colours differ by less than 1/255 on average, so the change can't be seen. It isn't redrawn, recoloured or cropped.
   - The UN goal icons are shown at 72px, so they are resized to 144px.
   - The founder photo is shown at 104px, so it is resized to 312px wide.
2. **zod left the browser bundle** (the libraries chunk went from 130 to 106 kB gzipped). The content is now checked when it is built, served or tested, by the content plugin in `vite.config.ts` using `src/content/load.ts`. The app uses the checked files as they are (`src/content/index.ts`).
3. **workbox-window gets its own chunk.** It is only fetched after the page has loaded, to register the worker.
4. **Some files are left out of the precache.**
   - The two flat mascot files: they are for printouts and emails, and no page uses them.
   - The app icons: the browser fetches those itself when the app is installed.
   - `.woff` fonts: none are referenced.

Phase 6's own code adds about 2 kB gzipped to the app code and 1 kB to the styles.

## Decisions

1. **Everything is precached at the first visit, not only the lessons a learner has opened.** The design README suggests keeping the lessons a learner opens, with a "Saved for offline" badge on lesson rows. The whole course is under 500 kB compressed, and CLAUDE.md rule 2 asks for the whole course to work offline after the first visit. So the whole course is precached, the learner home says "All 24 lessons work offline", and lesson rows carry no badge. The download happens even with Save data on: offline use matters more than those 210 kB.
2. **Updating.** A new version waits. It starts when someone taps **Update now**, or the next time Thinkerwell opens with no tab still on the old version. If another tab takes the update, this tab keeps running and keeps offering it (`registerSW` from vite-plugin-pwa would reload every open tab here, so the app registers the worker itself with workbox-window). If the new version hasn't taken over four seconds after the tap, the page reloads anyway.
3. **The first install takes charge of the open page** (`clientsClaim`), so a learner who goes offline during their very first visit still gets pictures and fonts from the precache.
4. **Save data follows the browser's hint until someone chooses.** This is what phase 4 suggested. `settings.saveData` is now `true`, `false` or `null`, where `null` means nobody has chosen yet.
   - Storage version 2 turns a stored `false` into `null`. Before phase 6 no screen could set it, so a stored `false` was only ever the default.
   - It replaces phase 4's softer start ("Your device is saving data", with the video still offered). Now the setting and Watch always agree.
   - A choice made in Settings always wins over the browser's hint.
5. **Offline copy.**
   - The offline banner never promises a guest that their work is saved.
   - It says the lesson itself is saved only once the whole course is on the device.
   - The update message tells a chosen learner their work is saved, because the lesson player saves on `pagehide`.
6. **Where Settings is linked.** The design keeps the header to five links, so Settings sits outside the Main navigation: an icon link at the end of the full header, and a separate item in the phone menu. The full header still fits at 1100px with a long learner name. The Lucide `Settings` icon is new to the icon set; it isn't in the design-system list.
7. **The Settings page** saves even while looking around (phase 5, decision 3). If a change can't be saved, the control goes back to how it was and says so. SegmentedControl gains `disabled` and `describedBy`, which aren't in the design-system docs.
8. **Print views are pages of their own**, not print styles on the lesson. A lesson shows one stage and one reading level at a time, and a printout needs both levels and every task. Each view looks like a sheet of paper on screen, with "Back" and "Print" above it.
   - The lesson picture keeps its colours when printed. The colours are part of the content (a map's key relies on them), and a black-and-white printer turns them into greys.
   - Educator notes, sources and quick-check answers are left out: the printout is for learners.
   - The video is named in the printout but never linked.
9. **The journal print view comes before the journal.** `/journal` is still the phase 1 placeholder (it is phase 7's), so the print view builds the journal from saved progress (`journalByLesson`, `src/storage/progress.ts`). For now the placeholder links to it when a learner is chosen. Guests are asked to choose who's learning.
10. **End-to-end tests block service workers**, except `e2e/offline.spec.ts`. A controlled page answers from its cache, out of reach of `page.route`, and every test would otherwise download the whole course in the background.

## For phase 7

- The journal page should link its "Print my journal" button (Journal.dc.html) to `/journal/print`, and it can use `journalByLesson()` for its own list.
- The Educators page could link each lesson's print view (`lessonPrintPath(id)`, `src/app/lessonUrls.ts`) as a paper copy.

## Not done, or for later

- **Not tried on real devices or on Vercel.** Everything was tested in headless Chromium 141 (Playwright, with `context.setOffline`) against `vite preview`. In phase 8, check the following:
  - On the Vercel deployment: that `sw.js` is served with `max-age=0`, that the rewrites never answer a precached URL with `index.html`, and that the service worker's scope is `/`.
  - On the pilot devices: a real offline day, and an update.
- **The update prompt hasn't been seen in a browser.** Its logic is covered by unit tests with a fake Workbox, because making a second build appear under a running page doesn't fit the Playwright setup.
- **iPads and iPhones.** Safari deletes a site's storage (IndexedDB and the offline copy) after 7 days without a visit, unless the site has been added to the Home Screen. On the pilot's iPads, add Thinkerwell to the Home Screen. Learners' work depends on this too, not only offline use.
- **Old tabs and new storage versions.** When a new version upgrades the on-device database (as this one does, to version 2), a tab still running the old version can't reopen the database. Its saves fail, and it shows the lesson's "didn't save" note until it reloads; the lesson player's last-moment copy keeps what was typed. A tab that closes its connection could show the update message more strongly. This matters only with two tabs open at once.
- **Nothing is sent when the connection returns.** The design README's "send saved work and events when the connection returns" waits for the measurement phase, which adds the events endpoint.
- The design README mentions a "Saved for offline" badge on lesson rows. It isn't needed, because every lesson is saved (decision 1).
