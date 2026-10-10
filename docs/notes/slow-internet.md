# Lighter on bad internet

Branch `slow-internet`, September 2026. The first pilot is at a learning centre in Jakarta, on shared laptops and tablets with slow, unreliable Wi-Fi, often with several devices downloading at once on one connection. This note measures what a first visit downloads and how long it takes there, and then what was cut.

## How it was measured

`npm run build && npm run slow-internet` (`tools/slow-internet.mjs`). It serves `dist/` the way Vercel does (Brotli for text files, `index.html` for page addresses, the caching headers in `vercel.json`) and opens the site in a fresh Chromium (Playwright) with no cache.

- **Bytes.** Every request a first visit makes to the home page and to Lesson 10's Read stage (`/lesson/towns-near-rivers/read`, opened straight from a link), and the service worker's precache list from `dist/sw.js` (the whole course, downloaded in the background after the first visit). Each file is counted as it is on disk (raw), gzipped (`-9`) and Brotli-compressed (quality 11), as Vercel sends text files. Fonts and images are already compressed and count as they are. "Before the first screen" is everything asked for before the page's h1 is on screen; "what follows" is asked for after it (mostly fonts the text needs, and the lesson picture). Byte counts don't depend on the machine, so they are the reliable number.
- **Time.** Chromium's own network throttling (`Network.emulateNetworkConditions`, over the Chrome DevTools Protocol) on the page and on the service worker, so the precache download is throttled too. Two profiles: **Slow 3G** (400 kbit/s down and up, 400 ms round trip) and **Very poor** (150 kbit/s, 600 ms). Five devices sharing a 1 Mbit/s connection each get about 200 kbit/s, between the two. Tablet size (820 x 1180).
  - *First paint*: first-contentful-paint: the header's lemon bar and mascot from `index.html`, before the app has started.
  - *Page ready*: the first meaningful paint, when the page's h1 (its real content) is on screen.
  - *Largest paint*: largest-contentful-paint.
  - *Offline ready*: when the service worker is active, which it becomes only once the whole course is stored ("All 24 lessons work offline"), counted from the start of the visit.
  - Other agents were building and testing on the same 2-core machine, so CPU timings are noisy. The CPU isn't throttled, each figure is the median of 3 cold visits, and at these speeds the network dominates: the three runs were within 0.1 s of each other for page ready and within 1.5 s for offline ready.

## Before (`main` at fddb9d8)

### First visit, home page

| Kind | Files | Raw | gzip -9 | Brotli |
| --- | ---: | ---: | ---: | ---: |
| HTML | 1 | 3.8 kB | 1.3 kB | 1.0 kB |
| JS | 5 | 926.1 kB | 269.7 kB | 228.1 kB |
| CSS | 1 | 104.7 kB | 16.1 kB | 14.0 kB |
| Fonts | 5 | 61.3 kB | 61.3 kB | 61.3 kB |
| Images | 1 | 10.7 kB | 10.7 kB | 10.7 kB |
| **Total** | **13** | **1106.6 kB** | **359.2 kB** | **315.0 kB** |
| Before the first screen | 10 | 1073.0 kB | 325.6 kB | 281.5 kB |
| What follows | 3 | 33.6 kB | 33.6 kB | 33.6 kB |

Before the first screen (Brotli): `index.html` 1.0 kB; the libraries (`vendor`) 91.3 kB, **all 24 lessons and 4 section checks (`content`) 70.8 kB**, the app (`index`) 63.6 kB, the chunk loader 0.4 kB, workbox-window 2.0 kB; the stylesheet 14.0 kB; the mascot 10.7 kB; fonts for the header: Eczar (the wordmark) 15.0 kB and Atkinson 700 12.7 kB. What follows: Funnel Display 500 and 600, Atkinson 400 (33.6 kB).

The home page shows no lesson text, yet it waits for every lesson.

### First visit, Lesson 10 Read from a link

| Kind | Files | Raw | gzip -9 | Brotli |
| --- | ---: | ---: | ---: | ---: |
| HTML | 1 | 3.8 kB | 1.3 kB | 1.0 kB |
| JS | 5 | 926.1 kB | 269.7 kB | 228.1 kB |
| CSS | 1 | 104.7 kB | 16.1 kB | 14.0 kB |
| Fonts | 6 | 73.9 kB | 73.9 kB | 73.9 kB |
| Images | 2 | 16.7 kB | 12.5 kB | 12.2 kB |
| **Total** | **15** | **1125.2 kB** | **373.6 kB** | **329.2 kB** |
| Before the first screen | 10 | 1073.0 kB | 325.6 kB | 281.5 kB |
| What follows | 5 | 52.2 kB | 48.0 kB | 47.7 kB |

The same 10 files as the home page before the first screen; then the lesson picture (1.5 kB) and four text fonts (46.2 kB).

### The whole course (the precache)

