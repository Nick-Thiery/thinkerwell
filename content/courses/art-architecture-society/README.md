# Art, Architecture and Society (preview course)

A hidden preview course, from Justin's brief of 4 November 2026, expanded on 7 November ("Art, Architecture and Society: a researched, image-led course and implementation brief"). It has 20 lessons in four sections of five, for ages 11 to 15. Each lesson teaches through two real works. A device shows it only after visiting `/preview/art-architecture-society` (`src/content/courses.ts`; `docs/notes/digital-world-preview.md` explains how preview courses work).

## How it is built

- **Lessons:** `lessons/AAS01.json` … `AAS20.json`, numbered in the brief's revised order. Each `id` is the brief's stable id (section 7), so the four lessons added on 7 November (Mughal South Asia, Ifugao, Diponegoro, Mexico) have ids without a number.
- **Read teaches; it asks nothing.**
  - There's no warm-up and no quick check (`read.checks: []`).
  - The standard reading is the brief's own, lightly edited for plain words. The simpler reading was written for this build, with the same meaning.
  - Write, Speak and Reflect are the brief's: one short task each, with no planning boxes or checklists, and one required Reflect prompt.
- **No Watch step:** no video has been screened or approved (`watch: null`), so every lesson has four steps.
- **No section checks or certificates:** the brief asks for no extra quiz.
- **Two real images per lesson, 40 placements from 37 distinct files.**
  - `visual` (image A) appears with the evidence, before the reading.
  - `secondVisual` (image B) appears after the last reading part, in the print view and in the teacher guide.
  - Each has a caption and its full credit: title, creator, date, holding institution, licence (linked), the record page, and what was changed. CC BY and CC BY-SA need all of it.
  - Three placements revisit earlier works, and say so: Lesson 12 reuses Lesson 1's *Harvesters*, and Lesson 20 reuses Lesson 16's two Buddhist works.
- **Files:** `visuals/AAS-nn-A.jpg` and `-B.jpg`, served from this site and never fetched from another server. They are resized to at most 1100 pixels (the two batiks to 1400, so their patterns stay readable) and saved as JPEG, about 4.9 MB in all. They sit in `assets/preview/`, which is never precached, and a lesson downloads its two images only when opened.

## Image audit (8 November 2026)

Every image file was downloaded from the brief's exact item record (or the record's own image link), looked at beside its record, and its rights checked item by item:

- **The Met:** `isPublicDomain: true` from the Met's collection API, for every Met object.
- **National Gallery of Art:** `openaccess = 1` for the exact image UUID, in the gallery's published open data (`published_images.csv` on GitHub).
- **Wikimedia Commons:** the licence, author and date read through the Commons API, for each file.
- **Saint Louis Art Museum:** the object page's own Rights field ("Public Domain"), with the image linked from that page. This resolves the two batik images the brief left pending.
- **Walters Art Museum:** both Vessantara Jataka paintings came from the Commons copies of the Walters' own images (public domain, CC0), because the Walters site refused requests from here.
- **Amon Carter Museum:** the object page's Copyright field ("Public domain").

