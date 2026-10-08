/**
 * The tiny model behind Digital World Lesson 2's "train a tiny model"
 * activity (docs/content/DIGITAL_WORLD_SPEC.md, section 6): a
 * nearest-neighbour classifier with k = 1, in plain TypeScript.
 *
 * "Training" keeps a copy of the labelled examples (k-NN keeps its training
 * data rather than building a general model). To guess the label of a new
 * card, it finds the example with the smallest straight-line (Euclidean)
 * distance over the card's numbers and gives that example's label. Ties go
 * to the example added first. Everything runs on the device; nothing is
 * stored or sent anywhere.
 */

export interface LabelledExample<L extends string = string> {
  readonly id: string;
  readonly features: readonly number[];
  readonly label: L;
}

export interface TinyModel<L extends string = string> {
  /** The examples it learned from, in the order they were added. */
  readonly examples: readonly LabelledExample<L>[];
}

export interface Guess<L extends string = string> {
  readonly label: L;
  /** The example it thought was most like the new card. */
  readonly nearest: LabelledExample<L>;
  readonly distance: number;
}

/** Straight-line distance between two cards' numbers. */
export function distance(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error(`Cards have ${a.length} and ${b.length} numbers; they need the same number.`);
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Keeps a frozen copy of the examples, so later changes to the learner's labels don't change a trained model. */
export function train<L extends string>(examples: readonly LabelledExample<L>[]): TinyModel<L> {
  return Object.freeze({
    examples: Object.freeze(examples.map((e) => Object.freeze({ id: e.id, features: Object.freeze([...e.features]), label: e.label }))),
  });
}

/** The model's guess for a new card, or null if it has no examples to compare with. */
export function predict<L extends string>(model: TinyModel<L>, features: readonly number[]): Guess<L> | null {
  let best: Guess<L> | null = null;
  for (const example of model.examples) {
    const d = distance(features, example.features);
    // Strictly smaller: on a tie the example added first wins.
    if (best === null || d < best.distance) best = { label: example.label, nearest: example, distance: d };
  }
  return best;
}

export interface TestCard<L extends string = string> {
  readonly id: string;
  readonly features: readonly number[];
  /** The answer the model's guess is compared with (in the lesson, the gardener's). */
  readonly answer: L;
}

export interface TestResult<L extends string = string> {
  readonly card: TestCard<L>;
  readonly guess: Guess<L>;
  readonly right: boolean;
}

export interface TestRun<L extends string = string> {
  readonly results: readonly TestResult<L>[];
  readonly right: number;
  readonly of: number;
  /** Ids of the cards it got wrong, in test order. */
  readonly wrong: readonly string[];
}

/** Guesses every test card and counts how many match their answers. Needs at least one example. */
export function test<L extends string>(model: TinyModel<L>, cards: readonly TestCard<L>[]): TestRun<L> {
  const results = cards.map((card) => {
    const guess = predict(model, card.features);
    if (!guess) throw new Error('The model has no examples to compare with.');
    return { card, guess, right: guess.label === card.answer };
  });
  return {
    results,
    right: results.filter((r) => r.right).length,
    of: results.length,
    wrong: results.filter((r) => !r.right).map((r) => r.card.id),
  };
}
