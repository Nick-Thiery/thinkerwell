import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { englishOnPage } from './englishText';
import { recordRequests } from './lessonHelpers';
import { overflowReport } from './overflow';
import { fakeSpeechRecognition, recognitionLangs } from './speechFake';
import { fakeVoices, IPAD_VOICES, spoken } from './voiceFake';

/** The iPad's voices with Apple's Malay voice (Amira), which the shared list leaves out. */
const IPAD_WITH_MALAY = [...IPAD_VOICES, { name: 'Amira', lang: 'ms-MY', uri: 'com.apple.voice.compact.ms-MY.Amira', isDefault: true }];

// Bahasa Melayu, Malaysian Malay (docs/notes/languages.md, docs/translation/ms/README.md).
// The same walk as Malay.spec.ts, in the third language.
//
// One language setting for the whole app (useLearnerSession().language):
// the header's switch (on every page, from the first), Settings, the
// new-learner form and a learner's home all read and change it, and every
// page follows at once, with no reload. It is saved for the device before
// anyone is chosen, and for each learner once chosen; a reload keeps it.
// With Malay on, nothing on any page is English but "Thinkerwell",
// learners' names and the English videos' titles, and nothing is wider
// than the screen or cut off, at phone, tablet and laptop widths. Text comes
// from the message and content files, so the tests follow the reviewers'
// wording.

const root = path.join(import.meta.dirname, '..');
const readJson = <T>(...parts: string[]) => JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;

type Tree = Record<string, unknown>;
const en = readJson<Tree>('src', 'i18n', 'messages', 'en.json');
const ms = readJson<Tree>('src', 'i18n', 'messages', 'ms.json');
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
  section: string;
  title: string;
  read: { sections: unknown[] };
  watch: { summary: string };
  sources: unknown[];
}
const names = readdirSync(path.join(root, 'content', 'lessons')).filter((name) => /^L\d\d\.json$/.test(name)).sort();
const lessons = names.map((name) => {
  const english = readJson<LessonText>('content', 'lessons', name);
  const malay = readJson<Partial<LessonText>>('content', 'ms', 'lessons', name);
  return { ...english, englishTitle: english.title, title: malay.title!, summary: malay.watch!.summary };
});
const L1 = lessons[0]!;
const L10 = lessons[9]!;

const MALAY = 'Bahasa Melayu';
const ENGLISH = 'English';

/** Changes the language with the header's switch (it is on every page). */
async function headerSwitch(page: Page, to: typeof MALAY | typeof ENGLISH): Promise<void> {
  await page.getByRole('button', { name: /^(Language|Bahasa): / }).click();
  await page.locator('.tw-language-switch-panel').getByRole('radio', { name: to }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', to === MALAY ? 'ms' : 'en');
}

/** Marks the page, so a later check can tell it wasn't reloaded. */
async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => ((window as unknown as { __notReloaded: boolean }).__notReloaded = true));
}
async function expectNotReloaded(page: Page): Promise<void> {
  expect(await page.evaluate(() => (window as unknown as { __notReloaded?: boolean }).__notReloaded)).toBe(true);
}

async function addLearner(page: Page, name: string, messages: Tree): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: msg(messages, 'pages.home.newLearnerTile') }).click();
  await page.getByLabel(msg(messages, 'pages.home.newLearner.nameLabel')).fill(name);
  await page.getByRole('button', { name: msg(messages, 'pages.home.newLearner.submit') }).click();
  await expect(page).toHaveURL(/\/lesson\/.+\/read$/);
}

/** Opens the header's learner switcher (whoever is chosen) and chooses `name`. */
async function chooseLearner(page: Page, name: string, messages: Tree): Promise<void> {
  const chip = page.getByRole('button', { name: new RegExp(`^${msg(messages, 'ds.chrome.siteHeader.switchLearner', { name: '.+' })}$`) });
  await chip.click();
  await page.getByRole('button', { name: new RegExp(name) }).click();
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

/** Fits the screen, nothing cut off, and no English left. */
async function expectAllMalay(page: Page, where: string, allowed: readonly string[] = []): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
  const report = await overflowReport(page);
  expect.soft(report.overflow, `${where} is ${report.overflow}px wider than the screen:\n${report.culprits.join('\n')}`).toBeLessThanOrEqual(0);
  expect.soft(await cutOff(page), `${where}: text cut off`).toEqual([]);
  expect.soft(await englishOnPage(page, allowed, 'ms'), `${where}: English on a Malay page`).toEqual([]);
}

