# Thinkerwell: product notes

Last updated 27 September 2026.

## What it is

A free social-studies course, "Exploring Our World", for refugee, displaced and under-served young people. It is a rebuild of an earlier version made on Base44 (thinkerwell-app.base44.app). The lesson content has been rewritten (version 2) and the site redesigned; this repository is the new build.

- 24 lessons in 4 sections: History & Human Stories (1–9), Geography & Our Environment (10–14), Culture, Society & Identity (15–19), Civics, Media & Everyday Economics (20–24).
- Every lesson: warm-up, evidence, Read (standard or simpler English), quick check, Write, Speak, Watch (optional), Reflect.
- A section check after each section (9–12 questions).
- Team: Justin Park (founder and director, content), Nick (CTO: builds the site and leads the AI work).
- Not a registered entity yet. Hosting on Vercel; domain to be bought when the site goes live (thinkerwell.app is the likely choice).

## Who it's for

- Learners about 10–17, many learning English, many with interrupted schooling. Home languages include Dari/Farsi, Rohingya, Somali and Arabic. Many live in "transit" countries where they can't work legally or open a bank account and don't know where they will live next.
- They use shared laptops and tablets, often with a volunteer teacher, on unreliable Wi-Fi.
- Educators at partner organisations run sessions and may want simple progress information.
- Details in `docs/research/LEARNER_CONTEXT.md`.

## First pilot

HELP for Refugees, Jakarta. Target start: one to two weeks from 26 September 2026 (no hard deadline). Still waiting on HELP for: learners' ages and number, home languages and English level, devices and browsers, who runs sessions, which lessons to pilot, and their parental-consent process.

## Decisions so far

- Keep the colour scheme, logo and mascot; the layout and user experience are redesigned (see `docs/screens/`).
- Fonts: Funnel Display for headings, Atkinson Hyperlegible Next for everything else, Eczar for the wordmark.
- Culture's section colour is rose, so lavender always means "help".
- Shared-device learner tiles; no accounts. An optional class code links a learner to a partner group for the pilot.
- Learner avatar colours: Yellow, Sand, Green, Blue and White, as on the NewLearner screen, with White as the default. Sand, Green and Blue reuse the History, Geography and Civics tints, which the brand book keeps for section places, and the brand book gives avatars lavender, so this is a recorded exception. **Open for Justin and Nick to confirm**; the alternative is lavender avatars told apart by initial.
- Nothing is locked; checks never block.
- The old keyword "Learning Guide" is removed; AI features come later.
- Listen (read aloud), Say it (dictation, on-device only by default) and Record yourself (stays on the device) are in.
- Offline use, a "Save data" mode and a print view are in.
- English first. Translation later: probably Dari/Farsi, Somali and Arabic first. Build right-to-left support in from the start.
- Feedback email on the educators page is a placeholder for now.
- The About page names Justin (founder and director) and Nick (CTO), each with a photo.
- British spelling in all copy.

### Lesson player (phase 4)

