/**
 * The prototype's own interface text, in English only.
 *
 * Dev only: CLAUDE.md rule 7 says every UI string lives in
 * src/i18n/messages/en.json, with English plurals and joined sentences never
 * built in code. This prototype (/dev/tiny-model, never in a production
 * build) keeps its words here instead so it can change quickly. When it
 * becomes a real lesson activity, every string below moves to en.json (with
 * notes in en.notes.json and ICU plurals in place of the `count === 1`
 * choices), goes through `t`/`tx` from useI18n(), and is translated into
 * Bahasa Indonesia with the lessons. The activity's own words (title,
 * instructions, card descriptions, debriefs) already come from the lesson
 * draft, drafts/digital-world/DW02.json.
 */

export const TEXT = {
  eyebrow: 'Digital World, Lesson 2 (prototype)',
  devNote:
    'Dev-only prototype. It is not part of the course and never reaches thinkerwell.app. Everything runs on this device; nothing is saved or sent.',
  roundsLabel: 'Rounds',
  stepOf: (n: number, of: number) => `Step ${n} of ${of}`,
  freePlayTitle: 'Try it yourself',
  freePlayIntro:
    'Take examples out, or change a label, then train the model again. The model follows your labels, even when they are different from the gardener’s.',
  newExamples: (count: number) => (count === 1 ? 'There is 1 new example to sort.' : `There are ${count} new examples to sort.`),
  noNewExamples: 'No new examples this time. Test the model on leaves from a new plant.',

  toSortTitle: 'To sort',
  toSortHelp: 'Give each leaf a label. It moves into that group.',
  notUsedTitle: 'Not used',
  notUsedHelp: 'The model does not learn from these. Give one a label to use it again.',
  groupTitle: { healthy: 'Healthy examples', sick: 'Sick examples' },
  groupEmpty: 'No examples here yet.',
  groupCount: (count: number) => (count === 1 ? '1 example' : `${count} examples`),
  labelFor: (description: string) => `Label for: ${description}`,
  takeOut: 'Take out',
  takeOutFor: (description: string) => `Take out: ${description}`,
  numbersSummary: 'What the model sees',
  numbersIntro: 'The model does not see the picture. It sees four numbers from 0 to 10:',

  train: 'Train the model',
  testNewPlant: 'Test the new leaves',
  trainHelpSort: (count: number) =>
    count === 1 ? 'Sort 1 more leaf to train the model.' : `Sort ${count} more leaves to train the model.`,
  trainHelpEmpty: 'Give at least one leaf a label to train the model.',
  changed: 'Your examples changed. Train the model again to see its new guesses.',

  resultsTitle: 'The model’s guesses',
  score: (right: number, of: number) => `The model got ${right} of ${of} right.`,
  learnedFrom: (count: number) => (count === 1 ? 'It learned from 1 example.' : `It learned from ${count} examples.`),
  modelSaid: 'The model said',
  gardenerSays: 'The gardener says',
  right: 'Right',
  notQuite: 'Not quite',
  lookedLike: (label: string) => `It looked most like this example, so the model said ${label.toLowerCase()}.`,
  yourLabelsDiffer:
    'Some of your labels are different from the gardener’s. The model learned your labels, so its guesses follow them.',

  next: {
    'round-2': 'Next: add more examples',
    'round-2-new-plant': 'Next: try a new plant',
    'round-3': 'Next: add the new plant',
    'free-play': 'Next: try it yourself',
  } as Record<string, string>,
  startAgain: 'Start again',

  historyTitle: 'Results so far',
  historyNone: 'No results yet. Train the model to see how it does.',
  historyScore: (right: number, of: number) => `${right} of ${of}`,

  howTitle: 'How this model works',
  how: [
    'It keeps every example you gave it, with your label.',
    'For a new leaf, it finds the example with the closest four numbers.',
    'It gives the new leaf that example’s label. This is called a nearest-neighbour model.',
  ],
} as const;
