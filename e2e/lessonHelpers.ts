import { expect, type Locator, type Page } from '@playwright/test';

// Shared helpers for the phase 4 lesson player specs (lesson-player,
// glossary-popover). Not a spec file itself: Playwright only runs *.spec.ts.

export const L10 = {
  id: 'towns-near-rivers',
  title: 'Why do people build towns near rivers?',
  path: (step: string) => `/lesson/towns-near-rivers/${step}`,
};

/** Hosts that must never be contacted before the learner taps "Watch the video". */
export const VIDEO_HOSTS = /youtube|ytimg|googlevideo|google\.|gstatic|doubleclick|ggpht/;

/** Collects console errors and uncaught page errors from now on. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

/** Every request URL from now on. */
export function recordRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  return urls;
}

/**
 * How far the page is wider than the window (0 or less: no sideways scroll).
 * Measured against the layout width (clientWidth), not window.innerWidth: a
 * phone (isMobile) zooms out to fit a page that is too wide, and innerWidth
 * then grows with it, so it would never show the problem.
 */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/**
 * Creates a learner through the app's own "I'm new here" form. "Start
 * Lesson 1" lands on Lesson 1; the learner is then the current one.
 */
export async function addLearnerViaUi(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: "I'm new here" }).click();
  await page.getByLabel('First name or nickname').fill(name);
  await page.getByRole('button', { name: 'Start Lesson 1' }).click();
  await expect(page).toHaveURL(/\/lesson\/.+\/read$/);
}

export interface Dump {
  stores: Record<string, unknown[]>;
  localStorageLength: number;
}

/** Every row of every IndexedDB store, plus how many localStorage keys there are. */
export async function dumpEverything(page: Page): Promise<Dump> {
  return page.evaluate(
    () =>
      new Promise<Dump>((resolve, reject) => {
        const request = indexedDB.open('thinkerwell');
        request.onerror = () => reject(new Error(request.error?.message ?? 'IndexedDB open failed'));
        request.onsuccess = () => {
          const db = request.result;
          const names = Array.from(db.objectStoreNames);
          if (names.length === 0) {
            db.close();
            resolve({ stores: {}, localStorageLength: window.localStorage.length });
            return;
          }
          const tx = db.transaction(names);
          const requests = names.map((name) => tx.objectStore(name).getAll());
          tx.oncomplete = () => {
            db.close();
            const stores: Record<string, unknown[]> = {};
            names.forEach((name, i) => {
              stores[name] = requests[i]!.result as unknown[];
            });
            resolve({ stores, localStorageLength: window.localStorage.length });
          };
          tx.onerror = () => reject(new Error(tx.error?.message ?? 'IndexedDB transaction failed'));
        };
      }),
  );
}

export interface StoredProgress {
  learnerId: string;
  lessonId: string;
  stagesDone: string[];
  currentStage: string;
  warmUpAnswer: string | null;
  checkAnswers: Record<string, { type: string; selected?: number; correct?: boolean; tries?: number; text?: string }>;
  writing: { text: string; exampleShown: boolean; selfCheck: Record<string, boolean>; planning: Record<string, string> };
  speak: { practisedHow: number | null };
  watch: { readInstead: boolean; beforeAnswer: string; afterAnswer: string };
  reflections: Record<string, string>;
  completedAt: string | null;
}

/** The saved progress for one lesson (any learner), or undefined. */
export async function storedProgress(page: Page, lessonId: string): Promise<StoredProgress | undefined> {
  const dump = await dumpEverything(page);
  return (dump.stores['progress'] as StoredProgress[] | undefined)?.find((record) => record.lessonId === lessonId);
}

/** Clicks the ActionBar's primary (next) button by name. */
export function nextButton(page: Page, name: string | RegExp): Locator {
  return page.locator('.tw-actionbar').getByRole('button', { name });
}
