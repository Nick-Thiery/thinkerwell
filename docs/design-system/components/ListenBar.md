# ListenBar

The controls that appear while a reading is read aloud (after the learner presses the Listen tool). It sits above the reading card.

Props: `state` playing | paused, `speed` slow | normal, `label` (default "Reading aloud").

- Uses the device's own voice (speech synthesis), so it works offline. Prefer a local English voice; never a voice that needs the internet.
- It reads whichever version is showing (standard or simpler English), from the first section to the last.
- Mark the sentence being read with `<mark class="tw-speaking">` inside the reading. That lemon highlight counts as the screen's one yellow highlight.
- "Slow" is about 0.8× speed. Stop hides the bar and returns focus to the Listen tool.
