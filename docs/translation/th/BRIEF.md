# Thai: the brief the AI translators and reviewers worked from

This is the written brief for the first draft of the Thai (November 2026, Nick's instruction). It is kept so native-speaker reviewers can see what the draft was asked to do, and so a later draft can be made the same way. `KEY_TERMS.md` holds the words to use for the terms that repeat.

## Who it is for

Youth about 10 to 17 years old, many of them refugee, displaced or under-served, learning on shared tablets and laptops. Some read Thai fluently; some have had interrupted schooling and read slowly, and some are learning Thai or English as another language. Write the way a kind, clear teacher talks to a 12-year-old: everyday words, short sentences, no school-exam stiffness.

## Voice and register

- The learner is **คุณ**. When the learner speaks ("ฉันมาใหม่", self-check items "ฉันสามารถ ..."), the learner is **ฉัน**.
- Never **กรุณา** or **โปรด** as "please", never **ท่าน** to a learner. No exclamation marks anywhere.
- No gendered polite particles (**ครับ**, **ค่ะ**, **คะ**) in text for learners: the same screen is read by everyone. Write neutral, friendly sentences instead.
- Instructions are plain and kind ("เลือกคำตอบหนึ่งข้อ"), not requests.
- Pages for adults (the Educators pages, teacher guides, Settings, For organisations, the session guide, code cards, the Privacy page) also use **คุณ**, in a more careful register. A parent or guardian is **ผู้ปกครอง**.
- Prefer everyday Thai words over formal Pali-Sanskrit words when there is an everyday word. Where the course teaches a term (a glossary word), use the term and explain it simply.

## Writing Thai for this site

- **No full stops.** Thai ends a sentence (or a clause) with a single space, not a full stop. Do not add "." at the end of Thai sentences; keep "?" for questions. Keep "..." and "___" where the English sentence starter ends with them.
- **Spaces.** Put one space between sentences, before and after a number or a Latin-script word inside Thai text when it reads better, and nowhere inside a word.
- **Numbers** stay as Arabic digits (not Thai digits). Thousands with a comma (1,000), decimals with a point (2.5). Dates "5 กันยายน". Keep units as the English has them (km, kg).
- Keep **Thinkerwell**, people's names and invented place names (Riverstone, Tallgrass Valley, Bayview, Riverlands ...) in Latin letters, exactly as they are. Real places take their usual Thai name (อียิปต์, จีน, อินเดีย ...). Where a place's usual name is contested, keep to the neutral name of the country or region and flag it.
- Keep every `{placeholder}` exactly as written (do not translate the word inside the braces, do not change the braces) and every `<tag>...</tag>`. Move them to where they belong in the Thai sentence.
- In a message that has number forms (`one`, `other`), Thai has only **`other`**: give just `{"other": "..."}`, and keep `{count}` in it.
- Short labels (buttons, menu links, tabs) stay short: about the length of the English. A phone is narrow, and Thai with its stacked vowel marks is taller than English.
- Use the words in `KEY_TERMS.md` for the terms in it. If you think a suggested word is wrong, use it anyway and flag the string, so the course stays consistent and one reviewer decides.

## Lessons

- Each lesson has a **standard** text and a **simpler** text for every reading part. The simpler text is not the standard text with a few words changed: it has shorter sentences, the most common words, one idea per sentence, and fewer abstract words. It must be clearly shorter than the standard text.
- Every key word (glossary word) must appear in **both** the standard and the simpler text of at least one reading part, spelled exactly as in `read.glossary[].word` (or one of its `forms`). Thai does not inflect, so `forms` is rarely needed.
- The reading is read aloud by a voice. Write it so it can be read aloud: no abbreviations, no symbols such as & or %, write เปอร์เซ็นต์, write names as names. Digits are fine; the recording tool turns them into words.
- **Quick checks and section checks.** Each option's `feedback` starts with **ถูกต้อง** (the right answer) or **ยังไม่ถูก** (a wrong one), then a space and one or two sentences that say why and give a hint. A wrong answer is never called **ผิด**. The options must stay clearly right or wrong exactly as the English: do not make the right answer longer or more specific than the others, and keep the options different from each other.
- **Self-check** items start with **ฉัน**.
- **The completion message** starts "คุณเรียนจบบทเรียนที่ N แล้ว" (N is the lesson number).
- **Writing and speaking tasks** keep the English task: same length asked for, same steps.
- Lesson 4 is about how different faiths and the sciences explain where the world comes from. Use each faith's own usual Thai name (see `KEY_TERMS.md`), keep every explanation respectful and not ranked, and flag the whole lesson for a reviewer from each faith it names.
- Lessons 1 and 23 teach how to judge sources and information; Lesson 24 is about how youth contribute to their communities. Translate exactly; do not add, remove or soften an idea, and do not add any example from Thailand or any other real country that the English does not have.

## Lesson pictures (SVG)

Some lessons have a picture whose labels are `<text>` elements. The Thai copy keeps the same drawing; only the words change. Keep each label about as short as the English so it still fits. The picture's `<desc>` is the lesson's translated `visual.alt`. Check the picture with `node scripts/render_svg.js content/th/visuals/L01.svg` (it renders a PNG and flags text that overflows).

## Flagging

For any string you are not sure of, add an entry to the notes file for that file (`docs/translation/th/notes/<name>.json`, or `docs/translation/th/notes/courses/<course id>/<name>.json` for the other courses):

```json
{ "read.sections.1.text": { "flag": true, "note": "Why I chose X over Y; what a native speaker should check." } }
```

Flag: a term not in `KEY_TERMS.md` that you had to choose, an idiom, a sensitive subject, a place name, anything where two Thai speakers might disagree, and anything that sounds stiff or unnatural to you. A flag is not a failure: it is where a native reviewer looks first.

## Checking your work

```sh
sh scripts/py.sh scripts/check_translation.py th L01                           # one Our World lesson
sh scripts/py.sh scripts/check_translation.py th quiz-history                  # a section check
sh scripts/py.sh scripts/check_translation.py --course digital-world th DW01   # another course's lesson
```

Fix every ERROR. Read every WARN and fix it unless you have a reason. Thai words are counted with PyThaiNLP (`scripts/setup-python.sh` installs it), so counts are approximate.

## The second pass (reviewer)

A second AI reviewer reads only the Thai and writes an English back-translation of each string **before** looking at the English, then compares the two, corrects clear mistakes (a meaning shift, a missing idea, a wrong answer made right, a number changed) and flags anything it is unsure of. Each back-translation is kept in the notes file as `back`. A native speaker's review comes after this and replaces it.
