import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// Thinkerwell's own videos (src/pages/siteVideo/, docs/notes/site-videos.md):
// on About, For educators and For organisations, played from this site's
// own files. CLAUDE.md rule 2: nothing of a video downloads before the tap,
// every video has a written version, and Save data turns the videos off.
//
// Playwright's Chromium has no H.264 decoder, so the real MP4 can't play in
// these tests (the player then shows the written version, as it would on
// any device that can't play it). To check the player itself, a test
// answers the MP4 request with a two-second VP9 clip (e2e/fixtures/clip.webm,
// made by ffmpeg from a plain colour and a tone) that this Chromium can play.

const CLIP = readFileSync(path.join(import.meta.dirname, 'fixtures', 'clip.webm'));

/** Serves the test clip for any of the site's video files, so the player can play here. */
async function playableVideos(page: Page): Promise<void> {
  await page.route(/\/video\/.*\.mp4$/, (route) => route.fulfill({ status: 200, contentType: 'video/webm', body: CLIP }));
}

function videoRequests(page: Page): string[] {
  const paths: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/video/')) paths.push(path);
  });
  return paths;
}

const PAGES = [
  { path: '/about', heading: 'About Thinkerwell', title: 'Explore your world' },
  { path: '/educators', heading: 'For educators', title: 'Run a session' },
  { path: '/organisations', heading: 'For organisations', title: 'Run a session' },
  { path: '/educators/setup', heading: 'Set up this device', title: 'Set up a device' },
];

for (const { path, heading, title } of PAGES) {
  test(`${path} offers "${title}", and downloads nothing of it before the tap`, async ({ page }) => {
    const requested = videoRequests(page);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    const card = page.locator('.tw-sitevideo');
    // Under the checklist's h1 the title is an h2; elsewhere it sits under a section's h2.
    await expect(card.getByRole('heading', { level: path === '/educators/setup' ? 2 : 3, name: title })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Watch the video' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Read instead' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(requested).toEqual([]);
    // The poster is drawn from the site's own mascot picture.
    await expect(card.locator('.tw-video-poster img')).toHaveAttribute('src', '/images/thinkerwell-mascot-transparent.png');
  });
}

test('the setup checklist’s video is on screen only: the printed checklist leaves it out', async ({ page }) => {
  await page.goto('/educators/setup');
  const card = page.locator('.tw-sitevideo');
  await expect(card).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(card).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await expect(card).toBeVisible();
});

test('the tap requests only the site’s own file and captions, into a player with controls and no autoplay', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? 'http://localhost').origin;
  await playableVideos(page);
  const all: string[] = [];
  page.on('request', (request) => all.push(request.url()));
  await page.goto('/about');
  await page.waitForLoadState('networkidle');
  const before = all.length;

  await page.locator('.tw-sitevideo').getByRole('button', { name: 'Watch the video' }).click();
  const video = page.locator('.tw-sitevideo video');
  await expect(video).toHaveAttribute('src', '/video/explore-your-world-v3.mp4');
  await expect(video).toHaveAttribute('controls', '');
  await expect(video).not.toHaveAttribute('autoplay');
  await expect(video.locator('track[srclang="en"]')).toHaveAttribute('src', '/video/explore-your-world-v3.en.vtt');
  await expect(video.locator('track[srclang="id"]')).toHaveAttribute('src', '/video/explore-your-world-v3.id.vtt');
  await expect(page.locator('.tw-sitevideo').getByRole('button', { name: 'Close the video' })).toBeVisible();
  // The tap started it (never by itself), with the English captions showing and the Indonesian subtitles there to choose.
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  expect(await video.evaluate((v: HTMLVideoElement) => [...v.textTracks].map((t) => `${t.kind}:${t.language}:${t.mode}`))).toEqual([
    'captions:en:showing',
    'subtitles:id:disabled',
  ]);

  await expect.poll(() => all.slice(before).filter((url) => url.includes('/video/')).length).toBeGreaterThan(0);
  const after = all.slice(before);
  expect(after.filter((url) => !url.startsWith('blob:') && new URL(url).origin !== origin)).toEqual([]);
  expect(after.filter((url) => url.includes('/video/')).every((url) => /\/video\/explore-your-world-v3\.(mp4|en\.vtt|id\.vtt)$/.test(new URL(url).pathname))).toBe(true);
});

