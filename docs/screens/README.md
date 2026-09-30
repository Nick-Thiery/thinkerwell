# Screens

These are the redesigned screens from the Thinkerwell Redesign canvas, as source files. Each one is a single screen at a fixed width. They are **reference, not code to ship**: rebuild them with the real React components in `src/components/ds/`.

## How to read a screen file

- `<x-import component-from-global-scope="Thinkerwell.Button" variant="ghost" icon="Map">Look at the map again</x-import>` means: render the design-system component `Button` with those props and that child text. Attribute names are kebab-case versions of the props (`logo-src` is `logoSrc`). Props and their meaning are in `docs/design-system/reference/index.d.ts` and `docs/design-system/components/<Name>.md`.
- `{{name}}` is a value filled in from the `renderVals()` block at the bottom of the same file (numbers, booleans, arrays and sample data).
- Everything else is plain HTML with inline styles that use the design tokens (`var(--canvas)`, `var(--radius-xl)` and so on). Turn repeated inline styles into component or page CSS; keep the values.
- `<helmet>` holds the font link and page background. The build self-hosts the fonts instead.
- Sample people (Amina, Reza, Hawa), the class code HLP-07 and "[FEEDBACK EMAIL]" are placeholders.
- Lesson 10 text on the lesson screens matches `content/lessons/L10.json`. On every other lesson, take the text from the content files, never from these screens.

## The screens

| File | Width | What it shows |
|---|---|---|
| `Main.dc.html` | 1280 | Home on a shared device: "Who's learning today?" learner tiles, "I'm new here", "Just look around" |
| `NewLearner.dc.html` | 1280 | Home: adding a new learner (name, colour, optional class code) |
| `Dashboard.dc.html` | 1280 | Learner home: continue card, progress by section, offline status badges |
| `Course.dc.html` | 1280 | Course map: four sections, lesson rows with stage dots, section check rows. Nothing is locked |
| `LessonRead.dc.html` | 1280 | Read stage with Listen on: ListenBar, highlighted sentence, warm-up, fictional map, reading card with key words |
| `LessonCheck.dc.html` | 1280 | Quick check: questions with correct and "not quite" feedback |
| `LessonWrite.dc.html` | 1280 | Write stage: task, writing help modes, sentence starters, writing box with Say it, self-check |
| `LessonSpeak.dc.html` | 1280 | Speak stage: partner and solo tasks, sentence frames, optional recorder, "how did you practise" |
| `LessonWatch.dc.html` | 1280 | Watch stage: slow-internet note, before question, video card with Read instead, after question |
| `LessonReflect.dc.html` | 1280 | Reflect stage: one required and one optional prompt |
| `LessonComplete.dc.html` | 1280 | Lesson done: summary and what's next |
| `QuizIntro.dc.html` | 1280 | Section check start |
| `QuizQuestion.dc.html` | 1280 | Section check question with feedback |
| `QuizResults.dc.html` | 1280 | Section check results: score, what to review, try again |
| `Journal.dc.html` | 1280 | My journal: saved writing and reflections, print |
| `Educators.dc.html` | 1280 | For educators: how it works, what you need, lesson plans, contact placeholder |
| `About.dc.html` | 1280 | About: what it is, promise to learners, UN goals, team (the built page leaves out the promise and links to `/credits` at the end; see `docs/PRODUCT.md`) |
| `TabletLesson.dc.html` | 820 | Tablet Read stage in simpler English while offline |
| `PhoneHome.dc.html` | 390 | Phone home |
| `PhoneCourse.dc.html` | 390 | Phone course map with section chips |
| `PhoneLesson.dc.html` | 390 | Phone Write stage while dictating |
| `PhoneQuiz.dc.html` | 390 | Phone section check question |

## Images

`/images/...` paths point at `public/images/` in this repo:

- `thinkerwell-mascot-transparent.png` (use this one on coloured backgrounds; the white and yellow versions match those grounds exactly)
- `sdg-04.png`, `sdg-10.png`, `sdg-16.png`, `sdg-17.png` (UN Sustainable Development Goal icons, used unaltered)
- `founder-justin-park.jpg`

If you want pictures of the screens, open the Thinkerwell Redesign canvas and export them from there.
