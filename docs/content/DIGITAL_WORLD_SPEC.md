# Digital World: course spec (draft)

Status: draft for Justin and Nick, written September 2026. Since October 2026 the 11 draft lessons are in the app as a **preview**: in `content/courses/digital-world/` (see its README), checked by the build, and shown only on a device that has visited `/preview/digital-world`, with a "Draft course: not yet reviewed" banner. Nobody else sees them, and they haven't been reviewed. How it works, the choices made where this spec is open, and what's left: `docs/notes/digital-world-preview.md`.

## 1. What it is for, and who it's for

Digital World is a planned second Thinkerwell course. It teaches learners to understand AI and online information, check what they see, and stay safe. It needs no coding and no internet.

The learners are the same as Our World's (`docs/content/SPEC.md` section 1): about 10–17, many learning English, many with interrupted schooling, on shared laptops and tablets with unreliable internet. Many can't work or open a bank account, and many don't own a phone. Every lesson must make sense for a learner who has never used an AI tool.

## 2. How it differs from Our World

- **Same shape.** Every lesson has the same fields as `content/lessons/*.json` and the same five stages (Read, Write, Speak, Watch, Reflect), both reading levels, a glossary, a quick check, teacher notes and sources. `docs/content/SPEC.md` applies unless this file says otherwise.
- **Plus activities.** Where doing something teaches better than reading, a lesson has one hands-on activity (section 5.2). Every activity works offline on a shared tablet, with no account, no camera, no microphone and no network.
- **A project at the end.** Lesson 11 is a design project, not a normal lesson.
- **A new subject.** Our World is social studies. Digital World is AI and media literacy, so its facts go out of date faster and need an AI-accuracy review (section 5.4).

## 3. The 11 lessons and the UNESCO framework

The course follows UNESCO's *AI competency framework for students* (2024): four aspects (Human-centred mindset; Ethics of AI; AI techniques and applications; AI system design), each at three levels (Understand, Apply, Create), which gives 12 competency blocks. Digital World aims mainly at Understand, with some Apply and one Create project.

| # | Working title | UNESCO aspect | Level | Competency block | Activity |
|---|---|---|---|---|---|
| 1 | What AI is, and what it isn't | AI techniques and applications | Understand | AI foundations | Sort everyday tools into “Uses AI”, “Not AI”, “Hard to say” (drafted) |
| 2 | How AI learns from examples | AI techniques and applications | Understand, some Apply | AI foundations | Train a tiny model on the device (drafted; section 6) |
| 3 | When AI gets it wrong | Ethics of AI | Understand | Embodied ethics | Compare a tool's results by group; find whose examples were missing (drafted) |
| 4 | Spotting fake photos, videos and voices | Ethics of AI | Understand, some Apply | Embodied ethics; Safe and responsible use | Real or fake? Look for the clues in made-up examples (drafted) |
| 5 | Checking a claim before you share it | Human-centred mindset | Apply | Human accountability | Check a made-up news story against other made-up sources (drafted) |
| 6 | Scams: fake prizes, loans and job offers | Human-centred mindset | Understand, some Apply | Human agency | Spot warning signs in made-up messages (drafted) |
| 7 | Your privacy | Ethics of AI | Apply | Safe and responsible use | Decide what is safe to share, and with whom, for made-up characters (drafted) |
| 8 | Asking an AI tool good questions | AI techniques and applications | Apply | Application skills | Improve a question, then check a pre-written answer (no real chatbot) (drafted) |
| 9 | Numbers that persuade | Human-centred mindset | Understand | Human agency | Find what a misleading made-up chart hides (drafted) |
| 10 | AI in your community | Human-centred mindset | Understand | Human agency (towards Citizenship in the era of AI) | Weigh helps and risks in translation, farming and health examples (drafted) |
| 11 | Project: design an AI helper | AI system design | Understand to Create | Problem scoping; Architecture design; Iteration and feedback loops | Plan a helper for a real problem where you live (drafted) |

The levels and blocks are a first mapping for review. Lesson 11 is a design on paper: it covers problem scoping (should AI be used here at all?) and a simple plan, and touches Create through one round of feedback. It does not build a working tool.

Future work: map the course to Indonesia's Coding and Artificial Intelligence elective (*Koding dan Kecerdasan Artifisial*), set by Permendikdasmen No. 13 of 2025 and phased in from the 2025/26 school year (from grade 5 in primary school, grade 7 in junior secondary and grade 10 in senior secondary). This needs the Ministry's own learning outcomes (*capaian pembelajaran*) for the subject, read in the original; nothing here claims a match yet.

## 4. Sections (proposal)

