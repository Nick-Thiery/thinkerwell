# Teacher tools

Branch `teacher-tools`. Built on 28 September 2026.

## What was built

- **A teacher guide for every lesson** at `/educators/lesson/:id` (`src/pages/educators/TeacherGuidePage.tsx`). It has:
  - the section, essential question, learning goal and time;
  - "Before you teach": the notes on sensitive topics in a marked box first, then the other teaching notes;
  - a session plan for about 45 minutes, with a 30-minute column and a note on shortening it;
  - the key words;
  - the evidence and the picture;
  - the quick check, with each correct answer marked and why;
  - the writing task, its self-check and the example answer;
  - the speaking tasks;
  - discussion prompts (the warm-up, the think question and the reflect prompts);
  - the video (title, channel, length, a YouTube link and its content note);
  - the sources.
- **An answer key for every section check** at `/educators/section/:id/answers` (`AnswerKeyPage.tsx`). Every question has its skill, its made-up example, the options in the file's order with the correct one marked, the feedback for each option, and the lesson it comes from, linked to that lesson's guide. A line at the top says the check is for practice and never blocks learners.
- **The Educators page** links both. Each lesson row has "Teacher guide" under it, and each section's list ends with its check and "Answer key". The chosen section is kept in the address (`?section=geography`), so "Back to the educators page" returns to the same list.
- **Screen and paper are the same page.** Both pages use the print views' sheet (`src/pages/print/print.css`) plus `src/pages/educators/teacherTools.css`. Printed, they are black on white, with no header, menus or buttons, and a link's address is printed after it. On A4, a guide takes 5 to 7 pages and an answer key 5 or 6.
- **Checks.** The page tour (`e2e/pageTour.ts`) stops at a guide and an answer key, so the sideways-scroll, axe and focus-ring, right-to-left, tap-size and privacy specs cover them. The 360px pass opens all 24 guides and all 4 answer keys. The offline spec opens both offline, and the print spec prints both on A4. Vitest renders every guide and every answer key and checks that their content comes from the files, with the right answers marked (`TeacherGuidePage.test.tsx`, `AnswerKeyPage.test.tsx`).

## Decisions

1. **A new content field, `sensitiveNotes`.** "Sensitive topics first and clearly marked" needs to know which notes are about sensitive topics. Only the content can say that, so each lesson now has `sensitiveNotes` next to `educatorNotes`. The schema, `scripts/check_lesson.py` (either list may be empty, but not both) and `docs/content/SPEC.md` follow.
   - 36 of the 82 notes moved: things that may be hard or personal for learners (floods, hunger, slavery, religion, moving, home and family, money, legal status), what never to ask, and which video to preview because of what it shows.
   - No note's text changed. The sorting is a judgement: **Justin should check it.**
2. **The notes come first in the guide**, before the session plan, so a teacher reads them before planning. A video's content note stays with the video; the sensitive box points to it.
3. **The session plan is the same for every lesson** (`sessionPlan.ts`): warm-up 3, read 12, quick check 5, write 10, speak 5, watch or read 7, reflect 3. For 30 minutes, Watch is skipped (nothing is locked, so learners can open it later) and the others are shortened. A test checks the totals.
4. **Correct answers are marked in words and with a tick** ("Correct answer"), with a heavier border and bold text. Colour is only extra, so the mark survives a black-and-white printer and colour blindness. Options appear in the file's order; the pages say that learners see them shuffled.
5. **The guide replaces the Educators page's "Show teaching notes and sources" disclosure.** The guide holds everything the disclosure did, so the list stays as short as before.
6. **The video link goes to youtube.com.** It is a plain link that opens in a new tab and loads nothing until a teacher taps it; nothing is embedded or fetched. A youtube-nocookie.com address can't be opened on its own (the player refuses without a referrer).
7. **On a phone, the plan table's rows become small grids.** Each row shows the step and its minutes on one line, with what to do below. At 320px, four columns left "What to do" one word wide. The table keeps explicit ARIA roles, because Safari drops table semantics when `display` changes. ESLint allows those roles (`eslint.config.js`).
8. **Not lazy-loaded.** Both pages add about 4.8 kB gzipped to the first load (349 kB instead of 344 kB) and to the precache. Loading them separately would save learners that, but the router then renders nothing while an educator's first visit loads the page. The launch checklist already judged lazy-loading the rare pages not worth it.
9. **Printing.**
   - The guide's plan, the marked boxes and each answer are kept whole.
   - An answer-key question may break between its options, but its heading, example and question stay with the first option.
   - The guide prints the picture smaller (90 mm high at most) than the learners' copy, so the evidence can share its page.
   - The learners' print view now also keeps the evidence question together.

## Left for later

- **Check the sorting of `sensitiveNotes`** (the content team).
- **Try printing on HELP's own printer and paper.** The page counts above come from Chromium's A4 PDF. US Letter should work too, but it hasn't been checked.
- The guide doesn't repeat the lesson's reading text, sentence starters or the video's written version. The learners' print view, linked from the guide, has them.
- `[FEEDBACK EMAIL]` on the Educators page is still a placeholder.
