# Malaysian Malay videos for the Watch step (candidates)

Branch `local-videos-ms`, 14 October 2026. For Justin and the Malaysian partner. Machine-readable version: `docs/notes/local-videos/ms.json`. **Nothing here is wired into the app.** Every entry is a candidate, and every one must be watched by a person before it is used.

## What this is

The partner in Malaysia asked for videos like the English ones, but made by Malaysian creators in Bahasa Melayu, for all 24 lessons, shown when the interface language is Malay. For each lesson this note gives one primary and one backup YouTube video, plus the Malay text a Watch step needs: `why`, `beforeQuestion`, `afterQuestion`, `summary` (the written version), `keyPoints` and `contentNote`.

**Result in one line:** 20 of 24 lessons have a primary candidate, 18 of those with a fit of 3 or more, 5 with a fit of 4 or more (Lessons 2, 6, 7, 10, 18); 4 lessons have no good match (Lessons 4, 9, 19, 22); 2 primaries are weak (Lessons 14, 24).

## What was and was not checked (read this first)

- **Verified:** every video id in the table and in the JSON was returned by a search and then checked with YouTube's oEmbed endpoint (`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json`), which returned a title and channel name. The title and channel in the JSON are those oEmbed values. An oEmbed answer of 401 means the owner has switched embedding off; those videos were dropped.
- **Not checked:** length, description, transcript, and what the video actually says. YouTube's watch pages could not be read from the build environment (the request was blocked), so `durationSeconds` is `null` for every entry and the Malay `summary` and `keyPoints` were written from the **title and channel name only**, marked `summaryBasis: title-and-description` with `summaryBasisDetail` saying so. They are a draft of what the video is probably about, not a record of what it says. **Rewrite them after watching.**
- **Length is the biggest unknown.** The brief asked for videos of about 1 to 6 minutes. EduwebTV KPM videos and teacher videos look like full lessons and may well run 15 minutes or more (not checked). Check this first.
- **"Malaysian"** is judged from the channel (an official Malaysian body, or a teacher using Malaysian syllabus terms such as KSSR, KSSM, Tingkatan, DSKP, SPM) and from Malaysian wording (for example 'perkataan pinjaman', 'wang', 'Zaman Neolitik'). Where that is only inferred, the JSON says `MY (inferred ...)` or `MY (unconfirmed)`. Individual creators in particular need a look.
- Nothing was watched. The Malay is machine-drafted to the rules in `docs/translation/ms/BRIEF.md` and `KEY_TERMS.md`, and has not been read by a native speaker.

## Review table: primary candidates

Fit is 1 to 5, from title, channel and fit with the lesson's question, before anyone has watched it. Length is "not checked" for all.