The Our World schema needs four sections. A proposal, in lesson order:

| id | Title | Lessons |
|---|---|---|
| `how-ai-works` | How AI works | 1–3 |
| `check-what-you-see` | Check what you see | 4–6 |
| `use-tools-wisely` | Use tools wisely | 7–9 |
| `ai-where-you-live` | AI where you live | 10–11 |

The drafts use these ids. The section colours and icons are open (section 8).

## 5. Rules that differ from or add to `docs/content/SPEC.md`

### 5.1 Fields

- `id`: a slug starting `dw-` (for example `dw-what-ai-is`), so ids never clash with Our World's.
- `oldId`: `null`. There is no Base44 original. The schema will need `oldId` to be optional.
- `section`: one of the ids in section 4.
- `number`: the lesson's number within Digital World (1–11). “You finished Lesson 1.” is fine, because the course name is on screen.
- `changes`: for drafts, notes for reviewers (what is new, what needs checking).
- `visual.src`: the schema requires it, so drafts point to a planned path (`visuals/DW01.svg`) that doesn't exist yet, and say so in `visual.description`.
- `activity`: optional, new (5.2).

### 5.2 The `activity` object

At most one per lesson. Fields every activity has:

| Field | Meaning |
|---|---|
| `type` | Which activity player to use: `sort`, `train-model`, `compare-results`, `check-claim`, `spot-signs`, `ask-tool`, `chart-check`, `design-plan` so far. |
| `stage`, `placement` | Where it appears, for example `read` / `after-evidence`. |
| `title`, `instructions` | Learner-facing, at the level of other learner text (grade 5.5 or lower). |
| `saves` | What is saved with the learner's lesson work (for the team; not shown). |
| `offline` | How it works with no network (for the team; not shown). |

Type-specific fields:

