# Southeast Asia Through Time: draft lessons

The third course, from Justin's brief of 28 October 2026 ("Thinkerwell — Course 2: Southeast Asia Through Time"). It has twelve real-source case studies in four sections of three, for learners of about 12–15. Learners tell an observation from an inference, place a source in its time, place and maker's view, and see that exchange across the region was not always equal or peaceful. They compare different paths through war and independence, and make a short, credited account that names a source's limits and a missing view. Justin wants it in the pilot alongside Our World and Digital World (`docs/PRODUCT.md`, 1 November 2026).

**Open on every device since 9 November 2026.** The lessons are at `/course/southeast-asia-through-time` (`/preview/southeast-asia-through-time` goes to the map). Nothing from this folder is in a first visit's download; it is kept for offline use as the other courses are (`docs/notes/offline-courses.md`). How the courses were built: `docs/notes/digital-world-preview.md`.

## The lessons

`course.json` is the course; `lessons/SAT01.json`…`SAT12.json` are the lessons (file name = number); `visuals/` holds each lesson's two pictures.

| # | Lesson (id) | Section | Video (English, **not yet watched**) | Real picture |
|---|---|---|---|---|
| 1 | What can a pot tell us about an early community? (`sat-01-ban-chiang-pot`) | Evidence and early connections | UNESCO/NHK, Ban Chiang (`o-GHiGlZfvY`) | Ban Chiang pot, Kiwiodysee 2013, CC BY-SA 3.0 |
| 2 | How do boat planks reveal connections across the sea? (`sat-02-butuan-boats`) | Evidence and early connections | none found | Butuan boat planks, Lee 2015, CC BY 2.0 |
| 3 | Why did Melaka become a crossroads? (`sat-03-melaka-crossroads`) | Evidence and early connections | UNESCO/NHK, Melaka and George Town (`Wr9zTtISJhw`) | Erédia's map of Melaka, 1604, CC0 |
| 4 | How can trade turn into forced control? (`sat-04-banda-nutmeg`) | Trade, power and everyday lives | left out (below) | View of Banda Neira, Vingboons workshop, 1662–63, public domain |
| 5 | Who made the rubber boom possible? (`sat-05-rubber-and-work`) | Trade, power and everyday lives | none found | Rubber tapping, *Souvenir of Singapore*, 1914, public domain |
| 6 | How can letters challenge limits on learning? (`sat-06-kartini-letters`) | Trade, power and everyday lives | Leiden University Libraries, Kartini letters (`CJAk6vrXXlE`) | Kartini's portrait from a 1922 book, public domain |
| 7 | How did war change daily life in Singapore? (`sat-07-singapore-occupation`) | War, independence and rebuilding | NLB Singapore, wartime food (`R8XTJi9NK4E`, 18 min) | Former Ford Factory, Actuall7 2025, CC BY 4.0 |
| 8 | Why did independence follow different paths? (`sat-08-independence-paths`) | War, independence and rebuilding | British Pathé, Kuala Lumpur 1957 (`9rVfUxVCveo`) | Stadium Merdeka, Renek78 2025, CC0 |
| 9 | What happens after independence? (`sat-09-timor-leste-schools`) | War, independence and rebuilding | UNICEF, Timor-Leste schools (`1uJGATqswUg`) | A school in Timor-Leste, Ponsyano 2024, CC0 |
| 10 | How did a trading port bring people together? (`sat-10-hoi-an-trading-port`) | People, memory and shared histories | UNESCO/NHK, Hội An (`N0BIcOTSD9k`) | The Japanese bridge, Hội An, Christophe95 2018, CC BY-SA 4.0 |
| 11 | Who preserves a place's story? (`sat-11-borobudur-conservation`) | People, memory and shared histories | UNESCO/NHK, Borobudur (`txujqGtB_6g`) | Borobudur's restoration, UNESCO/Gerard Bolla 1976, CC BY-SA 3.0 IGO |
| 12 | How can we tell a shared history fairly? (`sat-12-shared-history-exhibit`) | People, memory and shared histories | none (a capstone) | National Museum of Cambodia, Dtfman 2011, CC0 |

Written on 1 November 2026 by AI writers working from the brief's sections 3 and 3A, each fact checked against a source they opened (each lesson's `sources`; its `changes` says what differs from the brief and why). Every lesson passes `scripts/check_lesson.py` and the build's schema check with no errors.

## Pictures

Each lesson has two, as the brief asks:

- **`visual`**, an original Thinkerwell diagram (`SAT01.svg`…), drawn to `docs/content/VISUALS_SPEC.md` from the brief's Visual A, with every word a `<text>` element so the labels can be translated. Maps use Natural Earth coastlines (public domain) and say "modern map" and "not to scale"; speculative routes are dashed.
- **`secondVisual`**, the real item the brief names, from Wikimedia Commons (`SAT01-photo.jpg`…), shown after the last reading part. Each was checked against its file page (creator, date, licence) through the Commons API, resized to at most 1100px and saved as JPEG; each lesson's `credit` says so. Two differ from the brief: Lesson 11 uses file `…3469_0001.tiff`, the photo itself (the brief's `…_0000` is the typed back of the print), and Kartini's portrait is 330px wide (Commons' rate limit refused the full file).