| Lesson | Video | Channel | Length | Fit | Role | Concerns |
|---|---|---|---|---|---|---|
| 1. How can we find out about the past? | [DSKP 1.1.2 & 1.1.3 \|\| SEJARAH TAHUN 4 UNIT 1 : SUMBER SEJARAH & K...](https://www.youtube.com/watch?v=k1xPmV16_Vg) | Cikgu Yuhanisah | not checked | 3 | primary | Teacher-lecture style; covers sources in general, not 'primary source' by name. |
| 2. What can an object reveal about a person in the past? | [ARTIFAK PILIHAN MUZIUM NEGARA (CELEPA)](https://www.youtube.com/watch?v=vmzCfqPX-UA) | MUZIUM NEGARA RASMI | not checked | 4 | primary | Title and channel only; confirm it explains what the celepa shows about people, not just what it is. |
| 3. How does changing scale change the story? | [Jom Jelajah Planetarium Negara : Alam Semesta](https://www.youtube.com/watch?v=OAo_uFyuoY8) | Planetarium Negara | not checked | 3 | primary | A tour of the planetarium's Universe exhibit, not an explainer on scale. Loose fit. |
| 4. How do people explain where the world comes from? | none found | | | | | See "No good match" below. |
| 5. How did early humans learn, create, and move? | [Tingkatan 1 \| Sejarah \| Zaman Prasejarahserta Ciri-ciri Kehidupan...](https://www.youtube.com/watch?v=-XFsgSEkXDE) | EduwebTV KPM | not checked | 3 | primary | Broadcast-lesson style (EduwebTV), probably long. The backup's title says 'misteri'; check it sticks to evidence. |
| 6. How did farming change human societies? | [Zaman Neolitik: Kisah Manusia Prasejarah di Malaysia](https://www.youtube.com/watch?v=v_DStCZS7nk) | DBPMalaysia | not checked | 4 | primary | Best institutional fit of the set. Check it mentions the problems farming brought (the lesson asks for one). |
| 7. Why did the first cities and states begin? | [Tingkatan 1 \| Sejarah \| Ciri-ciri Tamadun Awal Dunia \| R297](https://www.youtube.com/watch?v=doCTie5-J4M) | EduwebTV KPM | not checked | 4 | primary | Broadcast-lesson style, probably long; check it covers rulers, laws and writing, not only locations. |
| 8. How did trade connect distant communities? | [Bab 5 : Aspek Kegemilangan Melaka ( Pusat Perdagangan & Pengurusan ...](https://www.youtube.com/watch?v=p5NZeSNYgG4) | Sejarah Dept STTSS PT3 KSSM J1-J3 | not checked | 3 | primary | Uses Melaka, not the Silk Road, so the lesson needs a line linking the two. Exam-revision style. |
| 9. How do inventions change everyday life? | none found | | | | | See "No good match" below. |
| 10. Why do people build towns near rivers? | [Tingkatan 1 \| Geografi \| Sungai Dan Tasik Utama Di Malaysia Dan K...](https://www.youtube.com/watch?v=HcB8dHKOw-E) | EduwebTV KPM | not checked | 4 | primary | Uses Malaysian rivers, not Mesopotamia; the lesson needs a line linking the two. Check it mentions floods. |
| 11. How do maps help us understand a place? | [Geografi Tingkatan 1 Bab 3 : Peta Lakar](https://www.youtube.com/watch?v=R2ZzdgiigbE) | Sherene Tan | not checked | 3 | primary | Sketch-map lesson for Form 1; check all four tools (title, key, compass, scale) appear. |
| 12. What makes a city grow? | [Asal Usul Kuala Lumpur](https://www.youtube.com/watch?v=mXNe7HsuejE) | Warkah TV | not checked | 3 | primary | Early Kuala Lumpur history includes a civil war; individual channel, accuracy unknown. |
| 13. How do climate and seasons affect daily life? | [Kenapa Malaysia Tak Ada 4 Musim Tapi Ada Monsun? \| Penjelasan Sain...](https://www.youtube.com/watch?v=WtbwO7P46AE) | Lati Ash Rex | not checked | 3 | primary | Individual creator, accuracy unknown; may show extreme weather. Backup is more about climate change than seasons. |
| 14. How can communities respond to environmental change? | [KPM siap sedia hadapi banjir, impak Monsun Timur Laut](https://www.youtube.com/watch?v=XvIRzkT-nOk) | Astro AWANI | not checked | 2 | primary | Weak: news reports on flood preparation, not about fairness or including everyone. May show flooded homes. |
| 15. How can objects express culture and identity? | [PEMAKAIAN BATIK MALAYSIA \| Penjawat Awam Jadi Duta Kecil Promosi I...](https://www.youtube.com/watch?v=ZBt_9BpMyEI) | Buletin TV3 | not checked | 3 | primary | News item about batik as national identity; batik's origin is sensitive between Malaysia and Indonesia. Backup is for preschoolers. |
| 16. How do languages connect people? | [Jom Belajar Bahasa Isyarat Malaysia](https://www.youtube.com/watch?v=VDK-d7yeWpM) | Unit PBIM MFD | not checked | 3 | primary | Covers sign language only, not 'languages change and share words'. Confirm the channel is the Malaysian Federation of the Deaf. |
| 17. Why do communities have traditions? | [SEJARAH TAHUN 6 \| UNIT 6 \| PERAYAAN DI MALAYSIA@madamshahmahadami...](https://www.youtube.com/watch?v=3tyRJcnRJss) | MADAM SHAH MAHADAMI | not checked | 3 | primary | Teacher-lecture style (Year 6); festivals may include religious elements. Backup's channel and language unknown. |
| 18. How can art tell a story? | [EYO HOCK SENG : Teruskan Legasi Seni Wayang Kulit Kelantan](https://www.youtube.com/watch?v=RRtmRXmQX9o) | Radio Televisyen Malaysia | not checked | 4 | primary | Wayang kulit stories often come from the Ramayana, and Kelantan has restricted the art form in the past (to verify). Handle with care. |
| 19. What does belonging mean? | none found | | | | | See "No good match" below. |
| 20. Why do people have to make choices? | [Konsep Kekurangan, Pilihan & Kos Lepas](https://www.youtube.com/watch?v=4WJBD1R1w0Q) | AZLIN | not checked | 3 | primary | Form 4 (SPM) Economics: exactly the right ideas but upper-secondary wording and probably long. |
| 21. How do people trade and exchange? | [Evolusi WANG (Barter, Emas & Fiat)](https://www.youtube.com/watch?v=rIj3sNElOAo) | Palataology | not checked | 3 | primary | Covers barter and money, not goods and services or trust. Also covers gold and fiat money, which may be hard. |
| 22. How do people plan for the future? | none found | | | | | See "No good match" below. |
| 23. What makes information trustworthy? | [Maklumat Palsu di Internet](https://www.youtube.com/watch?v=4B2Xced5ZqQ) | NADI Sibuti | not checked | 3 | primary | Check the examples are not about politics or religion. Backup is a government campaign video and may carry a political or legal tone. |
| 24. How can young people contribute to their communities? | [PROGRAM GOTONG ROYONG DI SEKOLAH KPM](https://www.youtube.com/watch?v=QeG4tb-Fvl8) | PUSAT SUMBER SERI KEMALA | not checked | 2 | primary | Weak: a school clean-up day, not young people sharing ideas with decision makers. Both candidates are low quality. |

## Backups

| Lesson | Video | Channel | Fit |
|---|---|---|---|
| 1 | [KSSM SEJARAH TINGKATAN 1 SUMBER SEJARAH](https://www.youtube.com/watch?v=mP3vBmAddfk) | CgMatdhi | 3 |
| 2 | [Pesara kerajaan abadikan koleksi barangan artifak purba di Muzium K...](https://www.youtube.com/watch?v=qdGduMh2ZnA) | Berita Harian Online | 3 |
| 3 | [Sejarah Tahun 4 Zaman Prasejarah : Kenali Zaman Prasejarah &  Garis...](https://www.youtube.com/watch?v=uC_PiGsZj4I) | Fiz channel | 2 |
| 5 | [PERAK MAN – Misteri Manusia Pertama Asia Tenggara \| Rahsia Silam #2](https://www.youtube.com/watch?v=xo4u3eLTLJI) | Rahsia Silam | 3 |
| 6 | [Zaman Neolitik](https://www.youtube.com/watch?v=EdOQsXSk1Pw) | Atika Ahmad | 2 |
| 7 | [Tingkatan 1 \| Sejarah \| Tamadun Awal Dunia Serta Empat Lokasi Awa...](https://www.youtube.com/watch?v=uZXZc3HgApU) | EduwebTV KPM | 3 |
| 8 | [Sejarah Perdagangan di Pelabuhan Melaka - Kurun ke-15](https://www.youtube.com/watch?v=cbB_sfETjl8) | wan azm | 2 |
| 10 | [7.3 KEPENTINGAN SUNGAI DAN TASIK DI MALAYSIA](https://www.youtube.com/watch?v=_sV2T_KyD-Y) | Suziyana | 3 |
| 11 | [GEOGRAFI TINGKATAN 1 : BAB 3 PETA LAKAR (CIRI-CIRI DAN SIMBOL)](https://www.youtube.com/watch?v=OPsFE3Ho0BQ) | Nurhabibah M A. | 3 |
| 12 | [SEJARAH KUALA LUMPUR. DULU RUMAH2 MASYARAKAT PAKAI DAUN NIPAH. SEKA...](https://www.youtube.com/watch?v=yjLwiTGmTgY) | Salwin Channel | 2 |
| 13 | [Kenapa Cuaca Panas Dan Kemarau Semakin Dahsyat Di Malaysia?](https://www.youtube.com/watch?v=6XIbVatjZXc) | Astro Lab | 3 |
| 14 | [Nadma bersiap sedia hadapi banjir di Lembah Klang](https://www.youtube.com/watch?v=laTEg7IDrVE) | Harian Metro | 2 |
| 15 | [SENI KRAFTANGAN TRADISIONAL : WARISAN & BUDAYA MALAYSIA](https://www.youtube.com/watch?v=kT16bByRF3c) | ZuRa aZRa | 2 |
| 16 | [Perkataan Pinjaman Bahasa Inggeris](https://www.youtube.com/watch?v=jd98LRb2_FY) | Nurul Sakinah | 2 |
| 17 | [Gawai Dayak & Tradisi Iban](https://www.youtube.com/watch?v=jmOFXmQE_dg) | Tri-poli | 2 |
| 18 | [Wayang Kulit (Kelantan)](https://www.youtube.com/watch?v=zK1uW_rbQPI) | PentasPusaka | 3 |
| 20 | [(Ekonomi Tingkatan 4) BAB 1 - KEKURANGAN PILIHAN KOS LEPAS](https://www.youtube.com/watch?v=SXZYJ4_LuYg) | Cikgu Ashari Saat | 3 |
| 21 | [(Ekonomi Tingkatan 4) BAB 3 - FUNGSI WANG](https://www.youtube.com/watch?v=h-4z7_6h6H4) | Cikgu Ashari Saat | 3 |
| 23 | [Langkah-Langkah Mengekang Penyebaran Berita Palsu](https://www.youtube.com/watch?v=nzwRbmxlpLM) | Pejabat Penerangan Daerah Johor Bahru | 2 |
| 24 | [VIDEO PENDEK HARI KESUKARELAWANAN BELIA MALAYSIA (2020) - HAIKAL ADNIN](https://www.youtube.com/watch?v=ewPl6apgTCs) | Haikal Adnin | 2 |

## No good match: Lessons 4, 9, 19 and 22

**Lesson 4 (How do people explain where the world comes from?).** No Malaysian-made, Malay-language video on how the universe began was found that was verifiably by a Malaysian creator or institution. The one Malay-language Big Bang video that turned up (GEOGERHANA, BlpQoPYooiw) uses the Indonesian word 'Ledakan' and was rejected as probably Indonesian. Results for 'origin of the world' in Malay were mostly religious sermons, which the brief rules out. **Proposal:** Keep the English video (it is a science account, introduced as one kind of account) with the written version in Malay, or ask a Malaysian science educator (for example Planetarium Negara) to make a 2-minute one. Lesson 4 also needs a local educator's preview whatever video is used.

**Lesson 9 (How do inventions change everyday life?).** Searches for Malay-language, Malaysian-made videos on how inventions change daily life (Edison, the printing press, the Industrial Revolution, phones) returned only Indonesian videos or videos with no Malaysian source. Nothing that also fits the lesson's 'who benefits' question was found. **Proposal:** Keep the English video (TED-Ed, with its existing content note about slavery on cotton farms and the Read instead option) with the Malay written version, or make a short Malay video using a local example (for example mobile phones or the Touch 'n Go card and who can or cannot use them).

**Lesson 19 (What does belonging mean?).** Searches for Malay-language, Malaysian-made videos about belonging, inclusion and having a say in a group found only policy news on inclusive education (Astro AWANI) and Indonesian videos. Nothing suits learners aged 10-17 and nothing avoids the refugee and race/religion policy topics the brief says to stay away from. **Proposal:** Keep the English video (CASEL, young people's views; it already has a content note and a Read instead option) with the Malay written version, or make a short Malay video with the partner's own learners if they agree. Do not use news about national inclusion policy.

**Lesson 22 (How do people plan for the future?).** Searches for Malaysian, Malay-language videos on saving, spending and budgeting that suit 10-17 year olds found only adult-salary tips (Afham Yusof), parent-facing advice (Dr Adam Zubir), Indonesian videos and national-budget news. Bank Negara Malaysia has a kids channel (BNM Kids) and AKPK has an official channel, but no specific video from them surfaced in search, so none could be verified. **Proposal:** A person should browse the BNM Kids channel (youtube.com/c/BNMKids) and AKPK Official (youtube.com/akpkofficial) for a short saving or budgeting video. Until then keep the English video (Teaching Without Frills) with the Malay written version, or make one.

## Weak matches: Lessons 14 and 24

**Lesson 14 (responding to environmental change).** The two candidates are news reports about flood preparation. They show an organised response, but nothing about fairness or including everyone, which is the lesson's point, and they may show flooded homes. **Proposal:** keep the English UNICEF video (with its content note) and the Malay written version, or make a short one. Check with the partner first whether floods are a sensitive topic for their learners.

**Lesson 24 (how young people contribute).** The two candidates are a school gotong-royong day and a short volunteer-day clip. Both are low quality and neither shows young people sharing ideas with people in charge. **Proposal:** keep the English UNICEF video with the Malay written version, or make one with the partner's own learners if they agree.

## Sensitivity notes for the partner

- **Refugee, race and religion policy:** no candidate is about refugees, citizenship, or race or religion policy. Lessons 8, 13, 14 and 23 use news or government-campaign videos, which could carry a political tone: preview them.
- **Lesson 15 (batik)** and **Lesson 18 (wayang kulit):** both are cultural topics that are sensitive in Malaysia (the origin of batik between Malaysia and Indonesia; Kelantan wayang kulit, drawn from the Ramayana, which the state has restricted before). The restrictions point is from general knowledge and is **not checked**. Ask the partner.
- **Lessons 5 and 12:** Perak Man is a skeleton (backup of Lesson 5); early Kuala Lumpur history includes a civil war (Lesson 12). Preview.
- **Lesson 17:** festivals may include religious ceremonies. No candidate is a religious teaching video, but it was not watched.
- **Lesson 4 (origins):** whatever video is used needs a Malaysian reviewer's preview, as the English video already does. Malay search results for this topic were mostly religious sermons, which the brief rules out.

## Seen and rejected

- **Indonesian, not Malaysian:** the 'Ledakan' Big Bang video (GEOGERHANA); 'Kepala Polisi Labrador' flood-safety cartoon; Kemkomdigi TV (Indonesian ministry); nearly every 'Jalur Sutra', 'Edison', 'inklusif' and 'menabung' result. These use Indonesian words (jalur, ledakan, menabung, inklusi).
- **Embedding switched off (oEmbed 401):** Lenggong World Heritage video `rJa8MuLYv4I`, `WryEYDA_5Sk` (Melaka), `GlYc4jAQHQ0` (Geografi), `1k2AqmcOYHM` (field work), `MGMQ8jD6DW0` (Year 1 festivals), `gXAsCQpoSD4` (BIM finger spelling). They cannot be played inside the app.
- **DidikTV KPM:** searches for its lesson episodes found only news about its launch and a few episodes titled by number (for example `wS6MHco-oi0`, `wuQDp7xJ4Kg`, posted on the EduwebTV KPM channel). They were not used because their subject and length could not be told from the title.
- **Not for these learners or this purpose:** tourist vlogs of Muzium Negara in English (several), 'dark secrets' and 'misteri' videos, news about the national budget and party politics, adult salary-saving tips, parent-facing advice videos, and preschool songs.
- **Seen but not chosen:** KuasaTv 'Episode 5: Zaman Kegemilangan Melaka, 84 bahasa bergema satu pelabuhan' (`XP7_lnnYg2M`), a good title for Lesson 8, but the channel is unknown and may be political. Think City's Lenggong video (`szuHwcImg1w`), a possible Lesson 5 alternative, probably a long documentary. Both are worth a look.

## Channels worth browsing by hand

The search tool could not list a channel's videos, so these official channels were seen but not browsed. A person could find shorter, better-fitting videos there, especially for Lessons 4, 9, 19, 22 and 24.

- EduwebTV KPM (Ministry of Education): `youtube.com/c/EduwebTVkpm`. Lesson recordings by form and subject; also primary-school Sejarah and Pendidikan Moral.
- DBPMalaysia (Dewan Bahasa dan Pustaka): `youtube.com/DBPMalaysia`. Has the Neolithic video; may have language and culture shorts for Lessons 16 and 17.
- Muzium Negara (`@muziumnegararasmi`), Jabatan Muzium Malaysia (`@adminjmm2024`), Arkib Negara (`@myarkibnegara`), Planetarium Negara (`@PlanetariumNegaraMY`).
- BNM Kids (`youtube.com/c/BNMKids`) and AKPK Official (`youtube.com/akpkofficial`), for Lessons 21 and 22.
- UNICEF Malaysia (`youtube.com/unicefmalaysia`), for Lessons 14, 19 and 24. Check the language, as some of its videos may be in English.
- Unit PBIM MFD (`@unitpbimmfd4041`) and Bahasa Isyarat Malaysia by MFD, for Lesson 16.

## Next steps

1. A Malay-speaking person watches each primary (and backup if the primary fails) and records the real length, whether it is in Malaysian Malay, and whether it is calm and suitable for ages 10 to 17.
2. For each video that passes, rewrite `summary` and `keyPoints` from what the video says, then set `durationSeconds`, `summaryBasis: transcript` and `needsWatching: false`. A native Malaysian reader checks the Malay.
3. Decide with the partner what to do for Lessons 4, 9, 14, 19, 22 and 24: keep the English video with the Malay written version (the app already does this today), or make a video.
4. Only then decide how the app shows a Malay-language video (a `watchByLanguage` field in the lesson files or a separate map). This note does not change the app, the lesson files or any Watch step, so no check, test or translation file is affected. `docs/PRODUCT.md` says the Malay videos stay English; that stays true until this is decided.