- `sort`: `groups` (`id`, `label`) and `items` (`id`, `text`, `suggested` group or `hard`, `feedback`). There is no score and nothing is marked wrong: feedback says what most people would say and why. A “Hard to say” group is allowed where experts disagree.
- `train-model`: section 6.
- `compare-results`: `groups` with made-up results (`label`, `right`, `of`), `mostMistakes`, and an `afterTap` choice question with per-option feedback, written like a quick check.
- `check-claim` (Lesson 5): a `claim` (`from`, `text`), `askFirst` (the three questions to show), `sources` (`id`, `name`, `who`, `says`), each opened with a tap like a new page and in any order, and a `question` (choice, per-option feedback). The question is never locked behind opening the sources.
- `spot-signs` (Lesson 6): `signs` (`id`, `label`), `notASign` (the message for a part that isn't one), and `messages` (`id`, `from`, `parts`: `text`, `sign` id or `null`, `feedback`). The learner taps parts; each tap shows the sign's label and feedback. No score; “Show all signs” is always available. Every part is a real button for keyboard and screen readers.
- `ask-tool` (Lesson 8): `toolLabel` (always shown: it is a pretend tool, section 5.6), `improve` (a `start` prompt and answer, a `question`, and `options` with `prompt`, `answer`, `correct`, `feedback`) and `check` (a `prompt`, a sure-but-wrong `answer`, a `trustedSource` with `name` and `says`, and a choice `question`). Every answer is written in the file.
- `chart-check` (Lesson 9): `measure`, `bars` (`label`, `value`), `views` (`id`, `label`, `axisStart`, `axisEnd`, `note`) and a choice `question`. The player draws each view as a bar chart with every bar's number written on it.
- `design-plan` (Lesson 11): `problems` (`id`, `text`; one may be `own: true`, a problem the learner writes), and `steps` (`id`, `title`, `kind` `text` or `choice`, `prompt`, optional `starter`, `options` with `feedback`, or `questions` for feedback). It sits in the Write stage; the learner can go back to any step. What the learner writes is saved like other lesson writing, on the device only.

The five newer types are proposals made with Lessons 4–11; the team may merge some (for example `check-claim` and `ask-tool` are both “open a card, then answer”).

Rules for every activity: nothing is locked and nothing blocks the lesson; no timers; no red (wrong answers use “Not quite” in burnt orange, as elsewhere); keyboard and screen-reader use; 44px tap targets; works at 320px wide; the same result is available without the activity (the evidence card, the print view, or a paper version in `educatorNotes`). Whether finishing an activity counts towards a stage being done is open (section 8).

### 5.3 Made-up examples

- Everything learners see in evidence and activities is made up and carries the fiction label: invented places (Hillview, Sunrise Garden, Riverbend), invented tools named by what they do (“the voice typing tool”), invented numbers.
- No real people, brands, apps, companies, products, chatbots or news events in learner text. Sources and teacher notes can name real organisations. A video may name companies; say so in `contentNote`.
- Real research can be described in learner text without names (“Researchers have found …”), and must be in `sources`.
- Scam, fake and misleading examples must be clearly fictional and harmless: no real phone numbers, links, bank names, logos or payment details, and nothing that would work as a real scam if copied.

### 5.4 Accuracy

- Every fact in a lesson comes from a source someone has opened and listed in `sources`. Write in your own words.
- AI changes fast. Prefer ideas that stay true (models learn from examples; missing examples cause mistakes) over claims about what today's tools can do. No product comparisons, no predictions about the future, no statistics that date quickly unless cited with their year.
- **AI-accuracy review.** Before a lesson reaches learners, someone who works in AI or machine-learning research reads it for accuracy, especially the simplifications (for example, Lesson 2's model is a nearest-neighbour model, and the lesson says so in plain words). They note what they checked in a review log, like `docs/content/REVIEW_LOG_*.md`.

### 5.5 Sensitive topics

`docs/content/SPEC.md` section 5 applies in full. In addition:

- **Privacy (Lesson 7) and every lesson:** never ask learners what they share, which apps or accounts they use, or anything about themselves to “practise”. Use made-up characters.
- **Scams (Lesson 6):** learners may not be able to work or borrow, but their families and friends receive such messages. Frame it as “messages anyone might get”. Never use examples about resettlement, visas, legal status, aid or official services: these are real scams aimed at displaced people and too close to home. `sensitiveNotes` should point educators to the partner's own safeguarding process if a learner describes a real message, and say not to debate the details. Fake job offers can be linked to exploitation; a partner educator must review this lesson.
- **Fakes (Lesson 4):** examples are harmless and silly (a giant fruit, a talking goat). No fake images of real people, no political content, nothing violent or sexual, and no voice-cloning example that uses a family member's voice asking for money. Name the harm in teacher notes, not in learner examples.
- **Bias (Lesson 3):** real bias can involve race, gender, language and accent. Keep learner text on causes and fixes, and never ask learners about their home language, origin or experiences of unfair treatment.
- **Health (Lesson 10):** AI health examples say that people should ask a health worker; no diagnosis advice.

### 5.6 No real AI chatbot for learners

Learners never talk to a real AI model in the app (it would need the internet, send their words to a company, and could say anything). Lesson 8 uses a pretend tool: a pre-written set of questions and answers in the lesson file, including an answer that sounds sure but is wrong, for learners to check. It must be labelled as a pretend tool.

### 5.7 Language

English first, following `docs/content/SPEC.md` (British spelling, reading levels, glossary rules). Bahasa Indonesia later, by the same process as Our World (`docs/translation/README.md`). Glossary words such as *model* and *training data* are taught, not avoided: they are the words learners will meet elsewhere.

## 6. The Lesson 2 activity: train a tiny model (`train-model`)

### What the learner does

1. **Teach.** The learner sees two example leaf cards (a big dark green leaf and a brown leaf with spots) and gives each a label, healthy or sick.
2. **Test.** The model guesses six new leaves. After each guess, the gardener's answer appears beside it, and the screen shows the example the model thought was most similar (“It looked most like this example, so the model said sick.”). The learner sees how many it got right.
3. **Teach more.** Four more, different examples are added (a small new leaf, a leaf with tiny marks, a yellow leaf with no spots, a small spotted leaf). Test again: it does better.
4. **Something new.** Two leaves from a new plant (long, thin, pale stripes, healthy) are tested. The model gets them wrong, because nothing in its examples looks like them.
5. **Fix it.** Two examples of the new plant are added. Test again: all right.
6. **Free play.** The learner can take examples out or change a label and test again. The model follows the learner's labels, even when they differ from the gardener's.

With the gardener's labels, the rounds give 4 of 6, 6 of 6, 0 of 2 for the new plant, then 8 of 8. The card set in `DW02.json` was checked with a small script to give exactly these results, and each round stores what to expect (`expectedIfLabelledLikeTheGardener`). The app's unit tests should check the same.

### How it works on the device

- Each card is a drawing (no photos) with four numbers from 0 to 10, stored in the lesson file: how green, spots, size, and shape (round to long).
- The model is a **nearest-neighbour classifier with k = 1**: for a new leaf, find the labelled example with the smallest distance (straight-line distance over the four numbers) and give its label. Ties go to the example added first. This is a real machine-learning method (scikit-learn's user guide describes it: a new point takes the class of its nearest neighbours, and the method keeps its training data rather than building a general model). It is simple enough to explain on screen, and it runs instantly in plain TypeScript with no library.
- All state is in memory. At most, the lesson saves which rounds were finished.

### What it must never do

- Never use the camera or microphone, never upload anything, never make a network request, never load a machine-learning library or model file.
- Never keep a learner's drawings or photos (if a drawing mode is added later, the drawing stays in memory and is discarded when the page closes).
- Never score the learner or mark their labels wrong: the model follows their labels, and the gardener's answer is shown for comparison.

### Possible later versions (not decided)

- A drawing mode: the learner draws two kinds of shapes with a finger; simple features (for example height-to-width ratio and how much of the box is filled) are worked out on the device.
- The same player reused in Lesson 3: give one example the wrong label and watch the model copy the mistake.

## 7. Watch

As in Our World: one short video from a reputable educational channel per lesson, embedded from youtube-nocookie.com only after the learner taps play, with a written summary that stands alone. The three drafts use Code.org's “How AI Works” videos. Someone on the team must watch each one before it goes in, because the drafts' summaries were written from published descriptions and transcript summaries.

## 8. Not decided (for Justin and Nick)

1. The course name, the four sections (section 4), and their colours and icons (the brand book has colours for Our World's four only).
2. Whether finishing an activity counts towards a stage being done, and what is saved (`src/lesson/progressRules.ts`).
3. Lesson 2: picture cards only, or a drawing mode too.
4. Who does the AI-accuracy review, and who at a partner reviews Lessons 3, 4, 6 and 7.
5. Lesson 6's topics. “Loans and job offers” are real risks for families, but learners may not be allowed to work or borrow. Keep them, reframe them as messages a family member might get, or swap them.
6. Lesson 8: is a pretend AI tool with pre-written answers enough, or should a later version use an on-device model (large, and hard to keep safe)?
7. Whether Lesson 10 may name real, well-documented projects (in teacher notes only) or stays fully fictional.
8. The age range. Is one version enough for 10–17, or should Lessons 8–11 have an older-learner option?
9. The Code.org videos name real companies, and one is six minutes long. Keep them, or look for others?
10. When to do the mapping to Indonesia's Coding and AI subject, and who reads the Ministry's documents.

## 9. The path to the app

Digital World is not switched on during the HELP pilot. Before any Digital World lesson can load:

(October 2026: the preview has done item 1, the players for every activity type, and item 6, and keeps Digital World out of every other device's download. Items 2–5 and 7 are still to do before it is switched on for everyone; item 3 is a simple course choice for preview devices only. `docs/notes/digital-world-preview.md`.)

1. **Multi-course support.** A course id in the content (for example `content/courses/our-world/` and `content/courses/digital-world/`, or a `course` field), the schema's section ids per course, `oldId` optional, and the `activity` object with a player for each type. Routes stay stable for Our World (`/lesson/:id/:stage` still works, since `dw-` ids never clash).
2. **Storage.** Progress and recordings are already keyed by learner and lesson id, and section checks by learner and section id, so separate ids keep work separate. The work file (`src/storage/workFile.ts`) and class view need to know which course a lesson belongs to. Certificates per course.
3. **A subject-choice screen.** After “Who's learning today?”, a learner picks a course. With only one course switched on, the screen is skipped, so the pilot looks exactly as it does now.
4. **A switch per course.** A course can be listed but off. During the HELP pilot, only Our World is on.
5. **Offline size.** The precache budget (under 490 kB, `e2e/build-output.spec.ts`) was set for one course. A second course either raises it, with the reason written down in `docs/notes/slow-internet.md`, or is stored for offline use only once a learner opens it.
6. **Content checks.** `scripts/check_lesson.py` and the zod schema learn the Digital World section ids, the optional `oldId` and the `activity` object; a new check covers activity text levels and, for `train-model`, the expected round results.
7. **Translation.** Indonesian by the same process as Our World, once the English is reviewed.

## Sources used for this spec

- UNESCO: AI competency framework for students (2024): https://www.unesco.org/en/articles/ai-competency-framework-students
- OECD.AI: What is AI? Can you make a clear distinction between AI and non-AI systems?: https://oecd.ai/en/wonk/definition
- scikit-learn user guide: Nearest neighbors: https://scikit-learn.org/stable/modules/neighbors.html
- detikEdu: Permendikdasmen 13 Tahun 2025, isi lengkap dan dampaknya untuk sekolah: https://www.detik.com/edu/sekolah/d-8021932/permendikdasmen-13-tahun-2025-isi-lengkap-dan-dampaknya-untuk-sekolah
- Each draft lesson lists its own sources.
