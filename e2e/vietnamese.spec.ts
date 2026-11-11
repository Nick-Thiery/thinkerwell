import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { englishOnPage } from './englishText';
import { recordRequests } from './lessonHelpers';
import { overflowReport } from './overflow';
import { fakeVoices, IPAD_VOICES, spoken } from './voiceFake';

/** The iPad's voices with Apple's Vietnamese voice (Linh), which the shared list leaves out. */
const IPAD_WITH_VIETNAMESE = [...IPAD_VOICES, { name: 'Linh', lang: 'vi-VN', uri: 'com.apple.voice.compact.vi-VN.Linh', isDefault: true }];

// Tiếng Việt (docs/notes/languages.md, docs/translation/vi/README.md): the interface and all four
// courses, drafted by AI and offered to everyone while native speakers review it, with no recordings
// of its own yet (Listen reads with a voice on the device). A shorter walk than malay.spec.ts, on the
// same lines: the one language setting, Be Vietnam Pro, Listen without recordings, lessons with no
// Watch step, and the pages fitting the screen with no English left on them.

const root = path.join(import.meta.dirname, '..');
const readJson = <T>(...parts: string[]) => JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;

type Tree = Record<string, unknown>;
const en = readJson<Tree>('src', 'i18n', 'messages', 'en.json');
const vi = readJson<Tree>('src', 'i18n', 'messages', 'vi.json');
/** A message by key with its {placeholders} filled in (plurals: the "other" form). */
function msg(messages: Tree, key: string, params: Record<string, string | number> = {}): string {
  let value = key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], messages);
  if (value && typeof value === 'object') value = (value as Tree).other;
  if (typeof value !== 'string') throw new Error(`No message ${key}`);
  return value.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

interface LessonText {
  id: string;
  title: string;
  read: { sections: unknown[] };
  watch: { keyPoints: string[] };
}
const names = readdirSync(path.join(root, 'content', 'lessons')).filter((name) => /^L\d\d\.json$/.test(name)).sort();
const lessons = names.map((name) => {
  const english = readJson<LessonText>('content', 'lessons', name);
  const vietnamese = readJson<Partial<LessonText>>('content', 'vi', 'lessons', name);
  return { ...english, title: vietnamese.title!, keyPoints: vietnamese.watch!.keyPoints };
});
const L10 = lessons[9]!;

const VIETNAMESE = 'Tiếng Việt';
const ENGLISH = 'English';

/** Changes the language with the header's switch (it is on every page). */
async function headerSwitch(page: Page, from: typeof VIETNAMESE | typeof ENGLISH, to: typeof VIETNAMESE | typeof ENGLISH): Promise<void> {
  const messages = from === VIETNAMESE ? vi : en;
  await page.getByRole('button', { name: msg(messages, 'header.language.button', { language: from }) }).click();
  await page.locator('.tw-language-switch-panel').getByRole('radio', { name: to }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', to === VIETNAMESE ? 'vi' : 'en');
}

async function expectAllVietnamese(page: Page, where: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  const report = await overflowReport(page);
  expect.soft(report.overflow, `${where} is ${report.overflow}px wider than the screen:\n${report.culprits.join('\n')}`).toBeLessThanOrEqual(0);
  expect.soft(await englishOnPage(page, [], 'vi'), `${where}: English on a Vietnamese page`).toEqual([]);
}

test.describe('the language switch offers Vietnamese', () => {
  test('the first page changes at once, both ways, in Be Vietnam Pro, and the switch names each language in its own', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText(msg(en, 'pages.home.title'));
    await page.getByRole('button', { name: msg(en, 'header.language.button', { language: ENGLISH }) }).click();
    const panel = page.locator('.tw-language-switch-panel');
    await expect(panel.getByRole('radio', { name: VIETNAMESE })).toHaveAttribute('lang', 'vi');
    await panel.getByRole('radio', { name: VIETNAMESE }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.locator('h1')).toHaveText(msg(vi, 'pages.home.title'));
    // The site's fonts have no ơ, ư or dotted vowels, so Vietnamese is set in Be Vietnam Pro.
    expect(await page.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Be Vietnam Pro');
    expect(await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Be Vietnam Pro');
    await expectAllVietnamese(page, 'Home');
    await headerSwitch(page, VIETNAMESE, ENGLISH);
    await expect(page.locator('h1')).toHaveText(msg(en, 'pages.home.title'));
    expect(await page.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily)).not.toContain('Be Vietnam Pro');
  });

  test('a reload keeps it, and Settings changes it too', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('radio', { name: VIETNAMESE }).check();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.locator('h1')).toHaveText(msg(vi, 'pages.settings.title'));
    await expectAllVietnamese(page, 'Settings');
  });
});

