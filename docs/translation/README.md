# Bahasa Indonesia: the translation and its review

Indonesian is the one language, besides English, in which Thinkerwell is **fully** translated: the interface, and also the lessons, the section checks, the course text and the words in the lesson pictures. (Every other language translates the interface only; the lessons stay English. See `docs/notes/languages.md`.) The videos stay English, and say so.

**The Indonesian was drafted by AI and cross-checked by AI. It is intentionally offered to everyone while native speakers review it**, so the Jakarta pilot can use it now; their changes are applied as they come in (see Reviewing below). It is the one exception to the rule that machine translation never reaches learners (`CLAUDE.md`, rule 7).

## Where things live

| What | English (source) | Indonesian |
|---|---|---|
| Interface messages | `src/i18n/messages/en.json` | `src/i18n/messages/id.json` (same keys; plurals have one form) |
| Course, sections, "how I practised", fiction label | `content/course.json` | `content/id/course.json` |
| Lessons | `content/lessons/L01.json` … | `content/id/lessons/L01.json` … |
| Section checks | `content/quizzes/history.json` … | `content/id/quizzes/history.json` … |
| Lesson pictures | `content/visuals/L01.svg` … | `content/id/visuals/L01.svg` … |
| Terms to decide first | | `docs/translation/id/KEY_TERMS.md` |
| Per-string notes: back-translation, flags, the English each string was translated from | | `docs/translation/id/notes/*.json` |
| Review spreadsheet | | `docs/translation/id/review/thinkerwell-id-review.xlsx` |

A translated lesson, section check or course file holds **only the text people read**: learners, and teachers (the teachers' notes, `educatorNotes` and `sensitiveNotes`, and the sources' titles). When the app loads, it lays the translation over the English (`src/content/translation.ts`); ids, correct answers, lesson numbers, video ids, links and the notes for the team (`changes`, `visual.description`, `watch.replacementSuggestion`) always come from the English. A translation can't change which answer is right or which video plays. Only the videos' titles and channels stay English, marked `lang="en"`.

A glossary entry's `forms` list is replaced whole: list the word forms that appear in the translated reading (for example `sumber-sumber`, `membandingkan`), or leave it out.

## Checks

- **The build** (`vite.config.ts`, `checkContent`) stops if a translation has the wrong shape, leaves a learner-facing string untranslated, translates something that must stay, breaks the schemas or cross-file checks once laid over the English, or lacks a picture (`checkTranslation` in `src/content/load.ts`).
- **`npm test`**: every Indonesian lesson keeps the English ids and correct answers, marks every key word in both the standard and the simpler text of one reading part (with the app's own matcher), keeps the simpler text clearly shorter, and starts quick-check feedback with "Benar." or "Belum tepat." (which the player drops, as it drops "Yes." and "Not quite."); section checks the same; the completion messages match the complete screen's heading.
- **`npm run check:i18n`**: `id.json` has every message of `en.json` with the same placeholders.
- **`npm run check:content`** runs `scripts/check_translation.py id` after the English checks: house style in the lessons and checks ("kamu", never "Anda"; no "silakan" or "tolong"; "Aku ..." self-checks; "Kamu sudah menyelesaikan Pelajaran N."), numbers and names kept, uncommon words in the simpler text, the same short string translated two ways, the pictures, and **strings whose English changed after they were translated** (each note keeps the English it was translated from as `source`).
- **`e2e/indonesian.spec.ts`**: the one language setting (the header's switch on the first page and every other, Settings, the new-learner form), back and forth mid-lesson with no reload, two learners keeping their own languages, a reload keeping it, Listen and Say it following it, the video note; then every kind of page, its popovers and every step of all 24 lessons at 390, 820 and 1280px, failing on sideways scroll, text cut off and **any English left** (`e2e/englishText.ts`).
- **`npm run test:review`** tests the spreadsheet scripts on a copy of the content.

## How the Indonesian was made

1. The terms that repeat across the course were chosen first (`id/KEY_TERMS.md`), so every translator used the same words.
2. AI translators worked from a written brief: everyday Indonesian for 10 to 17-year-olds, "kamu" (pages for adults were later changed to "Anda"), the simpler text clearly simpler, quick checks still clearly right, names kept, Lesson 4's faiths named in the standard Indonesian way and treated with care. Each flagged what it was unsure about.
3. A second AI reviewer back-translated every string into English **before** looking at the English, then compared, fixed clear mistakes and flagged doubts.
4. Nick's session fixed the clearest meaning shifts the reviewers found (for example, Lesson 4's wording, which could read as ranking science above faith) and made repeated strings consistent.

About 590 of 4,190 strings are flagged for the native reviewers (the count grows as new pages are added; the consent form's study parts and the information sheet added about 80, all flagged, in October 2026, and Settings' "Listen voice" and the setup checklist's voice step about 30, also flagged, with their menu names to check on devices set to Indonesian; Listen's recordings 35 more, all flagged: Settings' "Lesson audio", the recorded sample, the Read step's notes, the checklist's pointer and the Credits page's voices).

One Indonesian sentence lives in code rather than in these files: the sample "Play a sample" plays in Indonesian, "Ini suara yang membacakan pelajaran." (`LISTEN_SAMPLES` in `src/speech/sampleText.ts`). It is spoken in the lessons' language whatever the interface's, like the quick-check verdicts, so it isn't in `id.json`. Reviewers: check it too.

**Listen's Indonesian recordings say the lesson text as it is** (`docs/notes/recorded-audio.md`), with numbers, letters and a few abbreviations written out in words for the voice (`tools/audio/normalise.ts`: 1.000 as "seribu", "Tahun ke-8" as "tahun kedelapan", PBB as "pe be be"). `tools/audio/manifest.json` lists each one under `speak`. When a reviewer changes a lesson's Indonesian, the recordings must be made again (`npm run audio:generate`); `npm run check:audio` fails until they are. Reviewers listening to the recordings: note any word the voice says wrongly, with the lesson and part.

## Reviewing (for Justin and the reviewers)

1. One person decides the key terms in `id/KEY_TERMS.md`. A change there is applied across the course at once (tell Nick).
2. Reviewers work in `id/review/thinkerwell-id-review.xlsx` (Excel, LibreOffice or Google Sheets). The first tab (the interface) starts with the brief; then one tab per lesson, Lessons 1, 2, 11, 12, 16 and 23 first, each ending with the words in its picture; then one tab per section check. Start with flagged rows. Lesson 4 needs someone from each faith it names.
3. Nick applies their changes:

   ```sh
   npm run review:import -- path/to/reviewed.xlsx --dry-run   # what would change
   npm run review:import -- path/to/reviewed.xlsx             # apply it
   npm run check:i18n && npm run check:content && npm test
   npm run review:export                                      # a fresh sheet for the next round
   ```

   The import changes only rows whose Indonesian was edited. If the same text also changed in the repository since the export, it reports a conflict and keeps the repository's text. It refuses an empty text or a broken `{placeholder}`, and a picture label it can't find as one piece of text (change those in the SVG by hand). Reviewers' names and notes go into `id/notes/`.

`npm run i18n:export -- id` and `npm run i18n:import -- id file.csv` (the interface-only translator kit, `docs/TRANSLATING.md`) work for Indonesian too; the spreadsheet above covers the lessons as well.
