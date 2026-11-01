# Digital World: draft lessons

Digital World is the second course: **AI and the digital world through a social studies lens**, in 17 lessons and four sections. It was rebuilt on 31 October 2026 from the first 11 drafts, at Justin's request: "not pure coding, or learning about digital tools (how to vibe code, how to prompt, AI terms)", but where AI came from, how it has developed and been put to work in society, its benefits, trade-offs and implications, in at most 20 lessons. The rules every lesson follows are in `docs/content/DIGITAL_WORLD_SPEC.md` (section 5) and `docs/content/SPEC.md`; the decision is in `docs/PRODUCT.md`.

**A preview, not yet reviewed.** The app shows these lessons only on a device that has turned on the Digital World preview (`/preview/digital-world`), with a "Draft course: not yet reviewed" banner on every page. Everyone else sees Our World as before, and nothing from this folder is in their download. How to preview it: `docs/notes/digital-world-preview.md`.

## The lessons

`course.json` is the course: its title, description and four sections. `lessons/` has one file per lesson; the file name is the lesson's number.

| # | Lesson (id) | Section | Activity | Status |
|---|---|---|---|---|
| 1 | What AI is, and what it isn't (`dw-what-ai-is`) | Thinking machines | `sort` | First draft, kept |
| 2 | Dreams of thinking machines (`dw-history-of-ai`) | Thinking machines | `sort`: magazine headlines, a big promise or a careful claim | New |
| 3 | How AI learns from examples (`dw-how-ai-learns`) | Thinking machines | `train-model` | First draft, kept |
| 4 | What a large language model is (`dw-language-models`) | Thinking machines | `sort`: what an LLM can and can't do | New |
| 5 | The hidden work behind AI (`dw-hidden-work`) | Who builds AI, and at what cost | `sort`: seen by users or hidden | New |
| 6 | Chips, power and water (`dw-cost-of-computing`) | Who builds AI, and at what cost | `sort`: a benefit or a cost for a town | New |
| 7 | Does AI speak your language? (`dw-ai-and-languages`) | Who builds AI, and at what cost | `compare-results`: one help screen in three languages | New |
| 8 | When AI gets it wrong (`dw-when-ai-gets-it-wrong`) | Who builds AI, and at what cost | `compare-results` | First draft, kept |
| 9 | AI at work: jobs that change (`dw-ai-and-work`) | AI in daily life | `sort`: AI could help, a person is needed, or both | New |
| 10 | AI in your community (`dw-ai-in-your-community`) | AI in daily life | `sort` | First draft, kept |
| 11 | AI at school: help or shortcut? (`dw-ai-at-school`) | AI in daily life | `ask-tool`: a labelled pretend tool | Reworked from "Asking an AI tool good questions" |
| 12 | Cameras that know faces (`dw-faces-and-cameras`) | AI in daily life | `sort`: helps, could harm, or depends on the rules | New |
| 13 | Spotting fake photos, videos and voices (`dw-spotting-fakes`) | Truth, power and choices | `sort` | First draft, kept |
| 14 | Checking a claim before you share it (`dw-checking-a-claim`) | Truth, power and choices | `check-claim` | First draft, kept |
| 15 | What your feed shows you (`dw-feeds-and-elections`) | Truth, power and choices | `sort`: likely to spread fast, or less likely | New |
| 16 | Who makes the rules for AI? (`dw-rules-for-ai`) | Truth, power and choices | `sort`: banned, strict rules, or allowed | New |
| 17 | Project: design an AI helper (`dw-design-an-ai-helper`) | Truth, power and choices | `design-plan` | First draft, kept |

Taken out in the rebuild, because they teach tool skills rather than social studies: "Scams: fake prizes, loans and job offers", "Your privacy", "Numbers that persuade" and "Asking an AI tool good questions". They are in `retired/`, which the app and the checkers don't load; the unit tests still play their activities (`spot-signs`, `chart-check`, the first `ask-tool`) so those players stay working.

