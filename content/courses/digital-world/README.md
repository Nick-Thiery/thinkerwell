# Digital World: draft lessons

Digital World is the second course: **AI and the digital world through a social studies lens**, in 17 lessons and four sections. It was rebuilt on 31 October 2026 from the first 11 drafts, at Justin's request: "not pure coding, or learning about digital tools (how to vibe code, how to prompt, AI terms)", but where AI came from, how it has developed and been put to work in society, its benefits, trade-offs and implications, in at most 20 lessons. The rules every lesson follows are in `docs/content/DIGITAL_WORLD_SPEC.md` (section 5) and `docs/content/SPEC.md`; the decision is in `docs/PRODUCT.md`.

**Open on every device since 9 November 2026, facts still being checked.** The lessons are at `/course/digital-world`, with a line on the map that the course is new and an AI researcher is still checking its facts (`/preview/digital-world` goes to the map). Nothing from this folder is in a first visit's download; it is kept for offline use as the other courses are (`docs/notes/offline-courses.md`). How it was built: `docs/notes/digital-world-preview.md`.

## The lessons

`course.json` is the course: its title, description and four sections. `lessons/` has one file per lesson; the file name is the lesson's number.

| # | Lesson (id) | Section | Activity | Status |
|---|---|---|---|---|
| 1 | What AI is, and what it isn't (`dw-what-ai-is`) | How AI developed and how it works | None (since 8 November 2026) | First draft, kept |
| 2 | Dreams of thinking machines (`dw-history-of-ai`) | How AI developed and how it works | None (since 8 November 2026) | New |
| 3 | How AI learns from examples (`dw-how-ai-learns`) | How AI developed and how it works | `train-model`, an optional extension | First draft, kept |
| 4 | What a large language model is (`dw-language-models`) | How AI developed and how it works | None (since 8 November 2026) | New |
| 5 | The hidden work behind AI (`dw-hidden-work`) | Who builds AI, and at what cost | None (since 8 November 2026) | New |
| 6 | Chips, power and water (`dw-cost-of-computing`) | Who builds AI, and at what cost | None (since 8 November 2026) | New |
| 7 | Does AI speak your language? (`dw-ai-and-languages`) | Who builds AI, and at what cost | None (since 8 November 2026) | New |
| 8 | When AI gets it wrong (`dw-when-ai-gets-it-wrong`) | Who builds AI, and at what cost | None (since 8 November 2026) | First draft, kept |
| 9 | AI at work: jobs that change (`dw-ai-and-work`) | AI in daily life | None (since 8 November 2026) | New |
| 10 | AI in your community (`dw-ai-in-your-community`) | AI in daily life | None (since 8 November 2026) | First draft, kept |
| 11 | AI at school: help or shortcut? (`dw-ai-at-school`) | AI in daily life | `ask-tool` | Reworked from "Asking an AI tool good questions" |
| 12 | Cameras that know faces (`dw-faces-and-cameras`) | AI in daily life | None (since 8 November 2026) | New |
| 13 | Checking photos, videos and voices (`dw-spotting-fakes`) | Truth, power and choices | None (since 8 November 2026) | First draft, kept |
| 14 | Checking a claim before you share it (`dw-checking-a-claim`) | Truth, power and choices | `check-claim` | First draft, kept |
| 15 | What your feed shows you (`dw-feeds-and-elections`) | Truth, power and choices | None (since 8 November 2026) | New |
| 16 | Who makes the rules for AI? (`dw-rules-for-ai`) | Truth, power and choices | None (since 8 November 2026) | New |
| 17 | Project: design an AI helper (`dw-design-an-ai-helper`) | Truth, power and choices | `design-plan` | First draft, kept |

Taken out in the rebuild, because they teach tool skills rather than social studies: "Scams: fake prizes, loans and job offers", "Your privacy", "Numbers that persuade" and "Asking an AI tool good questions". They are in `retired/`, which the app and the checkers don't load; the unit tests still play their activities (`spot-signs`, `chart-check`, the first `ask-tool`) so those players stay working. Since 8 November `retired/` also keeps Lesson 1 and Lesson 8 as they were on 2 November (`DW01-ai-or-not.json`, `DW08-comparing-results.json`), so the `sort` and `compare-results` players, which no current lesson uses, stay tested.

