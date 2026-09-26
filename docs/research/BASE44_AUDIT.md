# Base44 site audit (reference for the rebuild)

**Site:** https://thinkerwell-app.base44.app
**Captured:** 26 September 2026, from the live JavaScript bundle `assets/index-CkPDfD3B.js` and stylesheet `assets/index-OMjaZvuS.css`

This file records what the current site actually does, based on its code rather than guesses. Use it with the other files in this folder:

- `base44-content.json` has all course, section, lesson and video data, extracted exactly as written.
- `base44-app-code.pretty.js` is the site's app code (formatted), for checking behaviour.
- `base44-styles.css` is the stylesheet.
- `images/` holds both mascot PNGs, the four SDG icons and the founder photo.

---

## 1. Headline findings

1. **All 24 lessons are fully written.** The handoff expected many placeholder lessons, but there are none. Every lesson has:
   - Read: sections, a simpler-English version, glossary terms and quick checks.
   - Write: a prompt, sentence starters and a planning scaffold.
   - Speak: a partner task, a solo task and a "how I practised" choice.
   - Watch: one YouTube video plus a full written alternative.
   - Reflect: one required and one optional prompt.
2. **There is no database.** All lesson content is hard-coded in the JavaScript bundle. Learner progress and the journal live in the browser's `localStorage` under the key `thinkerwell_progress_v1`. The only data that leaves the device is Base44's own page-view analytics, which POSTs to `/api/apps/…/analytics/track/batch` and `/api/app-logs/…` on every page.
3. **Why `/lesson/l6` shows Lesson 10.** Lesson IDs are left over from the old 20-lesson course (`l1`–`l20`). When the five new history lessons were added, they got text IDs (`history-scale`, and so on). `l4` was deleted and everything after it was renumbered on screen but kept its old ID. See the ID map in section 3.
4. **Lessons "lock" only because of the nickname.** Every card is disabled until a nickname is typed. After that, all 24 lessons are open in any order; there is no sequential lock. Typing a lesson URL directly sends a new visitor back to the home page, except that `?preview=true` opens **any** lesson for anyone without saving progress.
5. **The "Learning Guide" is not AI.** It matches keywords against canned replies. The replies were written for Lesson 10 (rivers), with a separate set for Lesson 1. The other 22 lessons show the Lesson 10 replies, so asking for help in Lesson 20 can return a paragraph about rivers and floods.

---

## 2. Pages and behaviour

| Route | What it does now | Notes for the rebuild |
|---|---|---|
| `/` | New visitor: hero ("Explore your world."), five pillar chips, and a lavender panel that requires a nickname before "Begin my learning path". Returning learner: a dashboard with "Continue learning", a four-section path, the last 3 journal entries, and counts (lessons, writing, speaking, reflections). | Make the nickname optional. Keep the dashboard idea; it matches the Khan Academy-style layout you want. |
| `/course` | Course title, the "Read → Write → Speak → Watch → Reflect" strip, and four section cards listing lessons with "Start / Continue / Review lesson →". | All cards are disabled (opacity 0.55) for anyone without a nickname. |
| `/lesson/:id` | The lesson player (details below). Without a nickname it redirects to `/`. `?preview=true` runs it as "Educator Preview" and saves nothing. | Use new stable IDs, and keep redirects from the old IDs. |
| `/journal` | Entries grouped by lesson. Each entry can be edited. | No delete, print or export. Redoing a lesson adds **duplicate** entries. |
| `/educators` | Lesson 10 preview button, three feature cards, a "Lesson card preview" (objective, materials, time, tips), and a "Coming later" list (dashboard, analytics, student management, onboarding). | Reword "Coming later", since some of it is now on the roadmap. |
| `/about` | Tagline, cycle, promise, mission, four SDG cards with images, and the founder card with photo. | The mission says "nonprofit platform providing free, accessible digital technology", which the handoff flags as overclaiming. |
| `/onboarding` | Same nickname screen as the home page. | Can be dropped. |
| Menu | Items: Home, "Explore the course" / "My Learning Path", My Journal, For Educators, About. The learner menu adds change name, reset progress and start over. The Base44 menu adds "My Courses" and "Sign In". | "My Courses" goes to `/courses`, which **404s**. "Sign In" is Base44's own account login and would ask kids to create a Base44 account. |

### Lesson player

- **Stages:** Read, Write, Speak, Watch and Reflect. Watch is only shown if the lesson has a video; all 24 do. Stage tabs are **freely clickable**, so a learner can jump straight to Reflect.
- **What unlocks the "Continue" button in each stage:**
  - Read: every non-optional multiple-choice check answered correctly. Unlimited retries, with feedback for each wrong option.
  - Write: any non-empty text.
  - Speak: choosing how you practised (partner / group / on my own / "another way").
  - Watch: nothing required.
  - Reflect: required reflection non-empty. **Saving it marks the lesson complete.**
