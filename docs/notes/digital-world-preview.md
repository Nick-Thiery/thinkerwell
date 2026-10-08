# Digital World preview

Branch `digital-world-preview`, October 2026. Digital World, the second course (11 lessons about AI and online information, `docs/content/DIGITAL_WORLD_SPEC.md`), is in the app, but only a device that turns on its preview shows it. Every other device, and every learner in the HELP pilot, sees exactly what they saw before: no links, no course choice, no words, no downloads. Its lessons are drafts and have not been reviewed; nobody should use them with learners yet.

## How to preview it

1. On the device, open **`/preview/digital-world`** (for example https://thinkerwell.app/preview/digital-world, or `npm run dev` and http://localhost:5173/preview/digital-world). Visiting the address turns the preview on for this device at once. Nothing links to it.
2. The page says the preview is on and offers **Open Digital World**, **Print all lessons** and **Turn preview off**.
3. With the preview on:
   - The course map (`/course`), the learner home and the "Just look around" home start with **Courses on this device**: Exploring Our World first, then Digital World with a "Draft" badge. "Who's learning today?" is unchanged.
   - Digital World's map is `/course/digital-world`; its lessons are `/lesson/dw-…/:stage` (for example `/lesson/dw-how-ai-learns/read`), each with its print view (`/lesson/dw-…/print`) and teacher guide (`/educators/lesson/dw-…`); every lesson printed together is `/course/digital-world/print`.
   - Every Digital World page has a banner under the header, **"Draft course: not yet reviewed"**, with **Turn preview off**. On paper the banner isn't printed; each sheet says "Digital World, draft course: not yet reviewed. Don't use it with learners yet." instead.
4. **To turn it off**, tap "Turn preview off" in the banner (it goes back to Our World's map) or on `/preview/digital-world`. The page then offers "Turn it on again".

The setting is the device's, not a learner's: `settings.previewCourses` (a list of course ids), an optional field added without a new `DB_VERSION`, like the other optional settings. It survives reloads and isn't in work files. In a browser that can't save (some private windows), the preview stays on until the page closes, and the page says so.

## What's hidden while it's off

- **Pages.** Every Digital World address (`/course/digital-world`, its print view, `/lesson/dw-…`, `/educators/lesson/dw-…`) shows "This page isn't here", as an unknown address does.
- **Links and words.** No course choice, no link and no Digital World word anywhere. Our World's map, home, Educators page, class view, journal, certificates and work files are unchanged.
- **Search engines.** The preview and course addresses are served `app.html` (`noindex`), and none is in `sitemap.xml` or `robots.txt`.
- **Downloads.** Digital World's code, lessons, words and styles are built into `dist/assets/preview/` (`src/courses/build.ts`), which the service worker never precaches (`PREVIEW_PRECACHE_IGNORES`). The build stops if any of it would land anywhere else or reach a first visit (`keepFirstVisitLight` in `vite.config.ts`), and `e2e/build-output.spec.ts` checks that no Digital World word, lesson id or style is in the precache or a first visit.

Sizes (Brotli, measured on the same machine against `main` at 15f5595):

| | `main` | This branch | Budget |
|---|---|---|---|
| Precache (every device) | 642.4 kB | 643.8 kB | 645 kB (unchanged) |
| First visit to the home page | 221.0 kB | 221.6 kB | 222 kB (unchanged) |
| Digital World, only with the preview on | | 56.5 kB: its code, lessons and words 52.9 kB, its styles 2.4 kB, the door to it 1.2 kB | |

What every device gains (1.4 kB precached, 0.6 kB of it on a first visit) is the course model, not the course: the list of courses (`assets/courses-*.js`, 0.2 kB, ids only), the device setting, the few lines that show the course choice only when a preview is on, the routes for `/course/:courseId` and `/preview/:courseId`, and the lesson pages' slots for a course's extras (`src/lesson/extras.tsx`). Opening a Digital World address with the preview off downloads only the door (`assets/preview/routes-*.js`, 1.2 kB), which says the page isn't here; the course itself is never fetched.

## How courses work

- **The list.** `src/content/courses.ts`: Our World (`our-world`, the default everywhere, its content where it always was) and Digital World (`digital-world`, `preview: true`, content in `content/courses/digital-world/`, lesson ids starting `dw-`). Our World's addresses don't change: `/course`, `/lesson/:id/:stage`, `/educators/lesson/:id` and the rest. Lesson ids can't clash, because each course has its own prefix and the build checks it.
- **Content.** `content/courses/digital-world/course.json` (four sections: `how-ai-works`, `check-what-you-see`, `use-tools-wisely`, `ai-where-you-live`) and `lessons/DW01.json`…`DW11.json`, moved from `drafts/` unchanged. They are checked when the content is built, served or tested, like Our World's: zod (build time only) with the course's own section ids, `oldId: null`, and the `activity` object for every type (`src/content/schema.ts`), plus checks zod can't do (`src/content/activityChecks.ts`: placements, ids, references, Lesson 2's rounds giving exactly the results the lesson states). `npm run check:content` runs `scripts/check_lesson.py` over them too, with the course's sections, `oldId: null`, the activity's learner text at reading level, and Lesson 2's rounds.
- **Pages.** Digital World uses the same lesson player, print view and teacher guide as Our World. They read their lessons through `useLessonContent()` (Our World unless a course provides its own, `src/content/useContent.ts`), and a course adds its own parts through named slots (`<LessonSlot name="read:after-evidence" />`); Our World fills none, so its pages are as they were. The course's own pages and parts are in `src/courses/digital-world/`; `src/courses/preview.tsx` shows them only with the preview on, and `src/courses/routes.tsx` is the door the app's routes load them through.
- **Words.** Digital World's interface words are in en.json and id.json under `digitalWorld` (125 messages), so the translation checks and the review spreadsheet cover them, but the build takes them out of the app's messages and serves them with the course's code (`virtual:thinkerwell/course-messages/digital-world`).
- **Styles.** Its own stylesheet (`digitalWorld.css`, every class starting `tw-dw-`), loaded with the course as a `<link>`, the way the Arabic font is, since the app has one stylesheet for everything else.
- **Saved work.** A Digital World lesson saves like any lesson (`progress`, keyed by learner and lesson id), plus `progress.activity` (optional: the activity's choices and writing by the activity's own ids, and which parts were opened). Look-around saves nothing, as in Our World.

## The activities

All eight types the drafts use have a player (`src/courses/digital-world/activities/`). Every one follows the spec's rules: nothing locked and nothing blocking the lesson, no timers, no red ("Not quite" in burnt orange, as elsewhere), real buttons and radio buttons with names for keyboard and screen readers, at least 44 by 44px, no sideways scroll from 320px, offline, no camera, microphone or network, and the same result without the activity (each lesson's print view has a paper version, and its teacher guide the answers). Each sits where its lesson file says (`read` after the evidence, or `write` before the task).