| Kind | Files | Raw | gzip -9 | Brotli |
| --- | ---: | ---: | ---: | ---: |
| HTML | 1 | 3.8 kB | 1.3 kB | 1.0 kB |
| JS | 5 | 926.1 kB | 269.7 kB | 228.1 kB |
| CSS | 1 | 104.7 kB | 16.1 kB | 14.0 kB |
| Fonts | 14 | 137.7 kB | 137.7 kB | 137.7 kB |
| Images (22 lesson pictures, 7 in `public/images`) | 29 | 315.9 kB | 146.0 kB | 133.0 kB |
| Other (the manifest) | 1 | 0.6 kB | 0.3 kB | 0.3 kB |
| **Total** | **51** | **1488.8 kB** | **571.1 kB** | **514.0 kB** |
| `sw.js` and the Workbox runtime (not in the list) | 2 | 19.2 kB | 6.7 kB | 6.0 kB |

The 15 largest files:

| # | File | Raw | gzip -9 | Brotli |
| ---: | --- | ---: | ---: | ---: |
| 1 | `assets/vendor-DdbVw-XQ.js` | 336.5 kB | 105.6 kB | 91.3 kB |
| 2 | `assets/content-B4NpGVTN.js` | 308.9 kB | 85.3 kB | 70.8 kB |
| 3 | `assets/index-D2j2Qy3h.js` | 274.3 kB | 76.2 kB | 63.6 kB |
| 4 | `images/sdg-16.png` | 17.2 kB | 17.2 kB | 17.2 kB |
| 5 | `assets/eczar-latin-500-normal-D5ElkdOw.woff2` | 15.0 kB | 15.0 kB | 15.0 kB |
| 6 | `images/sdg-17.png` | 15.0 kB | 15.0 kB | 15.0 kB |
| 7 | `assets/atkinson-hyperlegible-next-latin-400-italic-DZBmTazM.woff2` | 14.2 kB | 14.2 kB | 14.2 kB |
| 8 | `assets/index-C6zYb52Y.css` | 104.7 kB | 16.1 kB | 14.0 kB |
| 9 | `images/sdg-10.png` | 13.8 kB | 13.8 kB | 13.8 kB |
| 10 | `assets/atkinson-hyperlegible-next-latin-700-normal-Dpiyiu63.woff2` | 12.7 kB | 12.7 kB | 12.7 kB |
| 11 | `assets/atkinson-hyperlegible-next-latin-500-normal-gHP6TDRs.woff2` | 12.6 kB | 12.6 kB | 12.6 kB |
| 12 | `images/founder-justin-park.jpg` | 12.1 kB | 12.1 kB | 12.1 kB |
| 13 | `assets/atkinson-hyperlegible-next-latin-400-normal-FfmJh7DR.woff2` | 12.1 kB | 12.1 kB | 12.1 kB |
| 14 | `images/nick-thiery.jpg` | 11.5 kB | 11.5 kB | 11.5 kB |
| 15 | `assets/funnel-display-latin-600-normal-Mgf2EgkJ.woff2` | 10.8 kB | 10.8 kB | 10.8 kB |

A first visit to the home page downloads 315 kB for the page and then about 220 kB more for the service worker: 38 files the page didn't need, plus `index.html` and the 7 images again (Workbox asks the network for files without a hash in their name, even ones the page has).

### Time on slow connections

Median of 3 cold first visits.

| Connection | Page | First paint | Page ready | Largest paint | Offline ready | Downloaded (page + service worker) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Slow 3G | Home | 2.2 s | 6.0 s | 6.0 s | 28.6 s | 341 + 220 kB |
| Slow 3G | Lesson 10 Read | 2.2 s | 6.1 s | 6.7 s | 26.6 s | 345 + 206 kB |
| Very poor | Home | 5.0 s | 15.0 s | 15.0 s | 55.6 s | 341 + 220 kB |
| Very poor | Lesson 10 Read | 5.0 s | 15.1 s | 16.5 s | 54.0 s | 345 + 206 kB |

(Downloaded is what the browser reports, headers included.)

**Offline ready takes 4 to 5 times as long as the page.** Workbox's precache downloads its files one at a time ("Cache entries one at a time", `workbox-precaching`), so each of the 39 files it fetches over the network costs a full round trip before the next one starts. On Slow 3G that is about 16 s of waiting (39 x 400 ms) for 4.4 s of data; on Very poor about 23 s (39 x 600 ms) for 12 s of data. A learner who closes the laptop in that time has no offline course.

## After (this branch)

### Before and after

Brotli, as Vercel sends it. Times are the median of 3 cold first visits (tablet size, network throttled, CPU not).

| | `main` | This branch |
| --- | ---: | ---: |
| First visit, home page | 315.0 kB, 13 files | **204.5 kB**, 14 files |
| ... of which before the first screen | 281.5 kB | **170.9 kB** |
| First visit, Lesson 10 Read from a link | 329.2 kB, 15 files | **314.4 kB**, 20 files |
| The whole course (precache) | 514.0 kB, 51 files | **469.1 kB**, 58 files |
| `sw.js` and the Workbox runtime | 6.0 kB, 2 files | 6.1 kB, 1 file |
| Everything a first visit to the home page downloads (page + service worker, as the browser reports it) | 561 kB | **513 kB** |

