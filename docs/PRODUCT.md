# Thinkerwell: product notes

Last updated 1 October 2026.

## What it is

A free social-studies course, "Exploring Our World", for refugee, displaced and under-served young people. It is a rebuild of an earlier version made on Base44 (thinkerwell-app.base44.app). The lesson content has been rewritten (version 2) and the site redesigned; this repository is the new build.

- 24 lessons in 4 sections: History & Human Stories (1–9), Geography & Our Environment (10–14), Culture, Society & Identity (15–19), Civics, Media & Everyday Economics (20–24).
- Every lesson: warm-up, evidence, Read (standard or simpler English), quick check, Write, Speak, Watch (optional), Reflect.
- A section check after each section (9–12 questions).
- Team: Justin Park (founder and director, content), Nick (CTO: builds the site and leads the AI work).
- Not a registered entity yet. Hosted on Vercel at https://thinkerwell.app (bought in September 2026).

## Who it's for

- Learners about 10–17, many learning English, many with interrupted schooling. Home languages include Dari/Farsi, Rohingya, Somali and Arabic. Many live in "transit" countries where they can't work legally or open a bank account and don't know where they will live next.
- They use shared laptops and tablets, often with a volunteer teacher, on unreliable Wi-Fi.
- Educators at partner organisations run sessions and may want simple progress information. The class view shows it for each device, without scores.
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
- English is the default. Bahasa Indonesia is a full second language for the Jakarta pilot, lessons included, offered to everyone while native-speaker review is in progress (see "Languages" below). Dari/Farsi, Somali and Arabic may follow, interface only, once we know the learners' home languages.
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
- Settings for this device (`/settings`) is for educators. Its "Check this device" button asks what this browser can do and saves the answer, and it offers the browser's own one-time download for on-device speech to text. Lessons show on-device Say it only after that check said yes, and never ask the browser themselves: asking as a page opened crashed the tab in Chromium 153 on touch devices (docs/notes/phase-5.md, "Changed"). It is linked from the Educators page and, since phase 6, from the header menu. Changes there are saved even while looking around.
- Record yourself keeps the latest clip per learner and lesson on the device. It is deleted when the learner taps Delete or is removed, and not when someone else starts using the device. Guests' clips last only while the page is open. Recordings stop by themselves after 3 minutes and never count towards Speak being done.
- The Listen speed (Slow or Normal) is a device setting, saved when a chosen learner changes it.

### Offline, Save data and print (phase 6)

Details, sizes and the reasons are in `docs/notes/phase-6.md`.

