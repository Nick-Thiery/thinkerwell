import { describe, expect, it } from 'vitest';
import { firstPieceFrom, pieceAt, startOf, type PieceTime } from './timings';

// A heading (0.1 to 1.2 s), then three sentences, each followed by a pause.
const TIMES: PieceTime[] = [
  [0.1, 1.2],
  [1.95, 4.0],
  [4.35, 6.1],
  [6.7, 9.0],
];
// A part whose heading the first sentence repeats: nothing to say for it.
const NO_HEADING: PieceTime[] = [0, [0.1, 2.0], [2.35, 4.0]];

describe('pieceAt', () => {
  it('finds the piece being read, and keeps it through the pause after it', () => {
    expect(pieceAt(TIMES, 0)).toBe(0);
    expect(pieceAt(TIMES, 0.5)).toBe(0);
    expect(pieceAt(TIMES, 1.5)).toBe(0);
    expect(pieceAt(TIMES, 1.95)).toBe(1);
    expect(pieceAt(TIMES, 4.2)).toBe(1);
    expect(pieceAt(TIMES, 4.36)).toBe(2);
    expect(pieceAt(TIMES, 8)).toBe(3);
    expect(pieceAt(TIMES, 99)).toBe(3);
  });

  it('counts a seek to a piece’s very start as that piece', () => {
    expect(pieceAt(TIMES, 4.34)).toBe(2);
  });

  it('skips pieces with nothing to say', () => {
    expect(pieceAt(NO_HEADING, 0)).toBe(1);
    expect(pieceAt(NO_HEADING, 3)).toBe(2);
    expect(pieceAt([0, 0], 1)).toBeNull();
  });
});

describe('startOf and firstPieceFrom', () => {
  it('start at the piece, or the next one with something to say', () => {
    expect(startOf(TIMES, 2)).toBe(4.35);
    expect(startOf(NO_HEADING, 0)).toBe(0.1);
    expect(firstPieceFrom(NO_HEADING, 0)).toBe(1);
    expect(startOf(TIMES, 4)).toBeNull();
    expect(firstPieceFrom(TIMES, 4)).toBeNull();
  });
});