| Connection | Page | First paint | Page ready | Largest paint | Offline ready |
| --- | --- | ---: | ---: | ---: | ---: |
| Slow 3G | Home | 2.2 → 2.1 s | 6.0 → **4.1 s** | 6.0 → **4.1 s** | 28.6 → **15.3 s** |
| Slow 3G | Lesson 10 Read | 2.2 → 2.3 s | 6.1 → 6.1 s | 6.7 → 6.8 s | 26.6 → **14.8 s** |
| Very poor | Home | 5.0 → 4.8 s | 15.0 → **9.7 s** | 15.0 → **9.7 s** | 55.6 → **34.3 s** |
| Very poor | Lesson 10 Read | 5.0 → 5.3 s | 15.1 → 15.1 s | 16.5 → 16.5 s | 54.0 → **32.8 s** |

The three runs were within 0.1 s of each other for page ready and within 0.5 s for offline ready.

### First visit, home page

| Kind | Files | Raw | gzip -9 | Brotli |
| --- | ---: | ---: | ---: | ---: |
| HTML | 1 | 3.9 kB | 1.4 kB | 1.0 kB |
| JS | 6 | 477.3 kB | 149.7 kB | 130.1 kB |
| CSS | 1 | 104.3 kB | 16.0 kB | 14.0 kB |
| Fonts | 5 | 50.4 kB | 50.4 kB | 50.4 kB |
| Images | 1 | 9.0 kB | 9.0 kB | 9.0 kB |
| **Total** | **14** | **644.7 kB** | **226.4 kB** | **204.5 kB** |
| Before the first screen | 11 | 611.2 kB | 192.9 kB | 170.9 kB |
| What follows | 3 | 33.6 kB | 33.6 kB | 33.6 kB |

Before the first screen: `index.html` 1.0 kB; the libraries 91.3 kB, the code home, the course map and the 404 share with the other pages (`NotFoundPage-`, named after one of its files) 25.0 kB, the app shell with home and the course map (`index-`) 11.1 kB, the chunk loader 0.4 kB, the first-page script 0.4 kB, workbox-window 2.0 kB; the stylesheet 14.0 kB; the mascot 9.0 kB; the wordmark font 4.1 kB and Atkinson 700 12.7 kB. No lesson.

### First visit, Lesson 10 Read from a link

| Kind | Files | Raw | gzip -9 | Brotli |
| --- | ---: | ---: | ---: | ---: |
| HTML | 1 | 3.9 kB | 1.4 kB | 1.0 kB |
| JS | 10 | 873.2 kB | 263.1 kB | 225.9 kB |
| CSS | 1 | 104.3 kB | 16.0 kB | 14.0 kB |
| Fonts | 6 | 63.0 kB | 63.0 kB | 63.0 kB |
| Images | 2 | 14.9 kB | 10.8 kB | 10.5 kB |
| **Total** | **20** | **1059.2 kB** | **354.2 kB** | **314.4 kB** |
| Before the first screen | 15 | 1007.1 kB | 306.2 kB | 266.8 kB |
| What follows | 5 | 52.2 kB | 48.0 kB | 47.7 kB |

The home page's files, plus the lesson player (`lessonPages-` 14.3 kB, `lessonRoutes-` 9.1 kB, `speech-` 2.0 kB) and the lessons (`content-` 70.4 kB), all started at once by the first-page script.

### The whole course (the precache)

| Kind | Files | Raw | gzip -9 | Brotli |
| --- | ---: | ---: | ---: | ---: |
| HTML | 1 | 3.9 kB | 1.4 kB | 1.0 kB |
| JS | 13 | 938.2 kB | 278.4 kB | 239.8 kB |
| CSS | 1 | 104.3 kB | 16.0 kB | 14.0 kB |
| Fonts | 13 | 119.8 kB | 119.8 kB | 119.8 kB |
| Images (22 lesson pictures, 7 in `public/images`) | 29 | 277.0 kB | 107.1 kB | 94.1 kB |
| Other (the manifest) | 1 | 0.6 kB | 0.3 kB | 0.3 kB |
| **Total** | **58** | **1443.8 kB** | **523.0 kB** | **469.1 kB** |
| `sw.js` (Workbox inside) | 1 | 20.7 kB | 6.8 kB | 6.1 kB |

