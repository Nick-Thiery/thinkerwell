# Thinkerwell lessons v2: writer's spec

You are rewriting existing Thinkerwell lessons so that all 24 have the **same shape**, the **same reading level**, and are **accurate, clear and respectful** for the learners below. The CTO has approved these changes. Work only on the lessons you were assigned.

Files you need:
- Base44 originals: `the Base44 export (base44-content.json, kept outside this repo)` (`lessons` and `videos`; match a video to its lesson with `videos[].lessonId == lessons[].id`)
- Audit of known problems: `docs/research/BASE44_AUDIT.md` (sections 4 and 5)
- Learner context: `docs/research/LEARNER_CONTEXT.md`
- Checker: `python3 scripts/check_lesson.py <file.json>`
- Write your output to `content/lessons/L{NN}.json` (two-digit number, e.g. `L07.json`).

## 1. Who the learners are

- Refugee, displaced and under-served young people, probably about 10–17 years old. The first pilot is a refugee-led learning centre in Jakarta, but **the course is used in many places, so write for learners anywhere**, not for Indonesia only.
- Most are learning English as a second or third language. Home languages include Dari/Farsi, Rohingya, Somali, Arabic, Tamil and others.
- Many have had interrupted schooling. Many live in "transit" countries where they **cannot work legally, often have no bank account, may depend on aid, and do not know where they will live in future**.
- They use shared laptops and tablets with unreliable internet, often with a volunteer teacher, sometimes alone.

## 2. What to keep and what to change

Keep:
- The lesson number, order and topic. The essential question's meaning. The five stages (Read, Write, Speak, Watch, Reflect).
- Any fictional scenario that already exists (for example "Bayview" in Lesson 12). You may expand it.
- The existing video, unless section 6 says otherwise.
- A title may be lightly edited only if it is unclear. Say so in `changes`.

Change:
- Bring every lesson to the same length, structure and reading level (section 4).
- Rewrite "simpler English" so it is **much** simpler, not a copy of the original.
- Expand short lessons (Lessons 10–19 are only about 50–110 words) with accurate extra material. You may search the web. Use reputable sources: National Geographic Education, Khan Academy, Britannica, BBC Bitesize, Smithsonian, UNESCO, UN, OER Project, TED-Ed, museum sites. Add what you used to `sources`.
- Add anything missing: evidence, warm-up, example answer, self-check, visual plan (Lessons 1, 10 and 20–22 are missing several parts).
- Fix the known bugs: glossary words that never appear in the text, the correct answer sitting in the same position, stale "next lesson" titles (now derived automatically, so just omit that field).

## 3. Output schema (every field required unless marked optional)

