# Pilot lessons: second-pass review of the Indonesian

**What this is.** An AI second pass (Claude, October 2026), **not a native-speaker review**, of the Indonesian for the six lessons the HELP for Refugees pilot uses first: Lessons 1, 2, 11, 12, 16 and 23. For each lesson it compared `content/id/lessons/Lnn.json` with the English `content/lessons/Lnn.json`, the lesson's questions in the section checks (`content/id/quizzes/`), the words in its picture (`content/id/visuals/Lnn.svg`) and its glossary entries, against `KEY_TERMS.md` and the per-string notes in `notes/`. It lists only real problems: meaning, key terms, register for 10 to 17-year-olds learning Indonesian, sentence difficulty, quick-check options, and anything awkward for refugee learners. Points the drafters already flagged are repeated only where they still need a decision.

**How to use it.** Read each row, decide, and write your wording in that lesson's tab of `review/thinkerwell-id-review.xlsx` (Nick imports it; see `../README.md`). Picture labels are changed in the SVG by hand. A change to text that Listen reads (the reading sections) means the recordings are made again (`npm run audio:generate`).

Severity: **must fix** (wrong meaning a learner would act on), **should fix** (unclear, unnatural or inconsistent enough to slow a learner or a teacher), **consider** (a better wording; fine to leave).

**Overall.** No meaning errors in learner text; numbers, names, negations and correct answers all match the English. No Malaysian Malay words. Nothing asks learners about their journey, home country, family, religion or ethnicity, and the sensitive notes say what the English says. The picture labels match the lessons (for example "Perumahan Timur" and "Pusat Komunitas Riverstone" on the Lesson 11 map).

## What `npm run check:content` says about these lessons

- English lessons and section checks: 0 errors, 0 warnings.
- Indonesian: 0 errors, and no strings whose English changed after they were translated.
- L11: "name "Micronesian" does not appear". No action: the source label says "Mikronesia", which is right.
- L23: "exclamation mark in learner text". No action: it is Post A's "!!!", which is meant to look shouty, as in the English.
- Across lessons: "route" is "rute" (L11) and "jalur" (L08), "service" is "layanan" (L12) and "jasa" (L21). Both are on purpose (`KEY_TERMS.md`).

## Across the six lessons

| Where | Indonesian now | Issue | Suggested | Severity |
|---|---|---|---|---|
| educatorNotes: L02 .0, L11 .0, L12 .0, L16 .1 | "Kamu bisa membawa …", "pusat belajarmu", "pelajarmu" | Teachers' notes speak to the teacher as "kamu", but every other adult page, including the teacher guide these notes sit in, uses "Anda" (`KEY_TERMS.md`). The same happens in most other lessons (L03 to L20). `scripts/check_translation.py` forbids "Anda" in lesson files, so the rule needs relaxing for `educatorNotes` and `sensitiveNotes` first (tell Nick). | "Anda bisa membawa …", "pusat belajar Anda", "pelajar Anda" | should fix |
| speak: L01, L02 "dengan lantang"; L12 .independentTask, L23 .partnerTask and .independentTask "dengan suara keras" | "dengan suara keras" | "Aloud" two ways; "suara keras" can sound like shouting. | "dengan lantang" everywhere | consider |
| L01 educatorNotes.2, L23 watch.contentNote "versi tulisan"; L16 watch.contentNote "ringkasan tertulis" | "ringkasan tertulis" | The written version of a video two ways; the interface says "versi tulisan". | "versi tulisan" | consider |
| Lists in all six | "Surat, foto, gambar … dan peta" (L01, L02, L16); "judul, legenda, mata angin, dan skala" (L11, L12, L23) | Comma before "dan" in some lessons, not others. | Pick one (PUEBI puts the comma) | consider |

## Lesson 1: How can we find out about the past?

| Where | Indonesian now | Issue | Suggested | Severity |
|---|---|---|---|---|
| read.sections[0].text | "pernah melihat dunia seperti 1.000 tahun yang lalu" | Can read as "saw the world, like, 1,000 years ago". Flagged by the drafter, not yet changed. | "Tidak ada orang yang hidup sekarang yang pernah melihat seperti apa dunia 1.000 tahun yang lalu, …" | should fix |
| write.sentenceStarters[3] | "Jika digabung, sumber-sumber ini menunjukkan ..." | "Menunjukkan" (show) is firmer than "suggest", and the example answer now says "memberi petunjuk bahwa" for the same English. The lesson teaches careful claims and learners copy the starter. | "Jika digabung, sumber-sumber ini memberi petunjuk bahwa ..." | should fix |
| read.glossary[3].definition (claim) | "Pendapat yang kamu anggap benar dan kamu dukung dengan alasan." | "Pendapat" means opinion, and Lesson 23's video sets facts against opinions; "anggap" is "consider", not "say". | "Ide yang kamu katakan benar dan kamu dukung dengan alasan." | should fix |
| sources[0].label (teachers) | "(amati, renungkan, bertanya)" | Two commands, then a different form. | "(amati, renungkan, tanyakan)" | consider |

