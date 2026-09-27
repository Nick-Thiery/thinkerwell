# Build plan and Claude Code prompts

Run the phases in order, each in a fresh Claude Code session from the repository root. Each phase ends with a pull request you (or Justin) review before starting the next. Every prompt tells Claude Code to read `CLAUDE.md` first; it also loads it automatically.

Models: `claude-opus-5-5` for the phases with the most judgement (architecture, the lesson player, speech, offline, final quality pass) and `claude-sonnet-5` for the more mechanical ones. Raise the effort if a phase goes badly; lower it for small fixes.

## Before you start (you, about 20 minutes)

1. Create a private GitHub repository called `thinkerwell` and give Justin access.
2. Clone it, copy everything from this kit into the repository root, then commit and push ("Add build kit: content, design system, screens, docs").
3. Install Node.js (current LTS), Python 3 with `pip install wordfreq` (for the content checker), and Claude Code.
4. In Vercel, import the repository. You can do this after phase 1, once there is something to build.

---

## Phase 1: scaffold and foundations

```
claude --model claude-opus-5-5 --effort high
```

```text
Read CLAUDE.md, docs/PRODUCT.md and docs/design-system/README.md first.

Set up the project for Thinkerwell as described in CLAUDE.md. Don't build any screens yet.

1. Scaffold Vite + React + TypeScript (strict) with React Router, Vitest and Playwright. Use npm. Add scripts: dev, build, preview, test, test:e2e, lint, typecheck, check:content (runs python3 scripts/check_lesson.py content/lessons/*.json and python3 scripts/check_quiz.py content/quizzes/*.json).
2. Styles: copy docs/design-system/tokens.css to src/styles/tokens.css. Create src/styles/global.css (reset, body font, the canvas background, focus ring from the design system, prefers-reduced-motion). Use CSS logical properties throughout.
3. Fonts: self-host Funnel Display, Atkinson Hyperlegible Next and Eczar (Fontsource packages if available, otherwise files in public/fonts). No requests to Google at runtime.
4. i18n: a tiny typed message helper reading src/i18n/messages/en.json, with lang and dir set on <html>. Add a dev-only way to force dir="rtl" so we can check layouts.
5. Content layer: zod schemas in src/content/schema.ts for content/course.json, content/lessons/*.json and content/quizzes/*.json exactly as they are now (read a few files and docs/content/SPEC.md section 3). Load them at build time (import.meta.glob) and export typed getters: getCourse(), getSections(), getLessons(), getLesson(id), getLessonByOldId(oldId), getNextLesson(id). Add a Vitest test that parses every lesson and fails on any schema error.
6. Storage: src/storage/ with a typed IndexedDB wrapper (idb) for learners, progress, quizAttempts, recordings and settings as listed in CLAUDE.md, with a schema version and a migration hook. Unit-test it with fake-indexeddb.
7. App shell: routes for /, /course, /lesson/:id/:stage, /section/:id/check, /journal, /educators, /about and a friendly 404, each rendering a placeholder heading. Redirect old Base44 lesson URLs (/lesson/l6 and so on, using oldId) to the new ones.
8. Add a short README.md with how to run everything.

Stop when `npm run build`, `npm test`, `npm run typecheck` and `npm run check:content` all pass. Update the Commands line in CLAUDE.md. Open a pull request describing what you did and anything you decided.
```

Check: the app runs, routes show placeholders, the content test passes, and old URLs like `/lesson/l6` redirect to Lesson 10.

---

## Phase 2: design-system components

```
claude --model claude-sonnet-5 --effort high
```

```text
Read CLAUDE.md and docs/design-system/README.md first.

Port every component in docs/design-system/reference/bundle.js to a typed React component in src/components/ds/, one file per component, exported from src/components/ds/index.ts.

- Keep the same component names, props (docs/design-system/reference/index.d.ts) and class names. Port the CSS from docs/design-system/reference/bundle.css into src/components/ds/ds.css (or one CSS file per component), using the tokens. Replace the hand-drawn icons with lucide-react icons of the same names.
- Read docs/design-system/components/<Name>.md for each component's rules and follow them.
- Make static states real: GlossaryTerm opens and closes its definition (keyboard and tap, Escape closes, focus returns), ChoiceOption and Chip support radio and checkbox semantics, SegmentedControl and ToolToggle are controlled components, VoiceButton/ListenBar/VoiceRecorder take state and callbacks but don't touch browser APIs yet.
- Strings shown to learners go through the i18n helper.
- Build a /dev/components page (only in development) that shows every component in its main states, like the design system previews, including right-to-left.

Stop when every component renders on /dev/components at 390px and 1280px without horizontal scrolling, keyboard focus is visible everywhere, and tests pass. Open a pull request.
```