```json
{
  "id": "towns-near-rivers",
  "oldId": "l6",
  "number": 10,
  "section": "geography",
  "title": "Why do people build towns near rivers?",
  "essentialQuestion": "What makes one place better than another for a community to live?",
  "learningGoal": "Explain how rivers help communities and what problems they can bring.",
  "warmUp": {
    "question": "Look at the map. Where would you build a new town?",
    "options": ["Near the river", "On the hill", "In the forest"]
  },
  "evidence": {
    "fictional": true,
    "label": "Fictional example created for this lesson.",
    "question": "What do you notice about each place on the map?",
    "cards": [ { "type": "map", "title": "Riverlands", "locations": [ { "id": "a", "label": "River site", "description": "..." } ], "legend": [ { "label": "River", "color": "blue" } ] } ]
  },
  "read": {
    "sections": [
      { "heading": "Rivers give water and food", "text": "...", "simpler": "..." },
      { "heading": "Rivers help people travel and trade", "text": "...", "simpler": "..." },
      { "heading": "Rivers can also bring problems", "text": "...", "simpler": "..." }
    ],
    "glossary": [
      { "word": "settlement", "forms": ["settlements"], "definition": "A place where people live together, like a village or town.", "example": "The first settlement in Riverlands was next to the river." }
    ],
    "checks": [
      { "type": "choice", "question": "...", "options": [
          { "text": "...", "correct": false, "feedback": "Not quite. ..." },
          { "text": "...", "correct": true,  "feedback": "Yes. ..." },
          { "text": "...", "correct": false, "feedback": "Not quite. ..." } ] },
      { "type": "choice", "question": "...", "options": [ ... ] },
      { "type": "think", "question": "...", "placeholder": "...", "optional": true }
    ]
  },
  "write": {
    "prompt": "...",
    "sentenceStarters": ["...", "...", "...", "..."],
    "planningBoxes": ["My main idea", "Evidence from the lesson", "Why it matters", "A question I still have"],
    "selfCheck": ["I named one place.", "I gave two reasons.", "I named one problem."],
    "example": "..."
  },
  "speak": {
    "partnerTask": "...",
    "independentTask": "..."
  },
  "watch": {
    "youtubeId": "abc123",
    "title": "...",
    "channel": "...",
    "durationSeconds": 250,
    "why": "...",
    "beforeQuestion": "...",
    "afterQuestion": "...",
    "summary": "...",
    "keyPoints": ["...", "...", "..."],
    "contentNote": null,
    "replacementSuggestion": null
  },
  "reflect": {
    "prompts": [ { "text": "...", "required": true }, { "text": "...", "required": false } ],
    "completionMessage": "You finished Lesson 10. You explained why many towns grow near rivers."
  },
  "visual": { "type": "map", "description": "...", "alt": "..." },
  "sources": [ { "label": "National Geographic Education: Settlement", "url": "https://..." } ],
  "sensitiveNotes": ["..."],
  "educatorNotes": ["..."],
  "changes": ["..."]
}
```

Field rules:
- `id`: use the slug from the table in section 8. `oldId`: the Base44 `id`. `section`: `history`, `geography`, `culture` or `civics`.
- `learningGoal`: one sentence starting with a verb (Explain, Compare, Describe, Use...).
- `warmUp`: one short question before reading; `options` optional (2–4 short options). Any answer is accepted; it just gets the learner thinking.
- `evidence`: **every lesson has it**. `fictional: true` plus the label "Fictional example created for this lesson." for invented material; `fictional: false` and `label: null` for real material (then cite it in `sources`). `question`: one observation prompt. Card `type` is one of:
  - `items`: `{ "type": "items", "title": "...", "items": ["...", "..."] }`
  - `timeline`: `{ "type": "timeline", "title": "...", "events": [ { "year": "...", "text": "..." } ] }`
  - `map`: `{ "type": "map", "title": "...", "locations": [ { "id": "a", "label": "...", "description": "..." } ], "legend": [ { "label": "...", "color": "blue|green|brown|grey|yellow" } ] }`
  - `cases`: `{ "type": "cases", "title": "...", "cases": [ { "name": "...", "body": "..." } ] }`
  - `sources`: `{ "type": "sources", "title": "...", "sources": [ { "caption": "...", "details": ["..."] } ] }`
  - `table`: `{ "type": "table", "title": "...", "columns": ["...", "..."], "rows": [ ["...", "..."] ] }`
  Invented names should be varied, easy to read and not tied to one nationality. Places are invented (Bayview, Riverlands). No war, violence or disaster scenes.
- `read.sections`: 2 or 3 sections. Headings are short statements in sentence case.
- `read.glossary`: 4–6 words for the whole lesson. Definitions are 14 words or fewer, use easier words than the word itself, and are not circular. The example ties to this lesson. **Each glossary word (or one of its `forms`) must appear in the `text` AND the `simpler` of at least one section.** `forms` is optional.
- `read.checks`: exactly two `choice` questions, then one `think` question.
  - `choice`: exactly 3 options, exactly one `correct: true`. Every option has feedback. Correct feedback starts "Yes." and says why, using the lesson. Wrong feedback starts "Not quite." and points back to the text without shaming. Options are similar in length. No "all of the above", no "Which is NOT...". **Vary where the correct option sits**: across your lessons use first, second and third about equally, and don't let the correct option be the longest one most of the time. (The site also shuffles, but the data must not have a pattern.)
  - `think`: an open question, `optional: true`, with a helpful `placeholder`.