## Lesson 2: What can an object reveal about a person in the past?

| Where | Indonesian now | Issue | Suggested | Severity |
|---|---|---|---|---|
| read.sections[2].simpler | "Pakai kata hati-hati seperti mungkin dan kemungkinan besar." | "kata hati" is a fixed phrase (conscience), so a weak reader can split it wrongly; the two example words aren't marked as words. | "Pakai kata-kata yang hati-hati, seperti "mungkin" dan "kemungkinan besar"." | should fix |
| read.sections[1].simpler | "ML bisa saja nama orang lain." | ML are initials, not a name. | "ML bisa saja huruf awal nama orang lain." | consider |

Also the teachers' note in the table above (educatorNotes[0]).

## Lesson 11: How do maps help us understand a place?

| Where | Indonesian now | Issue | Suggested | Severity |
|---|---|---|---|---|
| read.glossary[3].definition (scale) | "Bagian peta yang menunjukkan berapa jarak sebenarnya dari jarak di peta." | Hard to follow (flagged in an earlier review, not yet changed). | "Bagian peta yang menunjukkan perbandingan jarak di peta dengan jarak sebenarnya." (the reading's own words) | should fix |
| write.prompt, write.selfCheck[2], speak.independentTask | "yang tidak bisa diberitahukan oleh peta", "tidak bisa diberitahukannya" | "Diberitahukan" is stiff, formal written Indonesian; hard for these learners. | prompt: "… dan tanyakan satu hal yang tidak ada di peta."; selfCheck: "Aku bertanya tentang satu hal yang tidak ada di peta."; speak: "Sebutkan satu hal yang ditunjukkan peta Riverstone dan satu hal yang tidak bisa ditunjukkannya." | should fix |
| read.checks[1].options[1].feedback and options[2].feedback | "Bagian 3 mengatakan untuk bertanya kepada orang yang mengenal tempat itu." | Word-for-word from "says to ask"; not natural Indonesian. | "Bagian 3 menyarankan kita bertanya kepada orang yang mengenal tempat itu." | should fix |
| read.sections[0].text, sources[2].label | "lempeng tanah liat" | "Lempeng" is mostly a tectonic plate; a clay tablet is usually "lempengan" or "papan". | "lempengan tanah liat" | consider |
| Interface string `mapKey` (heading over the map's legend) | "Keterangan peta" | The lesson's key word and the picture say "Legenda"; the heading uses the other word. | "Legenda peta" (in `src/i18n/messages/id.json`; `KEY_TERMS.md` "Map key") | consider |

## Lesson 12: What makes a city grow?

| Where | Indonesian now | Issue | Suggested | Severity |
|---|---|---|---|---|
| evidence.cards[0].events[1].text, read.sections[0].text, read.checks[0].options[2].feedback, picture `L12.svg` label | "gedung pendingin" | The usual term for cold storage is "gudang pendingin"; "gedung pendingin" reads as "a cooling building". Same length in the picture. | "gudang pendingin" | should fix |
| read.glossary[3].definition (service) | "seperti kesehatan, sekolah, atau bus" | "Kesehatan" is "health", not a service (English: "health care"). | "seperti klinik, sekolah, atau bus" | should fix |
| educatorNotes[1] | "jadi hindari persentase yang tepat" | "Tepat" also means "correct", so it can read as "avoid correct percentages". | "jadi hindari menyebut persentase yang persis" | should fix |
| "Pressure": read.sections[2].heading and .text, write.prompt, write.sentenceStarters[4], write.selfCheck[2], write.example, speak.partnerTask | "beban", "Namun, satu bebannya adalah..." | "Beban" (burden) is heavy and "satu bebannya" is awkward; school geography says "masalah" (the simpler English says "problems"). Decide once for all seven strings. | "masalah": "Pertumbuhan membawa manfaat dan masalah", "Namun, satu masalahnya adalah..." | consider |
| read.checks[2].question and .placeholder | "sebaiknya diperbaiki", "memperbaiki ___" | "Memperbaiki" is "repair"; the clinic isn't broken, it is too small. | "sebaiknya ditingkatkan", "meningkatkan ___" | consider |
| watch.summary | "Jauh kemudian, pabrik …" | Word-for-word from "Much later". | "Lama setelah itu, pabrik …" | consider |

Also the teachers' note in the table above (educatorNotes[0]).

## Lesson 16: How do languages connect people?

| Where | Indonesian now | Issue | Suggested | Severity |
|---|---|---|---|---|
| evidence.cards[0].cases[0].body (with evidence.question, cases[1].body, culture check questions[2]) | "“Makanan gratis untuk semua orang: Jumat, pukul 4 sore, …”" | The story is about a notice written in English that some visitors can't read, but learners see it in Indonesian and are then asked what they could understand "tanpa membaca bahasa Inggris". Flagged by the drafter; needs a team decision. | Show the English with the meaning after it: "“Free food for everyone: Friday, 4 p.m., Hillside Learning Centre.” (Artinya: Makanan gratis untuk semua orang, hari Jumat pukul 4 sore, di Pusat Belajar Hillside.)" | should fix |
| read.sections[0].simpler | "Banyak orang itu multibahasa." | "Itu" makes it read "those many people"; unclear for weak readers. | "Banyak orang di dunia multibahasa." | should fix |
| read.checks[0].options[1].feedback, read.checks[1].options[0].feedback | "Pelajaran ini bilang …" | "Bilang" is spoken slang; the other lessons write "mengatakan". | "Pelajaran ini mengatakan bahwa …" | should fix |
| culture check questions[2].options[2].text | "Hanya orang yang bisa membaca bahasa Inggris boleh datang ke sana." | Ungrammatical: "yang" missing before "boleh". | "Hanya orang yang bisa membaca bahasa Inggris yang boleh datang ke sana." | should fix |
| sensitiveNotes[0] | "menyebutkan bahasa rumah mereka" | "Bahasa rumah" is a word-for-word "home language"; not an Indonesian phrase. | "menyebutkan bahasa yang mereka pakai di rumah" | should fix |
| learningGoal, speak.independentTask, watch.why | "kenapa" | Casual; the other five lessons use "mengapa". | "mengapa" | consider |
| watch.why | "Pelajaran animasi dari TED-Ed ini …" | "Pelajaran" is the app's word for a lesson. | "Video animasi TED-Ed ini …" | consider |
| read.checks[0].options[0].text | "misalnya apa yang dibawa" | Vague ("what is carried"); the reading says "apa yang perlu dibawa". One word keeps the lengths even. | "misalnya apa yang harus dibawa" | consider |
| write.example | "seorang penolong …", "Gambar dan penolong itu bisa membantu hal itu." | "Penolong" (rescuer) is odd for someone at a door; the last sentence is awkward. | "seorang relawan …", "Gambar dan relawan itu bisa membantu mereka." | consider |
| educatorNotes[1] | "kata pinjaman (misalnya kata yang dimiliki bahasa setempat bersama bahasa Arab, Inggris atau Belanda)" | Teachers know "kata serapan"; the bracket is hard to parse. Also "Anda" (table above). | "kata serapan (misalnya kata dalam bahasa setempat yang berasal dari bahasa Arab, Inggris atau Belanda)" | consider |

## Lesson 23: What makes information trustworthy?

| Where | Indonesian now | Issue | Suggested | Severity |
|---|---|---|---|---|
| read.sections[1].simpler | "Foto itu tidak menunjukkan besok." | Word-for-word; "doesn't show tomorrow" is unclear in Indonesian. | "Foto itu tidak bisa memberi tahu apa yang terjadi besok." | should fix |
| read.sections[0].text and .simpler, read.glossary[2].example, read.checks[0].options[0].feedback | "jam yang tepat" | "Tepat" can read as "the right time" rather than "exact times". | "jam yang pasti" | consider |
| learningGoal | "Memeriksa sumber, bukti, …" | The other goals are commands (Gunakan, Bedakan, Pakai, Jelaskan). | "Periksa sumber, bukti, tanggal, dan konteks sebuah klaim sebelum membagikannya." | consider |
| watch.contentNote (teachers) | "Tonton dulu sebelum memutarnya." | Doesn't say for whom (flagged in an earlier review). | "Tonton dulu sebelum memutarnya untuk pelajar." | consider |
| civics check questions[7].options[1].text | "Langsung percaya, karena pesannya terdengar meyakinkan" | "Langsung" isn't in the English; both wrong options now start "Langsung …", which singles out the right one. | "Percaya saja, karena pesannya terdengar meyakinkan" | consider |
