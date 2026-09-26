# QuestionCard

A question with its lettered options and feedback, for quick checks and section quizzes.

Props: `eyebrow` ("Question 3 of 10"), `prompt`, `options` (strings), `selected` (index), `result` correct | retry, `feedback`, `id`, `children` (e.g. a Check answer button).

- Options are shuffled when the lesson loads, so the right answer is not always the same letter.
- Unlimited tries. The score is only shown to the learner.