- `write.prompt`: one clear task in 1–2 sentences that can be answered with the lesson's evidence. `sentenceStarters`: 4–5 that fit the prompt, ending in "..." or a blank "___". `planningBoxes`: 3–4 from this set (reword only if needed): "My main idea", "Evidence from the lesson", "Why it matters", "A question I still have". `selfCheck`: exactly 3 items, each starting "I ..." and matching the prompt. `example`: a model answer of 60–100 words that uses the starters and the evidence.
- `speak`: `partnerTask` and `independentTask`, 1–2 short sentences each. (The "how I practised" options, including quietly or in writing, are the same for every lesson and live elsewhere.)
- `watch`: take `youtubeId` from the Base44 `videoUrl`. Keep `title`, `channel` and `durationSeconds` (`null` if unknown). `why` is one sentence on why this video fits. Rewrite `beforeQuestion`, `afterQuestion`, `summary` and `keyPoints` at the reading level below. `summary` is 90–140 words and must stand alone for learners who cannot load the video. `contentNote` is `null` or a short note for educators (see section 6).
- `reflect.prompts`: exactly 2 sentence stems: the first `required: true`, the second `required: false`. `completionMessage`: "You finished Lesson N. You ..." (one or two sentences).
- `visual`: a plan for one new picture the team will draw later: `type` is `map`, `timeline`, `diagram` or `illustration`; `description` says exactly what it shows; `alt` is the alt text (one or two sentences). Use `null` only if a picture would not help.
- `sources`: 2–4 real pages. Keep valid Base44 sources. **Never invent a URL**: only use URLs you have seen in search results or fetched.
- Notes for teachers, 1–4 in all, in two lists (either can be `[]`, but not both):
  - `sensitiveNotes`: sensitive points: what may be hard or personal for learners, what never to ask, which video to preview because of what it shows. The educator pages (teacher guide, Educators page) show these first, marked "Sensitive topics".
  - `educatorNotes`: everything else: what they could swap for a local example, teaching tips, notes about a video's level or accuracy.
- `changes`: 3–8 short bullets saying what you changed compared with Base44, for the reviewers.

## 4. Reading level and length (the checker measures these)

| Part | Length | Level (Flesch–Kincaid grade) | Sentences |
|---|---|---|---|
| All `text` in a lesson | 220–320 words | 5.0–6.5 | average 15 words or fewer |
| All `simpler` in a lesson | 130–220 words | 3.5 or lower (aim 2.5–3.5) | average 9 words or fewer; none over 14 |
| Everything else learners read (warm-up, checks, feedback, prompts, starters, example, summary, reflect) | short | 5.5 or lower | short |

How to write `simpler`:
- It has the same ideas, in the same order, with the same glossary words, but not the same sentences.
- One idea per sentence. Common words. Present tense where you can. Active voice.
- No idioms, no "which/whereas/however" chains, no long lists (three items at most).
- Explain an idea instead of naming it, except for the glossary words, which stay.

How to write `text`:
- Clear and concrete, with an example in every section. Explain every idea you introduce.
- Use the fictional evidence in the text so the lesson hangs together.

## 5. Respect and safety (most important)

