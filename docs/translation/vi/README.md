# Vietnamese: a hidden preview, not yet offered

Vietnamese (Tiếng Việt) is **fully translated by AI and not yet reviewed by anyone**: the interface, Our World (24 lessons, the four section checks, the course text and the 24 lesson pictures) and, since 11 November 2026, the three other courses: Digital World (17 lessons), Southeast Asia Through Time (12 lessons, its four section checks and 12 diagrams) and Art, Architecture and Society (20 lessons). It is **not offered to anyone**: its entry in `src/i18n/locales.ts` has `ready: false` (and `content: true`), so the language switch, Settings, the new-learner form and the offline precache do not include it, and nothing of it reaches a first visit or the service worker's cache (`e2e/build-output.spec.ts`: "no Vietnamese preview content is precached or reaches a first visit"). This is not an exception to the no-machine-translation rule, as Indonesian is: it stays hidden until a native Vietnamese speaker has reviewed it and a partner needs it.

To look at it on a development machine: `npm run dev`, then add `?locale=vi` to any address.

## Why it exists now

A possible pilot partner in Vietnam, and Malaysian and other partners later, make more languages likely. Doing the first full draft early means a native reviewer starts from a complete, consistent, checked draft instead of nothing, and the app is shown to cope with another language that needs extra letters (Vietnamese diacritics) before a partner depends on it.

## Where things live

Same layout as Indonesian (`docs/translation/README.md`):

| What | Vietnamese |
|---|---|
| Interface | `src/i18n/messages/vi.json` (plural messages have one form, `other`) |
| Our World: course, lessons, section checks, pictures | `content/vi/course.json`, `lessons/`, `quizzes/`, `visuals/` |
| The other courses | `content/courses/<course id>/vi/` (course.json, lessons/, quizzes/ and visuals/ where the course has them), laid over the English by `translatedContents` in each `src/courses/<id>/content.ts`; their terms in `docs/translation/vi/notes/courses/<course id>/TERMS.md` |
| Terms to decide first | `docs/translation/vi/KEY_TERMS.md` |
| The brief the AI translators and reviewers worked from | `docs/translation/vi/BRIEF.md` |
| Per-string notes: back-translation, flags, reviewer changes, the English each string was translated from | `docs/translation/vi/notes/*.json` (Our World and the interface: `ui.json`), `notes/courses/<course id>/*.json` (the other courses: `source` and `flag` only, no back-translations yet) |
| Review spreadsheet | `npm run review:export -- vi` writes `docs/translation/vi/review/thinkerwell-vi-review.xlsx` |
| Letters the site fonts lack | Be Vietnam Pro, loaded only while Vietnamese is shown: `docs/notes/languages.md`, "Vietnamese fonts" |
| Recordings (Listen) | none on `main` by design; the voice and how to record every course: `docs/notes/vietnamese-preview.md`, `docs/notes/recorded-audio.md` |

## How it was made (October 2026)

1. The terms that repeat across the course were chosen first (`KEY_TERMS.md`).
2. AI translators worked from the written brief, in slices (interface in six slices, lessons in groups of three), and flagged what they were unsure of (about 1,000 strings in all).
3. AI reviewers wrote an English back-translation of every string from the Vietnamese alone **before** reading the English, compared the two, fixed clear mistakes and flagged doubts. They found and fixed about 20 meaning errors (for example "grain" translated as "rice", the compass letter N meaning south in Vietnamese, a blue river that read as green, and "upload" where nothing is uploaded). Each string's back-translation is in its note as `back`; their changes and questions are in `note`, starting "Review:".
4. `scripts/check_translation.py vi` (house style, numbers and names kept, simpler text clearly simpler, key words in both texts, quick checks still clearly right, strings whose English changed since) reports 0 errors; `npm run check:i18n` passes.

None of this replaces a native speaker.

## The other three courses and the rest of the interface (11 November 2026)

- The three preview courses were translated in one pass by Claude in a single session, one lesson at a time, each checked with `sh scripts/py.sh scripts/check_translation.py --course <id> vi` (0 errors; the simpler text kept to 20 words a sentence; every glossary word in both texts; every number kept). **No AI back-translation or second AI reviewer has read them** (Our World's had both), so they are a weaker draft than Our World's: the native reviewer should expect to change more. Two harmless consistency warnings remain on purpose, where one English word has two senses ("commission": đặt làm for the verb in Art 11, đơn đặt hàng for the noun in Art 15; "monument": công trình đồ sộ for Angkor Wat in Art 8, tượng đài for Rodin's in Art 14).
- The interface file had fallen behind the English while Vietnamese waited: 322 strings were missing (the educator pages, the session guide, the contact form, the learning check, the session record, Settings' courses for offline use, the reviewers' page) and about 60 had gone stale. All are translated and `source` in `notes/ui.json` is current (`flag: true` on every string touched). "Pilot" wording was updated to the optional learning study where the English changed (Settings' "Share optional study data" is "Chia sẻ dữ liệu học tập tùy chọn").
- Terms new in this round are listed per course in `notes/courses/<course id>/TERMS.md`, made from each lesson's glossary words; every row is open for the reviewer. Where the English says "Indonesian and Malay" as the lesson languages, the Vietnamese says the same: it is true today.
- Reading the three courses' Vietnamese on a device: `npm run dev`, then open the course with `?locale=vi`. A **production build leaves these files out** (`hiddenCourseLanguages()` in `vite.config.ts`): a hidden language adds nothing to a course's download or to Settings' "Courses for offline use".

## What a native reviewer should do

1. Decide the words in `KEY_TERMS.md` first (a change there is applied across the course at once).
2. Review the flagged strings (`npm run review:export -- vi` puts them in a spreadsheet, flagged rows first). The lessons with the most flags are 4 (faiths), 19, 20, 21 (belonging, resources, trade) and 23, 24 (judging sources, young people in their communities).
3. Have a person from each faith that Lesson 4 names read it.
4. Check the interface on real phones set to Vietnamese: the browser menu names in the setup guide and Settings (Safari, Chrome, Edge, Android, Windows), the long labels in the header and tabs at 390px ("Dành cho nhà giáo dục", "Nhật ký của mình"), and the date format ("Thêm ngày {date}" must not read "ngày ngày").

## What has to happen before Vietnamese is offered

- A native reviewer's changes applied; a decision on the open points in `KEY_TERMS.md`.
- Recordings for Listen (or the decision to use device voices only): `docs/notes/vietnamese-preview.md`. All four courses can now be recorded: about 5 hours on two CPU cores in all.
- Settings' "Listen voice" and "Lesson audio" lists have no Vietnamese entry yet (only English and Indonesian); a developer decision.
- Public strings that name only English and Indonesian as the lesson languages (Credits' translation text, the About and For organisations text, the information sheet) made accurate for Vietnamese, and Credits' entries added for Be Vietnam Pro and for whatever recordings are used (see `docs/notes/vietnamese-preview.md`: the font line did not fit the first-visit budget, so it waits).
- `ready` set to `true` in `src/i18n/locales.ts` (this adds it to the switch and the precache; check the size budgets in `e2e/build-output.spec.ts` and `docs/notes/slow-internet.md`).
