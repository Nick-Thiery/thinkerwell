/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Phase 8: every text colour against every ground it is used on, from the
// token values in tokens.css (the pairs each token's usage note in
// docs/design-system/tokens.json allows). WCAG 2.2 AA: 4.5:1 for text (the
// app has almost no large text on colour, so the stricter figure is used
// throughout), 3:1 for the focus ring and borders that carry meaning.
// axe (e2e/accessibility.spec.ts) checks the rendered pages as well.

// Read from disk: the test runs with `css: false`, so CSS imports come back empty.
const css = readFileSync(path.join(import.meta.dirname, 'tokens.css'), 'utf8');

function tokenColours(): Record<string, string> {
  const colours: Record<string, string> = {};
  for (const match of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) colours[match[1]!] = match[2]!.toLowerCase();
  // Aliases such as --frame: var(--ink).
  for (const match of css.matchAll(/--([a-z0-9-]+):\s*var\(--([a-z0-9-]+)\)/g)) {
    const target = colours[match[2]!];
    if (target) colours[match[1]!] = target;
  }
  return colours;
}

const colours = tokenColours();
const videoCss = readFileSync(path.join(import.meta.dirname, '../components/ds/VideoCard.css'), 'utf8');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(colours[a]!), luminance(colours[b]!)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

const TEXT = 4.5;
const NON_TEXT = 3;

/** Every ground text sits on. */
const ALL_GROUNDS = [
  'paper',
  'canvas',
  'lemon',
  'lemon-soft',
  'lavender',
  'lavender-soft',
  'lavender-wash',
  'correct-soft',
  'retry-soft',
  'sec-history',
  'sec-geography',
  'sec-culture',
  'sec-civics',
];

/** [text colour, grounds it is used on, minimum ratio]. */
const PAIRS: Array<[string, string[], number]> = [
  ['ink', ALL_GROUNDS, TEXT],
  ['ink-muted', ALL_GROUNDS, TEXT],
  ['ink-soft', ['paper', 'canvas'], TEXT],
  ['on-ink', ['ink', 'ink-hover'], TEXT],
  ['on-ink-muted', ['ink'], TEXT],
  ['violet', ['paper', 'canvas', 'lemon', 'lemon-soft', 'lavender', 'lavender-soft', 'lavender-wash'], TEXT],
  ['correct', ['paper', 'canvas', 'correct-soft'], TEXT],
  ['retry', ['paper', 'canvas', 'retry-soft'], TEXT],
  ['sec-history-ink', ['sec-history', 'paper', 'canvas'], TEXT],
  ['sec-geography-ink', ['sec-geography', 'paper', 'canvas'], TEXT],
  ['sec-culture-ink', ['sec-culture', 'paper', 'canvas'], TEXT],
  ['sec-civics-ink', ['sec-civics', 'paper', 'canvas'], TEXT],
];

describe('colour contrast of the design tokens', () => {
  it('reads every colour token from tokens.css', () => {
    for (const name of ['ink', 'paper', 'lemon', 'violet', 'correct', 'retry', 'frame', 'line-strong']) {
      expect(colours[name], name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  for (const [text, grounds, min] of PAIRS) {
    for (const ground of grounds) {
      it(`${text} on ${ground} is at least ${min}:1`, () => {
        expect(contrast(text, ground)).toBeGreaterThanOrEqual(min);
      });
    }
  }

  it('the focus ring (violet) stands out from every ground a control sits on, the header included', () => {
    for (const ground of ALL_GROUNDS) {
      expect(contrast('violet', ground), ground).toBeGreaterThanOrEqual(NON_TEXT);
    }
  });

  it('on an ink ground (inside the video player) the focus ring is on-ink instead, since violet is too dark there', () => {
    expect(contrast('violet', 'ink')).toBeLessThan(NON_TEXT);
    expect(contrast('on-ink', 'ink')).toBeGreaterThanOrEqual(NON_TEXT);
    expect(videoCss).toMatch(/\.tw-video-player iframe:focus-visible \{[^}]*outline-color: var\(--on-ink\)/);
  });

  it('borders that carry meaning (line-strong) stand out on paper and canvas', () => {
    for (const ground of ['paper', 'canvas']) expect(contrast('line-strong', ground), ground).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it('keeps the pairs the brand book rules out failing, so nobody starts using them', () => {
    // docs/design-system/README.md: ink-soft, correct and retry fail on lavender.
    for (const text of ['ink-soft', 'correct', 'retry']) expect(contrast(text, 'lavender'), text).toBeLessThan(TEXT);
  });
});