Every caption is honest about dates: a 2025 photo of the Former Ford Factory is not a picture of 1942. Under each real picture the lesson asks "What can this source show? What can it not show?" and gives its credit with the licence linked, as CC BY and CC BY-SA ask.

## Section checks

`quizzes/<section>.json`, one per section, written to `docs/content/QUIZ_SPEC.md` from the brief's section 4: six questions each, two per lesson, one or two of each skill, every one answerable from the reading, the evidence or a caption. Where the brief's question repeated a lesson's own quick check, it is reworded or turned into a made-up example (labelled). On the course map after each section, with an answer key for teachers (`/educators/section/<id>/answers`). `python3 scripts/check_quiz.py content/courses/southeast-asia-through-time/quizzes/*.json` checks them (two questions per lesson for another course). For a reviewer: Section III tests the 1945-before-1949 order only in a feedback line (a direct ordering question could replace the "proclamation" vocabulary one); Lesson 8's questions say "became free" to keep the reading level, as the simpler text does.

## Videos

**English videos are in, against the brief's "no Watch without approval"** (Nick, 1 November 2026); Indonesian and Malay get none unless a video in that language is approved. None has been watched by a person, and YouTube blocked the writers from reading captions, so every summary is written from the publisher's description or a published transcript, and each `contentNote` says which. **Someone must watch every one before learners see it.** Watch out for:

- **Lesson 4 (Banda):** left out. TED-Ed's video by the historian Adam Clulow (`OxeTFB84e2k`, 4:47) fits, but by its transcript the narration describes torture, people jumping from cliffs and an official calling for the Bandanese to be "entirely exterminated". Watch it and decide; the lesson has four steps until then.
- **Lesson 6 (Kartini):** the summary comes from Leiden's news page about the letters, not the film. Rewrite it after watching, or take the video out.
- **Lesson 7:** 18 minutes; the history is about 1:48–5:48. A chapter at 5:04 on prisoners of war may show photos of starving people.
- **Lesson 8:** covers only Malaya's 1957 ceremony, not Indonesia's path.
- **Lesson 9:** UNICEF's companion story describes the burning and killing of 1999; the video may show damage.
- **Lessons 1, 3, 10, 11 (UNESCO/NHK):** © NHK; embedding UNESCO's YouTube player is fine, anything else needs NHK's permission. Lesson 1's film makes a sweeping "earliest" claim (the summary calls it a claim); Lesson 11's mentions Mount Merapi, says the British "rediscovered" Borobudur in 1814 and describes a carving of the Buddha being tempted.

Lessons 2, 4, 5 and 12 have no video (`watch: null`), so four steps: Read, Write, Speak, Reflect.

## For reviewers

- **Sensitive topics for refugee learners.** Lessons 4 (the VOC's conquest of Banda, 1621: stated once, plainly), 5 (indentured labour), 7 (the Japanese occupation of Singapore: daily life only), 8 ("armed struggle" only) and 9 (one sentence on 1999) each have sensitive notes; learners are never asked about their own or their family's experiences of war or displacement, their country, religion or ethnicity.
- **Facts to check** (a historian): the Melaka map's date (the file page credits Erédia's *Declaraçam*, usually dated about 1613; the lesson's point, a map made long after 1511, holds either way); the Butuan boats' dates (the National Museum's 2022 late 700s–early 900s against UNESCO's 2006 10th–13th centuries; the lesson follows 2022); Kartini's 1903 scholarship (confirmed from the 1911 Dutch edition, not from Indonesia's National Archives, which a reviewer should open); "Tetum" or "Tétum" (Lesson 9); whether the Balangay Shrine Museum and the Butuan Boat Site Museum are one place (Lesson 2).
- **Sources the writers couldn't open** (bot checks): Indonesia's and Malaysia's National Archives (Lesson 8 used the Indonesian State Secretariat, the Dutch National Archives, Malaysia's government history page and the Australian War Memorial instead), UNESCO's Memory of the World page for the Borobudur archive (Lesson 11 used The Jakarta Post and Antara).
- **Spelling:** "artefact" (British, as in Our World), not the brief's "artifact".

## What still needs doing

- **Review by Justin and a historian**, and a partner's review of the sensitive notes (Lessons 4, 5, 7, 8, 9).
- **Watch all eight videos** (and Lesson 4's) and keep, replace or remove each.
- **Certificates:** none yet (Our World's only).
- **Indonesian and Malay: native-speaker review.** Lessons, section checks, course text and diagrams were drafted by AI in November 2026 (`id/`, `ms/`; notes, diagram notes and `TERMS.md` in `docs/translation/<code>/notes/courses/southeast-asia-through-time/`), every string flagged. Look first at: Lesson 4 (Banda, 1621: "diperbudak"/"diperhambakan", "pemukim"/"peneroka"), Lesson 5's indenture words ("kontrak terikat", "sistem kontrak"), Lesson 9 (Timor-Leste, for Jakarta), Lesson 11's "pemuliharaan"/"pemulihan" (Malay), and the diagrams' tight labels on a phone.
- **Credits:** each real picture's credit is under it, in the print view and in the teacher guide; `/credits` doesn't list the preview courses yet, and its line that every lesson picture was made for Thinkerwell is true only of Our World.