- **When a stage counts as done** (`src/lesson/progressRules.ts`): Read when every quick-check choice question is answered, right or wrong, or the learner continues from the quick check; Write when they continue having written something; Speak when they choose how they practised; Watch (optional) when they answer the after question or continue; Reflect as soon as the required prompt is answered (saved with the typing, so leaving without "Finish lesson" still counts), which completes the lesson. Continuing past a stage that the rules don't tick (an empty Write box) never creates a saved record, so an unstarted lesson never shows "In progress". Nothing is locked: these only decide the ticks.
- The reading level (Standard or Simpler) is remembered per learner, on the learner's own record, and falls back to the device's preferred level.
- A lesson opened with nobody chosen works like "Just look around" (nothing saved) and shows a note offering to choose who's learning.
- Write's example answer shows only once the learner has written something or taps "See an example answer", and stays open after that.
- Speak doesn't show "Say it in three sentences" frames: the lesson content has no field for them yet.
- The laptop StagePath's small labels under each stage are the same for every lesson ("Your writing task", "Optional · 4 min"), since the content has no per-lesson ones.
- Read's current part is in the address (`?part=2`, `?part=check`), so reload and Back work.
- The complete screen: anyone who opens it before finishing sees "You're partway through Lesson N." with a link to the first step not done. For guests this is decided by what they did on this visit (kept in memory), and they also see that nothing was saved.
- A guest's answers (look-around, or nobody chosen) live in memory only, and are forgotten whenever someone starts looking around, goes back to "Who's learning today?", or chooses or adds a learner, so the next person on a shared device never sees them.
- Watch counts the video as working only when the youtube-nocookie player itself says it is ready (a postMessage), not when its frame loads: a refused connection, a school filter or a captive portal also "load" a page. Otherwise the written version shows after 20 seconds, or at once when the device goes offline or the player says it can't play the video.
- Watch opens on the written version when the browser's own Save-Data hint is on, but still offers the video; the device's "Save data" setting (phase 6) turns the video off completely. (Changed in phase 6: the hint now turns Save data on until someone chooses in Settings, so the video isn't offered then either.)
- Quick-check feedback in the content starts with its verdict ("Yes." or "Not quite.", docs/content/SPEC.md); the player shows the Feedback title ("Correct" or "Not quite yet") and drops the content's lead so it isn't said twice. The lesson files are unchanged.
- Each lesson's picture (`visual.src`) opens the evidence on Read, just after the warm-up (which often says "Look at the map"), above the evidence question and the fiction label, as wide as the reading column. It sits outside the evidence cards because some lessons pair invented evidence with a picture of real places (Lesson 8), and the fiction label must not seem to cover those. Write's "Look at the map again" (or "the evidence") shows the same picture and evidence.
- A map card's key lists its labels as text, without colour swatches: each picture draws its own key in its own colours, and swatches built from the content's loose colour names ("brown", "grey") could not match every picture.
- The production bundle leaves out team-only lesson fields (`watch.replacementSuggestion` and `changes`); `sensitiveNotes`, `educatorNotes` and lesson `sources` stay for the educator pages (the Educators page and each lesson's teacher guide), where they are meant to be shown.
- The learner home's "Continue" goes on to the next unfinished lesson after the one finished most recently, the same "Up next" the complete screen offers.
- Captions are on by default in the video player, for learners of English.

### Listen, Say it and Record yourself (phase 5)

Browser support and the reasons are in `docs/notes/phase-5.md`.

- Listen uses only a voice that runs on the device, so it works offline and sends nothing. Where there is no such English voice, the Listen tool is hidden. It reads the part on screen, heading first and then one sentence at a time, and moves on from part to part by itself.
- Say it runs only where speech can be turned into text on the device, which today means recent Chrome on a laptop with its English pack. Elsewhere it is hidden, unless an educator turns on "Allow online speech-to-text" in Settings. That setting sends what learners say to the browser maker's service, and educators should turn it on only when the organisation and the families have agreed. The setting is off unless someone turns it on.
- Settings for this device (`/settings`) is for educators. It says what this browser can do and offers the browser's own one-time download for on-device speech to text. It is linked from the Educators page and, since phase 6, from the header menu. Changes there are saved even while looking around.
- Record yourself keeps the latest clip per learner and lesson on the device. It is deleted when the learner taps Delete or is removed, and not when someone else starts using the device. Guests' clips last only while the page is open. Recordings stop by themselves after 3 minutes and never count towards Speak being done.
- The Listen speed (Slow or Normal) is a device setting, saved when a chosen learner changes it.

### Offline, Save data and print (phase 6)

Details, sizes and the reasons are in `docs/notes/phase-6.md`.

- The whole course (every lesson, section check, picture and font) is saved on the device during the first visit, not lesson by lesson. That is about 480 kB compressed, and the first page itself about 295 kB. The learner home says "All 24 lessons work offline", and lesson rows have no "Saved for offline" badge.
- A new version never reloads the page by itself. It waits, and shows "A new version is ready" with "Update now". Otherwise it starts the next time Thinkerwell opens.
- Under the header, a banner says when the device is offline, and for a few seconds when it's back online. Guests are never told their work is saved.
- Watch opened while offline starts on the written version.
- "Save data" follows the browser's own data saver until someone chooses in Settings; a choice in Settings always wins. With it on, videos are off.
- Settings for this device is in the header menu, outside the five main links: offline status, Save data, the reading level for anyone who hasn't chosen one, the Listen speed and Say it.
- Every lesson has a print view with both reading levels, the key words, the picture, the quick check and every task, with lines to write on. The journal has one too, built from the learner's saved writing and reflections. They print in black and white with no header; the lesson picture keeps its colours.
- For volunteer teachers, every lesson has a teacher guide and every section check an answer key, linked from the Educators page (docs/notes/teacher-tools.md). The guide opens with the notes on sensitive topics, then a suggested plan for about 45 minutes (with a 30-minute version), and has the answers to the quick check. They work offline and print on A4. The Educators page no longer has a per-lesson notes disclosure: the guide has those notes.
- On iPads and iPhones, add Thinkerwell to the Home Screen: Safari deletes a site's saved data after 7 days without a visit otherwise.

### Quality pass and launch (phase 8)

What was checked, the Vercel import steps, every network request and what is left for people are in `docs/LAUNCH_CHECKLIST.md`.

- Every lesson picture has "See it bigger". It opens the picture in a dialog, big enough to read its labels on a phone, which can be dragged and pinch-zoomed. Pinch-zoom is never turned off anywhere.
- The site sends a Content-Security-Policy: only this site, plus the youtube-nocookie.com player in a frame after the learner taps play. The site can't be shown inside another website (for example a learning platform's frame). If a partner needs that, it is a decision to make, not a setting to flip.
- While the app starts on a slow connection, the page shows the header with the mascot instead of staying blank.
- Every radio group (warm-up chips, quick-check options, Speak's choices) answers to all four arrow keys. The quick check still answers only on Space or Enter.
- The site is built and tested with Node 22.

## Roadmap

1. **Pilot build (now):** everything in `docs/BUILD_PLAN.md` phases 1–8.
2. **Measurement:** pre and post checks, pilot codes, consent and an events endpoint, as in `docs/research/MEASUREMENT_PLAN.md`. Indonesia's data protection law needs parental consent for children's data.
3. **Translation:** language picker, first-language glossary, right-to-left layouts.
4. **AI features (later):** diagnostic quiz, mastery tracking, reading-level rewrites, first-language glossary help, an educator dashboard, a content review flow. All privacy-first.
5. **Service wing (later):** partnerships for device and data donations.

## Open content decisions

See the "Needs a decision" list in the lesson review page and `docs/content/REVIEW_LOG_*.md`. The main ones: someone must watch all 24 videos (some may not suit these learners), and a HELP educator should review Lessons 4 and 19 before use.
