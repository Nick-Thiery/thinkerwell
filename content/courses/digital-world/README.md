# Digital World: draft lessons

First drafts of all 11 lessons for Digital World, a planned second course. The course plan and the rules these drafts follow are in `docs/content/DIGITAL_WORLD_SPEC.md`.

**Nothing here is loaded by the app.** This folder is outside `content/`, the build doesn't read it, and no route, test or precache refers to it. Our World and the HELP pilot are unchanged.

## What's here

| File | Lesson | Section (proposed) | Activity |
|---|---|---|---|
| `DW01.json` | 1. What AI is, and what it isn't (`dw-what-ai-is`) | `how-ai-works` | `sort`: eight Hillview tools into “Uses AI”, “Not AI”, “Hard to say” |
| `DW02.json` | 2. How AI learns from examples (`dw-how-ai-learns`) | `how-ai-works` | `train-model`: teach and test a tiny leaf model on the device |
| `DW03.json` | 3. When AI gets it wrong (`dw-when-ai-gets-it-wrong`) | `how-ai-works` | `compare-results`: find the group a voice typing tool gets wrong, and whose examples were missing |
| `DW04.json` | 4. Spotting fake photos, videos and voices (`dw-spotting-fakes`) | `check-what-you-see` | `sort`: six Greenhill posts into “Probably real”, “Probably fake”, “Can't tell yet: check first” |
| `DW05.json` | 5. Checking a claim before you share it (`dw-checking-a-claim`) | `check-what-you-see` | `check-claim` (new): open four made-up sources about a bridge story, one at a time, then decide |
| `DW06.json` | 6. Scams: fake prizes, loans and job offers (`dw-scams`) | `check-what-you-see` | `spot-signs` (new): tap the warning signs in four made-up messages, one of them safe |
| `DW07.json` | 7. Your privacy (`dw-your-privacy`) | `use-tools-wisely` | `sort`: what four made-up learners share into “Fine to share”, “Only with people you trust”, “Don't share it” |
| `DW08.json` | 8. Asking an AI tool good questions (`dw-asking-good-questions`) | `use-tools-wisely` | `ask-tool` (new): a labelled pretend tool with pre-written answers; pick a better prompt, then check a sure-but-wrong answer against a book |
| `DW09.json` | 9. Numbers that persuade (`dw-numbers-that-persuade`) | `use-tools-wisely` | `chart-check` (new): switch a market stall's chart from “starts at 49” to “starts at zero”, then work out the real difference |
| `DW10.json` | 10. AI in your community (`dw-ai-in-your-community`) | `ai-where-you-live` | `sort`: eight sentences about three Sunvale tools (translation, farming, health) into “A help”, “A risk”, “Both” |
| `DW11.json` | 11. Project: design an AI helper (`dw-design-an-ai-helper`) | `ai-where-you-live` | `design-plan` (new): five planning steps in the Write stage, including “Should AI be used?” and one round of feedback |

Each file has the same fields as `content/lessons/*.json`, plus an `activity` object (spec section 5.2, which now also describes the five new types). All learner-facing examples are made up and carry the fiction label: invented places, people, tools, messages, numbers and one invented brand (“Sunny Juice”). Real organisations and projects appear only in `sources` and teacher notes. Every fact comes from a source listed in the lesson's `sources`, opened while writing. Every activity works offline on a shared tablet, from the lesson file alone, and each lesson's teacher notes give a paper version where it isn't obvious.

## Videos

