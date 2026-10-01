Thinkerwell is a free social-studies course for young people aged about 10–15, many of them refugee learners who are still learning English. They use it on shared laptops and tablets, often with patchy Wi-Fi and a volunteer teacher nearby. Every rule below serves that reader: calm, warm, easy to read, and serious about ideas.

## Voice and copy

- Write plain English at about a grade 4–6 reading level. One idea per sentence. Keep sentences under 15 words where you can.
- Speak to the learner as "you". The mascot and the product speak as "we" only on the About page.
- Sentence case everywhere: "Continue to Write", "Section check", never Title Case or ALL CAPS (the `eyebrow` style is the one uppercase exception).
- Buttons say what happens next, verb first: "Continue to Write", "Read instead", "Try again", "Finish lesson".
- A wrong answer is "Not quite yet", never "Wrong" or "Incorrect". Say what to look for next: "Look for a detail on the object itself."
- Praise the thinking, not the person: "You used evidence from the map." Never "You're so smart!"
- Keep useful subject words (evidence, scarcity, inference) and explain them. Never replace them with baby words.
- Never ask a learner about their own displacement, nationality, family history or trauma. Reflection prompts ask about ideas.
- Label invented material every time: "Fictional example made for this lesson."
- No emoji in the interface or in lesson copy. Icons do that job.
- Numbers as digits: "Lesson 10", "3 of 5", "4 min". Times as ranges only when they really vary.

## Colour

