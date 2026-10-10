# Bahasa Melayu (Malaysian Malay): the translation and its review

Malay is the third language in which Thinkerwell is **fully** translated, after Indonesian: the interface, the 24 lessons, the four section checks, the course text, the words in the lesson pictures, and the subtitles of Thinkerwell's own videos. The lesson videos stay English, and the Watch step says so. It was added in October 2026 for a possible partner in Malaysia, and is laid out exactly like Indonesian (`docs/translation/README.md`).

**The Malay was drafted by AI and cross-checked by AI. It is intentionally offered to everyone while native speakers review it**, as Indonesian is. It is an exception to the rule that machine translation never reaches learners (`CLAUDE.md`, rule 7), decided for Indonesian and extended to Malay by the team (October 2026; Justin to confirm). Nothing in it has been read by a native speaker yet.

## Where things live

| What | English (source) | Malay |
|---|---|---|
| Interface messages | `src/i18n/messages/en.json` | `src/i18n/messages/ms.json` (same keys; plurals have one form) |
| Course, sections, "how I practised", fiction label | `content/course.json` | `content/ms/course.json` |
| Lessons | `content/lessons/L01.json` … | `content/ms/lessons/L01.json` … |
| Section checks | `content/quizzes/history.json` … | `content/ms/quizzes/history.json` … |
| Lesson pictures | `content/visuals/L01.svg` … | `content/ms/visuals/L01.svg` … |
| Subtitles of the site videos | `public/video/*.en.vtt` | `public/video/*.ms.vtt` (the English lines' timings, the written version's words) |
| Recordings (Listen) | `public/audio/en/` | `public/audio/ms/` (`docs/notes/recorded-audio.md`, "Malay") |
| Terms to decide first | | `docs/translation/ms/KEY_TERMS.md` |
| The brief the AI translators and reviewers worked from | | `docs/translation/ms/BRIEF.md` |
| Per-string notes: back-translation, flags, reviewer changes, the English each string was translated from | | `docs/translation/ms/notes/*.json` |
| Review spreadsheet | | `docs/translation/ms/review/thinkerwell-ms-review.xlsx` (`npm run review:export -- ms`, `npm run review:import -- ms <file.xlsx>`) |

## What "Malaysian" means here

Standard Malaysian Malay as Malaysian schools use it (Dewan Bahasa dan Pustaka spelling), **not Indonesian**. Many everyday words differ and an Indonesian word in the Malay is a mistake: *percuma* (not *gratis*), *wang* (not *uang*), *boleh* (not *bisa*), *muat turun* (not *unduh*), *kuiz*, *komuniti*, *maklumat*, *sijil*, *bahagian*, *lapan*, *Mac* and so on. `BRIEF.md` lists about 200 of them with the Indonesian word each replaces, and `scripts/check_translation.py` (`INDONESIAN_NOT_MALAY`) fails the check on any of the clear ones. Some words are traps because they exist in both languages with different meanings: *pelan* (a plan in Indonesian), *selalu* ("often" in Malaysia), *setengah* ("some", not "half": use *separuh*), *sulit* (secret in Malay, difficult in Indonesian: use *sukar*), *aman* (peaceful: use *selamat* for safe), *harus* ("may": use *mesti* or *perlu*), *orang tua* (old people: use *ibu bapa*).

Register: learners are **kamu**, and **saya** when the learner speaks (self-checks start "Saya ..."); adults (teachers, families, partner organisations) are **anda**, in lower case in the middle of a sentence as Malaysians write it, or the pronoun is left out. No *sila* or *tolong* (the English never says "please"), no exclamation marks. Quick-check and section-check feedback starts "Betul." or "Belum tepat."; the completion message starts "Kamu telah menamatkan Pelajaran N."; the fiction label is "Contoh rekaan yang dibuat untuk pelajaran ini."

## Checks

The same as Indonesian (`docs/translation/README.md`, "Checks"): the build, `npm test` (every Malay lesson keeps the English ids and correct answers and marks every key word in both texts), `npm run check:i18n`, `npm run check:content` (`scripts/check_translation.py ms`: house style, numbers and names kept, the Indonesian-word list, the same short string translated two ways, the pictures, and strings whose English changed since), `e2e/malay.spec.ts` (every kind of page and every step of all 24 lessons with Malay on, failing on English text) and `npm run test:review`.

## How the Malay was made (October 2026)

1. The terms that repeat across the course were chosen first (`KEY_TERMS.md`).
2. AI translators worked from the written brief, one lesson at a time, the interface in ten slices, each section check and the course text on its own, and flagged what they were unsure of.
3. A separate AI pass **back-translated every Malay string into English from the Malay alone, before anyone saw the English**, and a third pass compared the English, the Malay and the back-translation, fixed the clear meaning shifts and wrote the flags. Each string's back-translation is in its note as `back`; changes and questions are in `note`.
4. `scripts/check_translation.py ms` reports 0 errors (and a handful of warnings that are about the English too, such as a correct option that is the longest in a section check); `npm run check:i18n` passes with all 1,260 messages.
5. The words in each of the 24 pictures were fitted by an AI that rendered the picture and looked at it until nothing ran out of its box. A person should still look at them on a phone.
6. The three videos' subtitles were made from the English lines' timings and the Malay written version, so the subtitles and the page agree.

About 520 of 4,354 strings are flagged for the native reviewers. None of this replaces a native speaker.

## What a native reviewer should do

1. Decide the words in `KEY_TERMS.md` first (a change there is applied across the course at once; tell Nick). The open ones: *bahagian* (section) against *unit*, *sumber primer* (primary source), *kos lepas* (opportunity cost), *rasa kekitaan* (belonging), *mengkhusus* (specialise), *khabar angin* (rumour), *kutu* (a savings group), *belia* against *remaja* for "youth".
2. Review the flagged strings (`npm run review:export -- ms` puts them in a spreadsheet, flagged rows first). Lessons 1, 2, 11, 12, 16 and 23 are the pilot lessons; 4 (faiths), 6, 9 and 17 have the most flags.
3. Have a person from each faith Lesson 4 names read it, ideally a Malaysian: the Malay names for faiths and for God (*Tuhan*) matter more here than in Indonesian, because of the way some of the words are used in Malaysia.
4. Check the Listen voice: it is read by a free, non-commercial model (`facebook/mms-tts-zlm`). Does it sound like Malaysian Malay, and are any words, names or numbers badly read? Tell Nick the sections and the words.
5. Check the interface on real phones set to Malay: the browser menu names in the setup guide and Settings ("Tetapan" on Android, iPhone and Windows, "Aksesibiliti", "Kandungan Lisan", "Suara"), the long labels in the header and tabs at 390px, and the date format.

## Before it is called reviewed

A native reviewer's changes applied (`npm run review:import -- ms <file.xlsx>`), a decision on the open points in `KEY_TERMS.md`, and recordings made again for any lesson text that changes (`npm run audio:generate`; `npm run check:audio` fails until they match).
