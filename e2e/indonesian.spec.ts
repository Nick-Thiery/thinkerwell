import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { recordRequests } from './lessonHelpers';
import { overflowReport } from './overflow';

// Bahasa Indonesia (docs/notes/languages.md): a learner or a device chooses
// it, and then the interface, the lessons, the section checks and the
// pictures are Indonesian; the videos stay English and say so. Then every
// kind of page, and every step of all 24 lessons, at phone, tablet and
// laptop widths: Indonesian runs longer than English, so nothing may be
// wider than the screen and no text may be cut off. Text comes from the
// message and content files, so the tests follow the reviewers' wording.

const root = path.join(import.meta.dirname, '..');
const readJson = <T>(...parts: string[]) => JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;

type Tree = Record<string, unknown>;
const en = readJson<Tree>('src', 'i18n', 'messages', 'en.json');
const id = readJson<Tree>('src', 'i18n', 'messages', 'id.json');
/** A message by key with its {placeholders} filled in (plurals: the "other" form). */
function msg(messages: Tree, key: string, params: Record<string, string | number> = {}): string {
  let value = key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], messages);
  if (value && typeof value === 'object') value = (value as Tree).other;
  if (typeof value !== 'string') throw new Error(`No message ${key}`);
  return value.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

interface LessonText {
  id: string;
  number: number;
  title: string;
  read: { sections: unknown[] };
  watch: { summary: string };
}
const names = readdirSync(path.join(root, 'content', 'lessons')).filter((name) => /^L\d\d\.json$/.test(name)).sort();
const lessons = names.map((name) => {
  const english = readJson<LessonText>('content', 'lessons', name);
  const indonesian = readJson<Partial<LessonText>>('content', 'id', 'lessons', name);
  return { ...english, englishTitle: english.title, title: indonesian.title!, summary: indonesian.watch!.summary };
});
const L1 = lessons[0]!;
const L10 = lessons[9]!;

/** Sets this device's language in Settings (nobody chosen, so it is saved for the device). */
async function setDeviceLanguage(page: Page, endonym: 'Indonesia' | 'English', from: Tree = en): Promise<void> {
  await page.goto('/settings');
  await page.getByRole('radiogroup', { name: msg(from, 'pages.settings.language.label') }).getByRole('radio', { name: endonym }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', endonym === 'English' ? 'en' : 'id');
}

async function addLearner(page: Page, name: string, messages: Tree): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: msg(messages, 'pages.home.newLearnerTile') }).click();
  await page.getByLabel(msg(messages, 'pages.home.newLearner.nameLabel')).fill(name);
  await page.getByRole('button', { name: msg(messages, 'pages.home.newLearner.submit') }).click();
  await expect(page).toHaveURL(/\/lesson\/.+\/read$/);
}