test.describe('Listen has no recordings in Vietnamese, so it uses a voice on the device', () => {
  test('reads Vietnamese with a Vietnamese voice, and says so when there is none', async ({ page }) => {
    await fakeVoices(page, IPAD_WITH_VIETNAMESE);
    await page.route('**/audio/**', (route) => route.abort());
    await page.goto(`/lesson/${L10.id}/read`);
    await page.getByRole('button', { name: msg(en, 'header.language.button', { language: ENGLISH }) }).click();
    await page.locator('.tw-language-switch-panel').getByRole('radio', { name: VIETNAMESE }).click();
    await page.getByRole('button', { name: msg(vi, 'lessonPlayer.read.listen') }).click();
    await expect.poll(async () => (await spoken(page))[0]?.lang).toBe('vi-VN');
    expect((await spoken(page))[0]?.voice).toBe('Linh');
  });

  test('with no Vietnamese voice, Listen is not shown and the Read step says why, in Vietnamese', async ({ page }) => {
    await fakeVoices(page, IPAD_VOICES);
    await page.goto(`/lesson/${L10.id}/read`);
    await page.getByRole('button', { name: msg(en, 'header.language.button', { language: ENGLISH }) }).click();
    await page.locator('.tw-language-switch-panel').getByRole('radio', { name: VIETNAMESE }).click();
    await expect(page.getByText(msg(vi, 'lessonPlayer.read.listenNoVoice'))).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: msg(vi, 'lessonPlayer.read.listen') })).toHaveCount(0);
  });

  test("Settings' Listen voice offers a Vietnamese voice, and says so when the device has none", async ({ page }) => {
    await fakeVoices(page, IPAD_WITH_VIETNAMESE);
    await page.goto('/settings#listen-voice');
    await page.getByRole('radio', { name: VIETNAMESE }).check();
    await expect(page.getByRole('combobox', { name: msg(vi, 'pages.settings.listenVoice.voiceFor.vi') })).toBeEnabled({ timeout: 8000 });
    await fakeVoices(page, IPAD_VOICES);
    await page.reload();
    await expect(page.getByText(msg(vi, 'pages.settings.listenVoice.noVoiceVietnamese'))).toBeVisible({ timeout: 8000 });
  });
});

test.describe('lessons in Vietnamese', () => {
  test('have no Watch step: /watch goes on to Reflect, four steps, the key points kept in Read; pictures and section checks are Vietnamese', async ({ page }) => {
    const requests = recordRequests(page);
    await page.goto(`/lesson/${L10.id}/watch`);
    await page.getByRole('button', { name: msg(en, 'header.language.button', { language: ENGLISH }) }).click();
    await page.locator('.tw-language-switch-panel').getByRole('radio', { name: VIETNAMESE }).click();
    await expect(page).toHaveURL(new RegExp(`/lesson/${L10.id}/reflect$`));
    await expect(page.locator('h1')).toHaveText(L10.title);
    const path = page.locator('.tw-lesson-path-horizontal .tw-step');
    if ((await path.count()) > 0) await expect(path).toHaveCount(4);
    else await expect(page.locator('.tw-lesson-step-count')).toHaveText(msg(vi, 'lessonPlayer.shell.stepOf', { number: 4, total: 4, stage: msg(vi, 'stages.reflect') }));
    await expect(page.getByRole('link', { name: new RegExp(`^${msg(vi, 'stages.watch')}`) })).toHaveCount(0);
    await page.goto(`/lesson/${L10.id}/read?part=${L10.read.sections.length}`);
    const learnMore = page.locator('.tw-read-learn-more');
    await learnMore.locator('summary').click();
    await expect(learnMore).toContainText(L10.keyPoints[0]!);
    await expect(page.locator('iframe')).toHaveCount(0);
    await page.goto(`/lesson/${L10.id}/read`);
    await expect(page.locator('figure img').first()).toHaveAttribute('src', /\/assets\/locales\/vi\/visuals\//);
    const history = readJson<{ title: string }>('content', 'vi', 'quizzes', 'history.json');
    await page.goto('/section/history/check');
    await expect(page.getByText(history.title).first()).toBeVisible();
    expect(requests.filter((url) => /youtube|ytimg|googlevideo/.test(url))).toEqual([]);
    await expectAllVietnamese(page, 'the section check');
  });

  test('another course opens in Vietnamese too, with its own words and no Watch step', async ({ page }) => {
    const first = readJson<{ title: string }>('content', 'courses', 'digital-world', 'vi', 'lessons', 'DW01.json');
    await page.goto('/lesson/dw-what-ai-is/read');
    await page.getByRole('button', { name: msg(en, 'header.language.button', { language: ENGLISH }) }).click();
    await page.locator('.tw-language-switch-panel').getByRole('radio', { name: VIETNAMESE }).click();
    await expect(page.locator('h1')).toHaveText(first.title);
    await expectAllVietnamese(page, 'a Digital World lesson');
  });

  for (const width of [390, 820, 1280]) {
    test(`the course map, Educators and Credits fit at ${width}px wide, with no English left`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/settings');
      await page.getByRole('radio', { name: VIETNAMESE }).check();
      for (const url of ['/course', '/educators', '/credits', '/about']) {
        await page.goto(url);
        await expectAllVietnamese(page, `${url} at ${width}px`);
      }
    });
  }
});
