# Launch checklist

Phase 8, branch `phase-8-quality`, September 2026. This is the quality pass before the HELP pilot: what was checked, what was fixed, how to put the site on Vercel, every network request the site makes, and what only people can do before the pilot.

Everything below was checked in headless Chromium 141 through Playwright, against a production build. Nothing was tried on a real tablet, phone or laptop, in Safari or Firefox, or on Vercel itself. Those checks are in the last section.

## What was checked, and the result

Most checks walk the same **page tour** (`e2e/pageTour.ts`), which visits every kind of page in one visit:

- home with nobody on the device, the new-learner form, the learner home and the learner switcher;
- the course, and the phone menu where there is one;
- every stage of Lesson 10: Read parts 1 to 3, "See it bigger" open, the quick check and its feedback, Write with the example open, Speak, Watch before the tap and "Read instead", Reflect, and the finished lesson;
- a section check: the intro, a question after answering, and the results;
- the journal, Educators, About and Settings (and Settings with a work file chosen to load);
- both print views, a teacher guide and an answer key (added with the teacher tools), and the 404;
- home with a learner on the device, and looking around.

The tour's learner has a long name, so every place that shows a name is tested at its widest.

| Check | How | Result |
| --- | --- | --- |
| No sideways scroll | `e2e/no-sideways-scroll.spec.ts`: `scrollWidth <= clientWidth` at every tour stop. Widths: 320, 360, 390, 640, 768, 820, 1024 and 1280px. 640 is a 1280px laptop at 200% zoom; 320 is the same at 400%, which WCAG 2.2 uses for reflow. It also checks every stage of all 24 lessons, every question of all four section checks, all 24 print views, all 24 teacher guides and all 4 answer keys at 360px. Last, a 30-letter name with no spaces and a 90-character web address typed into Write and Reflect. | Passes after the fixes below |
| Accessibility (axe) | `e2e/accessibility.spec.ts`: @axe-core/playwright, WCAG 2.2 A and AA plus axe's best practices, at every tour stop, at 390 and 1280px. | 0 violations after the fixes below. A one-off run over every stage of all 24 lessons also found 0. |
| Focus rings | The same walk focuses every control on every page as keyboard focus. The ring must show and have 3:1 contrast with what is around it. | Passes |
| Hidden things stay hidden | The same walk looks for any element marked `hidden` that still shows. | Passes after the fix below |
| Keyboard only | `e2e/keyboard-lesson.spec.ts`, at all three sizes. It adds a learner and works through Lesson 10 with only Tab, the arrow keys, Enter, Space, Escape and typing. Every control on the way must show a focus ring. | Passes after the fix below |
| Colour contrast | `src/styles/contrast.test.ts`: every text colour on every ground its token note allows (4.5:1), the violet focus ring on every ground (3:1) and the meaningful borders (3:1), from the values in `tokens.css`. | All pass. The one place violet fails is over the video player (2.2:1 on ink); that ring is now white. |
| 200% and 400% zoom | Browser zoom is the 640px and 320px widths above. | Passes after the fixes below |
| Right to left | `e2e/right-to-left.spec.ts` forces `dir="rtl"` on the production build and walks the tour at 390 and 1280px. It checks the page stays right to left, fits the screen and mirrors every arrow on screen. It also checks the lesson layout and that ArrowLeft moves to the next chip. Screenshots of 12 pages at both sizes were looked at too. | Passes. Nothing needed fixing: the layouts already use logical properties. English punctuation sits at the far end, which is expected until the text is translated. |
| Tap targets | `e2e/tap-targets.spec.ts`: every control on every tour stop is at least 44 by 44px on a phone (390) and a tablet (820). Targets inside a sentence, such as glossary words, are the one exception (WCAG 2.5.8). | Passes |
| Every lesson, stage and quiz renders | Vitest renders every step of every lesson (`LessonPage.test.tsx`). The 360px check opens every stage and question in the browser. | Passes |
| Content | `npm run check:content` | 0 errors in all 24 lessons and 4 section checks. Three lessons have a warning about uncommon words in the simpler text: Lesson 13 "equator"; Lesson 15 "batik", "kente", "tapa"; Lesson 17 "couscous", "kimchi", "lakalaka". They are names of real things, so they were left for Justin to decide (lesson text isn't changed in code). |
| Privacy | `e2e/privacy.spec.ts` records every request from any frame on every tour stop. Nothing may go to another server; after a tap on "Watch the video", only the youtube-nocookie.com frame may. It also checks for no cookies and self-hosted fonts. `e2e/offline.spec.ts` checks the service worker stores only this site's files. | Passes. The full list of requests is below. |
| Security headers | `e2e/security-headers.spec.ts` checks the headers from `vercel.json` arrive on pages and files, and that no tour stop and no tap on play breaks the Content-Security-Policy. `src/offline/deploy.test.ts` checks `vercel.json` itself. | Passes after the zod fix below. `vite preview` sends the same headers, so every end-to-end test runs under the real policy. |
| Speed on slow connections | `npm run perf` (`tools/measure-slow.mjs`), with Chromium's throttling. | See "Speed" below |
| Download size | `npm run size` | See "Speed" below |

## What was fixed

1. **Pages wider than the screen.**
   - A long name with no spaces, or a web address typed into Write or Reflect, made the learner home, the switcher, the journal and the journal print view up to 410px wider than a 360px phone. Text learners type now wraps.
   - Below 360px (a small phone, or a laptop zoomed to 400%), the home hero line, the compact lesson steps and "Just look around (nothing is saved)" didn't fit. The button had already run past its panel's edge at 360px.
2. **The phone checks couldn't catch sideways scroll.** On an emulated phone, Chromium zooms out to fit a page that is too wide, so `window.innerWidth` grows with it. The old checks compared with `innerWidth` and always passed. Every overflow check now uses `clientWidth`.
3. **Section check landmarks and headings.** The intro, question and results screens each had a second `<main>` inside the app's own `<main>`. A question's h3 also came straight after the h1. QuestionCard now takes `headingLevel` (2 or 3). This prop is not in the design-system reference.
4. **Arrow keys in radio groups.** A row of chips ignored ArrowDown, and the quick check's options ignored ArrowRight. Every radio group now answers to all four arrow keys, as the WAI-ARIA pattern asks. Left and Right still swap in right to left.
5. **The focus ring over the video player** was violet on ink (2.2:1). It is now white (on-ink).
6. **Teaching notes on the Educators page were always open.** The notes box's `display: flex` beat the browser's rule for `hidden`, and the unit test (jsdom, no CSS) couldn't see it. A global `[hidden] { display: none !important }` fixes this and anything like it. (The disclosure has since given way to each lesson's teacher guide: docs/notes/teacher-tools.md.)
7. **zod was back in the browser.** Phase 7 exported `QUIZ_SKILLS` from `src/content/schema.ts`, which pulled all of zod into the bundle: 26 kB more to download (gzipped). zod's own feature check also calls `Function('')`, which the new Content-Security-Policy blocks. `QUIZ_SKILLS` now lives in `src/content/quizSkills.ts`, and the build stops if zod reaches a browser chunk (`vite.config.ts`).
8. **A blank page for 6 seconds on Slow 3G.** `index.html` now shows the header's lemon bar with the mascot until the app starts (no words, `aria-hidden`).
9. **Lesson pictures too small to read on a phone.** "See it bigger" is added (see below).

