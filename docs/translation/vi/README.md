# Vietnamese: a hidden preview, not yet offered

Vietnamese (Tiếng Việt) is **fully translated by AI and not yet reviewed by anyone**: the interface, the 24 lessons, the four section checks, the course text and the 24 lesson pictures. It is **not offered to anyone**: its entry in `src/i18n/locales.ts` has `ready: false` (and `content: true`), so the language switch, Settings, the new-learner form and the offline precache do not include it, and nothing of it reaches a first visit or the service worker's cache (`e2e/build-output.spec.ts`: "no Vietnamese preview content is precached or reaches a first visit"). This is not an exception to the no-machine-translation rule, as Indonesian is: it stays hidden until a native Vietnamese speaker has reviewed it and a partner needs it.

To look at it on a development machine: `npm run dev`, then add `?locale=vi` to any address.

## Why it exists now

A possible pilot partner in Vietnam, and Malaysian and other partners later, make more languages likely. Doing the first full draft early means a native reviewer starts from a complete, consistent, checked draft instead of nothing, and the app is shown to cope with another language that needs extra letters (Vietnamese diacritics) before a partner depends on it.

## Where things live

Same layout as Indonesian (`docs/translation/README.md`):

| What | Vietnamese |
|---|---|
| Interface | `src/i18n/messages/vi.json` (plural messages have one form, `other`) |
| Course, lessons, section checks, pictures | `content/vi/course.json`, `lessons/`, `quizzes/`, `visuals/` |
| Terms to decide first | `docs/translation/vi/KEY_TERMS.md` |
| The brief the AI translators and reviewers worked from | `docs/translation/vi/BRIEF.md` |
| Per-string notes: back-translation, flags, reviewer changes, the English each string was translated from | `docs/translation/vi/notes/*.json` |
| Review spreadsheet | `npm run review:export -- vi` writes `docs/translation/vi/review/thinkerwell-vi-review.xlsx` |
| Letters the site fonts lack | Be Vietnam Pro, loaded only while Vietnamese is shown: `docs/notes/languages.md`, "Vietnamese fonts" |
| Recordings (Listen) | none yet: `docs/notes/vietnamese-preview.md` |

## How it was made (October 2026)

1. The terms that repeat across the course were chosen first (`KEY_TERMS.md`).
2. AI translators worked from the written brief, in slices (interface in six slices, lessons in groups of three), and flagged what they were unsure of (about 1,000 strings in all).
3. AI reviewers wrote an English back-translation of every string from the Vietnamese alone **before** reading the English, compared the two, fixed clear mistakes and flagged doubts. They found and fixed about 20 meaning errors (for example "grain" translated as "rice", the compass letter N meaning south in Vietnamese, a blue river that read as green, and "upload" where nothing is uploaded). Each string's back-translation is in its note as `back`; their changes and questions are in `note`, starting "Review:".
4. `scripts/check_translation.py vi` (house style, numbers and names kept, simpler text clearly simpler, key words in both texts, quick checks still clearly right, strings whose English changed since) reports 0 errors; `npm run check:i18n` passes.

None of this replaces a native speaker.

## What a native reviewer should do

1. Decide the words in `KEY_TERMS.md` first (a change there is applied across the course at once).
2. Review the flagged strings (`npm run review:export -- vi` puts them in a spreadsheet, flagged rows first). The lessons with the most flags are 4 (faiths), 19, 20, 21 (belonging, resources, trade) and 23, 24 (judging sources, young people in their communities).
3. Have a person from each faith that Lesson 4 names read it.
4. Check the interface on real phones set to Vietnamese: the browser menu names in the setup guide and Settings (Safari, Chrome, Edge, Android, Windows), the long labels in the header and tabs at 390px ("Dành cho nhà giáo dục", "Nhật ký của mình"), and the date format ("Thêm ngày {date}" must not read "ngày ngày").

## What has to happen before Vietnamese is offered

- A native reviewer's changes applied; a decision on the open points in `KEY_TERMS.md`.
- Recordings for Listen (or the decision to use device voices only): `docs/notes/vietnamese-preview.md`.
- Settings' "Listen voice" and "Lesson audio" lists have no Vietnamese entry yet (only English and Indonesian); a developer decision.
- Public strings that name only English and Indonesian as the lesson languages (Credits' translation text, the About and For organisations text, the information sheet) made accurate for Vietnamese, and Credits' entries added for Be Vietnam Pro and for whatever recordings are used (see `docs/notes/vietnamese-preview.md`: the font line did not fit the first-visit budget, so it waits).
- `ready` set to `true` in `src/i18n/locales.ts` (this adds it to the switch and the precache; check the size budgets in `e2e/build-output.spec.ts` and `docs/notes/slow-internet.md`).
