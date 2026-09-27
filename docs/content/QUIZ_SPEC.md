# Section checks: writer's spec

A section check comes after each of the four sections. It helps learners and teachers see what stuck. It never blocks anything, has no timer and can be retried. Learners are the same as in `SPEC.md` section 1: refugee and displaced young people, about 10–17, many learning English.

Read `SPEC.md` sections 1, 4 (reading level), 5 (respect and safety) and 7 (style) first. They all apply here.

## Files

Write `content/quizzes/{section}.json` where section is `history`, `geography`, `culture` or `civics`. Base every question on the version 2 lessons in `content/lessons/` (not the Base44 text). Check with:

`python3 scripts/check_quiz.py <file.json>`

## Schema

```json
{
  "section": "geography",
  "title": "Section check: Geography & Our Environment",
  "intro": "10 questions about Lessons 10–14. Take your time. You can look back at the lessons and try again as often as you like.",
  "questions": [
    {
      "id": "geography-01",
      "lesson": 10,
      "skill": "understand",
      "stimulus": null,
      "question": "Why did many early farming towns grow beside rivers?",
      "options": [
        { "text": "...", "correct": true,  "feedback": "Yes. ..." },
        { "text": "...", "correct": false, "feedback": "Not quite. ... Look back at Lesson 10." },
        { "text": "...", "correct": false, "feedback": "Not quite. ... Look back at Lesson 10." }
      ]
    }
  ],
  "results": {
    "high": "...",
    "middle": "...",
    "low": "..."
  }
}
```

- Number of questions: History 12 (it has 9 lessons), Geography 10, Culture 10, Civics 10.
- Coverage: every lesson in the section gets at least one question; History lessons 1–9 get one each plus three more spread across them; the other sections get two per lesson.
- `skill` is one of:
  - `vocabulary`: what a key word from the lesson means, or which word fits a short sentence. Use each lesson's glossary words.
  - `understand`: a main idea from the reading.
  - `evidence`: what a piece of evidence shows, or which evidence best supports an idea.
  - `apply`: use an idea from the lesson on a new short example in `stimulus`.
  Aim for about a quarter of each: at least 2 `vocabulary`, 3 `understand`, 2 `evidence` and 2 `apply` per quiz.
- `stimulus` is `null` or a short new example the question refers to: `{ "type": "text", "title": "...", "body": "..." }` (body 25–60 words) or `{ "type": "items", "title": "...", "items": ["...", "..."] }`. New examples are invented, labelled clearly as made-up ("A made-up town"), use invented names, and follow the same safety rules as lesson evidence.
- Each question: exactly 3 options, exactly one correct. Correct feedback starts "Yes." and explains why in one or two short sentences. Wrong feedback starts "Not quite.", explains kindly, and ends with "Look back at Lesson N." (or "Look back at Lessons N and M.").
- Don't copy the lessons' own quick-check questions. Test the same ideas in new words or with new examples.
- A learner who read the lessons (not the videos) must be able to answer everything. Never test a detail only in a video, a source link or an educator note.
- No trick questions, no "all of the above" or "none of the above", no negatives ("Which is NOT…"), no two correct-looking answers. Wrong options are plausible but clearly wrong from the lesson. Options are similar in length; the correct one is not usually the longest.
- Spread the correct answer across first, second and third place about equally within each quiz.
- Reading level: every question, option and feedback line at Flesch–Kincaid grade 5.5 or lower; short sentences.
- `results`: three short, warm messages (one or two sentences each) for a high score (8+ of 10, 10+ of 12), a middle score and a low score. They never shame; the low one suggests looking back at the lessons and trying again.
- Sensitive lessons: for Lesson 4 (origin accounts) only ask about the idea that different kinds of accounts answer different questions and about respect; never ask learners to judge a belief. For Lesson 19 (belonging) ask only about the ideas in the reading, never about the learner's own life. For Lessons 20–22 keep the lessons' examples (sharing data, a market stall, a savings tin); no jobs, salaries or bank accounts.