- The brand is lemon, lavender, ink and white. `lemon` (#FFFF66) is the signature. Use it for the header, the current step, the continue card and one highlight per screen, never for body text or large reading areas.
- Large yellow areas use `lemon-soft`: every "Your task" card.
- `lavender` is the friendly helper colour: the home welcome panel, support buttons (word help), learner avatars, speech bubbles. `lavender-soft` marks selection; `lavender-wash` is the quiet tint behind the learning goal and definitions.
- `ink` is text and the primary button. White text on ink uses `on-ink`. There is one primary (ink) button per view.
- Pages sit on `canvas`; cards and reading panels are `paper` with a `line` border. The home page sits inside an ink `frame`. `canvas` and `line` are deliberately a step darker than usual so cards stay visible on cheap tablets in bright rooms; don't lighten them.
- `violet` is for links, glossary words and the focus ring. Nothing else.
- Answers: `correct` (teal) with `correct-soft`, and `retry` (burnt orange) with `retry-soft`. They differ in lightness and hue and always come with an icon and a word, so colour-blind learners get the same message. No red anywhere in learning flows.
- Each section has a pale tint and an ink for its icon: `sec-history`, `sec-geography`, `sec-culture`, `sec-civics`. Use a tint only in that section's header band, number disc, badge and quiz intro, always beside the section's icon and name. The four are amber, sage, rose and sky. None of them is lavender, so lavender always means "help" and never a section.
- Text colours and the grounds they pass on are listed in each token's usage note. `ink-soft`, `correct` and `retry` fail on `lavender`; use `ink` or `ink-muted` there.

## Type

- Headings: `hero`, `display`, `h1`, `h2`, `h3` in Funnel Display (weight 500–600, slightly tight tracking). One `h1` per page.
- Everything learners read: Atkinson Hyperlegible Next. Lesson passages use `reading` (20/32) in a column no wider than `reading-measure`. Questions, answer options and task prompts use `body-lg` (18/28). UI copy uses `body`. Buttons and labels use `label`.
- Nothing smaller than `small` (14px). Metadata and helper text use `small` in `ink-muted`, never lighter.
- The word "Thinkerwell" beside the mascot uses `wordmark` (Eczar) and nothing else does.
- Later languages: Dari/Farsi and Arabic are right to left. Build with logical properties (`margin-inline-start`, `padding-inline`) and load Vazirmatn for those locales. Somali and Bahasa Indonesia use this Latin stack as is.

## Space, shape and layout

- Spacing steps are `space-1` to `space-16` on a 4px base. Card padding is `space-6` on laptop, `space-5` on tablet and `space-4` on phone; page gutters are `space-10`, `space-8` and `space-4`.
- Corners: buttons, fields and options `radius-md`; cards and questions `radius-lg`; page panels `radius-xl`; the home panels and the lesson-complete card `radius-2xl`; chips and steps `radius-pill`.
- Structure comes from borders and fills, not shadows. `shadow-pop` is only for things floating above the page (definition popovers, the learner switcher, menus).
- Every tap target is at least `target-min` (44px). The main lesson action is `control-lg` (56px) and sits in the `ActionBar` at the bottom of each stage.
- Layouts: the home page keeps the ink frame with a large white hero and a lavender panel. Every page sits in a `page-max` container (1440px since October 2026, up from 1120px, so a laptop's screen is used). On a laptop (1100px and wider), pages made of cards (About, Credits, For organisations, the journal, Settings) put them in two columns; reading text still stops at `reading-measure`. A lesson on laptop has the vertical `StagePath` on the left and one reading column on the right; on tablet and phone the `StagePath` turns horizontal and compact above the content.
- Show one idea at a time. Split long readings into parts ("Part 1 of 3") with a Next button, rather than one long scroll.

## Mascot

- The mascot is the lavender reader with the yellow sprout and book. It is used exactly as drawn: never redrawn, recoloured, cropped, rotated or given effects.
- Use the transparent file (`Mascot/thinkerwell-mascot-transparent.png`) on any brand colour. The white and yellow files are for places that need a flat image (emails, printouts).
- It appears once per screen at most: in the header logo, the home hero, as a `MascotTip` offering help, and on the lesson-complete and quiz-result screens. It never decorates a reading passage or a question.
- The gentle float (3s, 8px) is the only motion it gets, and it stops for `prefers-reduced-motion`.

## Icons

- One outline set, 2px stroke, round ends, drawn on a 24px grid, sized 16–22px next to text. Names follow Lucide (`BookOpen`, `Pencil`, `MessageCircle`, `Play`, `RefreshCw` for the five stages), so the site can use `lucide-react` with the same names.
- Stages always keep the same icon: Read `BookOpen`, Write `Pencil`, Speak `MessageCircle`, Watch `Play`, Reflect `RefreshCw`. Sections: History `Landmark`, Geography `Map`, Culture `Palette`, Civics `Scale`.
- An icon-only button always has an `aria-label`.

## States and motion

- Focus: a solid 3px `violet` outline, 2px outside the element, on every control.
- Hover darkens a border to `ink` or a fill one step. Pressed buttons move down 1px.
- Selected answers and chips fill with `ink` (chips) or `lavender-soft` with an ink border (answer options). Checked answers turn `correct` or `retry` and show the word.
- A disabled button uses `disabled` with `ink-soft` text, and always has a helper line saying what to do to continue.
- Transitions are 150ms. Nothing slides or bounces. Respect `prefers-reduced-motion`.

## Listening, speaking and low internet

- **Listen** (the `ToolToggle` above every reading) reads the page aloud with the device's own voice and shows a `ListenBar`. The sentence being read gets `mark.tw-speaking`.
- **Say it** (`WritingBox` with `dictate`) turns speech into text in Write and Reflect. Only offer it where the device can do it without sending the child's voice online, unless the partner has agreed to that in writing.
- **Record yourself** (`VoiceRecorder`) sits in the Speak stage. Recordings never leave the device.
- **Offline**: the site keeps working. Show a `StatusBanner` tone offline under the header; save everything locally; send saved work and events when the connection returns, then show tone back. Lessons a learner has opened are kept for offline use, and a lesson row can carry a small "Saved for offline" badge.
- **Low data**: a "Save data" setting turns videos off, so Watch opens on "Read instead". Images are small and load after text.
- Every video has a written version, and every lesson has a print view (plain black text on white, no header).

## Components in this system

Every screen is built from these: `SiteHeader`, `Logo`, `Mascot`, `MascotTip`, `Button`, `ToolToggle`, `SegmentedControl`, `Chip`, `Badge`, `StagePath`, `StageDots`, `ProgressRing`, `ProgressBar`, `SectionBadge`, `SectionHeader`, `LessonRow`, `ContinueCard`, `TaskCard`, `ReadingCard`, `GlossaryTerm`, `DefinitionCard`, `EvidenceCard`, `ChoiceOption`, `QuestionCard`, `Feedback`, `WritingBox`, `TextField`, `VideoCard`, `VoiceButton`, `ListenBar`, `VoiceRecorder`, `StatusBanner`, `ScoreSummary`, `LearnerTile`, `JournalEntry`, `ActionBar` and `Icon`. They live in `components/bundle.js` as `window.Thinkerwell` and need React 18 on the page, `tokens.css`, then `components/bundle.css` (which also loads the three Google fonts).
