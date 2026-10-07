/**
 * The recordings' timings (docs/notes/recorded-audio.md): for each section,
 * when each piece Listen reads starts and ends in its recording, in seconds
 * of the recording itself, whatever the playback speed. Made by
 * scripts/audio/generate.py into public/audio/<lang>/timings.<hash>.json.
 * Pure, no imports.
 */

/** A piece's [start, end] in the recording, or 0 for a piece with nothing to say (a heading the first sentence repeats). */
export type PieceTime = readonly [start: number, end: number] | 0;

export interface SectionTimings {
  /** The recording's file name, in public/audio/<lang>/. */
  f: string;
  /** The fingerprint of what it says (piecesHash in ./textHash.ts). */
  h: string;
  /** The recording's size in bytes. */
  b?: number;
  /** Each piece's time, in the order Listen reads them: the heading, then each sentence. */
  t: readonly PieceTime[];
}

export interface LanguageTimings {
  lang: string;
  /** By section: "<lesson id>/<standard|simpler>/<part>", and "sample" for Settings' sample sentence. */
  sections: Readonly<Record<string, SectionTimings>>;
}

/** A little leeway, so seeking to a piece's very start counts as being in it. */
const LEEWAY = 0.02;

/**
 * The piece being read at `seconds` into the recording: the last piece that
 * has started (it stays current through the pause after it, as with the
 * device's voice), or the first piece with something to say before that.
 * null when there is none.
 */
export function pieceAt(times: readonly PieceTime[], seconds: number): number | null {
  let first: number | null = null;
  let found: number | null = null;
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    if (!time) continue;
    if (first === null) first = i;
    if (time[0] <= seconds + LEEWAY) found = i;
    else break;
  }
  return found ?? first;
}

/** Where piece `index` starts (or the next piece with something to say), or null when nothing is left. */
export function startOf(times: readonly PieceTime[], index: number): number | null {
  for (let i = Math.max(0, index); i < times.length; i++) {
    const time = times[i];
    if (time) return time[0];
  }
  return null;
}

/** The first piece from `index` on with something to say, or null. */
export function firstPieceFrom(times: readonly PieceTime[], index: number): number | null {
  for (let i = Math.max(0, index); i < times.length; i++) if (times[i]) return i;
  return null;
}
