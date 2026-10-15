# Simpler lesson pages (October 2026)

The partner organisations asked for a cleaner interface: learners with little experience of digital learning tools met a wall of controls before the task. An outside review of the live site (15 October 2026) listed what made each screen busy; this is what was changed, and what was kept on purpose. **No lesson text, video, translation, answer or saved field changed.** Only where things sit, and whether optional help starts folded away.

## The lesson's shell (`src/pages/lesson/LessonPage.tsx`)

- **One column at every width** (at most 880px, centred). The laptop's side column with five large step cards, the title, the goal and the time is gone.
- **The head**, in order: the way back to the lesson's section, whether work is saved, "Lesson N", the title, the five steps, "About this lesson".
- **Whether work is saved is said once**, in the head, as one quiet line: "Saved on this device" for a chosen learner; "Nothing is saved yet" for nobody chosen; "You're looking around: nothing is saved" for "Just look around". The steps no longer repeat it (Write's helper line, Reflect's note), and the shell's look-around banner is left out on lesson pages (`isLessonPlayerPath`). A save error still shows as a banner. The completion screen keeps the line for guests on its own.
- **"Save my work"** (beside that line, once a guest has done something; before that it is "Choose who's learning"): it holds a copy of what the guest did on this visit (`holdWorkToSave`, `src/lesson/guestMemory.ts`, in memory only), and goes to "Who's learning today?", which says "Tap your name, or I'm new here, to keep your work from Lesson N." with "Don't keep it". The learner they tap, or add ("Save and go back to Lesson N"), claims it; the lesson player saves it to them as the lesson opens (`saveGuestWork`, combined with any work they already have there by the work file's own merge rules, so nothing is lost) and they are back on the same step with their answer. Starting to look around, going back to the picker, or "Don't keep it" drops it, so the next person on a shared device never gets it. Nothing is written anywhere until a learner is chosen, and never for anyone else.
- **The steps**: from 600px the five labelled steps in one row (`StagePath`, horizontal, no sublabels); on a phone "Step 2 of 5 · Write" and "All steps", which opens the same five links. Any step can be opened in any order, as before.
- **"About this lesson"** holds the essential question, the learning goal, the time and "Print this lesson". It starts open when the lesson starts (Read, nothing done yet, from 600px) and folded everywhere else.
- **The header inside a lesson** is compact at every width: the logo, the language, the learner and a **labelled Menu** (the word shows from 480px; on a phone the icon, as on every other page). Home, Course, My journal, For educators, About and Settings are in the menu.
- Each step still ends with one Continue (or "Finish lesson") and a quieter Back.

## The steps

- **Read**: the evidence (with the picture) comes first and the warm-up about it right under it, so a learner sees the sources before choosing. Listen and Standard/Simpler sit just above the reading they work on. **Key words** moved out of that row into a disclosure under the reading. Tapping a marked word still opens its meaning.
- **Write**: the task, "Look at the evidence again", the answer box, then **"Need help writing?"** (the sentence starters and the planning boxes, both as before), the example answer (rules unchanged) and **"Check your answer"** (the self-check). The three-way Write / Sentence starters / Plan first switch and the mascot tip are gone. Help opens by itself when the learner has planned before; the self-check when anything in it is ticked.
- **Speak**: "How did you practise?" is gone. Continue now marks Speak done (`src/lesson/progressRules.ts`); a choice saved before still counts and is kept, in the work file too. Nothing else read it.
- **Watch**: "Optional" is said once, in the task ("Optional: watch a short video, or read the same ideas instead. Both count."), not in the step label, the poster's tag and the Continue helper too. The "Slow internet?" banner became one quiet line beside Watch and Read instead. "Think first" shows its question as a prompt; the box opens under **"Write my idea"** (open when there is already an idea). Save data, offline and the 20-second fallback work as before.
- **Reflect**: the required prompt is in view; the optional one is under **"Add another thought"** (open when it has an answer). A chosen learner still sees, in one quiet line, that answers go to their journal on this device.

`LessonDisclosure` (`src/pages/lesson/LessonDisclosure.tsx`) is the one way optional help is folded: a native `<details>`, so keyboard and screen readers need nothing extra, and what is inside stays mounted while closed, so nothing typed or ticked is lost.

## The other pages

- **Course**: each lesson says where the learner is in words ("Not started", "In progress · 2 of 5 steps", "Done") instead of five unlabelled dots (`LessonRow`). The Educators page's previews leave it out.
- **Home, a new learner**: the name and Start come first; the colour ("Pick your colour (optional)"), the language ("Change language", starting as the language on screen) and the class code ("Have a class code?", opened by itself when the code needs fixing) are folded under Start. Nothing about them changed.
- **For educators**: how a session works (with its video) and the lessons to preview come first, then following the group on this device, then "Starting a pilot". "Set up this device" is one entry, in "What you need" (it replaced "Settings for this device"; the checklist links to each part of Settings it needs).
- **Teacher guide**: "Print teacher guide", "Print learner lesson" and "Preview learner lesson", so no Print can be read two ways.
- **A lesson's print view** prints one reading level, chosen above the sheet ("Reading to print": Standard, Simpler or Both), starting at the chosen learner's level, else Standard. Several lessons printed together (the Digital World preview) still print both.
- **Settings**: the language, the reading level and Listen speed, and offline and Save data first; then, under "For educators setting up this device", moving work, the Listen voice, lesson audio, Say it and pilot results. Every part keeps its address (`/settings#say-it` and the others).

## Kept on purpose

Listen, Standard/Simpler, the marked key words and their meanings, the picture's "See it bigger", the evidence descriptions, Read instead and its written version, captions, Say it, Record yourself, the print view, the sources at the end of every step, and every lesson's text in English, Indonesian and Malay. Nothing new is required to continue; Reflect's first prompt is still what finishes a lesson.

## Words

New interface words are in `en.json` (`lessonPlayer.shell.stepOf`, `allSteps`, `statusSaved`, `statusNotSaved`, `statusLookAround`; `lessonPlayer.write.needHelp`, `planIntro`, `helper`, `helperSayIt`; `lessonPlayer.reflect.addAnother`; `lessonPlayer.watch.writeIdea`, `ideaLabel`, `lowDataNote`) with Indonesian, Malay and Vietnamese drafted by AI and flagged for the native reviewers in each language's `notes/ui.json`. Watch's eyebrow and task changed in English, so their translations changed too; so did the teacher guide's two buttons. The other pages and "Save my work" added their own (`ds.course.lessonRow.badge`, `pages.home.newLearner.colourSummary` and the others, `pages.home.saveWork`, `print.levelLabel`, `pages.settings.moreTitle`), flagged the same way.

## Not changed yet

The pilot-day guide and the setup checklist name nothing that moved. The "Run a session" video's pictures show the old lesson screens; its words are still true. Re-record it once these pages have settled.
