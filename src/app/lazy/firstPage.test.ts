import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from '../routes';
import { lazyChunkFor } from './firstPage';
import * as lessonPages from './lessonPages';
import * as morePages from './morePages';
import * as teacherPages from './teacherPages';

// index.html's first-page script (vite.config.ts, preloadFirstPage) starts
// downloading the chunk a page needs from lazyChunkFor(); it must be the one
// the router then loads for that address.

const chunks = { lessonPages, teacherPages, morePages } as const;

/** Which chunk the router loads for a page address, or null if its page is in the first chunk. */
async function chunkRouterLoads(path: string): Promise<string | null> {
  const matches = matchRoutes(routes, path) ?? [];
  const leaf = matches[matches.length - 1]!.route;
  if (typeof leaf.lazy !== 'function') return null;
  const { Component } = await leaf.lazy();
  const found = Object.entries(chunks).find(([, module]) => Object.values(module).includes(Component as never));
  return found ? found[0] : 'unknown';
}

describe('lazyChunkFor', () => {
  it.each([
    '/',
    '/course',
    '/lesson/towns-near-rivers',
    '/lesson/towns-near-rivers/read',
    '/Lesson/L6/Watch',
    '/lesson/towns-near-rivers/complete',
    '/lesson/towns-near-rivers/print',
    '/lesson/l6/print/',
    '/section/history/check',
    '/journal',
    '/journal/print',
    '/educators',
    '/educators/lesson/towns-near-rivers',
    '/educators/section/civics/answers',
    '/about',
    '/settings',
    '/certificate/course',
    '/certificate/section/geography',
    '/onboarding',
    '/whatever',
  ])('%s preloads the chunk the router loads', async (path) => {
    expect(lazyChunkFor(path)).toBe(await chunkRouterLoads(path));
  });
});