test.describe('one language setting, changed anywhere, followed at once', () => {
  test('the first page has the switch, in the header, and it changes the page at once, both ways', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText(msg(en, 'pages.home.title'));
    const button = page.getByRole('button', { name: msg(en, 'header.language.button', { language: ENGLISH }) });
    await expect(button).toBeVisible();
    await expect(button.locator('svg').first()).toBeVisible(); // the globe
    await markPage(page);

    await headerSwitch(page, MALAY);
    await expect(page.locator('h1')).toHaveText(msg(ms, 'pages.home.title'));
    await expect(page.getByRole('button', { name: msg(ms, 'pages.home.newLearnerTile') })).toBeVisible();
    // Each language in its own name, in its own language.
    await page.getByRole('button', { name: msg(ms, 'header.language.button', { language: MALAY }) }).click();
    const panel = page.locator('.tw-language-switch-panel');
    await expect(panel.getByRole('radio', { name: ENGLISH })).toHaveAttribute('lang', 'en');
    await expect(panel.getByRole('radio', { name: MALAY })).toHaveAttribute('lang', 'ms');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);

    await headerSwitch(page, ENGLISH);
    await expect(page.locator('h1')).toHaveText(msg(en, 'pages.home.title'));
    await expectNotReloaded(page);
  });

  test('the new-learner form changes the page at once, and the learner keeps the language they joined in', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: msg(en, 'pages.home.newLearnerTile') }).click();
    await page.getByLabel(msg(en, 'pages.home.newLearner.nameLabel')).fill('Aina');
    await page.getByRole('radiogroup', { name: msg(en, 'pages.home.newLearner.languageLabel') }).getByRole('radio', { name: MALAY }).click();
    // The form itself is Malay now, and what was typed stays.
    await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
    await expect(page.getByLabel(msg(ms, 'pages.home.newLearner.nameLabel'))).toHaveValue('Aina');
    await page.getByRole('button', { name: msg(ms, 'pages.home.newLearner.submit') }).click();
    await expect(page.locator('h1')).toHaveText(L1.title);
    // The course text is the page's own language now: not marked English.
    await expect(page.locator('h1')).not.toHaveAttribute('lang', 'en');
  });

  test('back and forth in the header and in Settings, on several pages and in the middle of a lesson, with no reload', async ({ page }) => {
    await addLearner(page, 'Amina', en);

    // Mid-lesson: the Write step with an answer half written.
    await page.goto(`/lesson/${L10.id}/write`);
    const answer = page.getByRole('textbox', { name: msg(en, 'lessonPlayer.write.answerLabel') });
    await answer.fill('Saya akan membina bandar berhampiran sungai');
    await markPage(page);
    await headerSwitch(page, MALAY);
    await expect(page.locator('h1')).toHaveText(L10.title);
    await expect(page.getByRole('textbox', { name: msg(ms, 'lessonPlayer.write.answerLabel') })).toHaveValue('Saya akan membina bandar berhampiran sungai');
    await expect(page).toHaveURL(new RegExp(`/lesson/${L10.id}/write$`));
    await headerSwitch(page, ENGLISH);
    await expect(page.locator('h1')).toHaveText(L10.englishTitle);
    await headerSwitch(page, MALAY);
    await expect(page.locator('h1')).toHaveText(L10.title);
    await expectNotReloaded(page);

    // The Read step, part 2.
    await page.goto(`/lesson/${L10.id}/read?part=2`);
    await markPage(page);
    await headerSwitch(page, ENGLISH);
    await expect(page.locator('h1')).toHaveText(L10.englishTitle);
    await headerSwitch(page, MALAY);
    await expect(page.getByRole('button', { name: msg(ms, 'lessonPlayer.read.levelSimpler') })).toBeVisible();
    await expectNotReloaded(page);

    // Settings: the same setting, both ways, on the page itself.
    await page.goto('/settings');
    await markPage(page);
    const group = (messages: Tree) => page.getByRole('radiogroup', { name: msg(messages, 'pages.settings.language.labelLearner', { name: 'Amina' }) });
    await expect(group(ms).getByRole('radio', { name: MALAY })).toHaveAttribute('aria-checked', 'true');
    await group(ms).getByRole('radio', { name: ENGLISH }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: msg(en, 'header.language.button', { language: ENGLISH }) })).toBeVisible();
    await group(en).getByRole('radio', { name: MALAY }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
    await expect(page.getByRole('button', { name: msg(ms, 'header.language.button', { language: MALAY }) })).toBeVisible();
    await expectNotReloaded(page);

    // The course map and the learner's home.
    for (const address of ['/course', '/']) {
      await page.goto(address);
      await markPage(page);
      await headerSwitch(page, ENGLISH);
      await expect(page.locator('h1')).toBeVisible();
      await headerSwitch(page, MALAY);
      await expect(page.locator('h1')).toBeVisible();
      await expectNotReloaded(page);
    }
  });

  test('two learners on one device keep their own languages, and the first page keeps the device’s', async ({ page }) => {
    await addLearner(page, 'Amina', en);
    await headerSwitch(page, MALAY);
    await expect(page.locator('h1')).toHaveText(L1.title);

    // Back to "Who's learning": the device's language (still English).
    await page.getByRole('button', { name: new RegExp(`^${msg(ms, 'ds.chrome.siteHeader.switchLearner', { name: 'Amina' })}$`) }).click();
    await page.getByRole('button', { name: msg(ms, 'header.backToPicker') }).click();
    await expect(page.locator('h1')).toHaveText(msg(en, 'pages.home.title'));

    await addLearner(page, 'Kofi', en);
    await expect(page.locator('h1')).toHaveText(L1.englishTitle);

    await chooseLearner(page, 'Amina', en);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
    await chooseLearner(page, 'Kofi', ms);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/course');
    await expect(page.getByText(L1.englishTitle).first()).toBeVisible();
  });

  test('a reload keeps the language: on the first page, and for a learner', async ({ page }) => {
    await page.goto('/');
    await headerSwitch(page, MALAY);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
    await expect(page.locator('h1')).toHaveText(msg(ms, 'pages.home.title'));

    await addLearner(page, 'Amina', ms);
    await headerSwitch(page, ENGLISH);
    await page.reload();
    await expect(page.locator('h1')).toHaveText(L1.englishTitle);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Back to the first page: the device's language (Malay), after a reload too.
    await page.getByRole('button', { name: new RegExp(`^${msg(en, 'ds.chrome.siteHeader.switchLearner', { name: 'Amina' })}$`) }).click();
    await page.getByRole('button', { name: msg(en, 'header.backToPicker') }).click();
    await expect(page.locator('h1')).toHaveText(msg(ms, 'pages.home.title'));
    await page.reload();
    await expect(page.locator('h1')).toHaveText(msg(ms, 'pages.home.title'));
  });

  test('Say it listens in the language on screen, on the device only where that language was checked', async ({ page }) => {
    await fakeSpeechRecognition(page, 'available');
    await addLearner(page, 'Amina', en);
    await headerSwitch(page, MALAY);
    await page.goto('/settings');
    await page.getByRole('button', { name: msg(ms, 'pages.settings.sayIt.checkDevice') }).click();
    await expect.poll(async () => (await recognitionLangs(page)).asked).toEqual([['ms-MY']]);
    // The answer is kept (with its date) before leaving the page.
    const [before, after] = msg(ms, 'pages.settings.sayIt.checkedOn').split('{date}');
    await expect(page.getByText(new RegExp(`${before!.trim()}.+${after!.trim().replace('.', '\\.')}`))).toBeVisible();

    await page.goto(`/lesson/${L10.id}/write`);
    await page.getByRole('button', { name: msg(ms, 'ds.actions.voiceButton.sayIt') }).first().click();
    await expect.poll(async () => (await recognitionLangs(page)).started).toEqual(['ms-MY']);
    // English wasn't checked on this device, so in English there's no Say it.
    await headerSwitch(page, ENGLISH);
    await expect(page.getByRole('button', { name: msg(en, 'ds.actions.voiceButton.sayIt') })).toHaveCount(0);
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

test.describe('the header keeps its links on laptops @own-size', () => {
  // Malay words are longer, so the full header (every link, the
  // language by name, the learner's name) can be too wide for its row. It
  // then tightens (the language as its code, the learner as their avatar)
  // before it ever hides the links behind the phone menu button.
  for (const width of [1180, 1280, 1440]) {
    test(`at ${width}px wide, with a learner chosen, in Malay and English`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await addLearner(page, 'Aina', en);
      for (const [language, messages] of [[MALAY, ms], [ENGLISH, en]] as const) {
        if (language === MALAY) await headerSwitch(page, MALAY);
        else await headerSwitch(page, ENGLISH);
        const header = page.locator('header.tw-header');
        await expect(header.getByRole('navigation', { name: msg(messages, 'nav.label') })).toBeVisible();
        await expect(header.getByRole('button', { name: msg(messages, 'ds.chrome.siteHeader.openMenu') })).toHaveCount(0);
        const row = header.locator('.tw-header-inner');
        const [scroll, client] = await row.evaluate((el) => [el.scrollWidth, el.clientWidth]);
        expect(scroll, `${language} header at ${width}px`).toBeLessThanOrEqual(client + 1);
      }
    });
  }
});

test.describe('Listen follows the language', () => {
  test('reads Malay with an Malay voice on the device, and switches back to English with the page', async ({ page }) => {
    await voices(page, [['en-GB', true], ['ms-MY', true]]);
    await page.goto(`/lesson/${L10.id}/read`);
    await headerSwitch(page, MALAY);
    await expect(page.getByRole('button', { name: msg(ms, 'lessonPlayer.read.listen') })).toBeVisible();
    await expect(page.getByText(msg(ms, 'lessonPlayer.read.listenNoVoice'))).toHaveCount(0);
    await headerSwitch(page, ENGLISH);
    await expect(page.getByRole('button', { name: msg(en, 'lessonPlayer.read.listen') })).toBeVisible();
  });

  test("Settings' Listen voice is all Malay, and the chosen Malay voice reads Malay lessons without their recordings", async ({ page }) => {
    await fakeVoices(page, IPAD_WITH_MALAY);
    // Without the recordings (not downloaded, offline), the device voice reads.
    await page.route('**/audio/**', (route) => route.abort());
    await page.goto('/settings#listen-voice');
    await headerSwitch(page, MALAY);
    const Malay = page.getByRole('combobox', { name: msg(ms, 'pages.settings.listenVoice.voiceFor.ms') });
    await expect(Malay).toBeEnabled();
    await expect(page.getByRole('combobox', { name: msg(ms, 'pages.settings.listenVoice.voiceFor.en') })).toBeEnabled();
    await expectAllMalay(page, 'Settings, Listen voice');
    await Malay.selectOption({ label: 'Amira' });
    await page.goto(`/lesson/${L10.id}/read`);
    await page.getByRole('button', { name: msg(ms, 'lessonPlayer.read.listen') }).click();
    await expect.poll(async () => (await spoken(page))[0]?.voice).toBe('Amira');
    expect((await spoken(page))[0]?.lang).toBe('ms-MY');
  });

  test('with no Malay voice, Settings says so, in Malay', async ({ page }) => {
    await fakeVoices(
      page,
      IPAD_WITH_MALAY.filter((voice) => voice.lang !== 'ms-MY'),
    );
    await page.goto('/settings#listen-voice');
    await headerSwitch(page, MALAY);
    await expect(page.getByText(msg(ms, 'pages.settings.listenVoice.noVoiceMalayRecorded'))).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('combobox', { name: msg(ms, 'pages.settings.listenVoice.voiceFor.ms') })).toHaveCount(0);
    // The recorded Malay voice is still there, with its sample.
    await expect(page.getByRole('group', { name: msg(ms, 'pages.settings.listenVoice.voiceFor.ms') }).getByRole('button', { name: msg(ms, 'pages.settings.listenVoice.sample') })).toBeVisible();
    await expectAllMalay(page, 'Settings, no Malay voice');
  });

  test('with only English (or online) voices and no recording here, says so instead of reading Malay with them', async ({ page }) => {
    await voices(page, [['en-GB', true], ['ms-MY', false]]);
    await page.route('**/audio/**', (route) => route.abort());
    await page.goto(`/lesson/${L10.id}/read`);
    await headerSwitch(page, MALAY);
    // The Malay recordings: Listen shows, with no note.
    const listen = page.getByRole('button', { name: msg(ms, 'lessonPlayer.read.listen') });
    await expect(listen).toBeVisible();
    await expect(page.getByText(msg(ms, 'lessonPlayer.read.listenNoVoice'))).toHaveCount(0);
    // They can't be had, and there's no Malay voice: it says so, and never reads Malay with the English voice.
    await listen.click();
    await expect(page.getByText(msg(ms, 'lessonPlayer.read.listenUnavailable'))).toBeVisible();
    await expect(listen).toHaveAttribute('aria-pressed', 'false');
    await expectAllMalay(page, 'Read, Listen unavailable');
  });
});