test('"Read instead" shows every word of the video, and the video can be chosen again', async ({ page }) => {
  await playableVideos(page);
  await page.goto('/about');
  const card = page.locator('.tw-sitevideo');
  await card.getByRole('button', { name: 'Read instead' }).click();
  await expect(card.getByText('Written version')).toBeVisible();
  await expect(card.getByText(/Every learner deserves the chance to explore the world they live in/)).toBeVisible();
  await expect(card.getByText(/Sources: UNHCR \(2026\)/)).toBeVisible();
  await expect(card.locator('video')).toHaveCount(0);
  await card.getByRole('button', { name: 'Watch the video instead' }).click();
  await expect(card.locator('video')).toHaveCount(1);
});

test('with Save data on, only the written version shows and no video is offered', async ({ page }) => {
  await page.goto('/settings');
  const saveData = page.getByRole('checkbox', { name: 'Save data' });
  await expect(saveData).toBeEnabled();
  await saveData.check();
  await expect(saveData).toBeChecked();

  const requested = videoRequests(page);
  await page.goto('/organisations');
  const card = page.locator('.tw-sitevideo');
  await expect(card.getByText('Videos are off to save data.')).toBeVisible();
  await expect(card.getByText(/You don't need accounts, passwords or a big budget/)).toBeVisible();
  await expect(card.getByRole('button', { name: /Watch the video|Try the video again/ })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(requested).toEqual([]);
});

test('offline, the written version shows with a way to try the video again', async ({ page, context }) => {
  await page.goto('/educators');
  await expect(page.locator('.tw-sitevideo').getByRole('button', { name: 'Watch the video' })).toBeVisible();
  await context.setOffline(true);
  await page.locator('.tw-sitevideo').getByRole('button', { name: 'Watch the video' }).click();
  const card = page.locator('.tw-sitevideo');
  await expect(card.getByText("You're offline, so the video can't load now.")).toBeVisible();
  await expect(card.getByRole('button', { name: 'Try the video again' })).toBeVisible();
  await expect(card.locator('video')).toHaveCount(0);
  await context.setOffline(false);
});

test('a file that can’t play here gives way to the written version, with a way to try again', async ({ page }) => {
  // Not routed: the real MP4, which this Chromium can't decode.
  await page.goto('/educators');
  const card = page.locator('.tw-sitevideo');
  await card.getByRole('button', { name: 'Watch the video' }).click();
  await expect(card.getByText("This video can't play here right now.")).toBeVisible();
  await expect(card.getByText(/You don't need accounts, passwords or a big budget/)).toBeVisible();
  await expect(card.getByRole('button', { name: 'Try the video again' })).toBeVisible();
});

test('in Indonesian, the title, the note that the video is English and the written version are Indonesian', async ({ page }) => {
  await page.goto('/about');
  await page.getByRole('button', { name: /^(Language|Bahasa): / }).click();
  await page.locator('.tw-language-switch-panel').getByRole('radio', { name: 'Bahasa Indonesia' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  const card = page.locator('.tw-sitevideo');
  await expect(card.getByRole('heading', { level: 3, name: 'Jelajahi duniamu' })).toBeVisible();
  await expect(card.getByText('Video ini berbahasa Inggris', { exact: false })).toBeVisible();
  // The tap turns the Indonesian subtitles on instead of the English captions.
  await playableVideos(page);
  await card.getByRole('button', { name: 'Tonton video' }).click();
  const video = card.locator('video');
  await expect(video.locator('track[srclang="id"]')).toHaveAttribute('default', '');
  await expect(video.locator('track[srclang="en"]')).not.toHaveAttribute('default');
  await card.getByRole('button', { name: 'Tutup video' }).click();
  await card.getByRole('button', { name: 'Baca saja' }).click();
  await expect(card.getByText(/Setiap pelajar berhak mendapat kesempatan/)).toBeVisible();
});