The new lessons were drafted on 31 October 2026 by AI writers working from the spec, each fact from a source they opened (listed in each lesson's `sources`), every learner-facing example made up and carrying the fiction label. Every lesson passes `scripts/check_lesson.py` (wordfreq) and the build's zod and activity checks with no errors. Each lesson's `changes` says where it came from.

## Videos

None has been watched. Each title and channel was confirmed with YouTube's oEmbed; each summary was written from a published transcript, the publisher's description or a lesson plan, and each `contentNote` says which. **Someone must watch all 17 before learners see them.**

| # | Video | Channel | Length | Watch out for |
|---|---|---|---|---|
| 1 | What is Machine Learning? (`KHbwOetbmbs`) | Code.org | 2:53 | |
| 2 | What Is Artificial Intelligence? Crash Course AI #1 (`a0_lo_GDcFw`) | CrashCourse | about 11–12 min | Long; tells the "AI winters" more simply than the lesson. A shorter option is in the teacher notes (TED-Ed on the Turing test, `3wLqsRLvV-c`, 4:29). |
| 3 | How Computer Vision Works (`2hXG8v8p0KM`) | Code.org | 6:24 | Speakers name their companies. |
| 4 | How Chatbots and Large Language Models Work (`X-AWdfSFCHQ`) | Code.org | 7:20 | |
| 5 | Concerns rise over treatment of human workers behind AI technology (`hbxvccjQ-NI`) | PBS NewsHour | 5:56 | Chosen as a calm interview; other pieces describe what moderators saw. |
| 6 | Why are AI data centers using so much electricity? (`z3Y-gsBKChc`) | TED-Ed | 6:16 | Names Claude and ChatGPT. |
| 7 | Why AI doesn't speak every language (`a2DgdsE86ts`) | Vox | not confirmed | |
| 8 | AI: Training Data & Bias (`x2mRoFNm22g`) | Code.org | 2:41 | |
| 9 | The big debate about the future of work, explained (`TUmyygCMMGA`) | Vox | about 9 min | From 2017 and about the US; a newer one about generative AI would fit better. |
| 10 | Ethics & AI: Equal Access and Algorithmic Bias (`tJQSyzBUAew`) | Code.org | 3:23 | Speakers name their companies. |
| 11 | What are AI Chatbots? (`gmUHEvrpYoU`) | Common Sense Education | 3:20 | American cartoon for younger students. |
| 12 | Why Cities Are Banning Facial Recognition Technology (`sYftT5YgwVI`) | WIRED | 10:05 | **The riskiest choice: adult-level; mentions police, borders, an arrest, and fear around a place of worship. Must be previewed; likely to replace before refugee learners see it.** |
| 13 | AI Unlocked: Recognizing AI-generated content (`U3ct1Mi5njY`) | MediaWise | not confirmed | Shows real AI-made content. |
| 14 | Sort Fact from Fiction Online with Lateral Reading (`SHNprb2hgzU`) | Digital Inquiry Group | not confirmed | |
| 15 | Social media algorithms explained (`F5tz887wXCY`) | CBC Kids News | 3:02 | |
| 16 | Ethics of AI: Challenges and Governance (`VqFqWIqOB1g`) | UNESCO | 6:52 | From February 2023, before the EU's AI Act was agreed. |
| 17 | What is AI? (`b0KaGBOU4Ys`) | Common Sense Education | 2:37 | American cartoon for younger students. |

## For reviewers

From the writers' notes (each lesson's `educatorNotes`, `sensitiveNotes` and `changes` have the detail):

- **Sensitive topics for refugee learners.** Lesson 12 (facial recognition: police, borders, tracking) and Lesson 15 (elections, kept to a made-up town vote) each have sensitive notes; learners are never asked about their own experiences, status, country, family or languages. Lesson 5 keeps what content moderators had to see out of learner text. Lesson 9 leaves out the harsh punishments of the Luddites. Lesson 7 mentions colonialism briefly, as Masakhane's own description does.
- **Real names in learner text.** Some new lessons name real bodies and projects in the reading where they are the facts being taught (Turing, Dartmouth, Deep Blue, ChatGPT; SEA-LION, Sahabat-AI, Masakhane; UNESCO, the EU, San Francisco). Spec 5.3 kept real organisations to teacher notes for the first drafts; decide whether the rebuild's social studies lessons may name them.
- **Facts to check** (an AI-accuracy reviewer, spec 5.4): the dates of the "AI winters" (Lesson 2, simplified); ChatGPT's "100 million users" (an analyst estimate, said so); the IEA's data-centre electricity figures (Lesson 6, through Scientific American and Nature's report of them); Taiwan's share of advanced chips (a 2021 study); Batam data centres (one source); the ILO and IMF figures on jobs AI could affect, not jobs lost (Lesson 9); UNESCO's age guidance for generative AI in class (Lesson 11, "think about an age limit of 13"); the EU AI Act's limits on facial recognition, simplified (Lessons 12 and 16), with no dates for its high-risk rules, which have moved; "filter bubbles" described as a worry research has tested, not a proven fact (Lesson 15).
- **Weaker sources** where an official page couldn't be opened: Lesson 2 cites Wikipedia for Turing's 1950 paper and TechTarget for the AI winters; Lesson 9 cites a blog post on James Bessen's bank-teller research; Lesson 12 cites the NIST report's PDF and copies of UNESCO's releases.
- **Older questions still open from the first drafts:** whether every activity type is worth keeping; whether the design plan in Lesson 17 should count towards Write; Lesson 17's 40–60 minutes; overlap between Lesson 14 and Our World Lesson 23.

## What still needs doing

- **Review by Justin:** level, tone, the outline and the activities.
- **AI-accuracy review** (above) and **partner review** of the sensitive notes (Lessons 5, 7, 12, 13, 15).
- **Watch all 17 videos** and replace any that don't suit (Lesson 12 first).
- **Pictures:** 17 to draw, following `docs/content/VISUALS_SPEC.md`; each `visual.description` says what to show. Until then the lessons show none.
- **Section checks:** none yet; one per section, written to `docs/content/QUIZ_SPEC.md`. The preview offers no certificates.
- **Indonesian and Malay**, by the same process as Our World, once the English is reviewed. Until then the lessons are English under an Indonesian or Malay interface, marked `lang="en"`.
- **App work** before Digital World is switched on for everyone (spec section 9).
