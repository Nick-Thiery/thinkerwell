import { getLessons } from '../content';
import { checkSeed, hashSeed, mulberry32, seededShuffle, shuffledOrder } from './shuffle';

describe('hashSeed and mulberry32', () => {
  it('are deterministic', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'));
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });

  it('gives numbers in [0, 1)', () => {
    const random = mulberry32(hashSeed('range'));
    for (let i = 0; i < 1000; i++) {
      const n = random();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe('shuffledOrder', () => {
  it('is a permutation of the indexes', () => {
    for (let count = 0; count <= 6; count++) {
      const order = shuffledOrder(count, `seed-${count}`);
      expect([...order].sort((x, y) => x - y)).toEqual(Array.from({ length: count }, (_, i) => i));
    }
  });

  it('gives the same order for the same seed, every time', () => {
    const seed = checkSeed('learner-1', 'towns-near-rivers', 0);
    expect(shuffledOrder(3, seed)).toEqual(shuffledOrder(3, seed));
  });

  it('is pinned for a known seed, so the order stays the same across releases', () => {
    // If this changes, every learner sees their options in a new order when
    // they come back (saved answers are by content index, so they survive).
    expect(shuffledOrder(5, 'pinned')).toMatchInlineSnapshot(`
      [
        1,
        4,
        2,
        3,
        0,
      ]
    `);
  });

  it('varies between learners and questions', () => {
    const orders = new Set<string>();
    for (let learner = 0; learner < 30; learner++) {
      for (let question = 0; question < 2; question++) {
        orders.add(shuffledOrder(3, checkSeed(`learner-${learner}`, 'towns-near-rivers', question)).join(','));
      }
    }
    // All six orders of three options turn up across 60 seeds.
    expect(orders.size).toBe(6);
  });

  it('puts the correct option in every position about equally often', () => {
    const counts = [0, 0, 0];
    for (let learner = 0; learner < 600; learner++) {
      const order = shuffledOrder(3, checkSeed(`learner-${learner}`, 'towns-near-rivers', 0));
      counts[order.indexOf(0)]! += 1;
    }
    for (const count of counts) expect(count).toBeGreaterThan(150);
  });
});

describe('seededShuffle', () => {
  it('keeps each item with its original index', () => {
    const items = ['a', 'b', 'c', 'd'];
    const shuffled = seededShuffle(items, 'x');
    for (const { item, index } of shuffled) expect(items[index]).toBe(item);
    expect(shuffled.map((s) => s.item).sort()).toEqual(items);
  });

  it('shuffles every quick check in every lesson without losing an option', () => {
    for (const lesson of getLessons()) {
      lesson.read.checks.forEach((check, i) => {
        if (check.type !== 'choice') return;
        const shuffled = seededShuffle(check.options, checkSeed('learner', lesson.id, i));
        expect(shuffled).toHaveLength(check.options.length);
        expect(shuffled.filter((s) => s.item.correct)).toHaveLength(1);
      });
    }
  });
});
