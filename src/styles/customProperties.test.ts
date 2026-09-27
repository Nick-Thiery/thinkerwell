/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Every var(--name) in the app's CSS and components must name a custom
// property that is defined somewhere (or give a fallback). A property that
// doesn't exist makes the whole declaration invalid, silently: About's team
// cards once lost all their padding to a --space-7 that tokens.css doesn't
// have (the spacing steps skip 7, 9, 11 and so on).

const srcDir = path.join(import.meta.dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'dev' ? [] : files(full);
    return /\.(css|tsx?)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('CSS custom properties', () => {
  it('are all defined where they are used', () => {
    const sources = files(srcDir).map((file) => ({ file: path.relative(srcDir, file), text: readFileSync(file, 'utf8') }));
    const defined = new Set<string>();
    for (const { text } of sources) {
      for (const match of text.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(match[1]!);
      for (const match of text.matchAll(/['"](--[a-z0-9-]+)['"]\s*[:,]/gi)) defined.add(match[1]!);
    }
    const missing: string[] = [];
    for (const { file, text } of sources) {
      // var(--name) with no fallback: var(--name, fallback) is fine either way.
      for (const match of text.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)) {
        if (!defined.has(match[1]!)) missing.push(`${file}: ${match[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