| # | File | Raw | gzip -9 | Brotli |
| ---: | --- | ---: | ---: | ---: |
| 1 | `assets/vendor-DdbVw-XQ.js` | 336.5 kB | 105.6 kB | 91.3 kB |
| 2 | `assets/content-GfYKze01.js` | 307.3 kB | 84.7 kB | 70.4 kB |
| 3 | `assets/NotFoundPage-DU2shXIC.js` | 90.7 kB | 28.4 kB | 25.0 kB |
| 4 | `assets/lessonPages-JqI_5tPr.js` | 54.2 kB | 16.2 kB | 14.3 kB |
| 5 | `assets/atkinson-hyperlegible-next-latin-400-italic-DZBmTazM.woff2` | 14.2 kB | 14.2 kB | 14.2 kB |
| 6 | `assets/style-P77CJc1h.css` | 104.3 kB | 16.0 kB | 14.0 kB |
| 7 | `assets/atkinson-hyperlegible-next-latin-700-normal-Dpiyiu63.woff2` | 12.7 kB | 12.7 kB | 12.7 kB |
| 8 | `assets/atkinson-hyperlegible-next-latin-500-normal-gHP6TDRs.woff2` | 12.6 kB | 12.6 kB | 12.6 kB |
| 9 | `assets/atkinson-hyperlegible-next-latin-400-normal-FfmJh7DR.woff2` | 12.1 kB | 12.1 kB | 12.1 kB |
| 10 | `assets/index-D55KraBN.js` | 42.6 kB | 12.5 kB | 11.1 kB |
| 11 | `assets/funnel-display-latin-600-normal-Mgf2EgkJ.woff2` | 10.8 kB | 10.8 kB | 10.8 kB |
| 12 | `assets/funnel-display-latin-500-normal-CfaoK8W9.woff2` | 10.7 kB | 10.7 kB | 10.7 kB |
| 13 | `images/sdg-16.png` | 9.1 kB | 9.1 kB | 9.1 kB |
| 14 | `assets/lessonRoutes-DpH5LKQC.js` | 29.0 kB | 10.3 kB | 9.1 kB |
| 15 | `images/thinkerwell-mascot-transparent.png` | 9.0 kB | 9.0 kB | 9.0 kB |

## Merged with the language groundwork and the pilot-day tools

Branch `integrate-0928`, 28 September 2026: this branch, then `language-groundwork` (`docs/notes/languages.md`), then `pilot-day-tools` (`docs/notes/pilot-day-tools.md`), with the follow-up fixes below. Measured the same way (`npm run slow-internet`, median of 3 cold visits; the byte counts from the same tool run against each build).

| Brotli | `main` (fddb9d8) | This branch alone | + language groundwork | + pilot-day tools and fixes |
| --- | ---: | ---: | ---: | ---: |
| First visit, home page | 315.0 kB, 13 files | 204.5 kB, 14 files | 207.2 kB, 14 files | **210.5 kB**, 14 files |
| ... of which before the first screen | 281.5 kB | 170.9 kB | 173.6 kB | 176.9 kB |
| First visit, Lesson 10 Read from a link | 329.2 kB, 15 files | 314.4 kB, 20 files | 317.5 kB, 20 files | **320.8 kB**, 21 files |
| The whole course (precache) | 514.0 kB, 51 files | 469.1 kB, 58 files | 472.4 kB, 58 files | **480.5 kB**, 59 files |

| Connection | Page | `main` | This branch alone | Merged |
| --- | --- | ---: | ---: | ---: |
| Slow 3G | Home: page ready / offline ready | 6.0 / 28.6 s | 4.1 / 15.3 s | **4.2 / 15.6 s** |
| Slow 3G | Lesson 10 Read: page ready / offline ready | 6.1 / 26.6 s | 6.1 / 14.8 s | **6.2 / 14.7 s** |
| Very poor | Home: page ready / offline ready | 15.0 / 55.6 s | 9.7 / 34.3 s | **10.0 / 34.4 s** |
| Very poor | Lesson 10 Read: page ready / offline ready | 15.1 / 54.0 s | 15.1 / 32.8 s | **15.5 / 33.1 s** |

The home page's first paint is 2.2 s on Slow 3G and 5.0 s on Very poor, as on `main` (2.1 and 4.8 s on this branch alone). Everything a first visit to the home page downloads, page and service worker together, is 525 kB as the browser reports it (513 kB on this branch alone, 561 kB on `main`).

