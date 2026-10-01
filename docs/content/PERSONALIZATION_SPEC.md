# Suggestions: on-device personalisation (design spec)

Status: **proposed, not built.** Planned for after the HELP pilot, using what the pilot shows. Nothing here changes the pilot build.

Every rule in `CLAUDE.md` applies; where this spec seems to disagree, `CLAUDE.md` wins. In the interface the feature is called **Suggestions**; the code goes in `src/suggestions/`.

## 1. Goal and non-goals

**Goal.** Help each learner spend their time where it helps most, using what they have already done on the device. "Personalised" here means four things, and only these:

- a suggested reading level (Standard or Simpler);
- "worth another look" suggestions tied to a skill;
- short hints for teachers on the class page;
- a suggested starting point and next lesson.

It should show that adaptivity can work for learners with few resources: on a shared, offline tablet, with no account and no data leaving the device.

**It will never:**

- lock, hide, reorder or skip a lesson, stage or check, or change anything without the learner choosing it;
- show a learner a score, level label ("below level", "weak"), percentage, ranking or comparison with others;
- send learner data anywhere, call an online AI service, or run a large language model;
- ask about a learner's journey, home country, family, religion or ethnicity, or guess any of them;
- use red, timers, streaks or nagging. One suggestion at a time, and a "No thanks" is respected.

## 2. Inputs

### What the device already stores (checked in `src/storage/types.ts`)

| Input | Where | Usable? |
|---|---|---|
| Reading level | `Learner.readingLevel`, else `settings.preferredReadingLevel` | Only the **latest** choice; the level used for each lesson is not stored. |
| Stages done, completion | `LessonProgress.stagesDone`, `completedAt` | Yes. |
| Quick-check answers | `LessonProgress.checkAnswers[i]`: `selected`, `correct`, `tries` | Yes. `correct` is the **latest** answer, so "right first time" is `correct && tries === 1`. Two choice questions per lesson. **No skill tag.** |
| Section-check answers | `SectionQuizRecord.best` and `.latest` (option per question id), `attempts` | Yes. Every question has a `skill` (`vocabulary`, `understand`, `evidence`, `apply`). Only the best and latest attempts are kept. |
| Writing, reflections | `LessonProgress` | Not used: free text is never scored. |
| Time per stage | **Not stored** (only `startedAt`, `updatedAt` per lesson) | No. Unreliable on a tablet left open, so time is not used. |
| Listen and Say it use | Not stored | No. |

Two small additions make these inputs usable:

1. **A skill on each quick-check choice question** (`read.checks[i].skill`, the same four values), added by Justin and checked by `scripts/check_lesson.py`. Indonesian lessons take the tags from the English.
2. **The reading level used**, saved on `LessonProgress` as optional `readLevel` when Read counts as done.

### The new input: an optional starting check

- **Who:** any chosen learner, offered once on their home page after they are added ("Find a good place to start"), and there to take or retake any time. Guests can take it; nothing is saved.
- **How long:** about 8 minutes, no timer. **8 questions**, 2 per skill, each with a short made-up `stimulus`, so it needs no lesson first. Written to `docs/content/QUIZ_SPEC.md`, aiming for the low end of its reading level.
- **Read aloud:** every stimulus, question and option, with Listen under Read's on-device voice rules (section checks don't have Listen today; reuse Read's `useListen`).
- **Skippable:** "Skip for now" on the offer, "Stop" on every question. A part-finished check saves nothing.
- **No right/wrong shown during it**, like the pilot's pre-check. At the end the learner sees suggestions, not a score.
- **Questions:** from the pilot's 16-question pre/post check (`docs/research/MEASUREMENT_PLAN.md`): the 8 items that best showed who found the lessons easy or hard, rewritten on new examples. In `content/start/check.json`, Indonesian in `content/id/start/`.

## 3. What it changes

Ranked by value for cost. Every string below is a draft for `en.json` (with a note in `en.notes.json`) and `id.json`, reviewed like the rest of the Indonesian. Suggestion cards use the lavender "help" tone, never lemon (the continue card keeps the highlight) or a section colour.