| Placement | Work | Licence | Record | File |
|---|---|---|---|---|
| AAS-01-A | Under the Wave off Kanagawa (The Great Wave) | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/45434) | `visuals/AAS-01-A.jpg` 1100×740 |
| AAS-01-B | The Harvesters | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/435809) | `visuals/AAS-01-B.jpg` 1100×810 |
| AAS-02-A | Lower Body Wrapper with Repeated Diagonal Bands | Public domain | [record](https://www.slam.org/collection/objects/32569/) | `visuals/AAS-02-A.jpg` 1400×754 |
| AAS-02-B | Woman’s Tubular Skirt with Thousand Boxes Motif | Public domain | [record](https://www.slam.org/collection/objects/27208/) | `visuals/AAS-02-B.jpg` 1400×902 |
| AAS-03-A | Dish with bird in clouds | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/828473) | `visuals/AAS-03-A.jpg` 1100×826 |
| AAS-03-B | Covered box | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/61007) | `visuals/AAS-03-B.jpg` 1100×805 |
| AAS-04-A | Sphinx of Hatshepsut | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/544442) | `visuals/AAS-04-A.jpg` 1100×825 |
| AAS-04-B | Ear ornament with winged runner | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/309427) | `visuals/AAS-04-B.jpg` 1100×1021 |
| AAS-05-A | "Shah Jahan on a Terrace, Holding a Pendant Set With His Portrait", Folio from the Shah Jahan Album | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/451270?high=on) | `visuals/AAS-05-A.jpg` 735×1100 |
| AAS-05-B | Calligraphy page, Shah Jahan Album | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/451287) | `visuals/AAS-05-B.jpg` 758×1100 |
| AAS-06-A | Traditional Toraja House.JPG | CC BY-SA 3.0 | [record](https://commons.wikimedia.org/wiki/File:Traditional_Toraja_House.JPG) | `visuals/AAS-06-A.jpg` 1100×736 |
| AAS-06-B | Toraja house-1.JPG | CC BY-SA 3.0 | [record](https://commons.wikimedia.org/wiki/File:Toraja_house-1.JPG) | `visuals/AAS-06-B.jpg` 1100×733 |
| AAS-07-A | Borobudur stupas on upper terrace.jpg | CC BY-SA 4.0 | [record](https://commons.wikimedia.org/wiki/File:Borobudur_stupas_on_upper_terrace.jpg) | `visuals/AAS-07-A.jpg` 1100×733 |
| AAS-07-B | Stupa in Borobudur Temple, Indonesia.jpg | CC BY-SA 3.0 | [record](https://commons.wikimedia.org/wiki/File:Stupa_in_Borobudur_Temple,_Indonesia.jpg) | `visuals/AAS-07-B.jpg` 825×1100 |
| AAS-08-A | Angkor SiemReap Cambodia Ankor-Wat-01.jpg | CC BY-SA 3.0 | [record](https://commons.wikimedia.org/wiki/File:Angkor_SiemReap_Cambodia_Ankor-Wat-01.jpg) | `visuals/AAS-08-A.jpg` 1100×588 |
| AAS-08-B | 20171126 Angkor Wat 4715.jpg | CC BY-SA 4.0 | [record](https://commons.wikimedia.org/wiki/File:20171126_Angkor_Wat_4715.jpg) | `visuals/AAS-08-B.jpg` 1100×729 |
| AAS-09-A | Penang shophouses, Magazine Road, George Town.jpg | CC BY-SA 4.0 | [record](https://commons.wikimedia.org/wiki/File:Penang_shophouses,_Magazine_Road,_George_Town.jpg) | `visuals/AAS-09-A.jpg` 1100×766 |
| AAS-09-B | Amsterdam houses 2017.jpg | CC BY-SA 4.0 | [record](https://commons.wikimedia.org/wiki/File:Amsterdam_houses_2017.jpg) | `visuals/AAS-09-B.jpg` 1100×733 |
| AAS-10-A | Batad, Philippines, Rice Terraces.jpg | CC BY-SA 4.0 | [record](https://commons.wikimedia.org/wiki/File:Batad,_Philippines,_Rice_Terraces.jpg) | `visuals/AAS-10-A.jpg` 1100×825 |
| AAS-10-B | Ifugao House.jpg | CC BY-SA 4.0 | [record](https://commons.wikimedia.org/wiki/File:Ifugao_House.jpg) | `visuals/AAS-10-B.jpg` 736×1100 |
| AAS-11-A | Vessantara Jataka, Chapter 2: Kalinga Brahmins are Given the White Elephant | Public domain (Walters Art Museum, CC0) | [record](https://art.thewalters.org/object/35.232/) | `visuals/AAS-11-A.jpg` 960×720 |
| AAS-11-B | Vessantara Jataka, Chapter 3: Vessantara Gives Away the Chariot | Public domain (Walters Art Museum, CC0) | [record](https://art.thewalters.org/object/35.233/) | `visuals/AAS-11-B.jpg` 960×720 |
| AAS-12-A (revisits AAS-01-B) | The Harvesters | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/435809) | `visuals/AAS-01-B.jpg` 1100×810 |
| AAS-12-B | The Gleaners (Les Glanenses) | Public domain (National Gallery of Art Open Access, CC0) | [record](https://www.nga.gov/artworks/169702-gleaners-les-glanenses) | `visuals/AAS-12-B.jpg` 1100×825 |
| AAS-13-A | The Railway | Public domain (National Gallery of Art Open Access, CC0) | [record](https://www.nga.gov/artworks/43624-railway) | `visuals/AAS-13-A.jpg` 1100×893 |
| AAS-13-B | Argenteuil | Public domain (National Gallery of Art Open Access, CC0) | [record](https://www.nga.gov/artworks/52186-argenteuil) | `visuals/AAS-13-B.jpg` 1100×841 |
| AAS-14-A | The Burghers of Calais | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/207812) | `visuals/AAS-14-A.jpg` 1100×838 |
| AAS-14-B | A Burgher of Calais (Jean d’Aire) | Public domain (National Gallery of Art Open Access, CC0) | [record](https://www.nga.gov/artworks/1006-burgher-calais-jean-daire) | `visuals/AAS-14-B.jpg` 816×1100 |
| AAS-15-A | The Arrest of Prince Diponegoro | Public domain | [record](https://setkab.go.id/mengenal-koleksi-benda-seni-kenegaraan-bag-3/) | `visuals/AAS-15-A.jpg` 1100×693 |
| AAS-15-B | The Submission of Prince Dipo Negoro to General De Kock | Public domain | [record](https://www.rijksmuseum.nl/en/collection/object/The-Arrest-of-Diponegoro-by-Lieutenant-General-De-Kock--77b24ca4684720086aa5e5baf9dadeeb) | `visuals/AAS-15-B.jpg` 1100×828 |
| AAS-16-A | Buddha | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/39308) | `visuals/AAS-16-A.jpg` 754×925 |
| AAS-16-B | Architectural Element with Head of a Buddha | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/38278) | `visuals/AAS-16-B.jpg` 700×489 |
| AAS-17-A | Great Mosque of Djenne.jpg | CC BY 2.0 | [record](https://commons.wikimedia.org/wiki/File:Great_Mosque_of_Djenne.jpg) | `visuals/AAS-17-A.jpg` 1100×825 |
| AAS-17-B | Grand Mosque, Djenne (6862945).jpg | CC BY 2.0 | [record](https://commons.wikimedia.org/wiki/File:Grand_Mosque,_Djenne_(6862945) | `visuals/AAS-17-B.jpg` 1100×722 |
| AAS-18-A | Plate with Peonies | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/37451) | `visuals/AAS-18-A.jpg` 1100×826 |
| AAS-18-B | Jug with Floral Scroll | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/72420) | `visuals/AAS-18-B.jpg` 1100×825 |
| AAS-19-A | Calavera Catrina | Public domain | [record](https://www.cartermuseum.org/collection/calavera-catrina-197838411) | `visuals/AAS-19-A.jpg` 579×400 |
| AAS-19-B | Ofrenda de muertos en el Museo de Culturas Populares.JPG | CC BY-SA 3.0 | [record](https://commons.wikimedia.org/wiki/File:Ofrenda_de_muertos_en_el_Museo_de_Culturas_Populares.JPG) | `visuals/AAS-19-B.jpg` 1100×619 |
| AAS-20-A (revisits AAS-16-A) | Buddha | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/39308) | `visuals/AAS-16-A.jpg` 754×925 |
| AAS-20-B (revisits AAS-16-B) | Architectural Element with Head of a Buddha | Public domain (The Met Open Access, CC0) | [record](https://www.metmuseum.org/art/collection/search/38278) | `visuals/AAS-16-B.jpg` 700×489 |

## For reviewers

- **An art historian** should check the facts and qualifications, especially attributions marked "probably" or "attributed to", dates of works against dates of casts and photographs, and the Mughal, Ifugao, Diponegoro and Mexico lessons added on 7 November.
- **A partner organisation** should check the sensitive topics:
  - religious practice (Lessons 7, 8, 11, 16 and 20);
  - colonial conquest (Lessons 9 and 15);
  - death and remembrance (Lesson 19).
  
  No learner is asked to share their religion, identity or family, or to perform a practice.
- **No video** has been watched. Any added later must be screened at the exact title and URL first.
- **Indonesian and Malay** versions are drafted by AI and need native-speaker review, as the other courses do.