- **Read tools:**
  - **Listen** uses the browser's speech synthesis. In simpler-English mode it reads **only the first section**; that's a bug.
  - **Read in simpler English** swaps each section's passage.
  - **Glossary terms** become tappable words, but only when the exact word appears in the passage. 44 of the 116 glossary terms never appear, so learners never see them.
- **Lesson-specific extras:**
  - Lesson 1 opens with three fictional sources (a market drawing, a receipt and a diary) and an "I notice…" choice.
  - Lesson 10 has a prediction question and an interactive SVG map with River, Hill and Coast sites and a legend. The map is drawn in code; see component `D_` in the code file.
- **Write stage:** three modes ("Write my answer", "Use sentence starters", "Plan my ideas first"). The planning boxes are "My main idea / Evidence / Why it matters / A limit or question". The example response appears only after the learner has typed something. There is a self-check line.
- **Watch stage:** the learner chooses between the video and **Read instead**.
  - The video uses `youtube-nocookie.com/embed/{id}?rel=0&playsinline=1`, with no autoplay.
  - Also shown: title, channel, duration and caption status ("not yet confirmed" for all 24), before and after questions, the written summary and three key points.
  - After 20 seconds without loading, it shows "The video is unavailable right now. You can continue using the written version."
  - Video events are saved to `localStorage` only and are never sent anywhere.
- **Completion screen:** the lesson's completion message and a "Next lesson" card.

### Stored learner data (`localStorage["thinkerwell_progress_v1"]`)

```
studentName, language:"English", onboarded, completedLessons[], currentLesson, currentLessonStage,
lessonProgress{ [lessonId]: { read, write, speak, watch, reflect: bool, writing, reflection1, reflection2 } },
journal[{ id, lessonId, lessonNumber, lessonTitle, area, title, type:"writing"|"reflection", content, date }],
capstoneUnlocked (unused), videoEvents[{ lessonId, eventType, timestamp }]
```

On a shared tablet, the next learner sees the previous learner's name, progress and journal. There is no way to have more than one learner per device.

---

## 3. Lesson ID map (old → new)

| # | Old ID | Section |
|---|---|---|
| 1 | `l1` | History & Human Stories |
| 2 | `l2` | History & Human Stories |
| 3 | `history-scale` | History & Human Stories |
| 4 | `history-origin-accounts` | History & Human Stories |
| 5 | `history-collective-learning` | History & Human Stories |
| 6 | `history-agriculture` | History & Human Stories |
| 7 | `history-cities-states` | History & Human Stories |
| 8 | `l3` | History & Human Stories |
| 9 | `l5` | History & Human Stories |
| 10 | `l6` | Geography & Our Environment |
| 11 | `l7` | Geography & Our Environment |
| 12 | `l8` | Geography & Our Environment |
| 13 | `l9` | Geography & Our Environment |
| 14 | `l10` | Geography & Our Environment |
| 15 | `l11` | Culture, Society & Identity |
| 16 | `l12` | Culture, Society & Identity |
| 17 | `l13` | Culture, Society & Identity |
| 18 | `l14` | Culture, Society & Identity |
| 19 | `l15` | Culture, Society & Identity |
| 20 | `l16` | Civics, Media & Everyday Economics |
| 21 | `l17` | Civics, Media & Everyday Economics |
| 22 | `l18` | Civics, Media & Everyday Economics |
| 23 | `l19` | Civics, Media & Everyday Economics |
| 24 | `l20` | Civics, Media & Everyday Economics |

Recommendation: give each lesson a new stable ID that never encodes its position, such as a slug (`rivers-and-towns`), or `L10` if you're sure lessons will never move. Keep a redirect table from the old IDs. The section IDs are `history`, `geography`, `culture` and `civics`.

---

## 4. Lesson inventory

Reading grades are a rough automatic estimate (Flesch–Kincaid, with a simple syllable counter). Use them to compare lessons with each other, not as exact levels. "Key terms that never show" counts glossary entries whose word isn't in that section's text, so the tap-to-define never appears.