- The whole course (every lesson, section check, picture and font, and every page's code) is saved on the device during the first visit, not lesson by lesson. That is about 480 kB compressed. The first page itself downloads only what it shows: about 210 kB for the home page, about 320 kB for a lesson opened from a link. Home, the course map and the 404 come first; every other page (lessons, section checks, the journal, Educators and its tools, print views, certificates, Settings, About) loads when it is first opened, and from the saved copy once there is one (`docs/notes/slow-internet.md`). The learner home says "All 24 lessons work offline", and lesson rows have no "Saved for offline" badge.
- If the connection drops on a first visit before the course is saved, a page that hasn't downloaded yet says so, calmly and under the header: "This page hasn't downloaded yet. Connect to the internet, then try again.", with "Try again" and a link home. It never shows "Something went wrong" for this.
- A new version never reloads the page by itself. It waits, and shows "A new version is ready" with "Update now". Otherwise it starts the next time Thinkerwell opens.
- Under the header, a banner says when the device is offline, and for a few seconds when it's back online. Guests are never told their work is saved.
- Watch opened while offline starts on the written version.
- "Save data" follows the browser's own data saver until someone chooses in Settings; a choice in Settings always wins. With it on, videos are off.
- Settings for this device is in the header menu, outside the five main links: offline status, Save data, the reading level for anyone who hasn't chosen one, the Listen speed and Say it.
- Every lesson has a print view with both reading levels, the key words, the picture, the quick check and every task, with lines to write on. The journal has one too, built from the learner's saved writing and reflections. They print in black and white with no header; the lesson picture keeps its colours.
- For volunteer teachers, every lesson has a teacher guide and every section check an answer key, linked from the Educators page (docs/notes/teacher-tools.md). The guide opens with the notes on sensitive topics, then a suggested plan for about 45 minutes (with a 30-minute version), and has the answers to the quick check. They work offline and print on A4. The Educators page no longer has a per-lesson notes disclosure: the guide has those notes.
- On iPads and iPhones, add Thinkerwell to the Home Screen (the first step of **Set up this device**, below): Safari deletes a site's saved data after 7 days without a visit otherwise.

### Certificates

Details and the reasons are in `docs/notes/certificates.md`.

- Every section has a printable certificate, and so does the whole course. A learner gets one by finishing every lesson in it (Reflect's required answer). The section checks are never needed, and no score is printed.
- It shows the mascot and wordmark, the learner's name, what they finished, the section's lessons (or the four sections), the date the last lesson was finished and a line for a teacher to sign. It says the course is free and from Thinkerwell, and claims no accreditation.
- The name is the learner's own on this device. Whoever prints can change it (for example to a full name) for that print only; it is never saved.
- It is offered when a learner finishes the lesson that completes a section or the course (on the complete screen), then on that section's card on the course page, and for the course on the learner home. Opened too early, it lists the lessons left. Guests are told certificates are for learners who have finished lessons.
- It prints on one landscape page, on A4 or Letter, in black and white with little ink. Other printouts stay portrait. It works offline.
- The date reads "September 5, 2026", like the date in Settings. Day first would mean changing the site's English to British date order everywhere: open for Justin and Nick.

### Languages

Details and the reasons are in `docs/notes/languages.md`; how a helper translates is in `docs/TRANSLATING.md`.

- The lessons stay in English on purpose: the course is also English practice. What gets translated is the interface (buttons, menus, instructions), and, if wanted, one short line in the learner's language under the English meaning of each key word.
- **Exception: Bahasa Indonesia** (decided September 2026, for the Jakarta pilot; Justin to confirm). Learners who choose it get everything in Indonesian: the interface, all 24 lessons (standard and simpler reading, key words, quick checks, writing help, example answers, self-checks), the section checks, the course and section names, certificates and the lesson pictures. The videos stay English; the Watch step says so and offers the written version, which is translated. Only the videos' titles stay English; teachers' notes and sources are translated too. Listen reads Indonesian only with an Indonesian voice on the device, and says so when there is none; Say it listens in Indonesian under the same on-device rules. It was drafted and cross-checked by AI and is intentionally offered to everyone while native speakers review it (decided September 2026; `docs/translation/README.md`). Every device's offline copy grows by about 124 kB for it.
- Dari (`fa-AF`) and Arabic (right to left) and Somali are listed but not offered: a language appears only once a native speaker has translated every interface string and a second one has reviewed it. No machine translation reaches learners, except Bahasa Indonesia while its review is in progress. English and Indonesian are offered.
- Each learner can have their own language (a shared tablet may have learners with different home languages), chosen when they are added or on their home page. The device has a language too, in Settings, for the home screen, anyone looking around and learners who haven't chosen. Switching learner switches language. These choices show only once a second language is ready.
- **One language setting, switchable everywhere.** A globe button in the header, on every page including the first one, shows the language in its own name ("English", "Bahasa Indonesia") and changes it at once, no reload. Settings, the new-learner form and the learner home change the same setting. Before anyone is chosen it is saved for the device (the first page uses it); once a learner is chosen, it is theirs, and choosing a learner switches to their language. A reload keeps it.
- A learner's language goes with their work when it is moved to another device.
- In another language, lesson text stays marked as English, so screen readers and Listen read it as English. Listen and Say it always work in English, except in Indonesian, whose lessons are Indonesian.
- Dari and Arabic use the Vazirmatn font for their letters, downloaded only when one of them is shown. Somali needs no extra font.
- Each language downloads only when someone uses it, and is saved for offline use only once it is ready. Nothing extra downloads for English.
- Open: which calendar Dari dates should use (Afghanistan's solar calendar, which the browser uses by default, or the Western one), and whether the "how I practised" options and the fiction label, which come with the lesson files and so stay English, should be translatable.

### Quality pass and launch (phase 8)

What was checked, the Vercel import steps, every network request and what is left for people are in `docs/LAUNCH_CHECKLIST.md`.

- Every lesson picture has "See it bigger". It opens the picture in a dialog, big enough to read its labels on a phone, which can be dragged and pinch-zoomed. Pinch-zoom is never turned off anywhere.
- The site sends a Content-Security-Policy: only this site, plus the youtube-nocookie.com player in a frame after the learner taps play. The site can't be shown inside another website (for example a learning platform's frame). If a partner needs that, it is a decision to make, not a setting to flip.
- While the app starts on a slow connection, the page shows the header with the mascot instead of staying blank.
- Every radio group (warm-up chips, quick-check options, Speak's choices) answers to all four arrow keys. The quick check still answers only on Space or Enter.
- The site is built and tested with Node 22.

### Moving work between devices

Details, the file format and the reasons are in `docs/notes/device-transfer.md`.

- Settings has "Move work to another device". It saves one learner's work, or everyone's, to a small file, and loads such a file on another device. Nothing goes online: the file is downloaded, and loading reads a file someone picks. The file holds the learners, their lesson work and their section checks. Recordings and the device's settings stay on the device.
- Loading checks the whole file first and shows what is in it. Nothing changes until someone taps "Load it". A file that isn't Thinkerwell work, is from a newer version, is empty, is over 5 MB or is damaged in any part is refused, and nothing changes. Work for lessons this version doesn't have is left out, and the preview says how many.
- Learners are matched by id, never by name. A learner who isn't on the device is added as they are. A different learner with the same name is added too, and tiles of learners who share a name also show the day each was added.
- For a learner on both, nothing is lost. Every stage done on either side stays done, and a lesson completed on either side stays completed. For each answer, the copy from the lesson saved more recently wins, but an empty answer never replaces a written one. Section checks keep the best and the latest attempt, and the larger count of attempts. Loading the same file twice changes nothing the second time, and a failure while loading changes nothing at all.
- Before a tablet is reset or replaced, an educator saves everyone's work to a file (`docs/LAUNCH_CHECKLIST.md`). The file isn't locked, so it must be kept safe.

### Pilot-day tools

Details and the reasons are in `docs/notes/pilot-day-tools.md`. The founders won't be at the pilot, so HELP's staff set up devices and follow their group with three pages under Educators. All work offline and read only what is on the device.

- **Set up this device** (`/educators/setup`): a checklist for each laptop or tablet that says which steps are done on that device. The order matters: add Thinkerwell to the home screen first (on iPad the Home Screen app keeps its own saved work, apart from Safari), then the offline download, keeping saved work safe (the browser is asked only when someone taps), adding learners, and last the speech check (the saved result of Settings' "Check this device"; the page never asks the browser about speech itself). Then a reminder to save everyone's work to a file before a device is reset. It prints as a one-page checklist.
- **The class on this device** (`/educators/class`): every learner by name, with lessons finished per section, the lesson they're on, when they last worked and which section checks they've tried. No scores and no ranking, because any learner on a shared device can open it. It doesn't link to journals: a journal is always the current learner's, and this page never switches learners.
- **Print all certificates**: every certificate earned on the device, one landscape page each. Names come from the device; a learner's own certificate page is where a name can be changed for one print.
- Like the other Educators pages, they load when first opened and are saved for offline use with the rest of the course. Their dates and numbers follow the interface's language, and lesson and section names stay marked as English.

### Partner kit

Details and the reasons are in `docs/notes/partner-kit.md`. It gives a new partner organisation what it needs to start a pilot, in English and Bahasa Indonesia, under "Starting a pilot" on the Educators page:
- **For organisations** (`/organisations`, also linked from the new footer on every page): what a pilot involves, what partners get, what we ask, how privacy is kept, and how to get in touch once there is a contact address (`src/app/contact.ts`; no placeholder is shown meanwhile). It says that Thinkerwell is a student-led project, not a registered charity, that today learners' work and progress aren't sent to Thinkerwell, and which optional features use outside services. The wording follows `docs/content/PUBLIC_COPY.md`.
- **A consent form** for parents and guardians, one A4 page in black and white, with the organisation's name typed in or written by hand. It promises what the measurement build must keep to: anonymous data only (time spent, lessons finished, quiz scores, linked to a code), only the team sees it, it is deleted within 6 months of the pilot ending, YouTube gets some data when a video plays, and taking part is voluntary. A staff note, shown on screen only, says it is a template, not legal advice.
- **Code cards**: a prefix and a number make cut-out cards (HLP-01 …) and a list for names, which the organisation keeps. Learners type their code as their name.

### About and Credits

- **About** (`/about`) says what Thinkerwell is, the UN goals it works towards and who makes it, and ends with a link to Credits. The "Our promise to learners" box and the line about not being a registered charity were taken off About, and that line off the footer, in September 2026 (Nick's call). Nothing anywhere may claim Thinkerwell is a registered charity or nonprofit; For organisations and the consent form still say plainly that it isn't one.
- **Credits** (`/credits`, linked from About and the footer) lists every lesson's sources, every lesson's video with its channel (links only, nothing embedded), the pictures and the UN goal icons with the UN's statement, the fonts and their licence, the open-source software in the site, and how the Indonesian was made. The sources and videos come from the lesson files, so a new lesson credits itself.

## Roadmap

1. **Pilot build (now):** everything in `docs/BUILD_PLAN.md` phases 1–8.
2. **Measurement:** pre and post checks, pilot codes, consent and an events endpoint, as in `docs/research/MEASUREMENT_PLAN.md`. Indonesia's data protection law needs parental consent for children's data.
3. **Translation:** the groundwork is in (language list and picker, per-learner language, first-language glossary lines, right-to-left layouts and font, test languages, the translator's spreadsheet), and Bahasa Indonesia is fully translated and offered, with native-speaker review in progress. Next: that review; then learn the pilot learners' home languages, and translate and review those with native speakers.
4. **AI features (later):** diagnostic quiz, mastery tracking, reading-level rewrites, first-language glossary help, an educator dashboard, a content review flow. All privacy-first. The first step, on-device Suggestions (an optional starting check, a suggested reading level, "worth another look" by skill and hints for teachers, all worked out on the device), is specified in `docs/content/PERSONALIZATION_SPEC.md` and planned for after the HELP pilot.
5. **Service wing (later):** partnerships for device and data donations.
6. **Digital World (later, a second course):** the course spec and the first three draft lessons are in `docs/content/DIGITAL_WORLD_SPEC.md` and `drafts/digital-world/`; they are not in the app, and only Our World is on during the HELP pilot.

## Open content decisions

See the "Needs a decision" list in the lesson review page and `docs/content/REVIEW_LOG_*.md`. The main ones: someone must watch all 24 videos (some may not suit these learners), and a HELP educator should review Lessons 4 and 19 before use.