### 3.1 Suggested reading level (highest value, low cost)

**Rule.** Look at the learner's last 3 finished lessons read at the same level (6 quick-check questions):

- reading **Standard**, right first time on 2 or fewer of 6 → suggest Simpler;
- reading **Simpler**, right first time on 5 or more of 6 → offer Standard;
- after a starting check, before any lesson is finished: 1 or fewer of the 4 `vocabulary` and `understand` questions right → suggest Simpler.

Two of 6 is about what guessing among three options gives, so it is a fair sign the reading got in the way. Shown at the start of Read, never in the middle of a part. After "No thanks", the same suggestion waits until 3 more lessons are finished.

**Worked examples.**
- Amina reads Standard. In Lessons 2–4 she was right first time on 2 of 6 quick-check questions. Next time she opens Read: suggest Simpler.
- Budi reads Simpler. Right first time on all 6 in Lessons 5–7: offer Standard.
- Sara gets 1 of 4 on words and main ideas in the starting check: her first lesson opens with the Simpler suggestion.

**What the learner sees.**
- Suggest Simpler: "Want to try Simpler reading? It has the same ideas in shorter sentences. You can switch back any time." Buttons: "Use Simpler reading" / "Keep Standard".
- Offer Standard: "You've been getting the quick checks right. Want to try Standard reading?" Buttons: "Try Standard" / "Stay with Simpler".
- "Why this suggestion?" (a disclosure): "Suggested because some quick-check questions in your last 3 lessons were tricky." / "…because you got the quick checks right in your last 3 lessons."

The level names come from the existing `levelStandard` / `levelSimpler` messages, so they read right in Indonesian too.

### 3.2 "Worth another look", by skill (high value, low cost)

**Rule.** When a skill's estimate (section 4) is **"getting there"**, suggest one review: the finished lesson where the learner most recently missed a question with that skill, linked to its quick check. One card at a time, on the learner home under Continue and on the section-check results (whose "Worth another look" list then starts with that lesson).

**Worked example.** Leila finished Lessons 1–9 and the History check. On `evidence` she was right first time on 2 of 5 quick-check questions and 1 of 3 in the check's latest attempt: 3 of 8, estimate (3+1)/(8+2) = 0.4, "getting there". Her most recent miss on `evidence` was in Lesson 6. Her home shows: "Worth another look: using evidence. Lesson 6 has a good example." Button: "Open Lesson 6". Why: "Suggested because a few 'Using evidence' questions were tricky, most recently in Lesson 6."

Each skill gets its own whole message ("Worth another look: using evidence."), not a skill name dropped into a sentence, because the name changes case and grammar inside a sentence in other languages. Copy never says "wrong", "weak" or "failed".

### 3.3 Teacher hints on the class page (medium value, low cost)

**Rule.** On `/educators/class`, each learner's row shows at most two short hints, first of: reading level (3.1), one skill (3.2), "Hasn't taken the starting check". No numbers, no colour coding, no sorting or filtering by hint. Because anyone on a shared device can open this page, hints sit in a **"Show suggestions" disclosure, closed by default**, and print only when open.

**Copy.** "Might find Simpler reading easier", "Ready to try Standard reading", "Could look again at: using evidence", "Hasn't taken the starting check". Each with "Why?": the same reason a learner sees, about the learner rather than "you" ("Some quick-check questions in Lessons 2–4 were tricky").

### 3.4 Suggested starting point and next lesson (lower value, higher risk)

The course builds in order, and a skill check can't tell which topics a learner already knows, so this stays modest.

**Rule.** The starting point is Lesson 1, or the lesson a teacher names; the starting check never skips lessons. "Continue" and "Up next" stay as today (course order, `findContinueTarget`). The one change: on the complete screen, if a skill is "getting there" and the next lesson's questions use it, offer a detour beside "Up next": "Before Lesson 7, want another look at Lesson 6?" with "Open Lesson 6".