The new lessons were drafted on 31 October 2026 by AI writers working from the spec, each fact from a source they opened (listed in each lesson's `sources`), every learner-facing example made up and carrying the fiction label. Every lesson passes `scripts/check_lesson.py` (wordfreq) and the build's zod and activity checks with no errors. Each lesson's `changes` says where it came from.

## Revised from Justin's review (1 November 2026)

Justin's review ("Digital World: focused review and curriculum revision guidelines") asked for targeted edits, not a rewrite: the 17 lessons, their ids, sections, activities and reading levels stay. What changed:

- **Section 1 is historical as well as explanatory.** Lesson 2 is the history lesson: its evidence is now real and dated (the Dartmouth proposal of 31 August 1955 for the 1956 summer project, and a timeline from 1950 to 2012), rules and learning from examples are shown side by side, the "AI winters" are dated and sourced, and the made-up magazine headlines are a labelled claims exercise in the activity. Lessons 1, 3 and 4 each have a short, sourced history note. The section's description says it traces how AI developed; its title ("Thinking machines") is unchanged (the review offers "How AI developed and how it works" as an option).
- **Real Southeast Asian work:** SELENA+ (Singapore, eye screening, Lesson 10), Traffy Fondue (Thailand, residents' reports, then Lessons 16 and 17; since 8 November taught in Lesson 10) and Eco Pulse (Malaysia, a recycling prototype by three 15-year-olds, Lesson 17), each described only as far as its sources go (a prototype, a tested system or an operating service), next to the made-up examples, which stay labelled. Lesson 17's evidence is now these real cases; its made-up starter plans are in the reading and the activity.
- **Facts qualified in both reading levels**, in the quick checks and their feedback, the activities, the written Watch versions and the teacher notes: what AI is (some follows rules), tokens, training data, data centres "usually", all data centres versus AI, jobs "exposure" (ILO 2025) not job loss, low-resource languages, causes of bias, the studies in Lessons 11, 14 and 15 named with their dates and scope, the EU AI Act's actual limits and dates, "no special AI rules" not meaning no laws.
- **Answers grounded in reasons:** activities no longer say "what most people would say"; they give one possible answer and its reason, accept other justified answers on questions of judgment, and keep one right answer on factual ones. Recommendations are kept separate from what a law says (Lesson 16).
- **Lesson 13** is now "Checking photos, videos and voices": checking the source is the skill, and odd details are a reason to check, never proof.
- **Sources:** every changed fact comes from a source the writers opened, listed in each lesson's `sources` (up to six), and each lesson has a claim record in `claims/DW01.md`…`DW17.md`: claim, source, date and what the source actually establishes, with what couldn't be confirmed.
- **Printed sheets** say "Thinkerwell · Digital World", not "Exploring Our World".

Done since: Lesson 3's genuinely new test set, Round 4 (four leaves no earlier round used; the model gets 3 of 4), and (8 November, below) the Section 1 title and real names in learner text. Still open from the review: several older sources kept from the first drafts without being reopened (each claim record lists them); some sources the writers couldn't open (the Computer History Museum timeline, the IEA's own pages, sea-lion.ai, SNEC's SELENA+ page, NECTEC's Traffy page), for which they used other reputable sources.


## Revised from Justin's teaching brief (8 November 2026)

Justin's brief of 4 November ("Digital World: revised teaching brief") supersedes the earlier rule that every lesson has an activity: **a Read section does not need an activity**. The 17 lessons, their ids and sections stay; what changed:

- **Fewer tasks, more teaching.** Thirteen lessons have no activity now; four keep one where it teaches something a reading can't: Lesson 3's leaf model (an **optional extension**, folded under "Try it yourself", with all four rounds), Lesson 11's pretend helper, Lesson 14's sideways reading and Lesson 17's design plan (the single working document, reused in Write and Speak). Most lessons begin with the reading (no warm-up), have one or two quick-check questions or none, no planning boxes or self-check in Write, and one Reflect prompt; most are now "About 25–40 min". Removed work was not moved into other steps.
- **Section 1 is now "How AI developed and how it works"** (Justin's decision). Lesson 2 is the historical anchor: the 31 August 1955 Dartmouth proposal as real, dated evidence (its authors, institutions and hopes), the Rockefeller Foundation's $7,500 grant (National Research Council history), military funding, AI winters, expert systems from the 1960s and Japan's Fifth Generation project (Computer History Museum timeline), and rules and learning overlapping. Lessons 1, 3 and 4 have a worked example each and a short link to how their approach developed.
- **Real cases in the teaching:** Nuru, a cassava-leaf app tested in Tanzania (Lesson 3); SEA-LION, SEALD and Sahabat-AI (Lesson 7); Kid-Whisper and ImageNet (Lesson 8); Traffy Fondue in Bangkok, taught in depth with what its numbers can and can't show (Lesson 10); the Nigeria and Türkiye studies with their age groups, subjects, length and teacher support (Lesson 11); Changi Airport's passport-free clearance, NIST's 2019 tests and the EU AI Act's bans (Lesson 12); and in Lesson 17 a youth case and a professional one from two countries: Eco Pulse (three 15-year-olds in Johor, a prototype) and SELENA+ (Singapore, validated in a 2017 study, its national use reported by its developers). Proposal, prototype, validation, deployment and impact are kept apart.
- **Accuracy:** every correction in the brief's section 11, in both reading levels, the checks, glossary, teacher notes and written Watch versions. The 800 kg and "30–50 jobs" figures are gone from learner text.
- **Sources:** every new claim comes from a page the writers opened on 8 November (through web search, then the page reader); each claim record (`claims/DW01.md`…`DW17.md`) says what was checked that day and what couldn't be (the IEA's own pages, sea-lion.ai, NECTEC's award page, the Commission's AI Act page), with the reputable source used instead.
- **Videos** are unchanged and still unwatched; their written versions were corrected where they made claims.

## Videos

None has been watched. Each title and channel was confirmed with YouTube's oEmbed; each summary was written from a published transcript, the publisher's description or a lesson plan, and each `contentNote` says which. **Someone must watch all 17 before learners see them.**

| # | Video | Channel | Length | Watch out for |
|---|---|---|---|---|
| 1 | What is Machine Learning? (`KHbwOetbmbs`) | Code.org | 2:53 | |
| 2 | What Is Artificial Intelligence? Crash Course AI #1 (`a0_lo_GDcFw`) | CrashCourse | None (since 8 November 2026) | Long; tells the "AI winters" more simply than the lesson. A shorter option is in the teacher notes (TED-Ed on the Turing test, `3wLqsRLvV-c`, 4:29). |
| 3 | How Computer Vision Works (`2hXG8v8p0KM`) | Code.org | `train-model`, an optional extension | Speakers name their companies. |
| 4 | How Chatbots and Large Language Models Work (`X-AWdfSFCHQ`) | Code.org | 7:20 | |
| 5 | Concerns rise over treatment of human workers behind AI technology (`hbxvccjQ-NI`) | PBS NewsHour | None (since 8 November 2026) | Chosen as a calm interview; other pieces describe what moderators saw. |
| 6 | Why are AI data centers using so much electricity? (`z3Y-gsBKChc`) | TED-Ed | None (since 8 November 2026) | Names Claude and ChatGPT. |
| 7 | Why AI doesn't speak every language (`a2DgdsE86ts`) | Vox | not confirmed | |
| 8 | AI: Training Data & Bias (`x2mRoFNm22g`) | Code.org | 2:41 | |
| 9 | The big debate about the future of work, explained (`TUmyygCMMGA`) | Vox | None (since 8 November 2026) | From 2017 and about the US; a newer one about generative AI would fit better. |
| 10 | Ethics & AI: Equal Access and Algorithmic Bias (`tJQSyzBUAew`) | Code.org | None (since 8 November 2026) | Speakers name their companies. |
| 11 | What are AI Chatbots? (`gmUHEvrpYoU`) | Common Sense Education | `ask-tool` | American cartoon for younger students. |
| 12 | Why Cities Are Banning Facial Recognition Technology (`sYftT5YgwVI`) | WIRED | None (since 8 November 2026) | **The riskiest choice: adult-level; mentions police, borders, an arrest, and fear around a place of worship. Must be previewed; likely to replace before refugee learners see it.** |
| 13 | AI Unlocked: Recognizing AI-generated content (`U3ct1Mi5njY`) | MediaWise | None (since 8 November 2026) | Shows real AI-made content. |
| 14 | Sort Fact from Fiction Online with Lateral Reading (`SHNprb2hgzU`) | Digital Inquiry Group | not confirmed | |
| 15 | Social media algorithms explained (`F5tz887wXCY`) | CBC Kids News | 3:02 | |
| 16 | Ethics of AI: Challenges and Governance (`VqFqWIqOB1g`) | UNESCO | None (since 8 November 2026) | From February 2023, before the EU's AI Act was agreed. |
| 17 | What is AI? (`b0KaGBOU4Ys`) | Common Sense Education | `design-plan` | American cartoon for younger students. |

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
- **Indonesian and Malay: native-speaker review.** Both were drafted by AI in November 2026 (`id/`, `ms/`; notes and `TERMS.md` in `docs/translation/<code>/notes/courses/digital-world/`), every string flagged. Look first at: "kecerdasan artifisial" or "kecerdasan buatan" (Indonesian); "diharamkan" for a legal ban in Lesson 12 (Malay); the Batam and Johor data-centre passages (Lesson 6) and Sahabat-AI (Lesson 7); "pendedahan"/"keterpaparan" for job exposure (Lesson 9); OSIS (Lesson 16). When the English changes, `npm run check:content` lists the stale strings.
- **App work:** done for the pilot (open on every device since 9 November 2026, kept offline with the other courses); the rest of spec section 9 is the list above.