- **One way pages load.** `language-groundwork` had made Settings, the Educators page, teacher guides, answer keys, print views and certificates lazy on its own (React.lazy and a catch-all `app` chunk). This branch's scheme was kept: its three chunks, the catalog, the first-page script and the idle preload. The pilot-day pages (setup checklist, class view, all certificates) are in `teacherPages` with the other Educators pages; `firstPage.test.ts` covers their addresses, and `e2e/offline.spec.ts` opens them offline. The certificate sheet shared by `morePages` and `teacherPages` is a small chunk of its own (`CertificatePage-`, 1.5 kB).
- **The precache, from `sw.js`:** `index.html`; 14 scripts (`index-`, `NotFoundPage-`, `vendor-`, `rolldown-runtime-`, `first-page-`, `workbox-window-`, `lessonPages-`, `lessonRoutes-`, `speech-`, `saveData-`, `content-`, `teacherPages-`, `morePages-`, `CertificatePage-`); `style-`; the 13 Atkinson, Funnel Display and wordmark font files; the 22 lesson pictures; the 7 images in `/images/`; the manifest. English is inside the app's chunk. Nothing from `assets/locales/` (no other language exists, and none is `ready`), nothing from `assets/pseudo/` (the test languages, never), and nothing from `assets/fonts-arabic/` (Vazirmatn, only once a right-to-left language is `ready`): `languagePrecacheIgnores` feeds this worker's `globIgnores` as it fed Workbox's. `e2e/languages.spec.ts` checks `sw.js` lists none of them and an English visit fetches none.
- **The Arabic font stayed out of the site's stylesheet.** With `cssCodeSplit: false`, the `import('./arabic.css')` the language work used was folded into `style-*.css`, so every visit carried Vazirmatn's rules and nothing loaded for a right-to-left language. It is now imported as a file (`?url`) and added with a `<link>` when a language needs it, and `keepFirstVisitLight` stops the build if Vazirmatn reaches the site's stylesheet.
- **Where the growth comes from** (precache, 469.1 to 480.5 kB): the language code (the list, loading, formatters, the test-language switch) and reworded messages, 3.3 kB; the three pilot-day pages, 7.4 kB (`teacherPages` 4.1 kB, the shared certificate chunk, their words in en.json 1.7 kB and their styles 0.9 kB); the "hasn't downloaded yet" page and the pilot-day language fixes, 0.7 kB. Nothing landed in the first visit that shouldn't: no page code from the new pages, no language file and no test language is in `index-` or `NotFoundPage-` (checked module by module). The home page's first visit grew by 6.0 kB, all of it the language code, the new words (all interface words are in en.json) and styles (one stylesheet for every page).
- **Budgets.** The precache went over its 480 kB budget by 0.5 kB, so the budget in `e2e/build-output.spec.ts` is now **490 kB** (up 10 kB, about 2% above the merged size, as before). The home page's first visit is within its 212 kB budget, with 1.5 kB to spare; it is unchanged.
- **A page that hasn't downloaded yet.** The weak spot under "Left" is handled: if a lazily loaded page's code can't be fetched (the connection dropped after the home page showed but before the course was stored), the route shows "This page hasn't downloaded yet. Connect to the internet, then try again." under the header, with "Try again" and "Go to the home page", in ink with no red (`src/app/lazyPage.tsx`, `src/pages/PageNotDownloaded.tsx`, its words in en.json). Only a failed download is caught (`isPageDownloadError`: the words Chromium, Firefox and Safari use for a module they couldn't fetch); an error in the code itself still shows "Something went wrong". react-router keeps a failed `lazy` for good, so the route gets a page that tries the download itself and then shows the real page. Chromium also keeps a failed module download for the life of the page (a second `import()` fails without asking the network, checked in Chromium 141), so when that happens and the site answers a `HEAD /`, "Try again" loads the page again from the start, which downloads it; if the site doesn't answer, it says there is still no connection. `src/app/lazyPage.test.tsx` covers each path; `e2e/page-not-downloaded.spec.ts` blocks the lesson chunk with `page.route` after the home page loads (the service worker is blocked, so it never finishes), opens a lesson, checks the message, its title, the header, no red, tap size, axe and no sideways scroll at all three sizes, then lets the chunk through and taps "Try again".

## Later budget changes

Each time `e2e/build-output.spec.ts` went over a budget, the cause was looked for first; the budget was raised only for real new content.

