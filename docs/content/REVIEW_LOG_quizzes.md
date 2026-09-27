# Review log: section checks

Independent review, 27 September 2026, of `history.json` (12 questions), `geography.json` (10), `culture.json` (10) and `civics.json` (10). I checked each question against the lesson it names: the reading (`text` and `simpler`), the evidence cards, the glossary and the quick-checks. I also read the watch summary, so I could spot details that appear only in a video. After the fixes, `check_quiz.py` shows 0 errors and 0 warnings for all four files. Answer positions, skill counts and lesson coverage are unchanged.

I changed 10 of the 42 questions. None had a wrong answer key or two answers a learner could defend. No fact contradicted its lesson, no question depends only on a video or link, and no question asks about the learner's own life, home, family, religion or ethnicity. The Lessons 20–22 questions contain no jobs, pay, loans or bank accounts.

## Fixes

- history-05 (L4): the wrong option "How did the stars and the Earth form?" was copied word for word from the lesson's evidence card and quick-check. It now reads "How did the sun and the planets form?", which tests the same idea in new words.
- history-07 (L5): the stem "Look at the clues from early human sites in Lesson 5" sent learners back to the lesson. It now reads "Archaeologists found these clues at early human sites." The options already describe each clue in full.
- history-09 (L7): the stem sent learners back to the Banwa timeline and asked "Which step…". But the timeline's Step 4 (leaders make rules about the water) also shows power, and it is not an option. The stem now says Banwa is a made-up city and asks "Which of these changes…", so it points only to the three options. Each option states its step in full.
- geography-02 (L10): the question could not be answered without the Riverlands map, because the options do not say which site each fact belongs to. I added a short stimulus with the map notes for the three sites, and the stem no longer says "Look at the Riverlands map in Lesson 10".
- geography-05 (L12): "What helped both of them grow quickly?" now ends "grow?". Lesson 12 says Nairobi "slowly grew into a city", so "quickly" invited an argument. See the human decisions below.
- geography-07 (L13): I split a 20-word sentence in the Kelmar stimulus into two sentences.
- geography-09 (L14): the options (which idea costs a lot, which needs a phone) depended on the Brookside ideas card. I added a short stimulus with the problem and Ideas A–C, and the stem no longer says "Look at the three ideas".
- culture-02 (L15): the correct museum label left out the owner's memory. That is the same gap Lesson 15 criticises in the museum's first label, and the feedback on another option said the drum "also holds a memory". The correct option now reads "For music. It holds a memory for its owner and a skill for its maker." Its feedback now names the seller, the owner and the maker.
- civics-07 (L23): learners had to remember Message F. I added a short stimulus with its four details from the lesson, and the stem now asks only which detail is a clue.
- civics-08 (L23): in an option, "straight away" now reads "right now", which is plainer for English learners.

## Needs a human decision

- Lesson 12's text (not a quiz problem): section 2 says Nairobi "slowly grew into a city" and then "In both places, new jobs and transport made the population grow quickly." Pick one version in `L12.json` and `lessons-v2.json`. geography-05 no longer depends on the word.
- Lessons 4 and 19 already have educator notes asking a local educator to review them before use. Please include history-05 (L4) and culture-10 (L19) in that review. Both test only ideas from the reading: different accounts answer different questions, and a group can change how it works. Neither asks about the learner's beliefs or life.
- history-12 (L9) and culture-09 (L19) both use a screen or notice "in only one language" as the example of a barrier. It fits both lessons, and many learners will recognise it. A local educator may want to confirm that it feels respectful to a group of English learners, and not pointed, or vary one of the two examples.