test.describe('lessons, videos and downloads', () => {
  test('the video stays English and says so; its written version, section checks and pictures are Malay', async ({ page }) => {
    const requests = recordRequests(page);
    await page.goto(`/lesson/${L10.id}/watch`);
    await headerSwitch(page, MALAY);
    await expect(page.getByText(msg(ms, 'lessonPlayer.watch.videoInEnglish'))).toBeVisible();
    await expect(page.locator('.tw-video-title')).toHaveAttribute('lang', 'en');
    await page.getByRole('button', { name: msg(ms, 'lessonPlayer.watch.readInstead') }).click();
    await expect(page.locator('.tw-watch-written-text')).toContainText(L10.summary.split('\n')[0]!.slice(0, 40));

    await page.goto(`/lesson/${L10.id}/read`);
    await expect(page.locator('figure img').first()).toHaveAttribute('src', /\/assets\/locales\/ms\/visuals\//);
    const history = readJson<{ title: string }>('content', 'ms', 'quizzes', 'history.json');
    await page.goto('/section/history/check');
    await expect(page.getByText(history.title).first()).toBeVisible();
    expect(requests.filter((url) => /youtube|ytimg|googlevideo/.test(url))).toEqual([]);
  });

  test('English stays exactly as it was, and downloads nothing of Malay', async ({ page }) => {
    const requests = recordRequests(page);
    await page.goto(`/lesson/${L10.id}/watch`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toHaveText(L10.englishTitle);
    await expect(page.getByText(msg(en, 'lessonPlayer.watch.videoInEnglish'))).toHaveCount(0);
    expect(requests.filter((url) => /\/assets\/locales\/ms\//.test(url))).toEqual([]);
  });
});

const LEARNER = 'Nur Aisyah binti Abdullah';
/** What the tests type: Malay, as a learner would. */
const TYPED = 'Saya belajar sesuatu yang baharu.';

test.describe('with Malay on, every page is Malay and fits', () => {
  test('every kind of page, its popovers and messages, for a learner with work, a finished section and a section check', async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto('/');
    await headerSwitch(page, MALAY);
    await expectAllMalay(page, 'first page');
    await page.getByRole('button', { name: msg(ms, 'pages.home.newLearnerTile') }).click();
    await expectAllMalay(page, 'new learner');
    await page.getByLabel(msg(ms, 'pages.home.newLearner.nameLabel')).fill(LEARNER);
    await page.getByRole('button', { name: msg(ms, 'pages.home.newLearner.submit') }).click();
    await expect(page).toHaveURL(/\/lesson\//);
    const allowed = [LEARNER, TYPED];

    // The Geography section, finished (so its certificate exists), with writing in the journal.
    for (const lesson of lessons.filter((l) => l.section === 'geography')) {
      await page.goto(`/lesson/${lesson.id}/reflect`);
      await page.getByRole('textbox').first().fill(TYPED);
      await page.locator('.tw-actionbar').getByRole('button', { name: msg(ms, 'lessonPlayer.shell.finishLesson') }).click();
      await expect(page.locator('h1')).toHaveText(msg(ms, 'lessonPlayer.complete.title', { number: lesson.number }));
    }
    await expectAllMalay(page, 'lesson complete, section finished', allowed);

    // A section check to the end, answering the first option each time.
    await page.goto('/section/geography/check');
    await expectAllMalay(page, 'section check intro', allowed);
    await page.getByRole('button', { name: msg(ms, 'pages.sectionCheck.start') }).click();
    for (let n = 1; n <= 20; n += 1) {
      await page.getByRole('radio').first().click();
      await expectAllMalay(page, `section check question ${n}, answered`, allowed);
      const next = page.locator('.tw-actionbar').getByRole('button', { name: msg(ms, 'pages.sectionCheck.nextQuestion') });
      if (await next.isVisible()) await next.click();
      else {
        await page.locator('.tw-actionbar').getByRole('button', { name: msg(ms, 'pages.sectionCheck.seeResults') }).click();
        break;
      }
    }
    await expect(page.getByRole('button', { name: msg(ms, 'pages.sectionCheck.retry') })).toBeVisible();
    await expectAllMalay(page, 'section check results', allowed);

    for (const address of [
      '/',
      '/course',
      '/journal',
      '/journal/print',
      '/settings',
      '/about',
      '/credits',
      '/organisations',
      '/educators',
      '/educators/setup',
      '/educators/information-sheet',
      '/educators/consent-form',
      '/educators/code-cards?prefix=HLP&count=12',
      '/educators/class',
      '/educators/class/certificates',
      `/educators/lesson/${L10.id}`,
      '/educators/section/geography/answers',
      `/lesson/${L10.id}/print`,
      '/certificate/section/geography',
      '/certificate/section/history',
      '/certificate/course',
      '/section/history/check',
      '/no-such-page',
    ]) {
      await page.goto(address);
      await expect(page.locator('h1').first()).toBeVisible();
      await expectAllMalay(page, address, allowed);
    }

    // The consent form with an organisation's name typed in (the name is theirs, in any language).
    await page.goto('/educators/consent-form');
    await page.getByRole('textbox', { name: msg(ms, 'pages.consentForm.orgLabel') }).fill('HELP for Refugees');
    await expectAllMalay(page, 'consent form, with a name', [...allowed, 'HELP for Refugees']);
    // The information sheet with every box filled in.
    await page.goto('/educators/information-sheet');
    for (const [key, value] of [
      ['pages.consentForm.orgLabel', 'HELP for Refugees'],
      ['pages.infoSheet.startLabel', '13 Oktober 2026'],
      ['pages.infoSheet.endLabel', '21 November 2026'],
      ['pages.infoSheet.sessionsLabel', '12'],
      ['pages.infoSheet.contactLabel', 'Suria'],
    ] as const) {
      await page.getByRole('textbox', { name: msg(ms, key) }).fill(value);
    }
    await expectAllMalay(page, 'information sheet, filled in', [...allowed, 'HELP for Refugees']);

    // What opens: a key word's meaning, the language panel, the learner switcher, the phone menu.
    await page.goto(`/lesson/${L10.id}/read?part=1`);
    await page.locator('.tw-reading [aria-expanded]').first().click();
    await expectAllMalay(page, 'a key word opened', allowed);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: msg(ms, 'header.language.button', { language: MALAY }) }).click();
    await expectAllMalay(page, 'the language panel', allowed);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: new RegExp(`^${msg(ms, 'ds.chrome.siteHeader.switchLearner', { name: LEARNER })}$`) }).click();
    await expectAllMalay(page, 'the learner switcher', allowed);
    await page.keyboard.press('Escape');
    const menu = page.getByRole('button', { name: msg(ms, 'ds.chrome.siteHeader.openMenu') });
    if (await menu.isVisible()) {
      await menu.click();
      await expectAllMalay(page, 'the phone menu', allowed);
    }
  });

  for (const lesson of lessons) {
    test(`Lesson ${lesson.number}: every step`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('/');
      await headerSwitch(page, MALAY);
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
        await expect(page.locator('h1')).toHaveCount(1);
        if (step !== 'complete') await expect(page.locator('h1')).toHaveText(lesson.title);
        await expectAllMalay(page, step);
      }
      // What opens on Read's quick check (an answer's feedback), Write (starters, planning, the example), Watch (the written version) and the sources.
      await page.goto(`/lesson/${lesson.id}/read?part=check`);
      await page.getByRole('radio').first().click();
      await expectAllMalay(page, 'quick check answered');
      await page.goto(`/lesson/${lesson.id}/write`);
      for (const [full, short] of [
        ['modeStarters', 'modeStartersShort'],
        ['modePlan', 'modePlanShort'],
      ] as const) {
        const label = new RegExp(`^(${msg(ms, `lessonPlayer.write.${full}`)}|${msg(ms, `lessonPlayer.write.${short}`)})$`);
        await page.getByRole('button', { name: label }).click();
        await expectAllMalay(page, `write: ${full}`);
      }
      await page.getByRole('button', { name: msg(ms, 'lessonPlayer.write.seeExample') }).click();
      await expectAllMalay(page, 'write: example');
      await page.goto(`/lesson/${lesson.id}/watch`);
      await page.getByRole('button', { name: msg(ms, 'lessonPlayer.watch.readInstead') }).click();
      await expectAllMalay(page, 'watch: written version');
      // The lesson's sources, at the bottom of every step.
      await page.locator('.tw-lesson-sources summary').click();
      await expect(page.locator('.tw-lesson-sources a')).toHaveCount(lesson.sources.length);
      await expectAllMalay(page, 'sources');
    });
  }
});
