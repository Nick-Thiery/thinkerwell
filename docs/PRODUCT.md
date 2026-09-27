# Thinkerwell: product notes

Last updated 27 September 2026.

## What it is

A free social-studies course, "Exploring Our World", for refugee, displaced and under-served young people. It is a rebuild of an earlier version made on Base44 (thinkerwell-app.base44.app). The lesson content has been rewritten (version 2) and the site redesigned; this repository is the new build.

- 24 lessons in 4 sections: History & Human Stories (1–9), Geography & Our Environment (10–14), Culture, Society & Identity (15–19), Civics, Media & Everyday Economics (20–24).
- Every lesson: warm-up, evidence, Read (standard or simpler English), quick check, Write, Speak, Watch (optional), Reflect.
- A section check after each section (9–12 questions).
- Team: Justin Park (founder and CEO, content), Nick (CTO: builds the site and leads the AI work).
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
- The About page names Justin (founder and CEO) and Nick (CTO), with a placeholder photo for Nick.
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
- Watch opens on the written version when the browser's own Save-Data hint is on, but still offers the video; the device's "Save data" setting (phase 6) turns the video off completely.
- Quick-check feedback in the content starts with its verdict ("Yes." or "Not quite.", docs/content/SPEC.md); the player shows the Feedback title ("Correct" or "Not quite yet") and drops the content's lead so it isn't said twice. The lesson files are unchanged.
- Each lesson's picture (`visual.src`) opens the evidence on Read, just after the warm-up (which often says "Look at the map"), above the evidence question and the fiction label, as wide as the reading column. It sits outside the evidence cards because some lessons pair invented evidence with a picture of real places (Lesson 8), and the fiction label must not seem to cover those. Write's "Look at the map again" (or "the evidence") shows the same picture and evidence.
- A map card's key lists its labels as text, without colour swatches: each picture draws its own key in its own colours, and swatches built from the content's loose colour names ("brown", "grey") could not match every picture.
- The production bundle leaves out team-only lesson fields (`watch.replacementSuggestion` and `changes`); `educatorNotes` and lesson `sources` stay for the Educators page (phase 7), where the sources are meant to be shown.
- The learner home's "Continue" goes on to the next unfinished lesson after the one finished most recently, the same "Up next" the complete screen offers.
- Captions are on by default in the video player, for learners of English.

## Roadmap

1. **Pilot build (now):** everything in `docs/BUILD_PLAN.md` phases 1–8.
2. **Measurement:** pre and post checks, pilot codes, consent and an events endpoint, as in `docs/research/MEASUREMENT_PLAN.md`. Indonesia's data protection law needs parental consent for children's data.
3. **Translation:** language picker, first-language glossary, right-to-left layouts.
4. **AI features (later):** diagnostic quiz, mastery tracking, reading-level rewrites, first-language glossary help, an educator dashboard, a content review flow. All privacy-first.
5. **Service wing (later):** partnerships for device and data donations.

## Open content decisions

See the "Needs a decision" list in the lesson review page and `docs/content/REVIEW_LOG_*.md`. The main ones: someone must watch all 24 videos (some may not suit these learners), and a HELP educator should review Lessons 4 and 19 before use.
