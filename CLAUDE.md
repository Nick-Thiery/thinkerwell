# Thinkerwell

A free social-studies course, "Exploring Our World": 24 lessons in 4 sections, each lesson in five stages (Read, Write, Speak, Watch, Reflect), plus a short check at the end of each section. It is for refugee, displaced and under-served young people, about 10–17, most of them learning English. The first pilot is with HELP for Refugees, a refugee-led learning centre in Jakarta, on shared laptops and tablets with unreliable internet. The team is Justin Park (founder and CEO, content) and Nick (CTO, build). Background: `docs/PRODUCT.md`.

## Rules that are never traded away

1. **Privacy.** No accounts, no passwords, no email from learners, no ads, no third-party analytics, trackers or fonts loaded from other servers. Learner data stays on the device. Recordings are never uploaded. The site never asks learners about their journey, home country, family, religion or ethnicity.
2. **Works on bad internet.** After the first visit the whole course works offline. Every save is local first. Videos are optional and every video has a written version ("Read instead").
3. **Nothing is locked.** Any lesson and any stage can be opened in any order. Quick checks and section checks never block progress, have no timers and can be retried. Wrong answers say "Not quite" in burnt orange with a hint; there is no red anywhere in learning flows.
4. **Shared devices.** Home asks "Who's learning today?" with a tile per learner. Each learner's work is separate. Anyone can "Just look around" without saving.
5. **Accessible.** WCAG 2.2 AA. Tap targets at least 44px, visible focus on everything, full keyboard use, `prefers-reduced-motion` respected, nothing below 14px, reading text 20px/32px at most 68 characters wide.
6. **Plain words.** UI copy is short, sentence case, second person, no "please", no exclamation marks, no jargon. Lesson text follows `docs/content/SPEC.md`.
7. **Ready for other languages.** Every UI string lives in `src/i18n/messages/en.json`. Use CSS logical properties (`margin-inline-start`, not `margin-left`), set `lang` and `dir` on `<html>` per locale, and mirror direction icons in right-to-left. Dari/Farsi and Arabic (right-to-left) and Somali come later; the current fonts don't cover Arabic script, so a matching font will be added then.
8. **Honest.** Thinkerwell is a student-led project and is not a registered charity or nonprofit. Don't claim otherwise anywhere.

## Stack

- Vite, React and TypeScript (strict), with React Router. It is a static site hosted on Vercel.
- Plain CSS: `src/styles/tokens.css` (copied from `docs/design-system/tokens.css`) plus component CSS ported from `docs/design-system/reference/bundle.css`, keeping its `tw-` class names. No Tailwind, no CSS-in-JS.
- Icons: `lucide-react`. The design system uses Lucide names.
- Fonts, self-hosted (for example Fontsource packages): Funnel Display (headings), Atkinson Hyperlegible Next (everything else) and Eczar (the "Thinkerwell" wordmark only).
- On-device storage: IndexedDB through a small typed wrapper (`idb`).
- Offline: `vite-plugin-pwa` (Workbox) precaches the app, content and images. YouTube is never cached.
- Content validation: `zod` schemas in `src/content/schema.ts`, checked by a test.
- Tests: Vitest for logic, content and component behaviour (Testing Library), Playwright for end-to-end runs at 390, 820 and 1280px wide. A second, dev-only Playwright config (`playwright.dev.config.ts`, `npm run test:e2e:dev`) checks the `/dev/*` routes, which exist only in `npm run dev` and never reach `dist/`.
- Later (not phase 1): Vercel Functions for `POST /api/events` and a Postgres database for pilot measurement. See `docs/research/MEASUREMENT_PLAN.md`.

Commands: `npm run dev` (dev server; add `?dir=rtl` to any URL to check right-to-left), `npm run build`, `npm run typecheck`, `npm run lint` (ESLint and Stylelint), `npm test` (Vitest), `npm run test:e2e` (Playwright; run `npm run test:e2e:install` once), `npm run test:e2e:dev` (Playwright against the dev-only `/dev/*` routes; see README.md), `npm run check:content` (lesson checker; run `sh scripts/setup-python.sh` once for wordfreq).

## Where things live

```
content/course.json            course, 4 sections, "how I practised" options, fiction label
content/lessons/L01.json …     one file per lesson (source of truth for lesson text)
content/quizzes/               section checks (coming)
content/visuals/               one picture per lesson as SVG (coming)
docs/PRODUCT.md                who it's for, decisions made so far
docs/design-system/            brand book (README.md), tokens, component notes, reference implementation
docs/screens/                  every redesigned screen as source; see docs/screens/README.md
docs/content/SPEC.md           the rules lesson text is written to
docs/research/                 learner context, measurement plan, audit of the old Base44 site
public/images/                 mascot, UN goal icons, founder photo
scripts/check_lesson.py        checks lesson files against the spec
src/                           the app (created in phase 1)
```

