# Thai: offered while it is reviewed

Thai (ภาษาไทย) is **fully translated by AI and not yet reviewed by a native speaker**: the interface, Our World (24 lessons, the four section checks, the course text and the 24 lesson pictures), Digital World (17 lessons), Southeast Asia Through Time (12 lessons, its four section checks and 12 diagrams) and Art, Architecture and Society (20 lessons). **It is offered to everyone** (20 November 2026, Nick's instruction): `ready: true` in `src/i18n/locales.ts`, so the language switch, Settings and the new-learner form list it, and its words, lessons and font are in the offline copy. Like Indonesian, Malay and Vietnamese, it is an exception to the no-machine-translation rule (`docs/TRANSLATING.md`) while native-speaker review is in progress. Setting `ready: false` hides it again and nothing else needs to change.

To look at it on a development machine: `npm run dev`, then add `?locale=th` to any address.

## Where things live

| What | Thai |
|---|---|
| Interface | `src/i18n/messages/th.json` (plural messages have one form, `other`) |
| Our World: course, lessons, section checks, pictures | `content/th/course.json`, `lessons/`, `quizzes/`, `visuals/` |
| The other courses | `content/courses/<course id>/th/` (course.json, lessons/, and quizzes/ and visuals/ for Southeast Asia Through Time), laid over the English by `translatedContents` in each `src/courses/<id>/content.ts` |
| Terms decided first | `KEY_TERMS.md` (about 400 terms; the ones marked "check" first) |
| The brief the translators and reviewers worked from | `BRIEF.md` |
| Per-string notes: the English each string was translated from (`source`), the back-translation (`back`), flags | `notes/*.json` (Our World; the interface is `notes/ui.json`), `notes/courses/<course id>/*.json` |
| Letters the site fonts lack | Sarabun's Thai letters, added to the site's two families with `unicode-range`, loaded only while Thai is shown: `src/i18n/fonts/thai.css`, `docs/notes/languages.md`, "Thai" |
| Recordings (Listen) | MakHam (Kokoro-82M retrained for Thai), female voice: `docs/notes/recorded-audio.md`, "Thai" |

## How it was made (20 November 2026)

1. The terms that repeat across the courses were chosen first (`KEY_TERMS.md`), with the house style the checker enforces: the learner is คุณ (and ฉัน when the learner speaks), never กรุณา, โปรด or ท่าน, no ครับ/ค่ะ in learner text, no exclamation marks, no full stops at the end of Thai sentences, quick-check feedback starting ถูกต้อง or ยังไม่ถูก.
2. Seventeen AI translators worked in parallel from the brief (the interface in two parts; each course in slices of five or six lessons; the section checks and course texts on their own), checking every file with `scripts/check_translation.py` (0 errors) and flagging what they were unsure of (about 750 strings).
3. A second AI pass read the Thai alone, wrote an English back-translation of every string (`back` in the notes) before comparing it with the English, corrected meaning shifts and unified terms across files.
4. A native speaker's review comes next and replaces both passes: the flags are where to start.

## Checking it

```sh
sh scripts/py.sh scripts/check_translation.py th                       # Our World
sh scripts/py.sh scripts/check_translation.py --course digital-world th  # each other course
npm run check:i18n                                                     # the interface
```

`npm run check:content` runs them all. Thai has no spaces between words, so the checker counts words with PyThaiNLP (`scripts/setup-python.sh` installs it) and treats a space between Thai letters as the end of a sentence; a glossary word only has to be inside the text (`has_form`), and the app marks it the same way (`src/lesson/glossary.ts`). Listen splits Thai at those spaces too (`src/speech/sentences.ts`).

## Decisions a native speaker should make first

- **Names.** Real places use their usual Thai names. Real people are written in Thai script in some lessons and kept in Latin letters in others; the reviewers unified this within each course, not yet across courses.
- **Centuries.** "The 1400s" is written with the years (ช่วงปี 1400 …) so the checker can compare numbers; Thai history books would say คริสต์ศตวรรษที่ 15.
- **Faith wording** in Our World Lesson 4 and Art, Architecture and Society Lessons 3, 11, 17 and 19, ideally checked by a reader from each faith.
- **Thai history and monarchy** wording in Southeast Asia Through Time and Art, Architecture and Society Lesson 11.
- The interface terms marked "check" in `KEY_TERMS.md` (ลองดูก่อน for "Just look around", คิดทบทวน for Reflect, หน่วย for a section).