### "See it bigger"

Under each lesson picture on Read and Write, a secondary Button, "See it bigger", opens the picture in the browser's own modal `<dialog>`. The dialog is named for the kind of picture: "The map", "The timeline", "The diagram" or "The picture".

- The picture is at least 640px wide there, so its smallest labels are at least 14px, and at most its own 960px.
- On a phone its area scrolls sideways (drag, or the arrow keys once it has focus); the page never does.
- Pinch-zoom is never turned off. Touch screens show a one-line hint.
- Escape or Close shuts it, and focus goes back to the button.
- The print view leaves the button out.

It is built from Button, Icon (ImageIcon, X) and the native dialog, which traps focus by itself.

## Speed

Measured with `npm run build && npm run perf`, at tablet size (820 x 1180). `dist/` is served with brotli, as Vercel does. Each figure is the median of 3 to 5 cold loads with no cache and no service worker. "Page ready" means the page's h1 is on screen and the page can be used. The "before" column is `main` before this phase.

| Connection (CPU 4x slower) | Page | First paint, before → after | Page ready, before → after |
| --- | --- | --- | --- |
| Slow 3G (400 ms, 400 kbps) | Home | 6.2 s → **2.2 s** | 6.3 s → 6.1 s |
| Slow 3G | Lesson 10 Read | 6.2 s → **2.2 s** | 6.4 s → 6.2 s |
| 3G (300 ms, 1.6 Mbps) | Home | 2.3 s → **1.0 s** | 2.3 s → 2.2 s |
| 3G | Lesson 10 Read | 2.2 s → **1.0 s** | 2.4 s → 2.3 s |
| Slow 4G (150 ms, 1.6 Mbps) | Home | 1.9 s → **0.7 s** | 2.0 s → 1.9 s |
| Slow 4G | Lesson 10 Read | 1.9 s → **0.7 s** | 2.1 s → 2.0 s |
| Any of the three | Any page, on a later visit (from the service worker) | 0.3 s → 0.1 s | 0.4 s (nothing downloaded) |

