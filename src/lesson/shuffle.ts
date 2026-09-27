/**
 * A seeded shuffle for quick-check options (CLAUDE.md: "Shuffle options with
 * a seed per learner and question so the order stays the same when the
 * learner comes back").
 *
 * The same seed always gives the same order, on any device and in any
 * browser: the hash (cyrb53) and the generator (mulberry32) are plain integer
 * arithmetic, with no Math.random().
 */

/** A 53-bit string hash (cyrb53, public domain), as a non-negative integer. */
export function hashSeed(seed: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** mulberry32: a small, fast generator of numbers in [0, 1) from a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The order to show `count` items in, as their original indexes. A
 * Fisher–Yates shuffle driven by `seed`, so it is stable for the same seed.
 *
 *   shuffledOrder(3, 'learner-1:towns-near-rivers:0') // e.g. [2, 0, 1]
 */
export function shuffledOrder(count: number, seed: string): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  const random = mulberry32(hashSeed(seed));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return order;
}

/** The items in shuffled order, each with its index in the original array (store that, not the position). */
export function seededShuffle<T>(items: readonly T[], seed: string): Array<{ item: T; index: number }> {
  return shuffledOrder(items.length, seed).map((index) => ({ item: items[index]!, index }));
}

/**
 * The seed for one quick-check question: the learner (or this visit, when
 * looking around), the lesson and the question's index in lesson.read.checks.
 */
export function checkSeed(owner: string, lessonId: string, checkIndex: number): string {
  return `${owner}:${lessonId}:${checkIndex}`;
}