| Type | Lessons | What the learner does |
|---|---|---|
| `sort` | 1, 4, 7, 10 | Puts each item in a group (radio buttons per item); each placement says what most people would say and why. "Your groups" shows the groups so far. |
| `train-model` | 2 | Ported from the dev prototype (`/dev/tiny-model`, now gone): labels leaves healthy or sick, trains a nearest-neighbour model (k = 1, `train-model/model.ts`), and sees its guesses beside the gardener's, round by round (4 of 6, 6 of 6, 0 of 2, 8 of 8), then free play. |
| `compare-results` | 3 | Taps the group the made-up tool got wrong most often (bars with their numbers written on them), then answers the follow-up. |
| `check-claim` | 5 | Reads a made-up post, the three questions to ask, then opens made-up sources in any order, and answers. |
| `spot-signs` | 6 | Taps parts of four made-up messages; each tap says which warning sign it is, or that it isn't one. "Show all signs" is always there. |
| `ask-tool` | 8 | A pretend tool, labelled "Pretend tool" and with the lesson's `toolLabel`. Picks a better question and sees its pre-written answer, then checks a sure-but-wrong answer against a book. No AI model runs, nothing is typed into it and nothing is sent. |
| `chart-check` | 9 | Switches the chart between the poster's scale and starting at zero (drawn as SVG from the lesson's numbers, every bar labelled), then answers. |
| `design-plan` | 11 | Picks a problem or writes its own, then plans an AI helper in five steps, one at a time, going to any step at any time. "Your plan" shows it together. |