Download size (`npm run size`), brotli / gzip:

| | `main` before this phase | Now |
| --- | --- | --- |
| First load, home page | 324 kB / 369 kB | **303 kB / 344 kB** |
| First load, Lesson 10 Read | 338 kB / 384 kB | **317 kB / 358 kB** |
| Precache (the whole site, downloaded in the background once) | 512 kB / 570 kB | **490 kB / 544 kB** |

The biggest remaining cost is the JavaScript that must arrive before the page can be used: about 220 kB brotli. Of that, about 91 kB is the libraries (mostly React and React Router), 71 kB is all 24 lessons and 4 section checks, and 56 kB is the app. See "Left, and why" for what could still be done.

## Put it on Vercel

`vercel.json` is ready; nothing needs changing in it for the first deploy. It sets:

- the framework (Vite) and the install (`npm ci`), build (`npm run build`) and output (`dist`) settings;
- a rewrite that answers every page address with `index.html`. Files on disk are served first, and an address that ends in a file name, such as a missing `/assets/…js`, gets a 404 instead of the page;
- the service worker, the manifest, `index.html` and every page address are always revalidated (`max-age=0, must-revalidate`), and hashed files in `/assets/` are cached for a year, `immutable` (from phase 6; the Workbox runtime is now inside `sw.js`: `docs/notes/slow-internet.md`);
- these security headers on every response:
  - a Content-Security-Policy that allows only this site, plus the youtube-nocookie.com player in a frame. `img-src` also allows `data:`, because two small lesson pictures are inlined into the JavaScript, and `media-src` allows `blob:`, for playing back recordings;
  - `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY` with `frame-ancestors 'none'`, so the site can't be shown inside another site;
  - a `Permissions-Policy` that allows the microphone only on this site and turns off the camera, location, payment and USB;
  - `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy` of `same-origin`, and `Strict-Transport-Security` for two years (no `includeSubDomains` or preload until the domain is bought and settled).

`package.json` pins Node to `22.x`, the version everything was built and tested on.

### Import steps

1. In Vercel, choose **Add New… → Project**, then **Import Git Repository**, and pick the Thinkerwell GitHub repository. If the repository isn't listed, install or configure the Vercel GitHub app for the account that owns it.
2. On **Configure Project**:
   - **Project Name**: `thinkerwell`.
   - **Framework Preset**: Vite. It is detected, and `vercel.json` sets it too.
   - **Root Directory**: `./`, the repository root.
   - **Build and Output Settings**: leave as they are. `vercel.json` sets Install Command `npm ci`, Build Command `npm run build` and Output Directory `dist`, and these override the form.
   - **Environment Variables**: none. Don't add `NODE_ENV=production`: `npm ci` would then skip the dev dependencies the build needs (TypeScript and Vite).
3. Choose **Deploy**. The build takes about a minute. It runs `tsc -b` and checks every content file, and a content problem stops it.
4. In the project's **Settings → Build and Deployment**, set **Node.js Version** to **22.x**, to match `package.json` (Vercel follows `engines` either way).
5. In **Settings → Git**, set the **Production Branch** to `main`.
6. In **Settings → Deployment Protection**, leave the default: preview deployments need a Vercel login, and the production address is public. Give HELP only the production address.
7. Once the domain is bought (probably thinkerwell.app), add it under **Settings → Domains** and follow the DNS steps shown there.

### After the first deploy

Check the live site. Replace `SITE` with the production address.

```sh
curl -sI https://SITE/ | grep -iE 'content-security-policy|x-frame-options|referrer-policy|permissions-policy|strict-transport'
curl -sI https://SITE/sw.js | grep -i cache-control               # public, max-age=0, must-revalidate
curl -sI https://SITE/lesson/towns-near-rivers/read | head -1      # 200, and content-type text/html
curl -sI https://SITE/assets/not-a-file.js | head -1               # 404, not the page
```

