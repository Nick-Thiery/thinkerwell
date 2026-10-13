import { expect, test, type Page } from '@playwright/test';
import { addLearnerViaUi, L10 } from './lessonHelpers';

// Pilot measurement (docs/notes/pilot-measurement.md). It is OFF by default: with it off the app must make
// no request to /api/ and must not even create the queue's database. ON takes three things together (a
// pilot code as the learner's name, "Share pilot results" in Settings, an organisation code); the /api/events
// endpoint is always a stand-in here, because the tests never need a real server or database.

const QUEUE_DB = 'thinkerwell-measurement';
const WRITING = 'My secret river story about Amina and her family';

interface SentEvent {
  id: string;
  org: string;
  pilotCode: string;
  type: string;
  lessonId?: string;
  stage?: string;
  value: Record<string, unknown>;
}

/** Answers /api/events itself and keeps what it was sent. */
async function standInForServer(page: Page, status = 202): Promise<{ batches: Array<{ v: number; events: SentEvent[] }>; requests: string[] }> {
  const seen = { batches: [] as Array<{ v: number; events: SentEvent[] }>, requests: [] as string[] };
  await page.route('**/api/**', (route) => {
    const request = route.request();
    seen.requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    try {
      seen.batches.push(JSON.parse(request.postData() ?? '{}') as { v: number; events: SentEvent[] });
    } catch {
      // Not JSON: the test that cares looks at `requests`.
    }
    return route.fulfill({ status, contentType: 'application/json', body: '{}' });
  });
  return seen;
}

const allEvents = (seen: { batches: Array<{ events: SentEvent[] }> }): SentEvent[] => seen.batches.flatMap((batch) => batch.events);

async function databaseNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await indexedDB.databases()).map((entry) => entry.name ?? ''));
}

/** How many results wait in the queue's database on this device (0 if there is none). */
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

/** An educator's steps in Settings: save the organisation code, then turn sharing on. */
async function turnSharingOn(page: Page, org = 'help-jakarta'): Promise<void> {
  await page.goto('/settings');
  const code = page.getByLabel('Organisation code');
  await expect(code).toBeEnabled();
  await code.fill(org);
  await page.getByRole('button', { name: 'Save code' }).click();
  const share = page.getByRole('checkbox', { name: 'Share pilot results from this device' });
  await expect(share).toBeEnabled();
  await share.check();
  await expect(page.getByText(`Sharing with ${org}.`)).toBeVisible();
}

test.describe('pilot measurement: off by default, and gated by all three', () => {
  test('a learner who uses a pilot code, and every page, make no /api request and no queue', async ({ page }) => {
    const seen = await standInForServer(page);
    const urls: string[] = [];
    page.on('request', (request) => urls.push(request.url()));

    await addLearnerViaUi(page, 'HLP-01');
    for (const route of ['/lesson/towns-near-rivers/write', '/lesson/towns-near-rivers/watch', '/course', '/section/history/check', '/settings', '/journal']) {
      await page.goto(route);
      await expect(page.locator('h1')).toHaveCount(1);
    }
    await page.goto('/lesson/towns-near-rivers/write');
    await page.getByRole('textbox', { name: 'Your answer' }).fill(WRITING);
    // Longer than the sender's wait and the writing count's quiet moment, so anything that would be sent has been.
    await page.waitForTimeout(8_000);

    expect(urls.filter((url) => new URL(url).pathname.startsWith('/api/'))).toEqual([]);
    expect(seen.requests).toEqual([]);
    expect(await databaseNames(page)).not.toContain(QUEUE_DB);
  });

  test('"Share pilot results" is off and cannot be turned on without an organisation code', async ({ page }) => {
    await page.goto('/settings');
    const share = page.getByRole('checkbox', { name: 'Share pilot results from this device' });
    await expect(share).toBeDisabled();
    await expect(share).not.toBeChecked();
    await expect(page.getByText('Sharing is off. Nothing is sent.')).toBeVisible();
  });

  test('turned on, a learner with a real name sends nothing', async ({ page }) => {
    test.slow();
    const seen = await standInForServer(page);
    await turnSharingOn(page);
    await addLearnerViaUi(page, 'Amina');
    await page.goto('/lesson/towns-near-rivers/write');
    await page.getByRole('textbox', { name: 'Your answer' }).fill(WRITING);
    await page.waitForTimeout(12_000);
    expect(seen.requests).toEqual([]);
    expect(await queuedCount(page)).toBe(0);
  });

  test('turned on, a look-around sends nothing', async ({ page }) => {
    test.slow();
    const seen = await standInForServer(page);
    await turnSharingOn(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Just look around' }).click();
    await page.goto('/lesson/towns-near-rivers/read');
    await page.getByRole('link', { name: /^Write/ }).first().click();
    await page.waitForTimeout(8_000);
    expect(seen.requests).toEqual([]);
    expect(await queuedCount(page)).toBe(0);
  });
});

test('a same-origin POST to /api/events needs no change to the Content-Security-Policy', async ({ page }) => {
  // Under the real policy (`vite preview` sends vercel.json's headers). The preview has no /api, so it answers 404,
  // which is a real answer from this site: a blocked request would be a network error and a violation report.
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const violations: string[] = [];
    document.addEventListener('securitypolicyviolation', (event) => violations.push(event.violatedDirective));
    try {
      const response = await fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      return { status: response.status, violations };
    } catch (error) {
      return { status: 0, violations, error: String(error) };
    }
  });
  expect(result.violations).toEqual([]);
  expect(result.status).toBe(404);
});

