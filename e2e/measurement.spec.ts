import { expect, test, type Page } from '@playwright/test';
import { addLearnerViaUi } from './lessonHelpers';

// Coded study collection is PAUSED for everyone (11 November 2026, Justin's brief; src/measurement/paused.ts).
// Whatever a device's old "Share optional study data" preference says, the app makes no request to /api/,
// never downloads the collector, never creates or reads the queue's database and never sends what was
// already queued on reload, reconnect or in the background. Nothing is deleted: the preference and the
// queue stay on the device for when a pilot's collection is agreed and built.
// /api/events is always a stand-in here, because the tests never need a real server or database.

const QUEUE_DB = 'thinkerwell-measurement';
const WRITING_A = 'My river story, written by the first learner';
const WRITING_B = 'My mountain story, written by the second learner';

/** Answers every /api/ request itself and keeps what it was asked. */
async function standInForServer(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route('**/api/**', (route) => {
    const request = route.request();
    requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    return route.fulfill({ status: 202, contentType: 'application/json', body: '{}' });
  });
  return requests;
}

async function databaseNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await indexedDB.databases()).map((entry) => entry.name ?? ''));
}

/** Turns the old preference ON the way an older version of the app left it: partner.sharePilotResults and an organisation code. */
async function seedLegacyOnPreference(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('thinkerwell');
        open.onerror = () => reject(new Error(String(open.error)));
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          const store = tx.objectStore('settings');
          const get = store.get('device');
          get.onsuccess = () => {
            const current = (get.result ?? {}) as { partner?: Record<string, unknown> };
            store.put({ ...current, partner: { ...(current.partner ?? {}), sharePilotResults: true, organisationCode: 'help-jakarta' } }, 'device');
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(new Error(String(tx.error)));
        };
      }),
  );
}

/** Leaves results waiting in the queue's database, as a device that shared before the pause would have. */
async function seedQueuedEvents(page: Page, count: number): Promise<void> {
  await page.evaluate(
    (n) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('thinkerwell-measurement', 1);
        open.onupgradeneeded = () => {
          open.result.createObjectStore('events', { autoIncrement: true });
          open.result.createObjectStore('meta');
        };
        open.onerror = () => reject(new Error(String(open.error)));
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('events', 'readwrite');
          for (let i = 0; i < n; i += 1) {
            tx.objectStore('events').add({
              id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
              org: 'help-jakarta',
              pilotCode: 'HLP-01',
              type: 'lesson_open',
              lessonId: 'towns-near-rivers',
              value: {},
              ts: 1_790_000_000_000,
            });
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(new Error(String(tx.error)));
        };
      }),
    count,
  );
}

async function queuedCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('thinkerwell-measurement');
        open.onerror = () => resolve(0);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('events')) {
            db.close();
            return resolve(0);
          }
          const count = db.transaction('events').objectStore('events').count();
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
        };
      }),
  );
}

async function storedPreference(page: Page): Promise<{ sharePilotResults?: boolean; organisationCode?: string }> {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('thinkerwell');
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction('settings').objectStore('settings').get('device');
          get.onsuccess = () => {
            db.close();
            resolve(((get.result ?? {}) as { partner?: object }).partner ?? {});
          };
        };
      }),
  );
}

/** A learner opens lessons, finishes steps, writes, reloads and goes offline and back. Returns every request made. */
async function useTheSite(page: Page, urls: string[]): Promise<void> {
  for (const route of ['/lesson/towns-near-rivers/read', '/lesson/towns-near-rivers/write', '/lesson/towns-near-rivers/watch', '/course', '/section/history/check', '/settings', '/journal']) {
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
  }
  await page.goto('/lesson/towns-near-rivers/write');
  await page.getByRole('textbox', { name: 'Your answer' }).fill(WRITING_A);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue(WRITING_A);
  await page.context().setOffline(true);
  await page.waitForTimeout(500);
  await page.context().setOffline(false);
  // Longer than the sender's wait (5 s), its retry, and the writing count's quiet moment: anything that would be sent has been.
  await page.waitForTimeout(8_000);
  expect(urls.filter((url) => new URL(url).pathname.startsWith('/api/'))).toEqual([]);
}

