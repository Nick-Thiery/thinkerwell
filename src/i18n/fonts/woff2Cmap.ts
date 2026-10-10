/**
 * The code points a WOFF2 font has glyphs for, read from its cmap table,
 * for tests (src/i18n/fonts/fonts.test.ts). No font library: a WOFF2 file is
 * a table directory followed by one Brotli stream, and the cmap table is
 * never transformed, so Node's own Brotli is enough.
 */
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';

/** WOFF2's known table tags by index (the spec's table 1); only the first 12 matter here. */
const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca'];

function readBase128(bytes: Buffer, at: { offset: number }): number {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = bytes[at.offset++]!;
    value = value * 128 + (byte & 0x7f);
    if (!(byte & 0x80)) return value;
  }
  throw new Error('Bad UIntBase128 in a WOFF2 table directory');
}

/** Every code point the font maps to a glyph (cmap formats 4 and 12). */
export function woff2CodePoints(file: string): Set<number> {
  const bytes = readFileSync(file);
  if (bytes.toString('latin1', 0, 4) !== 'wOF2') throw new Error(`${file} is not a WOFF2 file`);
  const numTables = bytes.readUInt16BE(12);
  const compressedSize = bytes.readUInt32BE(20);
  const at = { offset: 48 };
  const tables: Array<{ tag: string; length: number }> = [];
  for (let i = 0; i < numTables; i++) {
    const flags = bytes[at.offset++]!;
    const index = flags & 0x3f;
    const version = flags >> 6;
    const tag = index === 63 ? bytes.toString('latin1', at.offset, (at.offset += 4)) : (KNOWN_TAGS[index] ?? `#${index}`);
    const original = readBase128(bytes, at);
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0;
    tables.push({ tag, length: transformed ? readBase128(bytes, at) : original });
  }
  const data = brotliDecompressSync(bytes.subarray(at.offset, at.offset + compressedSize));
  let start = 0;
  let cmap: Buffer | undefined;
  for (const table of tables) {
    if (table.tag === 'cmap') cmap = data.subarray(start, start + table.length);
    start += table.length;
  }
  if (!cmap) throw new Error(`${file} has no cmap table`);

  const points = new Set<number>();
  const count = cmap.readUInt16BE(2);
  for (let i = 0; i < count; i++) {
    const offset = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(offset);
    if (format === 4) {
      const segments = cmap.readUInt16BE(offset + 6) / 2;
      const ends = offset + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const rangeOffsets = deltas + segments * 2;
      for (let s = 0; s < segments; s++) {
        const end = cmap.readUInt16BE(ends + s * 2);
        const first = cmap.readUInt16BE(starts + s * 2);
        const rangeOffset = cmap.readUInt16BE(rangeOffsets + s * 2);
        const delta = cmap.readUInt16BE(deltas + s * 2);
        for (let code = first; code <= end && code !== 0xffff; code++) {
          let glyph = code;
          if (rangeOffset !== 0) {
            const glyphAt = rangeOffsets + s * 2 + rangeOffset + (code - first) * 2;
            glyph = cmap.readUInt16BE(glyphAt);
            if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
          } else {
            glyph = (code + delta) & 0xffff;
          }
          if (glyph !== 0) points.add(code);
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g++) {
        const first = cmap.readUInt32BE(offset + 16 + g * 12);
        const end = cmap.readUInt32BE(offset + 20 + g * 12);
        const glyph = cmap.readUInt32BE(offset + 24 + g * 12);
        for (let code = first; code <= end; code++) if (glyph + (code - first) !== 0) points.add(code);
      }
    }
  }
  return points;
}