| Change | The whole course (precache) | First visit, home page | Budgets after |
| --- | ---: | ---: | --- |
| Sources check and the partner kit (September 2026) | 624.8 kB | 216.3 kB | 630 kB, 218 kB |
| The consent form's study parts and the information sheet (October 2026) | 630.4 kB (626.2 kB before) | 218.8 kB (216.9 kB before) | 635 kB, 220 kB |
| The Listen voice choice, with the About page's mission card (October 2026) | 635.4 kB (630.4 kB before) | within 220 kB | 645 kB, 220 kB |
| Search engines and LinkedIn (October 2026) | within 645 kB | 220.5 kB (220.0 kB before) | 645 kB, 221 kB |
| Listen's recordings (October 2026) | 642.5 kB (636.1 kB before) | 221.2 kB (220.5 kB before) | 645 kB, 222 kB |
| The course model and the Digital World preview (October 2026) | 643.8 kB (642.4 kB before) | 221.6 kB (221.0 kB before) | 645 kB, 222 kB (unchanged) |
| The square favicon (October 2026) | unchanged (not precached) | 224.0 kB (221.6 kB before) | 645 kB, 224.5 kB |
| Thinkerwell's own videos (October 2026) | 649.4 kB (643.8 kB before) | 224.3 kB (224.0 kB before) | 655 kB, 224.5 kB (unchanged) |
| The Vietnamese hidden preview (October 2026) | 649.8 kB (649.9 kB before: a non-ready language's lazily loaded words are now left out of production chunks) | 224.6 kB (224.5 kB before) | 655 kB (unchanged), 224.7 kB |
| Bahasa Melayu (October 2026) | 790.5 kB (649.8 kB before) | 224.9 kB (224.6 kB before) | 795 kB, 225 kB |

- **Bahasa Melayu** (`docs/notes/languages.md`). The precache grew by 140.7 kB, all of it the third language: the Malay chunk (`assets/locales/ms/`: 1,260 interface messages, 24 lessons, 4 section checks, the course text; 428 kB, about 85 kB Brotli) and its 24 pictures (about 46 kB). Like Indonesian (+128 kB), it is in every device's offline copy, because a ready language is precached: nothing is downloaded at the moment someone first switches language, which matters on a poor connection. A first visit grew by 0.3 kB (a row in the language list, the quick-check verdicts and Listen sample in app code, and eight English messages in en.json); none of its words, lessons or pictures reach it. The recordings (about 45 MB per language) are not in the precache. **Three languages cost every device 141 kB it may never use. A fourth would be the moment to precache a language only on devices that use it**, which needs runtime caching for the language chunks (the service worker avoids that today), or a "download this language" step in Settings.

- **The consent form's study parts and the information sheet** (`docs/notes/partner-kit.md`). The precache grew by 4.2 kB: the English messages 1.3 kB (`NotFoundPage-`, which holds en.json), the Indonesian 1.2 kB (`assets/locales/id/`), the pages' code 1.1 kB (`teacherPages-`: the information sheet, the study parts both printouts share, and the two-page form) and their styles 0.5 kB (`style-`). The first visit grew by 1.9 kB: the English words and the styles, because every interface word is in en.json, which the app's first chunk carries (`src/i18n/core.ts`, CLAUDE.md rule 7), and every page shares one stylesheet (`cssCodeSplit: false`). No page code reached the first visit (`index-` grew by 33 bytes). The study and its promises are written once and used by both printouts (`pages.pilotStudy`), and the form's six old parts went when the new ones came in, so there is little left to cut without cutting what the brief asked for. Moving printouts' words out of en.json into their own chunk would save the 1.3 kB, but would break the one-messages-file rule; not done.

- **Search engines and LinkedIn** (`docs/notes/seo.md`). The first visit grew by 0.5 kB. index.html, which a first visit to the home page always fetches, now carries the home page's own title, description, canonical link and structured data (WebSite and Organization). en.json gained the public pages' search titles, which the app shows in the tab, and the footer gained the LinkedIn link. The pages' search descriptions and the share picture's description are only used at build time, so `stripBuildOnlyMessages` (`vite.config.ts`) leaves them out of the browser's copy of en.json and id.json (0.2 kB), and index.html's explanatory comment was cut to one line. `main` was already at 220.0 kB, so the budget went to 221 kB. The precache and the service worker are unchanged: the new HTML files aren't precached.

- **Listen's recordings** (`docs/notes/recorded-audio.md`). The recordings themselves, about 45 MB for both languages, are **not** in the precache and never reach a first visit: a part's recording downloads when Listen first plays it, and a teacher can download all of them for offline use in Settings, into a runtime cache of their own. What grew is the code that plays and downloads them and its words. The precache grew by 6.4 kB, within its budget: a new shared chunk for the player (`load-`, 2.8 kB), Settings' Lesson audio and recorded sample (`morePages-` +1.8 kB), the Read stage (`lessonPages-` +0.4 kB, `speech-` +0.4 kB), the checklist (`teacherPages-` +0.3 kB), the English words (`NotFoundPage-` +0.7 kB) and the Indonesian (+0.7 kB). The home page's first visit grew by 0.7 kB, all of it the English words (35 messages, 0.64 kB; every interface word is in en.json, in the app's first chunk, by CLAUDE.md rule 7) and 0.03 kB of styles. Main was at 220.5 kB, against its 221 kB budget, so these words take it over: the budget is now 222 kB. No player code is in `index-` or `NotFoundPage-` (checked: they only list the player's chunk among the lazily loaded pages' dependencies).

- **The course model and the Digital World preview** (`docs/notes/digital-world-preview.md`). Digital World itself, 56.5 kB (its code, lessons and words 52.9 kB, its styles 2.4 kB, the door to it 1.2 kB), is built into `assets/preview/`, which is never precached and which a device downloads only with the preview on; `e2e/build-output.spec.ts` checks that none of its words, lesson ids or styles reach the precache or a first visit. What every device gains is the course model: the precache grew by 1.4 kB (the app's first chunk, `index-` and `NotFoundPage-` together, +0.6 kB: the device setting, the course choice that shows only with a preview on, and the routes for `/course/:courseId` and `/preview/:courseId`; the list of courses, `courses-`, 0.2 kB; the lesson pages' course plumbing and slots, `lessonRoutes-` +0.3 kB, `lessonPages-` +0.2 kB, `teacherPages-` +0.2 kB), and the home page's first visit by 0.6 kB. Both stay within their budgets. Digital World's own chunk depends on the lesson and teacher pages' chunks as wholes, so adding it didn't split them into smaller files for everyone else (`src/courses/digital-world/index.tsx`).

- **Thinkerwell's own videos** (`docs/notes/site-videos.md`). The three video files (7.8 MB, 4.4 MB and 4.6 MB) are **not** in the precache and never reach a first visit: `public/video/` is left out (`globIgnores`), and a file downloads only when someone taps "Watch the video". What grew is the player (`src/pages/siteVideo/`) and the videos' words. The precache grew by 5.6 kB, nearly all of it in the chunk the About and educator pages already shared (`CertificatePage-`): the player 1.0 kB, the shared VideoCard's poster slot, and the three videos' transcripts in English (2.0 kB) and Indonesian (2.2 kB), which must be in the offline copy so "Read instead" works offline; the rest is the poster's styles (`style-` +0.2 kB) and chunk reshuffling. The budget went from 645 to 655 kB, leaving room for one more small feature, as earlier raises did. The home page's first visit grew by only 0.3 kB (the styles and VideoCard's few new lines), because the words are the first message group that loads with the pages that show them rather than with en.json: `siteVideo` is listed in `src/i18n/lazyGroups.ts`, `stripBuildOnlyMessages` leaves it out of the browser's copy of every message file, and `lazyMessages` (the plugin that already served Digital World's words) serves it as `virtual:thinkerwell/messages/siteVideo`, in every language at once (both languages' words download together, 2.2 kB more than an English reader needs; splitting them by language would need a chunk per language per group, not done for one group). Without that, the transcripts (2.0 kB in English alone) would have taken every first visit past 225 kB, over its budget, for words the home page never shows.

- **The square favicon** (`docs/notes/seo.md`, "The favicon"). Google Search shows only square favicons, and the tab icon was the mascot picture (422 x 423), which the first screen loads anyway, so it cost nothing. The tab icon is now `icons/favicon-96.png`, the mascot centred on a transparent square: 2.3 kB more on a first visit, the file itself. It is already a 256-colour PNG, a PNG doesn't compress further, and 96px is the smallest size Google recommends (a multiple of 48, larger than 48). `favicon.ico` isn't linked, so a first visit doesn't fetch it. Neither file is precached.

## What changed

1. **The offline copy downloads six files at a time** (`src/offline/sw.ts`). The worker is our own now (vite-plugin-pwa's injectManifest), with Workbox's precache, routes, cache name and update prompt as before; only its install hands the files to Workbox's precache strategy six at a time instead of one by one. Measured at that commit, before the pages were split (one run each), offline ready went from 28.6 to 12.9 s on Slow 3G and from 55.6 to 32.8 s on Very poor. Workbox is bundled into `sw.js`, so registering fetches one file, not two.
2. **A first visit downloads only what its page needs.** Home, the course map and the 404 are the first chunk; every other page loads when first opened (react-router `lazy`, through `lazyPage` in `src/app/lazyPage.tsx` since the merge), in three chunks (`src/app/lazy/`): lessons and section checks; teacher pages (with the pilot-day tools since the merge), print views and the journal; Settings, About and certificates.
   - The home page and course map list lessons from `src/content/catalog.ts`: each lesson's id, number, section, title, question and time, and each check's number of questions, made at build time from the checked content (`virtual:thinkerwell/lesson-catalog` in `vite.config.ts`, about 1.5 kB). All 24 lessons (70 kB) load only with the pages that show them. A test checks the catalog says exactly what the lessons say.
   - `main.tsx` keeps index.html's header bar until the first page's code is there, as before, so nothing new flashes.
   - A first visit straight to a lesson (or any lazily loaded page) runs a tiny first-page script (`preloadFirstPage` in `vite.config.ts`) that starts that page's chunks alongside the app's, instead of after it. Without it, a lesson from a link showed 0.6 s later on Slow 3G and 1.2 s later on Very poor than on `main`. Which chunk an address needs is `src/app/lazy/firstPage.ts`; a test checks it against the router.
   - Once a service worker controls the page, `main.tsx` loads every page's code from the offline copy while idle: pages then open at once, and a tab left open keeps working after another tab updates.
   - One stylesheet for every page (`cssCodeSplit: false`), so rules keep their order whatever opens first. Two print rules depended on the old order; they now say what they did (`src/pages/print/print.css`). Every element's computed style at every page-tour stop, on screen and in print, at 390, 820 and 1280px, matches `main`.
   - The build stops if a lesson file, a lazily loaded chunk, a `src/dev` page or a source map would reach a first visit (`keepFirstVisitLight`).
3. **The wordmark font is 4 kB instead of 22 kB** (`scripts/subset_wordmark_font.py`). Eczar draws only "Thinkerwell". The file keeps those letters (and the space, which sets the line's baseline, and the letters FreeType's auto-hinter measures a font by) with their outlines, spacing and kerning unchanged. The header, course, About and a lesson render pixel for pixel as before at 390 and 1280px, 1x and 2x. Every other font file stays: only latin and latin-ext were ever bundled, every weight and style is used, and latin-ext stays for names and later languages (Somali). Fonts are never inlined as `data:` URLs (the CSP allows fonts only from this site).
4. **Images, 87.8 kB down to 49.0 kB precached** (`scripts/optimise_images.py`). Every PNG is recompressed with oxipng (zopfli), keeping every pixel; the mascot is 9.0 kB instead of 10.7 kB. The UN goal icons become 256-colour PNGs (flat colours; edge pixels move by under 0.4/255 on average, checked by eye enlarged three times). The team photos are 208px wide, twice the 104px About shows them at. The social card and app icons are smaller too (not precached).
5. **Caching headers** (`vercel.json`): every page address and `/index.html` are always revalidated, as `sw.js` and the manifest were; hashed files in `/assets/` stay `public, max-age=31536000, immutable`. The Workbox runtime rule goes (it is inside `sw.js`). The Content-Security-Policy is unchanged.
6. **Tests.** `e2e/build-output.spec.ts`: the precache stays under 480 kB (490 kB since the merge, above) and a first visit to the home page under 212 kB (Brotli) and fetches no lesson; no source maps and no dev-only pages. Unit tests for the catalog, the first-page mapping, the wordmark font and the caching headers.

## Tried and dropped

- **Minifying the lesson pictures** (svgo). A configuration that keeps every pixel (checked by rendering each picture at 360, 640, 960 and 1920px) saves 2.1 kB Brotli across the 22 precached pictures (4.6%). Rewriting path data saves 6 kB but moves anti-aliasing in 13 of the 24 pictures. The pictures are hand-edited content with comments, so it would need a build step of its own; not worth it for 2 kB.
- **A stylesheet per chunk** (Vite's default) would save 5.4 kB on the home page's first visit, but the order the rules load in would depend on which page opens first; a print view's lists and picture already came out differently.
- **One chunk per page**: 85 precached files, and 17 kB more JavaScript and 4.6 kB more CSS in all, because small files compress worse. Three lazy chunks instead.
- **Stripping index.html's comments** would save 0.4 kB of its 1.0 kB; not worth a build step.
- **Not done, could be next:** importing the design-system components one by one instead of through `components/ds/index.ts` would take the lesson-only ones (about 7 kB) out of the first visit, but moves rules around in the stylesheet. Giving the mascot a hashed name would save the 9 kB the service worker downloads again after the page has it (Workbox refetches files without a hash).

## Devices that already have the old version

Checked by serving `main`'s build to a browser, letting its worker store the course, then serving this branch's build to the same browser:

- The browser finds the new `sw.js` (always revalidated) and installs it in the background, next to the old one. It uses the same cache, so it downloads only what changed: 20 files and `index.html`, about 220 kB (the libraries, 12 of the 13 font files and the 22 lesson pictures are reused). The lessons chunk is among them: its contents moved, though no lesson text changed.
- As before, it then waits: "A new version is ready" with "Update now". Nothing reloads by itself. After the switch, the old files (the old chunks, the two old Eczar files) are deleted, the cache holds exactly the new list, and lessons open offline.
- A tab still running `main` after another tab updates keeps working: `main` had every page in one file. From this version on, pages load separately, so each tab loads every page's code from its own offline copy as soon as it can (see 2 above); a tab left open on this version keeps working through the next update the same way.
- The old worker's `workbox-9c191d2f.js` isn't needed by the new one. Nothing on the device (IndexedDB) changes.

## Left

- **A lesson opened from a link** downloads 15 kB less but is ready no sooner (6.1 s on Slow 3G): it now needs 15 files before its first screen, not 10. Its first paint is 0.1 to 0.6 s later in these runs: the local test server speaks HTTP/1.1, where the lesson's code shares the connection equally with the stylesheet; Vercel's HTTP/2 lets the browser send the stylesheet first.
- **A first visit that loses the connection** after the home page shows but before the course is stored can't open a lesson it hasn't downloaded; on `main` the lessons came with the first page. The course now takes 15 s to store on Slow 3G instead of 29 s. Since the merge, such a page says "This page hasn't downloaded yet" with "Try again" rather than "Something went wrong" (above); the lesson itself still needs the connection back.
- **Offline ready is now close to the connection's limit**: 513 kB at 150 kbit/s is 27 s, and it takes 34 s. The rest is waiting for the page to finish loading before the worker starts (by design, phase 6). Splitting the pages moved about 100 kB from the first page to the worker's download, so the home page's offline ready is 15.3 s on Slow 3G rather than the 12.9 s the parallel download gave on its own, in exchange for the page being ready 1.9 s sooner.
- Nothing here was tried on the pilot's tablets and laptops or on Vercel itself.
