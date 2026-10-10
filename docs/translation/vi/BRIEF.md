# Vietnamese: the brief the AI translators and reviewers worked from

This is the written brief for the first draft of the Vietnamese (October 2026). It is kept so the native-speaker reviewers can see what the draft was asked to do, and so a later draft can be made the same way. `KEY_TERMS.md` holds the words to use for the terms that repeat.

## Who it is for

Youth about 10 to 17 years old, most of them refugee, displaced or under-served, learning on shared tablets and laptops. Some read Vietnamese fluently; some have had interrupted schooling and read slowly. They may be learning English at the same time. Write the way a kind, clear teacher talks to a 12-year-old: everyday words, short sentences, no school-exam stiffness.

## Voice and register

- The learner is **bạn**. When the learner speaks ("Mình mới đến đây", self-check items "Mình có thể ..."), the learner is **mình**.
- Never *vui lòng*, *làm ơn* or *xin* as "please". Never *quý vị* or *quý khách* to a learner. No exclamation marks anywhere.
- Instructions are plain commands ("Chọn một đáp án."), not requests. Do not start with *Hãy* every time; use it only when a bare command sounds blunt.
- Sentence case. Vietnamese capitalises only the first word of a sentence, title or button, and proper names. Do not capitalise every word of a title.
- Pages for adults (the Educators pages, teacher guides, Settings, For organisations, the information sheet, the consent form, code cards) also use **bạn**, in a more careful register. A parent or guardian is **phụ huynh hoặc người giám hộ**.
- Prefer plain Vietnamese words over Sino-Vietnamese (Hán Việt) abstractions when there is an everyday word: *bắt đầu*, not *khởi sự*. Where the course teaches a term (a glossary word), use the term and explain it simply.

## What to translate and what to keep

- Keep **Thinkerwell**, people's names and invented place names (Riverstone, Tallgrass Valley, Bayview, Riverlands ...) exactly as they are. Real places take their usual Vietnamese name (Ai Cập, Trung Quốc, Ấn Độ ...). Where the usual name of a place is contested, keep to the neutral name of the country or region and flag it.
- Keep every number. Write thousands with a full stop (1.000) and decimals with a comma (2,5). Dates: "ngày 5 tháng 9". Keep units as the English has them (km, kg) unless the Vietnamese practice differs.
- Keep every `{placeholder}` exactly as written (do not translate the word inside the braces, do not change the braces) and every `<tag>...</tag>`. You may move them to where they belong in the Vietnamese sentence.
- In a message that has number forms (`one`, `other`), Vietnamese has only **`other`**: give just `{"other": "..."}`, and keep `{count}` in it.
- Short labels (buttons, menu links, tabs) stay short: about the length of the English, and no longer than 1.5 times it. A phone is narrow.
- Use the words in `KEY_TERMS.md` for the terms in it. If you think a suggested word is wrong, use it anyway and flag the string, so the course stays consistent and one reviewer decides.

## Lessons

- Each lesson has a **standard** text and a **simpler** text for every reading part. The simpler text is not the standard text with a few words changed: it has shorter sentences (aim for 14 syllables or fewer on average), the most common words, one idea per sentence, and fewer abstract words. It must be clearly shorter than the standard text.
- Every key word (glossary word) must appear in **both** the standard and the simpler text of at least one reading part, as written in `read.glossary[].word` (or one of its `forms`). Vietnamese does not inflect, so `forms` is rarely needed; list a form only where the reading uses a different spelling or a compound ("nhà sử học" and "các nhà sử học" need no form).
- The reading is read aloud by a voice. Write it so it can be read aloud: no abbreviations, no symbols such as & or %, spell out *phần trăm*, write names as names. Digits are fine; the recording tool turns them into words.
- **Quick checks and section checks.** Each option's `feedback` starts with **Đúng rồi.** (the right answer) or **Chưa đúng lắm.** (a wrong one), then one or two sentences that say why and give a hint. A wrong answer is never called "sai". The options must stay clearly right or wrong exactly as the English: do not make the right answer longer or more specific than the others, and keep the options different from each other.
- **Self-check** items start with **Mình** ("Mình đã ...", "Mình có thể ...").
- **The completion message** starts "Bạn đã hoàn thành Bài N." (N is the lesson number).
- **Sentence starters** keep the English ending: if the English ends in "..." or "___", so does the Vietnamese.
- **Writing and speaking tasks** keep the English task: same length asked for, same steps.
- Lesson 4 is about how different faiths and the sciences explain where the world comes from. Use each faith's own usual name (see `KEY_TERMS.md`), keep every explanation respectful and not ranked, and flag the whole lesson for a reviewer from each faith it names.
- Lessons 1 and 23 teach how to judge sources and information; Lesson 24 is about how young people contribute to their communities. Translate exactly; do not add, remove or soften an idea, and do not add any example from Vietnam or any other real country that the English does not have.

## Lesson pictures (SVG)

Each lesson has a picture whose labels are `<text>` elements. The Vietnamese copy keeps the same drawing; only the words change. Keep each label about as short as the English so it still fits. The picture's `<desc>` is the lesson's translated `visual.alt`. Check the picture with `node scripts/render_svg.js content/vi/visuals/L01.svg` (it renders a PNG and flags text that overflows).

## Flagging

For any string you are not sure of, add an entry to the notes file for that file (`docs/translation/vi/notes/<name>.json`):

```json
{ "read.sections.1.text": { "flag": true, "note": "Why I chose X over Y; what a native speaker should check." } }
```

Flag: a term not in `KEY_TERMS.md` that you had to choose, an idiom, a sensitive subject, a place name, anything where two Vietnamese speakers might disagree, and anything that sounds stiff or unnatural to you. A flag is not a failure: it is where a native reviewer looks first. Be generous: too many flags is better than too few.

## Checking your work

```sh
sh scripts/py.sh scripts/check_translation.py vi L01        # one lesson
sh scripts/py.sh scripts/check_translation.py vi quiz-history
```

Fix every ERROR. Read every WARN and fix it unless you have a reason; "uncommon words" warnings count single syllables and are often noise.

## The second pass (reviewer)

A second AI reviewer reads only the Vietnamese and writes an English back-translation of each string **before** looking at the English, then compares the two, corrects clear mistakes (a meaning shift, a missing idea, a wrong answer made right, a number changed) and flags anything it is unsure of. Each back-translation is kept in the notes file as `back`. A native speaker's review comes after this and replaces it.