| Lesson | Video | Channel | Length | How it was checked | Verified? |
|---|---|---|---|---|---|
| 1 | What is Machine Learning? (`KHbwOetbmbs`) | Code.org | 2:53 | Search results and a transcript summary site (earlier draft) | Not verified |
| 2 | How Computer Vision Works (`2hXG8v8p0KM`) | Code.org | 6:24 | Search results and DCMP's page (earlier draft) | Not verified |
| 3 | AI: Training Data & Bias (`x2mRoFNm22g`) | Code.org | 2:41 | Search results and Code.org's lesson plan (earlier draft) | Not verified |
| 4 | AI Unlocked: Recognizing AI-generated content (`U3ct1Mi5njY`) | MediaWise | not confirmed | Title and channel from YouTube's oEmbed; content from PBS NewsHour Classroom's lesson plan for the video | Not verified |
| 5 | Sort Fact from Fiction Online with Lateral Reading (`SHNprb2hgzU`) | Digital Inquiry Group | not confirmed | Title and channel from YouTube's oEmbed; the group's own video page and description | Not verified |
| 6 | Is this a scam? Investment episode (`qFXZUSB5cGE`) | Consumer Affairs Victoria | not confirmed | Title and channel from YouTube's oEmbed; summary checked against the full transcript on the office's own page | Content checked by transcript; not watched |
| 7 | Private and Personal Information (`MjPpG2e71Ec`) | Common Sense Education | 1:20 | Title and channel from YouTube's oEmbed; length and description from Common Sense's video page; Code.org's lesson plan that uses it | Not verified |
| 8 | What are AI Chatbots? (`gmUHEvrpYoU`) | Common Sense Education | 3:20 | Title and channel from YouTube's oEmbed; length and description from Common Sense's video page and the lessons that use it | Not verified |
| 9 | How to spot a misleading graph - Lea Gaslowitz (`E91bGT9BjYk`) | TED-Ed | 3:49 | Title and channel from YouTube's oEmbed; summary checked against TED's full published transcript | Content checked by transcript; not watched |
| 10 | Ethics & AI: Equal Access and Algorithmic Bias (`tJQSyzBUAew`) | Code.org (its YouTube channel is named “CodeAI”) | 3:23 | Title and channel from YouTube's oEmbed; length, description and speakers from DCMP | Not verified |
| 11 | What is AI? (`b0KaGBOU4Ys`) | Common Sense Education | 2:37 | Title and channel from YouTube's oEmbed; length and description from Common Sense's video page | Not verified |

YouTube's own pages could not be opened (it asked to “confirm you're not a bot”), so no video was watched. YouTube's oEmbed service did confirm each new video's title and channel. Where a full transcript was published (Lessons 6 and 9), the summary was checked against it; the other summaries were written from descriptions and lesson plans, and each `contentNote` says so. **Someone must watch all 11 before use** and check the summaries, the lengths (`durationSeconds` is `null` where unknown) and the content notes. Things to look at:

- Lesson 4: shows real AI-made content, and tools that need the internet.
- Lesson 6: very short, and about an investment email (the warning signs carry over).
- Lessons 7, 8 and 11: American cartoons written for younger or US students; Lesson 7's talks to the viewer about “your” information.
- Lesson 9: names truck brands, the Super Bowl and US unemployment figures.
- Lesson 10: the speakers name the companies they work for.

## Checker results

`sh scripts/py.sh scripts/check_lesson.py drafts/digital-world/*.json` (with wordfreq):

| File | Text | Simpler | Errors | Warnings |
|---|---|---|---|---|
| DW01 | 293 words, grade 5.0 | 219 words, grade 2.4 | 2 (intentional) | 0 |
| DW02 | 311 words, grade 6.2 | 210 words, grade 2.1 | 2 (intentional) | 0 |
| DW03 | 289 words, grade 6.2 | 204 words, grade 3.4 | 2 (intentional) | 0 |
| DW04 | 320 words, grade 5.3 | 213 words, grade 1.4 | 2 (intentional) | 0 |
| DW05 | 310 words, grade 5.9 | 207 words, grade 2.4 | 2 (intentional) | 1 |
| DW06 | 315 words, grade 5.9 | 206 words, grade 2.0 | 2 (intentional) | 0 |
| DW07 | 319 words, grade 6.1 | 219 words, grade 2.8 | 2 (intentional) | 0 |
| DW08 | 295 words, grade 6.1 | 216 words, grade 2.9 | 2 (intentional) | 0 |
| DW09 | 319 words, grade 5.7 | 198 words, grade 1.5 | 2 (intentional) | 0 |
| DW10 | 317 words, grade 5.3 | 220 words, grade 2.6 | 2 (intentional) | 0 |
| DW11 | 316 words, grade 5.3 | 216 words, grade 2.3 | 2 (intentional) | 0 |

Across all 11 lessons, correct answers sit in positions 1, 2 and 3 seven, seven and eight times; the longest option is the correct one in 3 of 22 (1 of 16 in Lessons 4–11).

The two errors in every file are on purpose, and are for the checker to learn, not for the content to bend:

- `missing oldId`: Digital World lessons have no Base44 original, so `oldId` is `null`.
- `section must be one of [...]`: the drafts use the proposed Digital World sections (`how-ai-works`, `check-what-you-see`, `use-tools-wisely`, `ai-where-you-live`).

The one warning (DW05, “uncommon words in simpler: checkers”) comes from the glossary word “fact-checker”: the checker splits it at the hyphen and doesn't match the half to the glossary. It is left as it is.

**Activity text.** The checker doesn't read `activity` yet, so the activity's learner-facing text was measured with the same reading-level formula by a throwaway script (not committed). In Lessons 4–11 every activity reads at grade 3.3 or lower overall, and every string of 12 words or more is at grade 5.5 or lower. A few short strings (a message sender's name, a scam message's own wording) score higher on the formula because they are so short.