## Design system

- The brand book is `docs/design-system/README.md`; tokens are `docs/design-system/tokens.json` and `tokens.css`. Read the README before building any screen.
- `docs/design-system/reference/bundle.js` is a working reference implementation of every component (plain `React.createElement`), with its types in `index.d.ts` and notes in `docs/design-system/components/<Name>.md`. Port each one to a typed React component in `src/components/ds/` with the **same name, props and class names**. Behaviour the reference fakes (open states, pressed states) becomes real state and events.
- `docs/screens/*.dc.html` show every screen. Build pages to match them. If a screen and the design-system docs disagree, the docs win.
- Colour rules in short: lemon `#FFFF66` only for the header, the current step, the continue card and one highlight per screen, and never for text; one ink primary button per view; lavender means help; section colours (History amber, Geography sage, Culture rose, Civics sky) only in section places and always beside the section's icon and name; correct is teal, "not quite" is burnt orange. Cards use borders, not shadows.
- Don't redraw, recolour or crop the mascot. Use `public/images/thinkerwell-mascot-transparent.png` on coloured grounds.

## Content

- Lesson text comes only from `content/lessons/*.json`. Never hard-code lesson text in components, and don't edit it in code. To change a lesson, edit its JSON and run `python3 scripts/check_lesson.py content/lessons/*.json` (needs `pip install wordfreq`), which must report 0 errors.
- `id` is a stable slug used in URLs: `/lesson/:id/:stage`. `oldId` is the Base44 id; redirect `/lesson/l6` and the other old ids to the new URLs.
- "Next lesson" is worked out from the order, not stored.
- Quick-check options carry their own `correct` flag and feedback. Shuffle options with a seed per learner and question so the order stays the same when the learner comes back.
- Each glossary word is marked on its first appearance in each section, in both the standard and simpler text; tapping it opens the definition (`GlossaryTerm`).
- Evidence with `fictional: true` shows its label ("Fictional example created for this lesson.").
- Write: show the example answer only after the learner has written something or asks to see one.
- Watch: embed from `youtube-nocookie.com`, only after the learner taps play, never autoplay. If the player hasn't loaded after 20 seconds, or "Save data" is on, show the written version.
- Reflect: the required prompt completes the lesson.
- `estimatedMinutes` is an estimate; show it as "About 30–50 min".

## Data kept on the device

Version the schema and write migrations. Nothing leaves the device in phase 1.

- `learners`: id, name, colour, created date, optional class code.
- `progress` per learner and lesson: stages done, current stage, warm-up answer, check answers, writing and planning notes, self-check ticks, how they practised speaking, reflections, completed date.
- `quizAttempts` per learner and section: answers, score, date (keep the best and the latest).
- `recordings` per learner and lesson: the latest audio clip only. Delete it when the learner is removed or taps Delete.
- `settings` per device: save data, listening speed, preferred reading level, partner options.

The journal is built from saved writing and reflections; it is not stored separately.

## Listen, Say it and Record

- **Listen** uses the browser's `speechSynthesis` with a voice that runs on the device (`voice.localService === true`), reads the version on screen from the first section to the last, and marks the current sentence with `mark.tw-speaking`. Speeds: Slow (about 0.8) and Normal.
- **Say it** (dictation in Write, Watch and Reflect) uses speech recognition only when the browser can do it on the device. Some browsers send audio to an online service to turn it into text; for children that is off unless a partner turns it on. If neither applies, hide the button. Check current browser support when you build this; it changes often.
- **Record yourself** (Speak) uses `MediaRecorder` and stores the clip in IndexedDB. It is never uploaded.

## Don't

- Add accounts, logins, a chatbot "Learning Guide", ads, analytics scripts or social embeds.
- Load anything at runtime from a third-party server except YouTube embeds the learner starts.
- Use red, lock lessons, add timers, or show learners a leaderboard.
- Put English strings straight into components.
- Change lesson text, the design tokens or the brand rules without saying so in the pull request.

## How to work here

- Work in small steps: one feature per branch and pull request. Run the tests and the content check before committing.
- Test on narrow screens (390px) and with the keyboard as you go, not at the end.
- When a decision changes, update this file and `docs/PRODUCT.md` in the same pull request.
