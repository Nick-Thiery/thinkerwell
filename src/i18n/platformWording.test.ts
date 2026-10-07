import { describe, expect, it } from 'vitest';
import en from './messages/en.json';
import id from './messages/id.json';

// Public copy calls Thinkerwell a "platform", never a "project" (October
// 2026), in English and in Bahasa Indonesia ("platform", not "proyek").
// "Project Authors" in the font credits is part of those projects' names,
// so only the lowercase word counts.

function leaves(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (node && typeof node === 'object') return Object.values(node).flatMap(leaves);
  return [];
}

describe('public copy', () => {
  it('never calls Thinkerwell a project in English', () => {
    expect(leaves(en).filter((text) => /\bprojects?\b/.test(text))).toEqual([]);
  });

  it('never calls Thinkerwell a proyek in Indonesian', () => {
    expect(leaves(id).filter((text) => /\bproyek\b/i.test(text))).toEqual([]);
  });
});