| # | Old ID | Title | Read words (normal / simpler) | Approx. reading grade (normal / simpler) | Key terms that never show | Quick checks | Video (channel, length) | Video warning |
|---|---|---|---|---|---|---|---|---|
| 1 | `l1` | How can we find out about the past? | 105 / 107 | 7.5 / 6.0 | 1 of 5 | 2 MC | OpenLearn from The Open University, 1:33 |  |
| 2 | `l2` | What can an object reveal about a person in the past? | 132 / 81 | 7.4 / 3.9 | 3 of 4 | 2 MC + 1 open | OpenLearn from The Open University, 1:33 |  |
| 3 | `history-scale` | How does changing scale change the story? | 273 / 244 | 7.6 / 6.4 | 2 of 5 | 2 MC + 1 open | OER Project, 2:00 |  |
| 4 | `history-origin-accounts` | How do people explain where the world comes from? | 300 / 264 | 9.1 / 8.8 | 2 of 6 | 2 MC + 1 open | OER Project, 5:07 |  |
| 5 | `history-collective-learning` | How did early humans learn, create, and move? | 268 / 259 | 8.8 / 8.4 | 3 of 6 | 2 MC + 1 open | OER Project, 2:43 |  |
| 6 | `history-agriculture` | How did farming change human societies? | 229 / 219 | 10.8 / 10.1 | 4 of 6 | 2 MC + 1 open | OER Project, 5:07 |  |
| 7 | `history-cities-states` | Why did cities and states emerge? | 276 / 272 | 10.7 / 10.4 | 1 of 6 | 2 MC + 1 open | OER Project, 5:43 |  |
| 8 | `l3` | How did trade connect distant communities? | 130 / 70 | 6.7 / 5.9 | 2 of 4 | 2 MC + 1 open | TED-Ed, 5:20 |  |
| 9 | `l5` | How do inventions change everyday life? | 137 / 60 | 6.8 / 6.4 | 2 of 4 | 2 MC + 1 open | TED-Ed, 5:14 | Yes |
| 10 | `l6` | Why do people build towns near rivers? | 55 / 49 | 5.0 / 3.5 | 0 of 6 | 2 MC + 1 open | National Geographic, 4:10 |  |
| 11 | `l7` | How do maps help us understand a place? | 89 / 47 | 6.5 / 4.1 | 1 of 4 | 2 MC + 1 open | Ordnance Survey, 0:56 |  |
| 12 | `l8` | What makes a city grow? | 87 / 41 | 7.6 / 4.5 | 2 of 4 | 2 MC + 1 open | TED-Ed, 4:08 |  |
| 13 | `l9` | How do climate and seasons affect daily life? | 85 / 49 | 7.0 / 6.6 | 1 of 4 | 2 MC + 1 open | National Geographic, 3:05 | Yes |
| 14 | `l10` | How can communities respond to environmental change? | 101 / 42 | 6.6 / 4.8 | 2 of 4 | 2 MC + 1 open | UNICEF, 1:51 | Yes |
| 15 | `l11` | How can objects express culture and identity? | 90 / 52 | 7.4 / 7.5 | 3 of 4 | 2 MC + 1 open | Ayala Museum, 3:18 |  |
| 16 | `l12` | How do languages connect people? | 112 / 61 | 8.4 / 7.7 | 3 of 4 | 2 MC + 1 open | TED-Ed, unknown |  |
| 17 | `l13` | Why do communities have traditions? | 78 / 32 | 7.0 / 7.1 | 2 of 4 | 2 MC + 1 open | Smithsonian Folklife, 5:55 |  |
| 18 | `l14` | How can art tell a story? | 77 / 37 | 8.8 / 4.9 | 1 of 4 | 2 MC + 1 open | Ayala Museum, 3:18 |  |
| 19 | `l15` | What does belonging mean? | 79 / 38 | 8.2 / 5.5 | 2 of 4 | 2 MC + 1 open | CASEL, 4:54 | Yes |
| 20 | `l16` | Why do people have to make choices? | 346 / 163 | 6.4 / 5.3 | 0 of 5 | 3 MC | ABC Australia, unknown |  |
| 21 | `l17` | How do people trade and exchange? | 303 / 156 | 5.5 / 5.0 | 2 of 8 | 3 MC | Teaching Without Frills, unknown |  |
| 22 | `l18` | How do people plan for the future? | 299 / 124 | 6.2 / 5.7 | 2 of 7 | 3 MC | Teaching Without Frills, unknown |  |
| 23 | `l19` | What makes information trustworthy? | 76 / 34 | 7.1 / 3.7 | 0 of 4 | 2 MC + 1 open | TED-Ed, 4:49 |  |
| 24 | `l20` | How can young people contribute to their communities? | 115 / 67 | 8.3 / 8.6 | 3 of 4 | 2 MC + 1 open | UNICEF, unknown | Yes |

The lessons fall into three groups written at different times, and they read differently:

- **Lessons 3–7** (the `history-*` IDs) are the longest and hardest. Their "simpler" text is almost the same length and difficulty as the original.
- **Lessons 11–19** are very short (about 80–110 words).
- **Lessons 20–22** are long but easy. They have no fictional evidence card, no example response and no self-check, and they use 3 quick checks instead of 2 + 1 open question.

---

## 5. Content and video issues to fix in the rebuild

**Content**
- Stale "Next lesson" titles:
  - Lesson 12 points to "How does climate affect daily life?"; the current title is "How do climate **and seasons** affect daily life?"
  - Lesson 19 points to "Can we have everything we want?"; the current title is "Why do people have to make choices?"
