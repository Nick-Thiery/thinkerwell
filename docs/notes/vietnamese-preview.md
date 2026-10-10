# Vietnamese: a hidden preview

October 2026. Vietnamese (`vi`) is fully drafted by AI (the interface, 24 lessons, four section checks, the course text and the 24 pictures) and **not offered**: `ready: false` in `src/i18n/locales.ts`. How it was made, what is in it and what a native reviewer should do is `docs/translation/vi/README.md`; the words to decide first are `docs/translation/vi/KEY_TERMS.md`.

## What "hidden" means in the code

- `ready: false`: the language switch, Settings, the new-learner form and the learner home don't list it; `languagePrecacheIgnores` (`src/i18n/build.ts`) keeps its messages, content and font out of the precache; `lazyMessages()` in `vite.config.ts` leaves a non-ready language's lazily loaded words (`siteVideo`) out of every production chunk (in dev and tests they are all there). Test: `e2e/build-output.spec.ts`, "no Vietnamese preview content is precached or reaches a first visit". Measured at this change: precache 649.9 kB and first visit 224.5 kB, unchanged from `main`.
- `content: true`: its lessons are translated, laid over the English from `content/vi/` exactly as Indonesian's are. `npm run check:content` runs `scripts/check_translation.py vi`; the build checks the files like Indonesian's.
- To see it: `npm run dev` and add `?locale=vi` to an address. A production device cannot show it. A "preview language" switch for native reviewers, like the Digital World preview's (`settings.previewCourses`), is a possible follow-up; it isn't built.

## Fonts

The site's fonts have no Vietnamese letters (stacked tone marks). Be Vietnam Pro (OFL-1.1, `@fontsource/be-vietnam-pro`) is loaded **only while Vietnamese is shown**, as a stylesheet of its own (`font: 'vietnamese'` in `locales.ts`; `src/i18n/fonts/vietnamese.css`, built into `assets/fonts-vietnamese/`), the way Vazirmatn is for Arabic. The build stops if it reaches the site's one stylesheet or the precache. Details: `docs/notes/languages.md`, "Vietnamese fonts". Credits does **not** name it yet: a new line in en.json took a first visit 100 bytes over its 224.5 kB budget, and nobody can see Vietnamese yet. Add "Be Vietnam Pro, by the Be Vietnam Pro Project Authors (Vietnamese letters, only when a language written in them is shown)" beside Vazirmatn's line (`pages.credits.fontVazirmatn`, with its note and translations), together with the recordings' voice, codec and `sea-g2p` entries, before Vietnamese is offered, and make room in the budget by looking for a real cause first (CLAUDE.md).

## Recordings

Not made, and not on `main`. VieNeu-TTS v3 Turbo (Apache-2.0) can record all 145 sections in about an hour on two CPU cores, about 70 minutes and 17 MB of audio. Three sample voices were made for the team to listen to. Choosing the voice, recording and why they wait for review: `docs/notes/recorded-audio.md`, "Vietnamese", and `scripts/audio/README.md`. Until then Listen reads Vietnamese with a Vietnamese voice on the device, or says why it can't.

## Still to do before it is offered

See `docs/translation/vi/README.md`, "What has to happen before Vietnamese is offered". In short: a native reviewer; the open points in `KEY_TERMS.md`; recordings (or device voices only); Settings' voice and audio lists for Vietnamese; public text that names only English and Indonesian made accurate; `ready: true`.
