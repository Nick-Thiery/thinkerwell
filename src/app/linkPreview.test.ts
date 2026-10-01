/// <reference types="node" />
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// What a pasted link to the site shows in WhatsApp, Telegram, Facebook, X
// and so on comes from the tags in index.html (every page address is
// answered with it). Crawlers don't run the app, so the tags have to be
// there in the file itself.

const root = path.join(import.meta.dirname, '..', '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');

function meta(attribute: 'name' | 'property', key: string): string | undefined {
  const tag = new RegExp(`<meta\\s+${attribute}="${key.replace(/[.:]/g, '\\$&')}"\\s+content="([^"]*)"`).exec(html);
  return tag?.[1];
}

describe('link previews (index.html)', () => {
  it('has a description and a theme colour', () => {
    expect(meta('name', 'description')).toMatch(/^Free social studies learning for youth across Southeast Asia, especially those facing barriers to education\./);
    expect(meta('name', 'theme-color')).toBe('#ffff66');
  });

  it('has Open Graph and Twitter tags with a title, a line and a picture', () => {
    for (const [attribute, prefix] of [
      ['property', 'og'],
      ['name', 'twitter'],
    ] as const) {
      expect(meta(attribute, `${prefix}:title`)).toBe('Thinkerwell: Exploring Our World');
      expect(meta(attribute, `${prefix}:description`)).toMatch(/^Free social studies learning for youth across Southeast Asia, especially those facing barriers to education\./);
      expect(meta(attribute, `${prefix}:image`)).toMatch(/^https:\/\/[^/]+\/social-card\.png$/);
      expect(meta(attribute, `${prefix}:image:alt`)).toBeTruthy();
    }
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(meta('property', 'og:type')).toBe('website');
    // The page and the picture are on the same site.
    expect(meta('property', 'og:url')).toBe('https://thinkerwell.app/');
    const site = new URL(meta('property', 'og:url')!).origin;
    expect(new URL(meta('property', 'og:image')!).origin).toBe(site);
  });

  it('points at a 1200 x 630 PNG that is small enough for every app to fetch', () => {
    const file = path.join(root, 'public', 'social-card.png');
    const png = readFileSync(file);
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    // The IHDR chunk: width and height, big-endian, at bytes 16 and 20.
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    expect(meta('property', 'og:image:width')).toBe('1200');
    expect(meta('property', 'og:image:height')).toBe('630');
    // WhatsApp skips pictures over about 300 kB.
    expect(statSync(file).size).toBeLessThan(100 * 1024);
  });
});