Check: open `/dev/components` and compare it with the Thinkerwell Design System page.

---

## Phase 3: learners, home, dashboard and course map

```
claude --model claude-sonnet-5 --effort high
```

```text
Read CLAUDE.md first. The screens to match are docs/screens/Main.dc.html, NewLearner.dc.html, Dashboard.dc.html, Course.dc.html, PhoneHome.dc.html and PhoneCourse.dc.html (see docs/screens/README.md for how to read them).

Build:
1. Home (/) for a shared device: "Who's learning today?" tiles for learners saved on this device, "I'm new here" (name, colour, optional class code; nothing else is asked), and "Just look around" (browse without saving). Learners can be removed with a confirmation built into the page. Choosing a learner makes them the current learner until someone switches.
2. Learner home (after choosing a learner): greeting, continue card for the next unfinished stage, progress per section, "Saved on this device" badge.
3. Course map (/course): 4 sections with lesson rows (title, question, time estimate, stage dots from progress) and a section check row after each section. Nothing locked. Phone layout uses section chips.
4. A header with the current learner and "Switch learner".

Use only the design-system components and the tokens. All text from content files or en.json. Save everything through src/storage. Add Playwright tests for: new learner flow, switching learners keeps work separate, look-around mode saves nothing.

Stop when the tests pass at 390, 820 and 1280px. Open a pull request.
```

---

## Phase 4: the lesson player

```
claude --model claude-opus-5-5 --effort high
```

```text
Read CLAUDE.md and docs/content/SPEC.md first. Screens to match: docs/screens/LessonRead, LessonCheck, LessonWrite, LessonSpeak, LessonWatch, LessonReflect, LessonComplete, TabletLesson and PhoneLesson (.dc.html).

Build /lesson/:id/:stage for all 24 lessons from content/lessons/*.json, one template, no per-lesson code:
- Layout: vertical StagePath on the left on laptop; horizontal compact StagePath on tablet and phone. Any stage can be opened directly.
- Read: warm-up (any answer accepted, saved), evidence cards by type (items, timeline, map, cases, sources, table) with the fiction label, reading sections one at a time ("Part 1 of 3") with a Standard / Simpler switch that remembers the learner's choice, glossary terms marked on first appearance per section in both versions, key words list, then the quick check (2 choice questions with shuffled options and per-option feedback, retry allowed, plus the optional think question).
- Write: task card, three help modes (write, sentence starters that insert at the cursor, plan first with the planning boxes), writing box that saves as you type, self-check ticks, and the example answer revealed only after the learner has written something or asks for it.
- Speak: partner and solo tasks, the three-sentence frames if present, the "how did you practise" choice (options from content/course.json). Leave a slot for the recorder (phase 5).
- Watch: before question, VideoCard, "Read instead" showing the written summary and key points, after question. Load the youtube-nocookie iframe only after the learner taps play; no autoplay; if it hasn't loaded after 20 seconds show the written version with a kind message. Show the content note to educators only (not learners) for now: put it in a collapsed "For teachers" note.
- Reflect: required and optional prompts; answering the required one completes the lesson.
- Lesson complete screen and "next lesson" from the course order.
- Everything saves to src/storage per learner. Look-around mode works but saves nothing.
- Show each lesson's picture (visual.src, an SVG in content/visuals/) on the Read stage next to the evidence, with visual.alt as alt text, scaled to the reading column.

Add Playwright tests that go through Lesson 10 end to end, and a quick test that every lesson's every stage renders without errors. Stop when they pass at 390, 820 and 1280px. Open a pull request.
```

Check: go through Lesson 10 on a phone-sized window and on a laptop, in both reading levels.

---

## Phase 5: Listen, Say it and Record yourself

```
claude --model claude-opus-5-5 --effort high
```

```text
Read CLAUDE.md (the "Listen, Say it and Record" section) and docs/design-system/components/ListenBar.md, VoiceButton.md, VoiceRecorder.md.

1. Listen: the Listen tool on the Read stage reads the visible version aloud with speechSynthesis, using an English voice that runs on the device (voice.localService). It reads section by section, highlights the current sentence with mark.tw-speaking, scrolls it into view gently, and supports pause, play, stop and Slow/Normal. If no local voice exists, hide Listen and tell nobody anything scary.
2. Say it: on the writing boxes in Write, Watch and Reflect. Research the current browser APIs for on-device speech recognition and use it only when recognition can run on the device. Add a device setting "Allow online speech-to-text" (off by default, explained in plain words, for educators) that allows the cloud path. Otherwise hide the button. Dictated words insert at the cursor and stay editable.
3. Record yourself: VoiceRecorder in the Speak stage with MediaRecorder. Keep only the latest clip per learner and lesson in IndexedDB; Delete removes it; removing a learner removes their clips. Never upload. Ask for the microphone only when the learner taps Start.

Write down in the pull request which browsers and devices support each feature and what happens where they don't. Add unit tests with mocked speech and media APIs. Open a pull request.
```

