import { ACTIVITY, examplesUpTo, testById } from './activity';
import { distance, predict, test as runTest, train, type LabelledExample } from './model';

describe('distance', () => {
  it('is the straight-line distance over the numbers', () => {
    expect(distance([0, 0, 0, 0], [3, 4, 0, 0])).toBe(5);
    expect(distance([1, 2, 3, 4], [1, 2, 3, 4])).toBe(0);
  });

  it('refuses cards with different amounts of numbers', () => {
    expect(() => distance([1, 2], [1, 2, 3])).toThrow();
  });
});

describe('predict', () => {
  const examples: LabelledExample[] = [
    { id: 'a', features: [0, 0], label: 'healthy' },
    { id: 'b', features: [10, 10], label: 'sick' },
  ];

  it('gives the label of the nearest example, and says which one it was', () => {
    const guess = predict(train(examples), [8, 9]);
    expect(guess?.label).toBe('sick');
    expect(guess?.nearest.id).toBe('b');
  });

  it('gives a tie to the example added first', () => {
    expect(predict(train(examples), [5, 5])?.nearest.id).toBe('a');
    expect(predict(train([...examples].reverse()), [5, 5])?.nearest.id).toBe('b');
  });

  it('has no guess without examples', () => {
    expect(predict(train([]), [1, 1])).toBeNull();
  });

  it('keeps what it was trained on when the examples change later', () => {
    const mutable = [{ id: 'a', features: [0, 0], label: 'healthy' }];
    const model = train(mutable);
    mutable[0]!.label = 'sick';
    expect(predict(model, [0, 0])?.label).toBe('healthy');
  });
});

describe('DW02 rounds, labelled like the gardener', () => {
  // docs/content/DIGITAL_WORLD_SPEC.md section 6: 4 of 6, 6 of 6, 0 of 2, then 8 of 8.
  it.each(ACTIVITY.rounds.map((round, index) => [round.id, index] as const))('%s gives its expected result', (_id, index) => {
    const round = ACTIVITY.rounds[index]!;
    const model = train(examplesUpTo(index).map((e) => ({ id: e.id, features: e.features, label: e.gardenerSays })));
    const run = runTest(
      model,
      round.test.map(testById).map((t) => ({ id: t.id, features: t.features, answer: t.gardenerSays })),
    );
    expect({ right: run.right, of: run.of, wrong: run.wrong }).toEqual({
      right: round.expected.right,
      of: round.expected.of,
      wrong: [...round.expected.wrong],
    });
  });

  it('matches the worked numbers in the spec', () => {
    expect(ACTIVITY.rounds.map((r) => `${r.expected.right}/${r.expected.of}`)).toEqual(['4/6', '6/6', '0/2', '8/8']);
  });

  it('follows the learner when a label differs from the gardener', () => {
    // Round 1 with the two labels swapped: the model copies them.
    const swapped = examplesUpTo(0).map((e) => ({
      id: e.id,
      features: e.features,
      label: e.gardenerSays === 'healthy' ? ('sick' as const) : ('healthy' as const),
    }));
    const model = train(swapped);
    const t1 = testById('t1');
    expect(predict(model, t1.features)?.label).toBe('sick');
    expect(t1.gardenerSays).toBe('healthy');
  });
});