**Zod schema** (`src/content/schema.ts`, parsed with a throwaway script that was not committed): each of the 11 drafts fails on exactly three things, `oldId` (null), `section` (not an Our World section) and the unknown `activity` key. With those three changed or removed, all 11 pass. `visual.src` passes the pattern but points to a picture that doesn't exist yet (`visuals/DW04.svg` and so on).

The Lesson 2 card set was also checked with a small script: labelled like the gardener, the rounds give 4 of 6, 6 of 6, 0 of 2 (new plant) and 8 of 8, matching `expectedIfLabelledLikeTheGardener` and the lesson text. The Lesson 9 numbers were worked by hand: 52 and 50 on a scale from 49 give bars of 3 and 1 (three times as tall); the real difference is 2.

## Sources that couldn't be opened directly

- unesco.org blocks automated reading. Lesson 11 cites UNESCO's AI competency framework (as the spec and Lesson 1 do); its wording on AI system design (problem scoping, “when AI should not be used”, iteration and feedback loops) was checked through a summary by Kyiv Polytechnic's Human-Centred AI lab, which is also cited. Lesson 8 cites UNESCO's generative AI guidance through UN News's report of it.
- The eSafety Commissioner's deepfakes page refused automated reading, so Lesson 4 uses the News Literacy Project, MIT Media Lab and PBS NewsHour Classroom instead.

## Open questions for reviewers

1. **Lesson 6, loans and job offers** (spec section 8, item 5). Kept, as asked, and framed as “messages anyone might get”, with no examples about work in another place, papers, visas, legal status, aid or official services. Fake job offers are linked to trafficking into scam operations in Southeast Asia (UN human rights report, 2023; in the lesson's sensitive notes). **A partner educator must review this lesson.** Keep, reframe further, or swap?
2. **Partner review of sensitive notes**: Lessons 4 (deepfakes harm real people; voice clones in scams), 6, 7 (privacy; a stranger asking where a learner goes) and 10 (health, languages).
3. **Lesson 8, the pretend tool** (spec section 8, item 6). Is it enough? UNESCO recommends a minimum age of 13 for generative AI in the classroom, which supports keeping real chatbots out.
4. **Lesson 10, real projects** (spec section 8, item 7). Real examples (an offline cassava-disease app from IITA and Penn State; WHO's 2021 guidance; CLEAR Global) are in teacher notes and sources only. May learner text ever name them?
5. **Five new activity types** (`check-claim`, `spot-signs`, `ask-tool`, `chart-check`, `design-plan`), each needing a player. Are they all worth building, or should some become `sort` or a quick check? Should Lesson 11's plan count towards the Write stage being done (spec section 8, item 2)?
6. **Lesson 11's time**: `estimatedMinutes` is 40–60, longer than other lessons. Fine for a project?
7. **Overlap with Our World Lesson 23** (What makes information trustworthy?). Lesson 5 builds on it and adds lateral reading; Lesson 4 also touches on edited photos. Does a learner who does both courses get too much repetition?
8. **Facts that date**: Lesson 4's visual clues (extra fingers, messy writing) are already fading as tools improve. The lesson teaches them as reasons to check, not proof, but the AI-accuracy reviewer should confirm the wording.
9. **Lesson 7, AI and privacy**: the sentence “Some AI tools are also trained on information collected from the internet” rests on a news report of the UK regulator's 2024 consultation. A stronger source would help.

## What still needs doing

- **Review by Justin:** level, tone, and whether the activities are the right ones.
- **AI-accuracy review** by someone who works in AI or machine-learning research (spec 5.4), especially Lessons 1, 2, 4, 8 and 10.
- **Partner review** of the sensitive notes (Lessons 3, 4, 6, 7 and 10; Lesson 6 is required).
- **Watch all 11 videos** (above).
- **Visuals:** 11 pictures to draw, following `docs/content/VISUALS_SPEC.md`; each `visual.description` says what to show. The leaf drawings in Lesson 2 are shared with its activity.
- **Section checks:** none are drafted yet. The four proposed sections will each need one, written to `docs/content/QUIZ_SPEC.md`.
- **Indonesian translation**, by the same process as Our World, once the English is reviewed. Lessons 4–6 name Indonesian sources (Mafindo, OJK) in teacher notes for a partner who wants to localise.
- **Mapping to Indonesia's Coding and AI subject** (spec section 3).
- **App work** before any of this can load (spec section 9), including players for the new activity types; the open questions are in spec section 8.
