# Digital World: draft lessons

First drafts of three lessons for Digital World, a planned second course. The course plan and the rules these drafts follow are in `docs/content/DIGITAL_WORLD_SPEC.md`.

**Nothing here is loaded by the app.** This folder is outside `content/`, the build doesn't read it, and no route, test or precache refers to it. Our World and the HELP pilot are unchanged.

## What's here

| File | Lesson | Activity |
|---|---|---|
| `DW01.json` | 1. What AI is, and what it isn't (`dw-what-ai-is`) | `sort`: eight Hillview tools into “Uses AI”, “Not AI”, “Hard to say” |
| `DW02.json` | 2. How AI learns from examples (`dw-how-ai-learns`) | `train-model`: teach and test a tiny leaf model on the device |
| `DW03.json` | 3. When AI gets it wrong (`dw-when-ai-gets-it-wrong`) | `compare-results`: find the group a voice typing tool gets wrong, and whose examples were missing |

Each file has the same fields as `content/lessons/*.json`, plus an `activity` object (spec section 5.2). All examples are made up and carry the fiction label. Every fact comes from a source listed in the lesson's `sources`.

## Videos

All three are from Code.org's “How AI Works” series.

| Lesson | Video | Length | How it was checked |
|---|---|---|---|
| 1 | What is Machine Learning? (`KHbwOetbmbs`) | 2:53 | A web search showed this YouTube URL with this title; a transcript summary site lists it in Code.org's “How AI Works” playlist. |
| 2 | How Computer Vision Works (`2hXG8v8p0KM`) | 6:24 | A web search showed this YouTube URL with this title; DCMP's page lists it as a Code.org video, 6 min 24 s, grades 7–12. |
| 3 | AI: Training Data & Bias (`x2mRoFNm22g`) | 2:41 | A web search showed this YouTube URL with this title; Code.org's own lesson plan (Machine learning and bias) links to it. |

The YouTube pages themselves could not be opened: YouTube refused the requests (rate limit), so titles and channels were confirmed through search results and the pages named above, and the summaries were written from published descriptions and transcript summaries. **Someone must watch all three before use** and check the summaries, the lengths and the content notes. Lesson 1's video says human-like AI is “decades away” (an opinion), and Lesson 2's is long and names companies.

## Checker results

`sh scripts/py.sh scripts/check_lesson.py drafts/digital-world/*.json` (with wordfreq):

| File | Text | Simpler | Errors | Warnings |
|---|---|---|---|---|
| DW01 | 293 words, grade 5.0 | 219 words, grade 2.4 | 2 (intentional) | 0 |
| DW02 | 311 words, grade 6.2 | 210 words, grade 2.1 | 2 (intentional) | 0 |
| DW03 | 289 words, grade 6.2 | 204 words, grade 3.4 | 2 (intentional) | 0 |

Correct answers sit in positions 1, 2 and 3 twice each; the longest option is the correct one in 2 of 6. The activity's learner-facing text was checked with the same reading-level measure (all at grade 5.5 or lower).

The two errors in every file are on purpose, and are for the checker to learn, not for the content to bend:

- `missing oldId`: Digital World lessons have no Base44 original, so `oldId` is `null`.
- `section must be one of [...]`: the drafts use the proposed Digital World section `how-ai-works`.

**Zod schema** (`src/content/schema.ts`, parsed with a throwaway script that was not committed): each draft fails on exactly three things, `oldId` (null), `section` (not an Our World section) and the unknown `activity` key. With those three changed or removed, all three drafts pass. `visual.src` passes the pattern but points to a picture that doesn't exist yet (`visuals/DW01.svg` and so on).

The Lesson 2 card set was also checked with a small script: labelled like the gardener, the rounds give 4 of 6, 6 of 6, 0 of 2 (new plant) and 8 of 8, matching `expectedIfLabelledLikeTheGardener` and the lesson text.

## What still needs doing

- **Review by Justin:** level, tone, and whether the three activities are the right ones.
- **AI-accuracy review** by someone who works in AI or machine-learning research (spec 5.4), especially the simplifications in Lessons 1 and 2.
- **Partner review** of the sensitive notes (Lesson 3 now; Lessons 4, 6 and 7 when drafted).
- **Watch the three videos** (above).
- **Visuals:** three pictures to draw, following `docs/content/VISUALS_SPEC.md`; each `visual.description` says what to show. The leaf drawings in Lesson 2 are shared with its activity.
- **The other 8 lessons** (4–11), to the same spec.
- **Indonesian translation**, by the same process as Our World, once the English is reviewed.
- **Mapping to Indonesia's Coding and AI subject** (spec section 3).
- **App work** before any of this can load (spec section 9); the open questions are in spec section 8.