test.describe('pilot measurement: on', () => {
  test('sends only the promised events, with the codes, and never a name or any writing', async ({ page }) => {
    test.slow();
    const seen = await standInForServer(page);
    await turnSharingOn(page, 'my-partner');
    await addLearnerViaUi(page, 'HLP-01');
    await expect.poll(() => allEvents(seen).some((event) => event.type === 'lesson_open'), { timeout: 20_000 }).toBe(true);

    // Write something, then read instead of watching.
    await page.goto('/lesson/towns-near-rivers/write');
    await page.getByRole('textbox', { name: 'Your answer' }).fill(WRITING);
    // The word count goes in the queue after a quiet moment (10 s), not at the last keystroke.
    await page.waitForTimeout(11_000);
    await page.goto(L10.path('watch'));
    await page.getByRole('button', { name: 'Read instead' }).click();
    await page.goto('/course');

    await expect
      .poll(() => allEvents(seen).some((event) => event.type === 'writing_saved'), { timeout: 30_000 })
      .toBe(true);
    await expect.poll(() => allEvents(seen).some((event) => event.type === 'video_choice'), { timeout: 30_000 }).toBe(true);

    const events = allEvents(seen);
    const types = new Set(events.map((event) => event.type));
    expect(types).toContain('session_start');
    expect(types).toContain('lesson_open');
    expect(types).toContain('stage_enter');
    for (const event of events) {
      expect(event.org).toBe('my-partner');
      expect(event.pilotCode).toBe('HLP-01');
    }
    expect(events.find((event) => event.type === 'writing_saved')).toMatchObject({ stage: 'write', value: { words: 9 } });
    expect(events.find((event) => event.type === 'video_choice')).toMatchObject({ lessonId: L10.id, value: { choice: 'read' } });

    // Nothing a learner wrote or was called, anywhere in anything sent.
    const everything = JSON.stringify(seen.batches);
    for (const secret of ['secret', 'Amina', 'river story', 'recording', 'email']) expect(everything).not.toContain(secret);
    for (const batch of seen.batches) {
      expect(batch.v).toBe(1);
      expect(batch.events.length).toBeLessThanOrEqual(50);
    }
    // Only this site's /api/events was asked.
    expect(new Set(seen.requests)).toEqual(new Set(['POST /api/events']));
  });

  test('turning sharing off deletes what was waiting and sends nothing more', async ({ page }) => {
    test.slow();
    // The server "is not set up" (503), so results stay in the queue.
    const seen = await standInForServer(page, 503);
    await turnSharingOn(page);
    await addLearnerViaUi(page, 'HLP-02');
    await expect.poll(() => seen.requests.length, { timeout: 20_000 }).toBe(1);
    await page.goto('/settings');
    const share = page.getByRole('checkbox', { name: 'Share pilot results from this device' });
    await expect(share).toBeChecked();
    await expect(page.getByText(/Results waiting to be sent: [1-9]/)).toBeVisible();
    await share.uncheck();
    await expect(page.getByText('Sharing is off. Nothing is sent.')).toBeVisible();
    // Deleting is a moment's work in the background (a few milliseconds).
    await expect.poll(() => queuedCount(page)).toBe(0);
    seen.requests.length = 0;
    await page.goto('/lesson/towns-near-rivers/read');
    await page.waitForTimeout(8_000);
    expect(seen.requests).toEqual([]);
    // The queue is empty.
    expect(await queuedCount(page)).toBe(0);
  });

  test('keeps results while offline and sends them when the connection is back', async ({ page, context }) => {
    test.slow();
    const seen = await standInForServer(page);
    await turnSharingOn(page);
    await addLearnerViaUi(page, 'HLP-03');
    await expect.poll(() => allEvents(seen).length, { timeout: 20_000 }).toBeGreaterThan(0);
    const before = allEvents(seen).length;

    await context.setOffline(true);
    // Client-side moves between lessons need no network.
    await page.getByRole('link', { name: /^Write/ }).first().click();
    await expect(page).toHaveURL(/\/write$/);
    await page.waitForTimeout(8_000);
    expect(allEvents(seen).length).toBe(before);

    await context.setOffline(false);
    await expect.poll(() => allEvents(seen).some((event) => event.type === 'stage_enter' && event.stage === 'write'), { timeout: 30_000 }).toBe(true);
  });

  test('stops quietly when the server is not set up (503): one try, then no more', async ({ page }) => {
    test.slow();
    const seen = await standInForServer(page, 503);
    await turnSharingOn(page);
    await addLearnerViaUi(page, 'HLP-04');
    await expect.poll(() => seen.requests.length, { timeout: 20_000 }).toBe(1);
    // More activity does not make more requests, and nothing on the page complains.
    await page.goto('/lesson/towns-near-rivers/write');
    await page.getByRole('textbox', { name: 'Your answer' }).fill('some words here');
    await page.waitForTimeout(8_000);
    expect(seen.requests).toHaveLength(1);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