Build this only if the pilot shows learners going on with a skill they hadn't got (see 8).

## 4. The model

**Per-skill estimates from answers, with thresholds.** For each learner and each of the four skills:

- **Observations:** each quick-check choice question answered (right first time = 1, else 0); each section-check question in the latest attempt; each starting-check question, until the learner has 6 lesson observations for that skill.
- **Window:** only the 8 most recent observations per skill count, so old work and a slow start fade, and if someone else once used the tile it washes out.
- **Estimate:** (right + 1) / (count + 2). The "+1, +2" keeps a single answer from swinging it.
- **Bands:** fewer than 4 observations, "not enough yet" (no suggestion); under 0.5, "getting there"; otherwise "on track". Bands are internal: nobody sees them, only the suggestions they lead to.

Estimates are **worked out from saved work each time, never stored**, like the journal and certificates: delete a learner's work and their estimates are gone.

**Why not an LLM.** A useful language model is hundreds of megabytes; the whole offline course is under 490 kB and runs on shared, low-end tablets. An online model would send children's work away (rule 1) and fail offline (rule 2). Its output can't be checked in advance, translated and reviewed by a native speaker (rule 7), or explained in one sentence. The rules above are a few kilobytes, testable line by line and the same on every device.

**Explaining a suggestion.** Each suggestion carries its reason as data (`{ kind, skill?, lessons[], source }`), and one message per reason turns it into "Suggested because…", naming lessons and skills, never a count of wrong answers. If a reason can't be said in plain words, the rule is too complicated.

## 5. Data and storage

- **New store `startingChecks`** (key `learnerId`): `{ learnerId, first, latest, attempts }`, each attempt `{ answers: Record<questionId, number>, finishedAt }`. "First" is kept to match the pilot's before-and-after design.
- **`Learner.suggestions?`**: dismissals and choices, `Record<suggestionKey, { response: 'took' | 'no-thanks', at, lessonsDoneAt }>`, so a "No thanks" lasts across devices.
- **`LessonProgress.readLevel?`**: from 2.
- **`DeviceSettings.suggestions?`**: an educator's on/off switch in Settings ("Show suggestions to learners"). Missing means on (open, see 8).
- **Schema:** `DB_VERSION` 2 → 3. Migration 3 creates `startingChecks`; no records are rewritten (the new fields are optional). `migrations.test.ts` upgrades a version-2 database with data and checks nothing was lost.
- **Deleting a learner:** `removeLearner` deletes their `startingChecks` record in the same transaction as the rest.
- **Work file:** gains `startingCheck` per learner (plus the optional `suggestions` and `readLevel`). A new kind of record with its own merge rule means **`WORK_FILE_VERSION` goes to 2**. Version 2 still loads version 1 files. A device not yet updated refuses a version 2 file as "saved by a newer Thinkerwell" rather than quietly dropping the starting check. Merge (`mergeWork.ts`): `first` is the earlier attempt, `latest` the later, `attempts` the larger count; per suggestion key, the later response wins. Update the checker in `workFile.ts` and `docs/notes/device-transfer.md`.
- **Guests and look-around:** the starting check and suggestions live in memory only and are forgotten with the rest of guest memory (`src/lesson/guestMemory.ts`).

## 6. Measuring whether it helps

The consent form promises anonymous data only: time spent, lessons finished and quiz scores, linked to a code, seen only by the team and deleted within 6 months of the pilot ending. Measurement of Suggestions must keep to that.

- **With what the form already covers:** compare, by code, lessons finished, active time and section-check scores between devices with Suggestions on and off (the Settings switch, set by the educator per tablet). With about 20 learners this is descriptive, not proof: "learners with Suggestions finished X lessons, versus Y", never "Suggestions raised scores".
- **Not collected unless the form changes first:** which suggestions were shown, taken or turned down, and per-question answers. The form doesn't name them. Change the form, get new consent, then collect.
- **Without learner data:** add one question to the educator's weekly log ("Did any suggestion help or get in the way? What happened?"). That is staff feedback, not learner data.

