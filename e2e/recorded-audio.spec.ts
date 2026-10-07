import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { horizontalOverflow, L10, recordRequests, watchErrors } from './lessonHelpers';

// Listen's recordings (docs/notes/recorded-audio.md), with the real files
// for Lesson 10, played by headless Chromium (which has no voice of its own,
// so anything read aloud here is a recording). The service worker is
// blocked (playwright.config.ts) except where a test turns it on.

const root = path.join(import.meta.dirname, '..');
const index = JSON.parse(readFileSync(path.join(root, 'src', 'audio', 'recordings.json'), 'utf8')) as Record<string, { timings: string }>;
const timings = JSON.parse(readFileSync(path.join(root, 'public', index.en!.timings), 'utf8')) as {
  sections: Record<string, { f: string; t: Array<[number, number] | 0> }>;
};
const PART_1 = timings.sections[`${L10.id}/standard/1`]!;

const audio = (page: Page) => page.locator('audio.tw-read-audio');
const media = (page: Page) =>
  audio(page).evaluate((el: HTMLAudioElement) => ({
    src: el.src,
    paused: el.paused,
    rate: el.playbackRate,
    pitch: el.preservesPitch,
    time: el.currentTime,
  }));

test('Listen plays the part’s recording, the highlight follows it, and Slow plays it at 0.8 with the pitch kept', async ({ page, baseURL }) => {
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  const requests = recordRequests(page);
  await page.goto(L10.path('read'));
  // Nothing is downloaded until Listen is tapped.
  await expect(page.getByRole('button', { name: 'Listen' })).toBeVisible();
  expect(requests.filter((url) => url.includes('/audio/'))).toEqual([]);

  await page.getByRole('button', { name: 'Listen' }).click();
  await expect.poll(async () => (await media(page)).src).toMatch(/^blob:/);
  await expect.poll(async () => (await media(page)).paused).toBe(false);
  expect(requests.filter((url) => url.includes('/audio/')).map((url) => new URL(url).pathname)).toEqual(
    expect.arrayContaining([index.en!.timings, `/audio/en/${PART_1.f}`]),
  );

  // The heading, then the first sentence, then the second, as the recording reaches them.
  const mark = page.locator('mark.tw-speaking');
  await expect(mark).toHaveText('Every community needs water to drink, cook and wash.', { timeout: 15_000 });
  await expect(mark).toBeInViewport();
  await expect(mark).not.toHaveText('Every community needs water to drink, cook and wash.', { timeout: 20_000 });
  const second = await mark.textContent();
  expect(second).toBeTruthy();

  // Slow mid-sentence: 0.8, pitch kept, same place, same sentence.
  const bar = page.getByRole('group', { name: /Reading aloud · part 1 of 3/ });
  const before = (await media(page)).time;
  await bar.getByRole('button', { name: 'Slow' }).click();
  const slow = await media(page);
  expect(slow.rate).toBe(0.8);
  expect(slow.pitch).toBe(true);
  expect(slow.time).toBeGreaterThanOrEqual(before);
  expect(slow.time - before).toBeLessThan(1.5);
  await expect(mark).toHaveText(second!);
  await bar.getByRole('button', { name: 'Normal' }).click();
  expect((await media(page)).rate).toBe(1);

  // Pause stops the recording; Play starts the sentence again from its beginning.
  await bar.getByRole('button', { name: 'Pause' }).click();
  await expect.poll(async () => (await media(page)).paused).toBe(true);
  await bar.getByRole('button', { name: 'Play' }).click();
  await expect.poll(async () => (await media(page)).paused).toBe(false);
  await expect(mark).toHaveText(second!);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await bar.getByRole('button', { name: 'Stop' }).click();
  await expect(mark).toHaveCount(0);
  await expect.poll(async () => (await media(page)).paused).toBe(true);

  expect(errors).toEqual([]);
  // Only this site's own files: nothing goes to any other server.
  const origin = new URL(baseURL ?? 'http://localhost').origin;
  expect(requests.filter((url) => !url.startsWith('data:') && !url.startsWith('blob:') && new URL(url).origin !== origin)).toEqual([]);
});

test('with the recordings blocked and no voice on the device, Listen says why and turns off', async ({ page }) => {
  await page.route('**/audio/**', (route) => route.abort());
  await page.goto(L10.path('read'));
  const listen = page.getByRole('button', { name: 'Listen' });
  await listen.click();
  await expect(page.getByRole('status').filter({ hasText: "Listen can't play this part here yet." })).toBeVisible();
  await expect(listen).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('group', { name: /Reading aloud/ })).toHaveCount(0);
});

test('Settings plays the recorded sample, and says how big the lesson audio is', async ({ page }) => {
  const requests = recordRequests(page);
  await page.goto('/settings#listen-voice');
  const english = page.getByRole('group', { name: 'Voice for English lessons' });
  await expect(english.getByText('Listen plays recordings made with Kokoro (Heart).')).toBeVisible();
  await english.getByRole('button', { name: 'Play a sample' }).click();
  await expect.poll(() => requests.filter((url) => /\/audio\/en\/sample\.[\da-f]+\.mp3$/.test(url)).length).toBe(1);

  const audioPart = page.getByRole('region', { name: 'Lesson audio' });
  await expect(audioPart.getByText(/^For English lessons: [\d.]+ MB in all\.$/)).toBeVisible();
  // The service worker is blocked here, as in a browser without one: nothing can keep the recordings, so nothing is offered.
  await expect(audioPart.getByText("This browser can't keep lesson audio, so Listen needs the internet here.")).toBeVisible();
  await expect(audioPart.getByRole('button', { name: 'Download lesson audio' })).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  async function waitUntilOfflineReady(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      }
    });
  }

  test('a part played once plays again offline, from the recordings’ own cache', async ({ page, context }) => {
    test.setTimeout(60_000);
    await page.goto(L10.path('read'));
    await waitUntilOfflineReady(page);
    await page.getByRole('button', { name: 'Listen' }).click();
    await expect.poll(async () => (await media(page)).paused).toBe(false);
    await page.getByRole('group', { name: /Reading aloud/ }).getByRole('button', { name: 'Stop' }).click();
    const kept = await page.evaluate(async () => (await (await caches.open('thinkerwell-audio-v1')).keys()).map((r) => new URL(r.url).pathname));
    expect(kept).toEqual(expect.arrayContaining([index.en!.timings, `/audio/en/${PART_1.f}`]));

    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button', { name: 'Listen' }).click();
    await expect.poll(async () => (await media(page)).paused).toBe(false);
    await expect(page.locator('mark.tw-speaking')).toHaveText('Every community needs water to drink, cook and wash.', { timeout: 15_000 });
    await expect(page.getByText("Listen can't play this part here yet.")).toHaveCount(0);
  });

  test('Settings downloads all the lesson audio for offline use, and says it is stored', { tag: '@own-size' }, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/settings#lesson-audio');
    await waitUntilOfflineReady(page);
    await page.reload();
    const audioPart = page.getByRole('region', { name: 'Lesson audio' });
    await expect(audioPart.getByText('None of it is on this device yet.')).toBeVisible();
    await audioPart.getByRole('button', { name: 'Download lesson audio' }).click();
    await expect(audioPart.getByText('All of it is on this device. Listen works here without the internet.')).toBeVisible({ timeout: 90_000 });
    const kept = await page.evaluate(async () => (await (await caches.open('thinkerwell-audio-v1')).keys()).length);
    expect(kept).toBe(Object.keys(timings.sections).length + 1);
  });
});