- **Never ask learners about their journey, why they left, their home country, their family members, losses, legal status, religion or ethnicity.** If a prompt invites a personal connection, always offer a non-personal option, for example "a place you know, or a place from the lesson". Say "a community you know", not "your country".
- No graphic violence, war, persecution or disaster detail. Where a topic touches something hard, keep it short and factual and add a `sensitiveNotes` entry.
- Do not use the word "refugee" in learner-facing text unless it is essential. Learners are learners.
- Religion: respectful and neutral. Never rank beliefs. "Many people believe..." for faith accounts; "Scientists explain..." for science. Different accounts can answer different questions (Lesson 4).
- Money (Lessons 20–22): adapt a little, don't rewrite the lesson. Learners may not be allowed to work, may have no bank account, may depend on aid, and may not know their future. Use examples such as: a family deciding how to use a small amount of money or food, sharing a phone or mobile data, a small market stall, swapping goods or skills, saving small amounts in a safe place or a community savings group, short-term goals (learning English, a skill, staying healthy). Avoid: salaries, "getting a job", bank loans, credit cards, mortgages, owning a home, long career plans, "your parents' jobs". Keep it general, not Indonesia-specific, and note in `educatorNotes` which examples a partner could localise.
- Belonging (Lesson 19): belonging can be to a class, a team, a group of friends, a language, a hobby. Never require talking about home or family.
- Don't assume learners live with parents, own a phone, or have been to school regularly.
- Use examples from many regions (Asia, Africa, the Middle East, the Americas, Europe, the Pacific), not only Western ones.

## 6. Videos

- Keep each lesson's video. Put any Base44 content warning into `contentNote` (Lesson 9: slavery and exploitation; 13: extreme weather footage; 14: landslides and dangerous rainfall; 19: personal reflections from young people; 24: climate impacts).
- Suggest a replacement only for these, in `replacementSuggestion` as `{ "youtubeUrl": "...", "title": "...", "channel": "...", "why": "...", "verify": true }`:
  - Lesson 2 (it shares Lesson 1's video)
  - Lesson 18 (it shares Lesson 15's video)
  - Lesson 3 (the Big Bang video may not fit "changing scale")
  - Lesson 4 (Big Bang video for a lesson about origin accounts; suggest something neutral if you can)
  Only suggest a video if a search result shows its real YouTube URL and title together, from a reputable educational channel. If you can't find one, leave `null` and say so in `changes`.

## 7. Style

- British spelling: colour, centre, organise, urbanisation, practise (verb), practice (noun).
- Sentence case for headings. Second person ("you"). Warm and direct. No emoji. No exclamation marks except, at most, one in the completion message.
- "Not quite." for wrong answers, never "Wrong".
- Numbers: digits for 10 and above; words below 10 unless it is a date or statistic.
- Accuracy matters more than anything: if you are not sure a fact is true, check it or leave it out. Avoid precise statistics that go out of date unless you cite them.

## 8. Slugs

| # | id | # | id |
|---|---|---|---|
| 1 | finding-out-about-the-past | 13 | climate-and-seasons |
| 2 | objects-and-people | 14 | responding-to-environmental-change |
| 3 | changing-scale | 15 | objects-and-identity |
| 4 | origin-accounts | 16 | languages-connect-people |
| 5 | early-humans | 17 | why-traditions-matter |
| 6 | farming-changes-societies | 18 | art-tells-stories |
| 7 | cities-and-states | 19 | what-belonging-means |
| 8 | trade-connects-communities | 20 | making-choices |
| 9 | inventions-and-daily-life | 21 | trade-and-exchange |
| 10 | towns-near-rivers | 22 | planning-for-the-future |
| 11 | maps-and-places | 23 | trustworthy-information |
| 12 | how-cities-grow | 24 | young-people-contribute |

## 9. Process for each lesson

1. Read the Base44 lesson and its video entry.
2. Research what you need to expand it accurately.
3. Write `L{NN}.json`.
4. Run the checker and fix every ERROR. Fix WARNINGs unless you have a good reason (say why in your final report).
5. When all your lessons are done, run the checker on all of them together (`check_lesson.py L01.json L02.json ...`) to see the answer-position summary, and fix any pattern.
6. Report briefly: which lessons, the final checker numbers, anything you could not do, and anything the reviewers should look at.
