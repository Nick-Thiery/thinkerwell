/**
 * A short, stable fingerprint of a piece of text, the same in the browser,
 * in Node (tools/audio/) and in every test: cyrb53, a fast non-cryptographic
 * 53-bit hash, as 14 hex digits. The recordings' manifest keeps one for each
 * section's pieces, so Listen plays a recording only when it says exactly
 * what is on screen, and `npm run check:audio` finds recordings that no
 * longer match the lessons (docs/notes/recorded-audio.md). Pure, no imports.
 */
export function textHash(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const value = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return value.toString(16).padStart(14, '0');
}

/** The fingerprint of what one section says: its pieces' texts in order (an empty piece counts too). */
export function piecesHash(texts: readonly string[]): string {
  return textHash(texts.join('\u001f'));
}