## Decisions made where the spec was open

These are the simplest reasonable choices, for Justin and Nick to change:

1. **Activities don't count towards a stage being done** (spec 8, item 2). The stage's own rules decide (`src/lesson/progressRules.ts`, unchanged); the activity's answers are saved with the lesson's work.
2. **What's saved:** the choice for each item or question, what was written, and which parts were opened or tapped. Lesson 2 keeps its labels in memory and saves only the rounds trained (the spec: "at most, which rounds were finished").
3. **Lesson 2 has picture cards only**, no drawing mode (spec 8, item 3). The leaves are drawn from each card's numbers, with a little extra per card (its outline and marks) kept in code (`train-model/LeafPicture.tsx`), not in the lesson file.
4. **Section looks** (spec 8, item 1): the brand book has colours for Our World's four sections only, so Digital World's borrow them, each with its own icon: How AI works amber with a light bulb, Check what you see sage with an eye, Use tools wisely rose with a hand, AI where you live sky with people.
5. **The course's words**: "Digital World" is still the working name. `course.json`'s description and each section's question and description were written for the preview (the drafts had none) and need Justin's review.
6. **No section checks or certificates** (none drafted). The map says so; the complete screen offers neither, and nothing links to one.
7. **Indonesian:** the interface (banner, preview page, choice, activities' buttons and labels) is in Indonesian, and the lessons stay English, marked `lang="en"` (so screen readers, Listen and Say it treat them as English), and the banner adds "Its lessons are in English for now."
8. **Listen** uses the device's English voice: there are no recordings. `npm run check:audio` skips preview courses on purpose and says so.
9. **The teacher guide** has each lesson's activity with what most people say and the right answers, and a "For reviewers" part: each lesson's `changes` notes and the picture it still needs. Its back link goes to Digital World's map.
10. **The course choice** shows on the course map, the learner home and "Just look around", not on "Who's learning today?". The preview page turns the preview on as it opens: visiting the hidden address is the choice.
11. **Questions inside activities** are shuffled per learner, as quick checks are, and give "Correct" or "Not quite" with the option's own hint. In `compare-results`, any tap shows the follow-up question, right or not. In `spot-signs`, "Show all signs" doesn't change what was tapped and isn't saved.

## What's left

- **AI-accuracy review** by someone who works in AI or machine-learning research (spec 5.4), especially Lessons 1, 2, 4, 8 and 10, logged like `docs/content/REVIEW_LOG_*.md`.
- **Partner review** of the sensitive notes in Lessons 3, 4, 6, 7 and 10; Lesson 6 (fake job offers and loans) must be reviewed before use.
- **Justin's review** of level, tone and the activities, and the open questions in spec section 8 and `content/courses/digital-world/README.md`.
- **Section checks** for the four sections (`docs/content/QUIZ_SPEC.md`), and then certificates.
- **Indonesian**: the lessons, once the English is reviewed (`docs/translation/README.md`); the 125 interface strings are AI-drafted and flagged.
- **Audio**: recordings for Listen, once the text is final (`npm run audio:generate`).
- **Videos**: someone must watch all 11 and check the summaries, lengths and content notes (`content/courses/digital-world/README.md`, "Videos").
- **Pictures**: 11 to draw (`docs/content/VISUALS_SPEC.md`); until then the lessons show none, and the teacher guide says what each will show.
- **Before it goes to everyone**, a decision about offline size: the course isn't in the offline copy, so with the preview on it works offline only as long as the browser keeps its files (Vercel sends them as `immutable` for a year). Switching it on for everyone would mean precaching it (about 56 kB more) and raising the budget, or storing it when a learner first opens it (spec section 9, item 5).
- **Also before then:** Digital World's work in work files (they keep it when saving but, on loading, leave out lessons the device's course doesn't list), in the journal (only Our World's lessons are listed) and in the class view (only "last active" counts it), and the lessons' `changes` notes, which still say the checker and schema don't accept them.