test.describe('coded study collection is paused for every device', () => {
  test('with the old preference OFF: no /api request, no collector, no queue database', async ({ page }) => {
    test.slow();
    const seen = await standInForServer(page);
    const urls: string[] = [];
    page.on('request', (request) => urls.push(request.url()));

    await addLearnerViaUi(page, 'HLP-01');
    await useTheSite(page, urls);

    expect(seen).toEqual([]);
    expect(await databaseNames(page)).not.toContain(QUEUE_DB);
    // The collector is never even downloaded.
    expect(urls.filter((url) => /measurementCollector|measurement-/i.test(url))).toEqual([]);
  });

  test('with the old preference ON and a pilot code as the name: still nothing is sent, queued or downloaded, and nothing is deleted', async ({ page }) => {
    test.slow();
    const seen = await standInForServer(page);
    const urls: string[] = [];
    page.on('request', (request) => urls.push(request.url()));

    await addLearnerViaUi(page, 'HLP-01');
    await seedLegacyOnPreference(page);
    await page.reload();
    await useTheSite(page, urls);

    expect(seen).toEqual([]);
    expect(await databaseNames(page)).not.toContain(QUEUE_DB);
    expect(urls.filter((url) => /measurementCollector|measurement-/i.test(url))).toEqual([]);
    // The preference is kept as it was: this is a pause, not a deletion.
    expect(await storedPreference(page)).toMatchObject({ sharePilotResults: true, organisationCode: 'help-jakarta' });
  });

  test('results queued before the pause stay on the device and are not sent on reload, reconnect or in the background', async ({ page }) => {
    test.slow();
    const seen = await standInForServer(page);
    const urls: string[] = [];
    page.on('request', (request) => urls.push(request.url()));

    await addLearnerViaUi(page, 'HLP-01');
    await seedLegacyOnPreference(page);
    await seedQueuedEvents(page, 3);
    await page.reload();
    await useTheSite(page, urls);

    expect(seen).toEqual([]);
    expect(await queuedCount(page)).toBe(3);
  });

  test('the server refuses an older copy of the app that still tries (503, nothing stored)', async ({ page }) => {
    // vite preview has no /api, so this only checks the site answers; api/_lib/events.paused.test.ts checks the real handler.
    const response = await page.request.post('/api/events', { data: { v: 1, events: [] }, failOnStatusCode: false });
    expect([404, 503]).toContain(response.status());
  });

  test('Settings has no study-sharing control, and the old address of that part is harmless', async ({ page }) => {
    await page.goto('/settings#share-results');
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(page.getByText(/Share optional study data|study data|Organisation code/i)).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: /study data/i })).toHaveCount(0);
  });

  test('two profiles keep their own writing while one has the old preference on, and switching and language still work', async ({ page }) => {
    test.slow();
    const seen = await standInForServer(page);
    await addLearnerViaUi(page, 'HLP-01');
    await seedLegacyOnPreference(page);
    await page.goto('/lesson/towns-near-rivers/write');
    await page.getByRole('textbox', { name: 'Your answer' }).fill(WRITING_A);
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue(WRITING_A);

    // A second profile on the same device.
    await page.locator('.tw-learner-chip').click();
    await page.getByRole('button', { name: "I'm new here" }).click();
    await page.getByLabel('First name or nickname').fill('Amina');
    await page.getByRole('button', { name: 'Create profile' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Hi Amina' })).toBeVisible();
    await page.goto('/lesson/towns-near-rivers/write');
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('');
    await page.getByRole('textbox', { name: 'Your answer' }).fill(WRITING_B);
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue(WRITING_B);

    // Back to the first: their words, untouched.
    await page.locator('.tw-learner-chip').click();
    await page.getByRole('dialog', { name: 'Switch learner' }).getByRole('button', { name: 'HLP-01' }).click();
    // The switch has to show on the page (and so be saved) before the reload, or a slow machine reloads as the second learner.
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue(WRITING_A);
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue(WRITING_A);

    // Another language still works for the chosen learner, and the words stay.
    await page.getByRole('button', { name: /^(Language|Bahasa): / }).click();
    await page.locator('.tw-language-switch-panel').getByRole('radio', { name: 'Bahasa Indonesia' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.getByRole('textbox').first()).toHaveValue(WRITING_A);

    await page.waitForTimeout(6_000);
    expect(seen).toEqual([]);
  });
});

test('a same-origin POST to /api/events still needs no change to the Content-Security-Policy', async ({ page }) => {
  // Under the real policy (`vite preview` sends vercel.json's headers). The preview has no /api, so it answers 404,
  // which is a real answer from this site: a blocked request would be a network error and a violation report.
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const violations: string[] = [];
    document.addEventListener('securitypolicyviolation', (event) => violations.push(event.violatedDirective));
    const response = await fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { status: response.status, violations };
  });
  expect([404, 503]).toContain(result.status);
  expect(result.violations).toEqual([]);
});
