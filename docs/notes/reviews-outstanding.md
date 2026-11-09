# Reviews: done and still to do (9 November 2026)

One place that says which reviews have happened and which have not, for the four courses. It is a list of what the repository records. A review is "done" here only if a person did it and it is written down; checks run by the build, the checkers or an AI are listed apart, because they are a first filter and not a review. Update this note when a review finishes.

## Done

| What | Who / how | Where it is recorded |
| --- | --- | --- |
| Lesson, section-check and translation checkers (`npm run check:content`, `check:i18n`, `check:audio`) | automated, on every push | CI |
| Indonesian and Malay drafts of every course's interface, lessons, section checks and course text, each back-translated by a second AI | AI | `docs/translation/<code>/notes/` (every string flagged for a native speaker) |
| Image audit of Art, Architecture and Society (credits, licences, relevance) | the team with AI | `content/courses/art-architecture-society/README.md` |
| Recordings for Listen in English, Indonesian and Malay: every reading section of every lesson of all four courses | generated, checked against the lesson text | `npm run check:audio` (see `docs/notes/recorded-audio.md`) |

No review by an outside person (art historian, partner organisation, native speaker, AI-accuracy reviewer) is recorded yet.

## Outstanding

**Art, Architecture and Society**
- An art historian checks the facts and qualifications: attributions marked "probably" or "attributed to", the dates of works against casts and photographs, and the Mughal, Ifugao, Diponegoro and Mexico lessons.
- A partner organisation checks the sensitive lessons: religious practice (7, 8, 11, 16, 20), colonial conquest (9, 15), death and remembrance (19).
- No video has been watched, and the course has none.

**Indonesian and Malay (all four courses)**
- A native speaker of Indonesian and one of Malay (Malaysian Malay) review the interface, lessons, section checks and course text: every string is flagged. Review spreadsheets: `npm run review:export` (`-- ms` for Malay).
- First in Indonesian: Lesson 15 (Diponegoro) and Lesson 19 (Día de Muertos) of Art, Architecture and Society.
- First in Malay: the same two lessons, and the George Town lesson (`docs/translation/ms/notes/courses/`).
- Terms chosen per course are in each course's `TERMS.md` for the reviewer to confirm.

**Digital World**
- The AI-accuracy review of its facts (its map says it is still being checked).
- Partner review of the sensitive notes (Lessons 5, 7, 12, 13, 15; Lesson 6 required).
- All 17 videos watched by a person, Lesson 12 first. Until then Read instead is the safe path (`docs/notes/local-language-videos.md` for Indonesian and Malay videos, none approved yet).
- Pictures (17 placeholders), section checks.
- Justin's review of level, tone, outline and activities.

**Southeast Asia Through Time**
- Review of the 8 lessons' videos, which have not been watched by a person, and of the photo credits.

**Our World**
- Lessons 4 and 19 need a local educator's review before use (the session guide says so). Indonesian and Malay native-speaker review as above.
