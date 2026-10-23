# The before-and-after check

The consent form promises (`pages.pilotStudy`) that in the first and last sessions of a pilot, each learner whose family said yes:

- answers 16 short questions (about 15 minutes),
- writes a few sentences about a made-up town, on paper (about 8 minutes),
- picks a face for each of 5 sentences, such as "I can use a map to find information" (about 1 minute).

This is the core measure of `docs/research/MEASUREMENT_PLAN.md`: it is what turns a pilot into "learners improved by X", where the in-app usage data (`docs/notes/pilot-measurement.md`) can only say how much they used it. It was built in October 2026, three days before the first pilot.

## On paper, on purpose

The check is printed, not taken in the app:

- It works with no internet and no working tablet, on the day that matters most.
- It needs nothing new from pilot measurement: no new event type, nothing the consent form doesn't already cover. The answers never pass through the site.
- Learners circle a letter; the team types the letters into a spreadsheet afterwards, by code.

An in-app version (the plan's `mode: "assessment"`) can come later, if the paper version proves the questions.

## Where it is

- **`/educators/learning-check`** (`src/pages/educators/pilotCheck/`; `/educators/pilot-check` until October 2026, which still opens it), in the Educators page's folded "Optional learning study". The page calls it the **learning check** and says the sheets alone don't prove what learners learned. Two printouts, chosen above the sheets:
  - **Sheets for learners**: the code, "First session" or "Last session" and the date at the top of each page, never a name; Part 1, the 16 questions (a letter in a circle to ring, A, B or C); Part 2, the writing task with lines; Part 3, the five statements with four drawn faces ("Not yet", "A little", "Mostly", "Yes"). Each part starts a new page.
  - **Answer key for the team**: each question's right letter and option, its lesson and whether the pilot teaches it, and the writing rubric.
- **The questions** are content: `content/pilot-check/en.json` (the source: each question's lesson, whether it is taught, its area, which option is right), with the Indonesian and Malay words in `id.json` and `ms.json`, in the same order (`pilotCheckContent.test.ts` checks they match). The page shows the language on screen when it has its own words, else English, marked `lang="en"`. Each language is a chunk of its own that loads with the page; all three are in the offline copy, so a centre can print without the internet.
- **The page's words** are the lazily loaded `pilotCheck` group (`src/i18n/lazyGroups.ts`), in English, Indonesian and Malay.
- **The scoring spreadsheet**: `docs/pilot/pilot-check-scoring.xlsx`, made by `python3 scripts/pilot_check_sheet.py` from `en.json` (run it again whenever the questions change). Sheets: How to use, Key, Answers (one row per learner per session; yellow cells are for typing; letters, writing marks and faces are checked as they are typed), Results (type each code once; it works out before, after, the change, the normalised gain, taught and untaught scores, writing and confidence, and a summary of learners with both sessions). It is for the team only, by code, and is deleted with the paper sheets within 6 months of the pilot ending.

## The questions

16 multiple-choice questions, 3 options each, one right, written to `docs/content/QUIZ_SPEC.md`'s rules (plain words, no tricks, no negatives, made-up examples labelled as made up) and spread across A, B and C:

- **12 taught**: 2 from each of the pilot's lessons, **1, 2, 11, 12, 16 and 23**: sources and claims, observation and inference, a map's key and what a map leaves out, why a city grows and what growth strains, languages as a strength and pictures that make a notice accessible, checking a message and an old photo's context.
- **4 untaught**, of similar difficulty, from lessons the pilot doesn't teach (3, 13, 21 and 22: scale, weather and climate, barter, trade-offs). If scores rise on the taught questions but not on these, the lessons are the likely reason, not taking the check twice.
- Never Lessons 4 or 19 (sensitive). Nothing asks about a learner's own life.
- They test the lessons' ideas with new examples, not the lessons' own quick checks, so a learner who did the lessons has learned something they can use, not memorised an answer.

**If the partner chooses other lessons, the taught questions must change with them** (and `PILOT_LESSONS` in `pilotCheckContent.test.ts`, the key, and the spreadsheet: run the script).

The writing task gives two clues about a made-up town (a new bridge last year; a shop's notebook says many more customers came from across the river this year) and asks what happened, using one clue. The rubric gives 0 to 2 points each for the claim, the evidence and the reasoning (or naming a limit), out of 6. Two team members mark every script without seeing the code or the session, as the plan asks; the spreadsheet flags marks 2 or more apart. Answers in any language count.

## Running it

The top of the page says it to the staff, in their language:

1. The same sheets in the first session (before the first lesson) and the last.
2. The learner writes their pilot code at the top of each part, never their name; staff staple each learner's pages together.
3. About 25 minutes, with no time limit.
4. Questions may be read aloud (it measures social studies, not reading). Staff don't explain words in the questions, help with answers, mark the sheets or say a score: no feedback, so the check doesn't teach.
5. Staff collect every sheet; the team marks them. The answer key is printed only for the team.

## Who checked it, and what's still open

- The questions, the writing task and the Indonesian and Malay were written by an AI (Claude) from the lessons. **Justin (content) reads them before they are printed**, and a native speaker should read the Indonesian before the first session if one can.
- The lessons the pilot teaches (1, 2, 11, 12, 16, 23) were suggested to HELP; confirm them.
- No statistics beyond the spreadsheet's means yet: the plan's paired test and confidence intervals are for the pilot report, with so few learners that the numbers are an early signal, not proof.
