# Thinkerwell's own videos

Branch `site-videos`. Built on 9 October 2026.

Three short videos about Thinkerwell itself, made by the team (not lesson videos, which stay YouTube embeds): **Explore your world** (1:53, why Thinkerwell exists and what is in it) on About under the mission, **Run a session** (1:09, a session with a group from start to finish) on For educators under "How a session works" and on For organisations under "What Thinkerwell is", and **Set up a device** (1:19, the setup checklist step by step, from the real pages) on "Set up this device" between the introduction and the steps, on screen only. All are in English with English captions, and every word of each is on the page as its written version, in the reader's language.

## What was built

- **The files** are the site's own, in `public/video/`: `explore-your-world-v3.mp4` (7.8 MB), `run-a-session-v1.mp4` (4.4 MB) and `set-up-a-device-v1.mp4` (4.6 MB), 1280 × 720 H.264 (High, level 4.0) with AAC at 112 kb/s, "fast start" so playback begins before the download ends, and a WebVTT captions file each (`<name>.en.vtt`), made from the narration's word timings. The name carries a version (`-v3`): the files are sent with a year-long immutable cache header (`vercel.json`, like `/audio/`), so a changed video gets a new name, never the same one. `.vtt` is sent as `text/vtt`. The masters, the Remotion project that renders them and the captions script are in the team's video project, not in this repository.
- **`SiteVideo`** (`src/pages/siteVideo/SiteVideo.tsx`) shows one of them with the design system's `VideoCard`, as a lesson's Watch step does, and keeps the same promises (CLAUDE.md rule 2, and the Watch rules):
  - Nothing of the video downloads before the tap. The poster is drawn here, from the mascot picture the site already has (`VideoCard`'s new `posterArt` slot), with the length and "English captions" on it.
  - "Watch the video" puts a `<video controls playsinline>` in the poster's place, with the captions track on (`default`), and starts it; it never plays by itself, and the player's own controls pause it or turn the captions off. "Close the video" goes back to the poster.
  - "Read instead" shows the written version: the video's title, every paragraph it says, and the sources of its figures (`siteVideo.<id>.*` in the messages), with "Watch the video instead".
  - With **Save data** on (the Settings choice, or the browser's data saver until someone chooses: `src/offline/saveData.ts`) the written version shows and no video is offered, as in a lesson. The setting is read once from the device's storage (`getStore().getSettings()`), so the component works on pages that have no learner session of their own.
  - **Offline**, or when the first frame hasn't arrived 20 seconds after the tap, or the file can't play (the `error` event: a browser without an H.264 decoder, a lost connection), the written version shows with a short reason and "Try the video again".
  - Focus follows the view: to the player on the tap, to the written version's heading on "Read instead" or a fallback, back to "Watch the video" on close. A live region says when the player opens.
  - The page's language: the title, the note that the video is English and the written version are Indonesian in Indonesian (drafted by AI and flagged for the native reviewers like the rest, `docs/translation/id/notes/ui.json`); the video and its captions stay English, and the note says so, as the lesson videos' note does.
- **Placing**: About wraps the mission card and the video in one element (`.tw-about-main`), so on a laptop they share the left column beside the UN goals; on a phone they stack. For educators and For organisations show "Run a session" across the whole page (`wide`: the picture and its details side by side on a laptop). The Educators page passes `watchVariant="secondary"` because its hero already has the page's one ink primary button, as does the setup checklist (its Print button), where "Set up a device" sits in the sheet under the introduction, in a `tw-no-print` wrapper so the paper checklist stays one page.
- **`VideoCard`** gained two props, both outside the reference: `posterArt` (a picture under the play button) and `titleInEnglish={false}` (the title is an interface message in the reader's language, so it isn't marked `lang="en"` as a lesson video's English title is).
- **Not in the offline copy, not on a first visit.** `public/video/` is in the precache's `globIgnores` (`vite.config.ts`), so a video is only ever downloaded by someone who taps Watch; the words, though, are in the offline copy with the pages' code, so "Read instead" works offline. The words are also the first message group to load with the pages that show them rather than with en.json: see below.
- **Printing** leaves the video out (`@media print`): the written version is on screen only; the pages that print (the checklist, the forms) don't carry a video.

## Words that load with their pages

Every interface word still lives in `en.json` and `id.json` (rule 7), but `en.json` is in the app's first chunk, and the two transcripts (about 4.6 kB of English) would have taken every first visit to the home page over its budget (`e2e/build-output.spec.ts`), for words the home page never shows. Digital World's preview already had a way round this: the build leaves its group out of the browser's copy of the message files and serves it as a virtual module its own code imports. That mechanism is now general:

- `src/i18n/lazyGroups.ts` lists the groups that load with their pages (`siteVideo` today).
- `stripBuildOnlyMessages` (`vite.config.ts`) leaves them out of the browser's copies of `en.json`, `id.json` and the rest; `lazyMessages` (the plugin that was `courseMessages`) serves each as `virtual:thinkerwell/messages/<group>`, every language's words together.
- `withWords` (`src/i18n/words.tsx`) gives a page's i18n with those words added: the language's own, then the app's messages (the dev server and the test languages still have every group), then English. Digital World's `withCourseWords` is now `withWords` plus its English-lessons marking.
- The group lands in whichever chunk imports it: for `siteVideo`, the chunk the About and educator pages already share. The service worker precaches it like any other page code.

`npm run check:i18n`, the translator's spreadsheet and the tests read the files whole, so nothing changes for translators.

## Sizes

The precache grew by 5.6 kB (649.4 kB, budget raised from 645 to 655 kB) and the home page's first visit by 0.3 kB (224.3 kB, within 224.5 kB): `docs/notes/slow-internet.md`, "Later budget changes".

## Tests

- `src/pages/siteVideo/SiteVideo.test.tsx`: the poster downloads nothing, the tap makes the player with captions and starts it, "Read instead" shows every paragraph and the sources, Save data (the setting and the browser's hint), the 20-second fallback and the first frame cancelling it, the `error` fallback, offline on open and going offline while loading, focus.
- `e2e/site-videos.spec.ts`, at all three sizes: each page offers its video with nothing from `/video/` requested before the tap; the checklist's video is hidden on paper; the tap requests only the site's own file and captions and the player starts with the captions showing (Playwright's Chromium has no H.264 decoder, so that test answers the MP4 request with a two-second VP9 clip, `e2e/fixtures/clip.webm`); the real MP4 gives way to the written version with "Try the video again"; "Read instead"; Save data; offline; Indonesian.
- The page-walking specs (axe, focus rings, sideways scroll, tap targets, privacy, the Content-Security-Policy, the test languages, right-to-left) visit About, For educators and For organisations as before.

## Decisions

1. **The site's own files, not YouTube.** The lesson videos are other people's, embedded from youtube-nocookie.com. These are the team's own, so they are served from the site: nothing is requested from another server (rule 1 goes further than it must), they need no YouTube account to publish, the Content-Security-Policy's `media-src 'self'` already allows them, the captions are a file of our own, and the written version is the page's own words. At 720p the two files are 12 MB together; nobody downloads a byte of them without tapping.
2. **720p, not 1080p.** The masters are 1080p. On the phones and shared tablets the pilot uses, 720p is the screen's own size or more, and the files are about half the size. Screen text in the videos stays readable (checked frame by frame).
3. **No poster picture file.** `VideoCard` draws its poster, and the mascot picture is on every page already, so the poster costs nothing to download.
4. **The words are the written version.** Not a summary: every word the narration says, so a reader without the video (Save data, offline, a browser that can't play it, a screen reader) misses nothing. The figures' sources are under it, as the video's end card shows them.
5. **The budget was raised for real content**, once the transcripts were kept off the first visit. Splitting the words by language (so an English reader doesn't download the Indonesian, 2.2 kB) would need a chunk per language per group; not done for one group.
6. **Versioned file names.** A video can be re-rendered (v3 of "Explore your world" is the one here). With a year-long cache, the only safe way to change one is a new name; the old file can stay until no page points to it.

## For the team

- To replace a video: render the new MP4 and captions in the video project, copy them into `public/video/` under a new version number, change `src` and `captions` in `src/pages/siteVideo/siteVideos.ts`, update the words in `en.json` and `id.json` (and the reviewers' notes) if the narration changed, and run `npm test` and `npm run test:e2e -- e2e/site-videos.spec.ts`.
- The Indonesian words (`siteVideo.*`) are flagged for the native reviewers in the usual way; "IPS dan lebih dari itu" is the draft rendering of the motto "Social studies and beyond", and should stay the same in both videos' words once decided.
