import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// A language with an approved video of its own (src/content/localVideos.ts,
// docs/notes/local-language-videos.md). No such video is in content/ yet, so this runs
// against the dev server, which serves e2e-dev/fixtures/local-videos/id.json as
// content/id/videos.json (TW_TEST_LOCAL_VIDEOS, playwright.dev.config.ts): Lesson 5 has an
// approved Indonesian video, Lesson 9 an entry that is not approved. The production build
// has no way to do this (e2e/build-output.spec.ts checks it contains none of it).

const root = path.join(import.meta.dirname, '..');
const readJson = <T>(...parts: string[]) => JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;

type Tree = Record<string, unknown>;
const id = readJson<Tree>('src', 'i18n', 'messages', 'id.json');
const en = readJson<Tree>('src', 'i18n', 'messages', 'en.json');
function msg(messages: Tree, key: string): string {
  const value = key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], messages);
  if (typeof value !== 'string') throw new Error(`No message ${key}`);
  return value;
}

interface Fixture {
  lessons: Record<string, { youtubeId: string; title: string; channel: string; summary: string; keyPoints: string[]; beforeQuestion: string }>;
}
const fixture = readJson<Fixture>('e2e-dev', 'fixtures', 'local-videos', 'id.json');
const local = fixture.lessons.L05!;
const lesson5 = readJson<{ id: string; watch: { youtubeId: string; title: string } }>('content', 'lessons', 'L05.json');
const lesson9 = readJson<{ id: string; watch: { youtubeId: string; title: string } }>('content', 'lessons', 'L09.json');

const VIDEO_HOSTS = /youtube|ytimg|googlevideo|google\.|gstatic|doubleclick|ggpht/;

/** Changes the language with the header's switch (it is on every page). */
async function toIndonesian(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^(Language|Bahasa): / }).click();
  await page.locator('.tw-language-switch-panel').getByRole('radio', { name: 'Bahasa Indonesia' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
}

test.describe('a lesson with an approved Indonesian video', () => {
  test('shows it in place of the English one, with no English note and nothing marked English', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(`/lesson/${lesson5.id}/watch`);
    // English first: the English video, as always.
    await expect(page.locator('.tw-video-title')).toHaveText(lesson5.watch.title);
    await toIndonesian(page);

    const title = page.locator('.tw-video-title');
    await expect(title).toHaveText(local.title);
    await expect(title).not.toHaveAttribute('lang', /.+/);
    await expect(page.locator('.tw-video-meta')).toContainText(local.channel);
    await expect(page.getByText(msg(id, 'lessonPlayer.watch.videoInEnglish'))).toHaveCount(0);
    await expect(page.getByText(local.beforeQuestion)).toBeVisible();
    // Nothing from YouTube before the tap.
    // (By host: the dev server's own file src/pages/lesson/watch/youtube.ts is this site's.)
    expect(requests.filter((url) => VIDEO_HOSTS.test(new URL(url).host))).toEqual([]);

    // The tap makes the player for the local video, not the English one.
    await page.route(VIDEO_HOSTS, (route) => route.abort());
    await page.getByRole('button', { name: msg(id, 'ds.content.video.watchLabel') }).click();
    const src = await page.locator('.tw-video-player iframe').getAttribute('src');
    expect(src).toContain('youtube-nocookie.com');
    expect(src).toContain(`/embed/${local.youtubeId}`);
    expect(src).not.toContain(lesson5.watch.youtubeId);
  });

  test("keeps Read instead: the written version is the local video's", async ({ page }) => {
    await page.goto(`/lesson/${lesson5.id}/watch`);
    await toIndonesian(page);
    await page.getByRole('button', { name: msg(id, 'lessonPlayer.watch.readInstead') }).click();
    await expect(page.locator('.tw-watch-written-h')).toHaveText(local.title);
    await expect(page.locator('.tw-watch-written-h')).not.toHaveAttribute('lang', /.+/);
    await expect(page.locator('.tw-watch-written-text')).toContainText(local.summary.split('\n\n')[0]!);
    await expect(page.locator('.tw-watch-keypoints li')).toHaveText(local.keyPoints);
  });

  test('is only for Indonesian: English keeps the English video', async ({ page }) => {
    await page.goto(`/lesson/${lesson5.id}/watch`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.tw-video-title')).toHaveText(lesson5.watch.title);
    await expect(page.getByText(local.title)).toHaveCount(0);
  });

  test('is credited on the Credits page, beside the English video', async ({ page }) => {
    await page.goto('/credits');
    const videos = page.getByRole('region', { name: msg(en, 'pages.credits.videosTitle') });
    const link = videos.getByRole('link', { name: new RegExp(local.title) });
    await expect(link).toHaveAttribute('href', `https://www.youtube.com/watch?v=${local.youtubeId}`);
    await expect(videos.getByRole('link', { name: new RegExp(lesson5.watch.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first()).toBeVisible();
    // The entry that is not approved is not credited, and was never downloaded.
    await expect(videos).not.toContainText('Video uji yang belum disetujui');
  });
});

test.describe('a lesson whose entry is not approved', () => {
  test('is unchanged: the English video, marked English, with the note that it is in English', async ({ page }) => {
    await page.goto(`/lesson/${lesson9.id}/watch`);
    await toIndonesian(page);
    await expect(page.locator('.tw-video-title')).toHaveText(lesson9.watch.title);
    await expect(page.locator('.tw-video-title')).toHaveAttribute('lang', 'en');
    await expect(page.getByText(msg(id, 'lessonPlayer.watch.videoInEnglish'))).toBeVisible();
    await expect(page.getByText('Video uji yang belum disetujui')).toHaveCount(0);
  });
});