- Time estimates disagree:
  - The course map says "30 min" for most lessons.
  - The lesson pages say "25–35 minutes, at your own pace".
  - Lesson 24 says 30–40 minutes. Lesson 10 says "15–20 minutes independently · 25–35 minutes with partner discussion".
  - The course total says "approximately 12 hours".
- In 27 of the 51 multiple-choice checks the correct answer is the **second option**, so learners can learn to guess it. Shuffle options at render time.
- Simpler English is weak in Lessons 3–7, 15, 17 and 24 (see table). Listen reads only the first section in simpler mode.
- Lessons 1 and 10 have no "Sources and further reading". Lessons 1, 10 and 20–22 have no example response.

**Videos** (all 24 are in `base44-content.json` → `videos`)
- Lessons 1 and 2 use the **same** video ("What is a primary source?"). Lessons 15 and 18 also share one ("How Are Everyday Things Made Special?").
- Lesson 3 ("How does changing scale change the story?") uses "Threshold 1: The Big Bang". Check that it actually fits the lesson.
- Every video's caption status is "unknown". Five durations are missing (Lessons 16, 20, 21, 22, 24).
- Five videos carry content warnings:
  - Lesson 9: slavery and exploitation.
  - Lesson 13: extreme weather footage.
  - Lesson 14: landslides and dangerous rainfall.
  - Lesson 19: personal reflections from young people.
  - Lesson 24: climate impacts.

  For refugee learners, have HELP educators preview Lessons 9, 13, 14 and 24 before using them.
- Lesson 4 (origin accounts) pairs religious and scientific accounts with a Big Bang video. Most HELP learners come from Muslim-majority communities. The handoff already asks for educator review of Lessons 4 and 19, and this is the pilot to do it in.

**Site**
- The Learning Guide gives wrong-lesson answers in 22 lessons. Drop it until the AI version exists.
- "My Courses" links to a 404, and "Sign In" is Base44's account login.
- The About page mission line overclaims ("digital technology", "nonprofit platform").
- Leftover fields: `language: "English"`, `capstoneUnlocked`, and a `built: true` flag on Lessons 1 and 10 in the course map. They do nothing.

---

## 6. Visual and usability issues (from `screenshots/`)

- **Dashboard contradicts itself for a new learner** (13). It shows "Welcome, Sam. Your journey begins with Lesson 1" **and** "Welcome back, Sam" together, with two identical "Start Lesson 1" buttons.
- **Things look locked when they aren't.** On the dashboard, sections 2–4 are labelled "Coming up" (14). Before a nickname is entered, every course card is greyed out with no explanation (02).
- **Lesson cards carry little information** (15). Every card is the same grey, with a tiny "Start lesson →". There's no per-lesson progress (no stage dots or check marks) and no progress per section on the course page.
- **Stage tabs overflow on phones** (19). Watch and Reflect are cut off, and nothing shows that the row scrolls.
- **The mascot shows a visible square** on the yellow header, especially on mobile (19, 20). The handoff says no boundary should show. Match the wrapper background to the image exactly, or use a transparent PNG.
- **The Learning Guide pop-up opens in the middle of the page**, not the middle of the screen (12), so on long lessons it can be off-screen.
- **The Watch stage** starts collapsed behind an accordion and repeats caption status twice (10).
- **Text is small and low-contrast** in many places: 12–13px grey helper text at 40–60% opacity (the essential question, times, "Answer all questions to continue"). That's hard for young English learners and fails contrast guidelines.
- **Two different yellows** (`#FFFF66` header, `#FFFD73` panels), plus a cream colour for feedback. Settle on one yellow scale.
- **The nav label changes** between "Explore the course" and "My Learning Path" depending on whether a nickname is set.
- **The About page** sometimes sat on a blank spinner for several seconds (Base44 auth check).

---

## 7. Carry over as-is

- The five-stage lesson model, the soft completion rule (the required reflection completes the lesson), unlimited retries with per-option feedback, sentence starters, planning boxes, and an example shown only after an attempt.
- The Watch design: choose video or "Read instead", privacy-enhanced embed, no autoplay, 20-second failure fallback, and before/after questions.
- Fictional-evidence labels ("Fictional example created for this lesson.").
- The visual system: header `#FFFF66`; lavender `#D2C0F9`; soft yellow panels `#FFFD73`; near-black `#0F0E0E`; page background `#F8F8F8`; tinted card `#F8F6FE`. Funnel Sans for UI, Eczar for the "Thinkerwell" wordmark. 20–24px rounded cards and pill buttons. The floating mascot animation is turned off when the user prefers reduced motion.
- Mascot rules from the handoff: use the exact PNGs, match the background colour of whatever sits behind them, and don't redraw.
