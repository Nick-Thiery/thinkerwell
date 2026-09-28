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