---

## Phase 6: offline, save data and print

```
claude --model claude-opus-5-5 --effort medium
```

```text
Read CLAUDE.md and the "Listening, speaking and low internet" section of docs/design-system/README.md.

1. Make the site a PWA with vite-plugin-pwa: precache the app shell, all content, fonts and images so every lesson works offline after the first visit. Never cache YouTube. Show a gentle "New version ready" prompt instead of reloading under a learner.
2. Connection status: StatusBanner tone offline under the header when offline ("You're offline. Keep going: your work is saved on this device."), tone back for a few seconds when the connection returns. Watch shows the slow-internet note and opens on "Read instead" when offline.
3. Settings (device-wide, reachable from the header menu): Save data (turns off video embeds), reading level default, listening speed, allow online speech-to-text (for educators).
   (Note from phase 4: Watch already opens on the written version when the browser's Save-Data hint, `navigator.connection.saveData`, is on, while still offering the video. Consider using that hint as the Save data switch's default.)
4. Dashboard badge showing that lessons work offline.
5. Print view for a lesson (reading in both levels, tasks, glossary) and for the journal: black text on white, no header or navigation, good page breaks.
6. Keep the total download small: report the size of the first load and of the precache in the pull request, and optimise images.

Test offline behaviour with Playwright (context.setOffline). Open a pull request.
```

---

## Phase 7: section checks, journal, educators and about

```
claude --model claude-sonnet-5 --effort medium
```

```text
Read CLAUDE.md. Screens: docs/screens/QuizIntro, QuizQuestion, QuizResults, PhoneQuiz, Journal, Educators and About (.dc.html).

1. Section checks at /section/:id/check from content/quizzes/<section>.json (see the "Section checks" note in CLAUDE.md). Flow: intro, one question at a time with a progress bar, feedback after each answer, results with the score, the lessons to review for missed questions, and "Try again". No timer, never blocks anything. Save attempts per learner (best and latest).
2. Journal (/journal): all saved writing and reflections for the current learner, newest first, grouped by lesson, editable, with print.
   (Note from phase 6: the print view already exists at /journal/print, built by journalByLesson() in src/storage/progress.ts; link "Print my journal" there and reuse journalByLesson() for the list. The Educators page can link each lesson's print view, /lesson/:id/print.)
3. Educators (/educators) and About (/about) exactly as the screens, with text in en.json. Keep "[FEEDBACK EMAIL]" as a visible placeholder. About names Justin Park (founder and CEO) and Nick (CTO) with a placeholder photo for Nick.
4. Friendly 404.

Open a pull request with Playwright tests for a quiz attempt and the journal.
```

---

## Phase 8: quality pass and launch

```
claude --model claude-opus-5-5 --effort high
```

```text
Read CLAUDE.md. Do a full quality pass before the pilot:

1. Accessibility: run axe on every page type and fix everything; check keyboard-only use through a whole lesson; check 200% zoom; check contrast of every text style against its background with the token values.
2. Right-to-left: force dir="rtl" and fix anything that breaks or points the wrong way.
3. Phones and tablets: check 360, 390, 768, 820, 1024 and 1280px; no horizontal scrolling; tap targets at least 44px.
4. Performance on a slow connection (Playwright with throttling): first load and a lesson page. Fix the biggest costs.
5. Privacy: confirm there are no requests to any third-party host except YouTube after a tap. List every network request the site makes in the pull request.
6. Content: run check:content; make sure every lesson, stage and quiz renders.
7. Deploy to Vercel (production build, correct SPA rewrites, security headers, service worker scope). Add the custom domain once it is bought.

Write a short docs/LAUNCH_CHECKLIST.md with what you checked and anything left for humans. Open a pull request.
```

---

## Later phases

- **Measurement for the pilot** (after HELP confirms consent): `claude --model claude-opus-5-5 --effort high`. Build what `docs/research/MEASUREMENT_PLAN.md` describes: pilot codes, consent screen for educators, the pre and post check, an IndexedDB event queue, `POST /api/events` as a Vercel Function writing to Postgres, and a simple export for the team. Nothing identifying; learner names never leave the device.
- **Translation**: `claude --model claude-opus-5-5 --effort high`. Language picker, translated UI strings, an Arabic-script font, right-to-left layouts, and a first-language glossary.