/** Text cut off at its end (as e2e/languages.spec.ts checks the test languages). */
async function cutOff(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.body.querySelectorAll('*'))
      .filter((el) => {
        if (!(el instanceof HTMLElement) || !el.checkVisibility()) return false;
        if (![...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())) return false;
        const style = getComputedStyle(el);
        const hides = ['hidden', 'clip'].includes(style.overflowX) || style.textOverflow === 'ellipsis';
        return hides && el.clientWidth > 1 && el.scrollWidth > el.clientWidth + 1;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className}: "${el.textContent.trim().slice(0, 60)}"`),
  );
}

async function expectFits(page: Page, where: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const report = await overflowReport(page);
  expect.soft(report.overflow, `${where} is ${report.overflow}px wider than the screen:\n${report.culprits.join('\n')}`).toBeLessThanOrEqual(0);
  expect.soft(await cutOff(page), `${where}: text cut off`).toEqual([]);
}

test.describe('choosing Bahasa Indonesia', () => {
  test('a new learner picks it when they join, and then learns in it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: msg(en, 'pages.home.newLearnerTile') }).click();
    await page.getByLabel(msg(en, 'pages.home.newLearner.nameLabel')).fill('Dewi');
    await page.getByRole('radiogroup', { name: msg(en, 'pages.home.newLearner.languageLabel') }).getByRole('radio', { name: 'Indonesia' }).click();
    await page.getByRole('button', { name: msg(en, 'pages.home.newLearner.submit') }).click();

    await expect(page).toHaveURL(new RegExp(`/lesson/${L1.id}/read$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.locator('h1')).toHaveText(L1.title);
    // Course text is in the page's own language now: not marked English.
    await expect(page.locator('h1')).not.toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: msg(id, 'lessonPlayer.read.levelSimpler') })).toBeVisible();

    // Saved with the learner: a reload stays Indonesian.
    await page.reload();
    await expect(page.locator('h1')).toHaveText(L1.title);
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  });

  test('each learner keeps their own language on a shared device', async ({ page }) => {
    await addLearner(page, 'Amina', en);
    await expect(page.locator('h1')).toHaveText(L1.englishTitle);
    await page.goto('/');
    await page.getByRole('radiogroup', { name: msg(en, 'pages.home.dashboard.languageTitle') }).getByRole('radio', { name: 'Indonesia' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');

    // A second learner joins in the device's language (English) and stays English.
    await page.getByRole('button', { name: new RegExp(msg(id, 'ds.chrome.siteHeader.switchLearner', { name: 'Amina' })) }).click();
    await page.getByRole('button', { name: msg(id, 'header.backToPicker') }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await addLearner(page, 'Kofi', en);
    await expect(page.locator('h1')).toHaveText(L1.englishTitle);

    // Back to Amina: Indonesian again, lessons and course map included.
    await page.getByRole('button', { name: new RegExp(msg(en, 'ds.chrome.siteHeader.switchLearner', { name: 'Kofi' })) }).click();
    await page.getByRole('button', { name: /Amina/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await page.goto('/course');
    await expect(page.getByText(L1.title).first()).toBeVisible();
  });

  test("a teacher's device language applies to new learners and to anyone looking around", async ({ page }) => {
    await setDeviceLanguage(page, 'Indonesia');
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText(msg(id, 'pages.home.title'));
    await page.goto(`${`/lesson/${L10.id}/read`}?preview=true`);
    await expect(page.locator('h1')).toHaveText(L10.title);
    await setDeviceLanguage(page, 'English', id);
    await page.goto(`/lesson/${L10.id}/read`);
    await expect(page.locator('h1')).toHaveText(L10.englishTitle);
  });

  test('the video stays English and says so; its written version, section checks and pictures are Indonesian', async ({ page }) => {
    const requests = recordRequests(page);
    await setDeviceLanguage(page, 'Indonesia');
    await page.goto(`/lesson/${L10.id}/watch`);
    await expect(page.getByText(msg(id, 'lessonPlayer.watch.videoInEnglish'))).toBeVisible();
    await expect(page.locator('.tw-video-title')).toHaveAttribute('lang', 'en');
    await page.getByRole('button', { name: msg(id, 'lessonPlayer.watch.readInstead') }).click();
    await expect(page.locator('.tw-watch-written-text')).toContainText(L10.summary.split('\n')[0]!.slice(0, 40));

    await page.goto(`/lesson/${L10.id}/read`);
    const picture = page.locator('.tw-lx-visual img, .tw-visual img, figure img').first();
    await expect(picture).toHaveAttribute('src', /\/assets\/locales\/id\/visuals\//);

    const history = readJson<{ title: string }>('content', 'id', 'quizzes', 'history.json');
    await page.goto('/section/history/check');
    await expect(page.getByText(history.title).first()).toBeVisible();
    // Nothing from YouTube before a tap, in Indonesian too.
    expect(requests.filter((url) => /youtube|ytimg|googlevideo/.test(url))).toEqual([]);
  });

  test('English stays exactly as it was, and downloads nothing of Indonesian', async ({ page }) => {
    const requests = recordRequests(page);
    await page.goto(`/lesson/${L10.id}/watch`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toHaveText(L10.englishTitle);
    await expect(page.getByText(msg(en, 'lessonPlayer.watch.videoInEnglish'))).toHaveCount(0);
    expect(requests.filter((url) => /\/assets\/locales\/id\//.test(url))).toEqual([]);
  });
});

/** Replaces the browser's voices with these (lang, local): Listen then sees only them. */
async function voices(page: Page, list: Array<[lang: string, local: boolean]>): Promise<void> {
  await page.addInitScript((given) => {
    const events = new EventTarget();
    const synth = {
      paused: false,
      pending: false,
      speaking: false,
      getVoices: () => given.map(([lang, local], i) => ({ name: `Voice ${i}`, lang, localService: local, default: i === 0, voiceURI: `voice-${i}` })),
      speak() {},
      cancel() {},
      pause() {},
      resume() {},
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => synth });
  }, list);
}

test.describe('Listen in Indonesian', () => {
  test('reads with an Indonesian voice on the device', async ({ page }) => {
    await voices(page, [['en-GB', true], ['id-ID', true]]);
    await setDeviceLanguage(page, 'Indonesia');
    await page.goto(`/lesson/${L10.id}/read`);
    await expect(page.getByRole('button', { name: msg(id, 'lessonPlayer.read.listen') })).toBeVisible();
    await expect(page.getByText(msg(id, 'lessonPlayer.read.listenNoVoice'))).toHaveCount(0);
  });

  test('with only English (or online) voices, says so instead of reading Indonesian with them', async ({ page }) => {
    await voices(page, [['en-GB', true], ['id-ID', false]]);
    await setDeviceLanguage(page, 'Indonesia');
    await page.goto(`/lesson/${L10.id}/read`);
    await expect(page.getByText(msg(id, 'lessonPlayer.read.listenNoVoice'))).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: msg(id, 'lessonPlayer.read.listen') })).toHaveCount(0);
  });
});

test.describe('every screen in Indonesian fits', () => {
  test.beforeEach(async ({ page }) => {
    await setDeviceLanguage(page, 'Indonesia');
  });

  test('every kind of page, with a learner who has done a lesson and a section check', async ({ page }) => {
    test.setTimeout(240_000);
    await expectFits(page, 'settings');
    await page.goto('/');
    await expectFits(page, 'home');
    await page.getByRole('button', { name: msg(id, 'pages.home.newLearnerTile') }).click();
    await expectFits(page, 'new learner');
    await page.getByLabel(msg(id, 'pages.home.newLearner.nameLabel')).fill('Nur Aisyah Rahmawati');
    await page.getByRole('button', { name: msg(id, 'pages.home.newLearner.submit') }).click();
    await expect(page).toHaveURL(/\/lesson\//);

    // A section check to the end, answering the first option each time.
    await page.goto('/section/history/check');
    await expectFits(page, 'section check intro');
    await page.getByRole('button', { name: msg(id, 'pages.sectionCheck.start') }).click();
    for (let n = 1; n <= 20; n += 1) {
      await page.getByRole('radio').first().click();
      await expectFits(page, `section check question ${n}`);
      const next = page.locator('.tw-actionbar').getByRole('button', { name: msg(id, 'pages.sectionCheck.nextQuestion') });
      if (await next.isVisible()) await next.click();
      else {
        await page.locator('.tw-actionbar').getByRole('button', { name: msg(id, 'pages.sectionCheck.seeResults') }).click();
        break;
      }
    }
    await expect(page.getByRole('button', { name: msg(id, 'pages.sectionCheck.retry') })).toBeVisible();
    await expectFits(page, 'section check results');

    const pages = [
      '/',
      '/course',
      '/journal',
      '/journal/print',
      '/settings',
      '/about',
      '/educators',
      '/educators/setup',
      '/educators/class',
      '/educators/class/certificates',
      `/educators/lesson/${L10.id}`,
      '/educators/section/history/answers',
      `/lesson/${L10.id}/print`,
      '/certificate/section/history',
      '/certificate/course',
      '/no-such-page',
    ];
    for (const address of pages) {
      await page.goto(address);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', 'id');
      await expectFits(page, address);
    }
    // The header's switcher and, on a phone, the menu.
    await page.goto('/course');
    await page.getByRole('button', { name: new RegExp(msg(id, 'ds.chrome.siteHeader.switchLearner', { name: 'Nur Aisyah Rahmawati' })) }).click();
    await expectFits(page, 'learner switcher');
    await page.keyboard.press('Escape');
    const menu = page.getByRole('button', { name: msg(id, 'ds.chrome.siteHeader.openMenu') });
    if (await menu.isVisible()) {
      await menu.click();
      await expectFits(page, 'phone menu');
    }
  });

  for (const lesson of lessons) {
    test(`Lesson ${lesson.number}: every step`, async ({ page }) => {
      test.setTimeout(120_000);
      const steps = [
        ...Array.from({ length: lesson.read.sections.length }, (_, i) => `read?part=${i + 1}`),
        'read?part=check',
        'write',
        'speak',
        'watch',
        'reflect',
        'complete',
      ];
      for (const step of steps) {
        await page.goto(`/lesson/${lesson.id}/${step}`);
        await expect(page.locator('html')).toHaveAttribute('lang', 'id');
        await expect(page.locator('h1')).toHaveCount(1);
        if (step !== 'complete') await expect(page.locator('h1')).toHaveText(lesson.title);
        await expectFits(page, step);
      }
      // What opens on Write (starters, planning, the example) and on Watch (the written version).
      await page.goto(`/lesson/${lesson.id}/write`);
      for (const [full, short] of [
        ['modeStarters', 'modeStartersShort'],
        ['modePlan', 'modePlanShort'],
      ] as const) {
        const label = new RegExp(`^(${msg(id, `lessonPlayer.write.${full}`)}|${msg(id, `lessonPlayer.write.${short}`)})$`);
        await page.getByRole('button', { name: label }).click();
        await expectFits(page, `write: ${full}`);
      }
      await page.getByRole('button', { name: msg(id, 'lessonPlayer.write.seeExample') }).click();
      await expectFits(page, 'write: example');
      await page.goto(`/lesson/${lesson.id}/watch`);
      await page.getByRole('button', { name: msg(id, 'lessonPlayer.watch.readInstead') }).click();
      await expectFits(page, 'watch: written version');
    });
  }
});