## 7. Risks and how they're handled

| Risk | Handling |
|---|---|
| A wrong suggestion labels a learner | No labels are shown. Suggestions need 4+ observations, use only the last 8, are offers, and can point back up (3.1). |
| Discouragement | Positive suggestions too. One card at a time; "No thanks" holds for 3 lessons. No counts of wrong answers, no "behind", no red. |
| Shared devices | Per learner only; nothing saved for guests. Class hints closed by default. The 8-observation window limits damage when someone uses another's tile. |
| Read-aloud or teacher help changes answers | Fine: suggestions describe what works with the help the learner has, not ability. |
| Translation | Every string in `id.json`, reviewed by a native speaker. In Indonesian lessons "Simpler" is Simpler Indonesian, so copy says "Simpler reading". |
| Content changes | Answers to removed questions are ignored, as work files do for removed lessons. |
| Untested thresholds | All in one file (`src/suggestions/rules.ts`), with tests; set from pilot data before release. |
| Over-claiming | Section 9; nothing public mentions Suggestions until released. |

## 8. Build plan

Small PRs, each green on CI, with en.json, en.notes.json and id.json updated, and `CLAUDE.md` and `docs/PRODUCT.md` when a decision lands.

1. **Skill tags on quick checks.** Content and schema (`skill` on choice checks), `check_lesson.py` rule. Tests: schema test, content check, every lesson has both tags.
2. **The model, no UI.** `src/suggestions/`: observations from progress and quiz attempts, estimates, bands, rules, reasons; `readLevel` saved when Read is done. Tests: unit tests for every worked example in this spec, the window, the thresholds' edges, and that nothing is stored.
3. **Reading-level suggestion.** Card at the start of Read, `Learner.suggestions`, merge rule (no file version change yet: an optional field), Settings switch. Tests: component tests, e2e at 390/820/1280, axe and focus, `e2e/languages.spec.ts`, page tour stop, keyboard.
4. **Worth another look.** Learner home and section-check results. Tests: as above, plus the "no counts of wrong answers" copy check.
5. **Teacher hints.** Class page disclosure, closed by default. Tests: `classSummary.test.ts` hints, no sorting by hint, print only when open.
6. **Starting check.** Content file and checker, page in the lessons chunk, Listen, `DB_VERSION` 3, `startingChecks`, `removeLearner`, `WORK_FILE_VERSION` 2 with v1 still loading. Tests: migration test, transfer and merge tests, guest test, precache budget in `build-output.spec.ts`, offline spec.
7. **Detour on the complete screen** (3.4), only if the pilot supports it.

**Decide after the pilot:**
- Thresholds: what first-time quick-check accuracy looks like at Standard and Simpler in the pilot, and whether switching to Simpler helped those who did.
- Which 8 pre-check items to keep: the ones that best predicted quick-check results in the first lessons.
- Whether the starting check is worth 8 minutes of a session, or the quick checks alone are enough.
- Skills: keep the four quiz skills, or move to the measurement plan's seven tags.
- Whether HELP's staff want teacher hints, and whether hiding them by default is right.
- Whether Suggestions are on or off by default on a new device.
- Whether 3.4 is needed at all.
- Whether the consent form should cover suggestion events before a second pilot.

## 9. How to describe it in grant applications

Until it is released, say it as a plan:

> After our first pilot with HELP for Refugees in Jakarta, we plan to add on-device suggestions to Thinkerwell: a short optional starting check, a suggested reading level, and "worth another look" suggestions tied to skills, with short hints for teachers. They will use simple, explainable rules that run entirely on the learner's device, offline, with no accounts and no learner data leaving the device. Suggestions never lock or hide anything; learners and teachers can always ignore them. We will set the rules using what the pilot shows, and tell partners what changed.

Don't call it "AI-powered" without saying it is a small rule-based model, don't call it built before it is, and keep saying Thinkerwell is a student-led project, not a registered charity.
