# Review log: Lessons 13–24

Reviewer pass after the v2 rewrite. All 12 files still pass the checker (0 errors). The only warnings are rare words that are names of things explained in the same sentence (equator, batik/kente/tapa, couscous/kimchi/lakalaka). Correct-answer positions are unchanged (1: 9, 2: 7, 3: 8).

I found every URL in `sources` and `replacementSuggestion` in search results or fetched it, so none were removed. Where I could get a transcript (NatGeo, UNICEF disability, Ayala, TED-Ed x2, CASEL, ABC, both Teaching Without Frills videos) or a description (Smithsonian), I checked the video summaries against it.

## L13 Climate and seasons
- Simpler: "Near the middle of Earth" could be read as the inside of Earth. It now says "The equator is a line around Earth's middle." I also shortened the Mongolia sentence to stay under 220 words, and dropped "sheep and goats", which is not in the main text.
- Check 2: changed "Writing down the heat each day" (odd English) to "Writing down how hot it is each day", and changed its feedback to match.
- Write prompt: cut from three sentences to two, as the spec asks.

## L14 Responding to environmental change
- Simpler: "This is inclusion. It means..." had no clear referent. It now says "When everyone can use a plan, that is called inclusion."
- Check 2 feedback: "Section 3" became "the lesson" and "the part about a good plan", because learners do not see section numbers.
- Video summary: rewritten from the transcript. The video is about children with disabilities: not every child can hear a warning siren or run to safety, and it asks for warnings, safe paths and shelters that work for everyone.

## L15 Objects and identity
- Simpler: "got it as a gift at a new school" became "...when they started at a new school", to match the text.
- Video summary and key points: the old summary said the video shows "cloth, tools and containers", which was not accurate. The video shows a Chinese celadon pot with dragons, a salakot hat and a handkerchief with a poem. Rewrote both to match.

## L16 Languages connect people
- "Hillside Community Centre" became "Hillside Learning Centre", to match L20, L23 and L24. No details clash: food on Friday at 4 p.m., a free room on Tuesday afternoons, and closed Tuesday 9 to 12.
- The example answer did not do what the prompt and self-check ask: it explained the existing pictures, not the two suggested changes. Rewrote it so it gives two changes, how each helps and one limit.
- Simpler: "Take the word 'coffee'" (an idiom) became "Look at the word 'coffee'."
- Video summary: removed claims the video does not make ("no language is better", "holds the knowledge..."). Experts compare grammar and basic words, not just similar words (the video says similar words can mislead). Added the video's "3,000 to 8,000 languages" point. Changed key point 3 to match.

## L17 Why traditions matter
- Simpler: two sentences had "welcome" with no object ("welcome there", "meet and welcome"). Fixed both.
- Simpler: "a spicy food called kimchi" became "kimchi from vegetables". Not all kimchi is spicy.

## L18 Art tells stories
- Video summary: rewritten to match the real objects in the video (see L15), using its details as clues.
- replacementSuggestion channel: removed "(film by NHK)". I could not confirm it; the title "Vanuatu Sand Drawings" and the channel "UNESCO" are confirmed.
- Check 2 feedback: "the second section" became "the part about rock art".

## L19 What belonging means
- Video summary and key points: rewritten from the transcript. In the video, agency means feeling sure you can reach a goal, and belonging means staff knowing your name and sharing without being judged. I left out the video's mention of families on purpose.
- Simpler: "The UN says" became "A UN agreement says" (it is the Convention). Also "when all talk at once" became "when everyone talks at once".

## L20 Making choices
- Video summary: the "hour playing a game" example is not in the video. The summary now describes the video's real example: Mario, a phone, a games console and a cheaper phone with fewer features. It leaves out the part about his job. Key point 3 now matches ("time can be a cost").
- Educator note: now says exactly what the video shows, including "work an extra shift at his job".
- Simpler: an unclear "It is not only about money" became "Opportunity cost is not only about money."

## L21 Trade and exchange
- Renamed Tomas to Leo. L09 has "Tomas, repair shop owner"; here Tomas was a man trying to swap fish.
- Video summary and key points: rewritten from the transcript. The video recaps needs and wants and gives doctor, pilot and chef examples, plus the book/librarian and pizza/delivery puzzles. It does not talk about swapping.
- Simpler: "Fair trade helps..." (which reads like the Fairtrade label) became "When people trade fairly, they get more of what they need."

## L22 Planning for the future
- Renamed Lina to Mei. L09 has "Lina, market seller"; here Lina is a young learner.
- Video summary and key points: rewritten from the transcript: scarcity, a healthy lunch before a cupcake, spend now or wait and save, and "there is no one right answer". I removed claims the video does not make, such as "a simple plan helps".
- Added an educator note: the video opens with "many people earn money by working".

## L23 Trustworthy information
- Added a contentNote. The TED-Ed narration mentions secret wars, assassinations, terrorist attacks, natural disasters and protests (Arab Spring, Ukraine). It had no warning.
- Video summary and key points: rewritten from the transcript: find the first source, don't follow breaking news minute by minute, read several outlets, watch for "think/likely/probably" and unnamed sources, and check before sharing.
- Write prompt: the self-check asks about the old photo, but the prompt did not. It now also asks why Post C's photo proves nothing.

## L24 Young people contribute
- Safety: learners now ask bus users "with a teacher". This is changed in evidence Idea 2, the text, the simpler text and the example answer. Before, only the clean-up involved an adult.
- Simpler: "People a problem affects are stakeholders" (hard to parse) became "Stakeholders are people who are affected by a problem."

## Needs a human decision
- **L20 video**: Mario's example assumes his own spending money and a job ("work an extra shift"). This goes against the spec's money guidance. The summary and educator note now work around it, but consider replacing the video. ABC Education lists it at 1:53 if you want to fill in `durationSeconds`.
- **L23 video**: even with the new content note, decide whether a video that mentions wars, assassinations and terrorist attacks suits these learners.
- **L24 video**: I could not check what is in it. YouTube rate-limited me and I found no transcript. The summary still rests on Base44's description. Someone should watch it before use.
- **L24 scenario**: the bus stop is public space, so the centre manager may not really be the person who gives permission. The educator note already suggests moving it to a space at the centre. Consider making that the default.
- **Names**: L02 "Mina L." (an adult in an old notebook) and L20 Mina (a young learner) are different people with the same name. I left L20 alone. If the L01–12 reviewer renames L09's Tomas or Lina, my renames in L21 and L22 still work.
- **L21 and L22 videos** are made for grades 3–6 and may feel young to older learners. `durationSeconds` is still null for L16, L20, L21, L22 and L24. DCMP lists L21 at 3:00 and L22 at 2:37, but those are DCMP copies.
- **L18 replacement video** (UNESCO "Vanuatu Sand Drawings"): the title and channel are confirmed, but someone still needs to watch it (`verify: true`).
