# Offline use of the four courses (9 November 2026)

Since the whole-platform pilot, Our World, Digital World, Southeast Asia Through Time and Art, Architecture and Society are all open on every device. This note says what works offline, how a device is prepared, and what was tested.

## How it is built

- **Our World** is in the service worker's precache (the whole course, every page, lesson, picture and font), so it works offline after the first visit. Unchanged.
- **The other three courses** are in `dist/assets/preview/` and are never precached (about 9.6 MB together: Digital World ~1 MB, Southeast Asia Through Time ~2.5 MB, Art, Architecture and Society ~6.1 MB, plus ~24 kB they share). Putting them in the precache would have made every first visit and every update download 9.6 MB more on slow connections, for courses a group may not use.
- Instead the worker keeps them at run time, in a cache of its own, `thinkerwell-courses-v1` (`src/offline/courseCache.ts`, `src/offline/sw.ts`): a course's file that is downloaded while online is stored, and served from the cache when offline (`ignoreVary`, because the files are served with `Vary: Origin`). The build writes `course-files.json` (`courseFilesManifest`, `vite.config.ts`), listing every file of each course and what they share, with sizes; it is fetched network-first with a cached fallback. Old versions' files are pruned when a new worker activates.
- **"Save the courses"** (Settings, `/settings#course-files`, and a button on the setup checklist, `src/offline/courseFiles.ts`) downloads every file in that manifest at once, with a progress bar, and can remove a course again. It is not offered with Save data on.

## What the educator does

1. Open Thinkerwell once on good Wi-Fi (this saves Our World).
2. If the group will use any other course, open Settings, "Courses for offline use", and tap "Save the courses" (about 10 MB). The setup checklist says the same. A course that was only opened is kept as far as it went: the pages and lessons that were opened.
3. Videos always need the internet. Every lesson with a video has a written version ("Read instead"), which works offline.

## What works offline (tested)

After "Save the courses", on a device that then goes offline (`e2e/courses-offline.spec.ts`, Chromium with the service worker allowed):

- the course choice, each course's map, its lessons (Read, Write, Speak, Reflect), the teacher guides and the print views open, in English, Indonesian and Malay;
- the pictures of Southeast Asia Through Time and Art, Architecture and Society load (Digital World has no pictures yet: its 17 are placeholders);
- saved responses and progress are on the device (IndexedDB) and are unaffected by being offline; switching between courses keeps them;
- Listen's recordings are separate: they are downloaded in Settings ("Lesson audio") and are never in the course cache. Without a recording, or offline, Listen uses a device voice if there is one, and the Read step says so if there is none.

A course that was **only opened online** works offline for what was opened: its other lessons' text opens (it is in the course's code) but their pictures do not load, and show the alt text. A course that was never opened or saved says "This page hasn't downloaded yet" with "Try again", and nothing else breaks.

## What does not work offline

- videos (YouTube, and Thinkerwell's own videos on About and the educator pages: they download only on a tap);
- a course that was never opened or saved on this device, and its Listen recordings unless downloaded.

## Sizes

See `docs/notes/slow-internet.md`, entry of 9 November 2026: the precache and a first visit stay within their budgets; no course content is in either.