Then, in Chrome's DevTools on the live site:

- **Application → Service workers** shows `sw.js` with scope `https://SITE/`.
- The **Console** shows no Content-Security-Policy errors.
- Open any lesson's Watch stage and tap "Watch the video": the video plays. If the frame says it was blocked, YouTube sent the player to another host, and that host needs adding to `frame-src` in `vercel.json`.

## Every network request

Checked by recording every request from every frame, and from the service worker, on every page type.

**A first visit, any page.** Everything comes from the site itself:

| Request | What it is |
| --- | --- |
| The page's address, for example `/` or `/lesson/towns-near-rivers/read` | `index.html` |
| `/assets/index-[hash].js`, `NotFoundPage-[hash].js`, `vendor-[hash].js`, `rolldown-runtime-[hash].js` | The app shell with home, the course map and the 404 (`NotFoundPage-` is the code they share with the other pages, named after one of its files), the libraries, and the chunk loader |
| `/assets/lessonPages-[hash].js`, `content-[hash].js` and the chunks they share (`lessonRoutes-`, `speech-`) | Only on a lesson or section check page: the lesson player, and all lessons and checks. The Educators, teacher, print and journal pages load `teacherPages-`; Settings, About and certificates `morePages-` (`docs/notes/slow-internet.md`) |
| `/assets/style-[hash].css` | All styles |
| `/images/thinkerwell-mascot-transparent.png` | The mascot in the header, and the tab icon |
| `/assets/*.woff2`, as text needs them | The self-hosted fonts: Atkinson Hyperlegible Next (400, 500, 700, 400 italic), Funnel Display (500, 600) and Eczar (500, only the wordmark's letters). Latin first; latin-ext only when a character needs it. |
| `/assets/workbox-window-[hash].js`, then `/sw.js` | Registers the service worker, after the page has loaded |

**The service worker's first install** happens once per version, in the background, six files at a time:

- the precache: 57 files. These are `/index.html`, all the JavaScript (every page's) and the CSS, all 13 font files, 22 lesson pictures (`/assets/L01-[hash].svg` and so on), the images in `/images/` (the mascot, 4 UN goal icons and the two team photos) and `/manifest.webmanifest`.
- Once it controls the page, the page loads the other pages' code from it (not from the internet).

Lessons 2 and 4 have no picture file: their pictures are small enough to be inlined into the JavaScript as `data:` URLs.

**Later on:**

| Request | When |
| --- | --- |
| `/assets/L{NN}-[hash].svg` | Read, Write and print show a lesson's picture (from the precache once it is there) |
| `/images/sdg-04.png`, `sdg-10.png`, `sdg-16.png`, `sdg-17.png`, `/images/founder-justin-park.jpg`, `nick-thiery.jpg` | The About page |
| `/sw.js` | The browser checks for a new version when a page opens, and the site checks once an hour while it is open, online and on screen |
| `/manifest.webmanifest`, `/icons/*.png` | Only when someone installs the site or adds it to a home screen (the browser asks) |

After the service worker has installed, page loads answer from it, and nothing is downloaded until a new version comes out.

**After the learner taps "Watch the video"**, the page makes exactly one request to another server: the player frame, `https://www.youtube-nocookie.com/embed/{video id}?rel=0&playsinline=1&modestbranding=1&cc_load_policy=1&enablejsapi=1&origin={this site}`. It sends the site's origin as the referrer and nothing about the learner. Nothing goes to YouTube or Google before the tap: no thumbnail, no preconnect, no script. The service worker never caches any of it.

Inside that frame, YouTube's player then loads its own scripts, images, captions and video from YouTube and Google servers, such as `www.youtube.com`, `i.ytimg.com` and `*.googlevideo.com`. Those requests are made by YouTube's page, not by Thinkerwell, and the site's Content-Security-Policy doesn't govern them. They couldn't be observed here, because this machine can't reach YouTube. See the last section.

**Nothing else.** There are no cookies (tested), no analytics, no fonts or scripts from other servers, and no API calls; the measurement endpoint comes later. Two browser features can reach other servers, but only when someone chooses them. Neither is a request from the site:

- **Say it with "Allow online speech-to-text"**, which is off unless an educator turns it on in Settings. It sends what learners say to the browser maker's service.
- **"Download speech to text"** in Settings is the browser's own one-time download (about 60 MB, from Google for Chrome). It starts only when an educator taps it. ("Check this device", next to it, only asks the browser what it can do; it downloads nothing.)

Recordings never leave the device. Listen uses only voices that run on the device.

Saving work to a file and loading one (Settings, "Move work to another device") make no requests: the file is made and read in the browser (`docs/notes/device-transfer.md`).

## Left, and why

- **About 130 kB of JavaScript before a first visit to the home page can be used**, most of it React and React Router (91 kB). The lessons and the other pages now load with the pages that show them (`docs/notes/slow-internet.md`); a lesson opened straight from a link still needs them all (about 225 kB). Later visits come from the service worker.
- **The YouTube player's own requests** were not observed (see above).
- **axe's "needs review" items:** the numbers inside the progress rings on the course and learner home. axe can't see the ring's ground through the SVG. They are ink on a section tint or canvas, at least 15:1.
- **Text-only zoom** (Safari's and Firefox's zoom text only) wasn't tested; Chromium has none. The layouts use px sizes from the tokens, so check it on a device.
- **Browsers other than Chromium.** Safari on iPad and iPhone, Chrome on Android, and Firefox weren't available here. The picture dialog needs Safari 15.4 or later; older browsers open it in the page, without trapping focus.
- **From earlier phases**: the notes for phases 5 to 7 list what couldn't be tried without real devices. That covers speech on real hardware, a real offline day and an update, and old tabs after a storage upgrade.

## Before the pilot: what only people can do

- [ ] **Import the repository into Vercel** (steps above), then run the checks under "After the first deploy".
- [ ] **Test on the real pilot devices**: HELP's tablets and laptops, in the browsers they have. On each one:
  - open the site once on good internet and wait for "All 24 lessons work offline" on the learner home;
  - then turn off the Wi-Fi and open a few lessons;
  - in Settings, tap **Check this device** under "Say it" (once per device and browser, and again after a browser update). Lessons show Say it on the device only after this says speech stays on the device; they never check by themselves. If it offers "Download speech to text", download on good Wi-Fi, then check again;
  - try Listen, Say it and Record yourself;
  - print a lesson, a teacher guide and an answer key;
  - in Settings, save a learner's work to a file, find the file (on an iPad: Files, then Downloads), and load it on another device. On an iPad, do this from the Home Screen app;
  - use a lesson with the keyboard and with a screen reader (VoiceOver on iPad, TalkBack on Android, NVDA on Windows).
- [ ] **Add Thinkerwell to the Home Screen on every iPad and iPhone.** Otherwise Safari deletes the saved work and the offline copy after 7 days without a visit.
- [ ] **Before resetting a tablet or replacing a device, save everyone's work to a file**: Settings, "Move work to another device", "All learners on this device", **Save my work to a file**. On the new device, **Load my work** and choose the file. Recordings aren't in the file. Tell HELP's educators this too, and to keep the file safe: anyone with it can read the work in it.
- [ ] **Watch all 24 videos.** Some may not suit these learners, and a HELP educator should review Lessons 4 and 19 (docs/PRODUCT.md). On HELP's own network, check that the videos play: a school filter or a regional block would show the written version instead. In DevTools, note which servers the player contacts.
- [ ] **Confirm HELP's consent process** before any measurement, and before an educator turns on "Allow online speech-to-text".
- [ ] **Replace the placeholders**:
  - `[FEEDBACK EMAIL]` on the Educators page (`pages.educators.feedbackEmail` in `src/i18n/messages/en.json`);
  - ~~Nick's photo on the About page~~ Done: `public/images/nick-thiery.jpg`, made from `docs/design-system/assets/nick-thiery.jpg`.
- [ ] **Decide the learner avatar colours** (open in docs/PRODUCT.md).
- [ ] **Check which teaching notes are marked as sensitive topics** (`sensitiveNotes` in each lesson file; docs/notes/teacher-tools.md).
- [ ] **Buy the domain**, add it in Vercel, and share only that address with HELP. Then change `https://thinkerwell.vercel.app` in the link-preview tags in `index.html` (`og:url`, `og:image`, `twitter:image`) to the new address.
- [ ] **Check a link preview** on the live site: paste the address into WhatsApp (and, if you like, Facebook's Sharing Debugger or opengraph.xyz). It should show "Thinkerwell: Exploring Our World", the line under it and the lemon card with the mascot (`public/social-card.png`).
