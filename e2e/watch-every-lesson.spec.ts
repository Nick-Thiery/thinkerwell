import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { horizontalOverflow, recordRequests, storedProgress, VIDEO_HOSTS } from './lessonHelpers';

// The Watch step of every lesson in every language learners can choose
// (docs/notes/local-language-videos.md): English, Bahasa Indonesia and Bahasa
// Melayu, on a phone. In English every lesson shows its video's poster, and
// Read instead works. In a translated language a lesson with no approved local
// video opens on the written version, in the language, with "Watch the video
// in English" under it (its title marked English); one with an approved video
// shows that video's poster, with no note. The questions, the written version
// and its key points are in the language;
// answering the question after counts Watch as done for the learner; nothing
// is requested from YouTube; nothing is wider than the screen. When a video is
// approved, the same walk shows it: the note goes, and the lesson's watch
// comes from content/<lang>/videos.json (checked here too).
//
// 24 lessons in 3 languages: run on the phone only (the narrowest screen).

const root = path.join(import.meta.dirname, '..');
const readJson = <T>(...parts: string[]) => JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;

type Tree = Record<string, unknown>;
function msg(messages: Tree, key: string): string {
  const value = key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], messages);
  if (typeof value !== 'string') throw new Error(`No message ${key}`);
  return value;
}

interface WatchText {
  youtubeId: string;
  title: string;
  beforeQuestion: string;
  afterQuestion: string;
  summary: string;
  keyPoints: string[];
}
interface LessonText {
  id: string;
  title: string;
  watch: WatchText;
}
interface VideosFile {
  lessons: Record<string, Partial<WatchText> & { approved?: boolean }>;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Bahasa Melayu' },
] as const;

const files = readdirSync(path.join(root, 'content', 'lessons')).filter((name) => /^L\d\d\.json$/.test(name)).sort();

/** What a learner in this language should see on each lesson's Watch step. */
function expected(code: string) {
  const videos = code === 'en' ? { lessons: {} } : readJson<VideosFile>('content', code, 'videos.json');
  return files.map((file) => {
    const english = readJson<LessonText>('content', 'lessons', file);
    const translated = code === 'en' ? english : { ...english, ...readJson<Partial<LessonText>>('content', code, 'lessons', file) };
    const watch = { ...english.watch, ...(translated.watch ?? {}) };
    const local = videos.lessons[file.replace('.json', '')];
    const approved = local?.approved === true;
    return {
      id: english.id,
      title: translated.title,
      local: approved,
      watch: approved ? { ...watch, ...local } : watch,
    };
  });
}

/** Changes the language with the header's switch (it is on every page). */
async function switchTo(page: Page, name: string, code: string): Promise<void> {
  await page.getByRole('button', { name: /^(Language|Bahasa): / }).click();
  await page.locator('.tw-language-switch-panel').getByRole('radio', { name }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', code);
}

const firstWords = (text: string) => text.split('\n')[0]!.slice(0, 40);

for (const language of LANGUAGES) {
  test(`every lesson's Watch step in ${language.name}: the right video, its note, the questions, Read instead and progress`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', '24 lessons in 3 languages: the phone is enough.');
    test.setTimeout(300_000);
    const messages = readJson<Tree>('src', 'i18n', 'messages', `${language.code}.json`);
    const requests = recordRequests(page);

    // A learner, so the answers are saved; the language set for the device first, so the learner gets it.
    await page.goto('/');
    if (language.code !== 'en') await switchTo(page, language.name, language.code);
    await page.getByRole('button', { name: msg(messages, 'pages.home.newLearnerTile') }).click();
    await page.getByLabel(msg(messages, 'pages.home.newLearner.nameLabel')).fill(`Watcher ${language.code}`);
    await page.getByRole('button', { name: msg(messages, 'pages.home.newLearner.submit') }).click();
    await expect(page).toHaveURL(/\/lesson\/.+\/read$/);

    for (const lesson of expected(language.code)) {
      const where = `${language.code} ${lesson.id}`;
      await page.goto(`/lesson/${lesson.id}/watch`);
      await expect(page.locator('h1'), where).toHaveText(lesson.title);

      const englishFirst = language.code !== 'en' && !lesson.local;
      // The questions in the language.
      await expect(page.getByText(lesson.watch.beforeQuestion, { exact: true }), where).toBeVisible();
      const after = page.getByLabel(lesson.watch.afterQuestion);
      await expect(after, where).toBeVisible();

      if (englishFirst) {
        // The written version first, in the language, under the English video's title (marked English), with the English video one tap away.
        await expect(page.locator('.tw-watch-written-h'), where).toHaveText(lesson.watch.title);
        await expect(page.locator('.tw-watch-written-h'), where).toHaveAttribute('lang', 'en');
        await expect(page.getByRole('button', { name: msg(messages, 'lessonPlayer.watch.watchInEnglish') }), where).toBeVisible();
        await expect(page.locator('.tw-video-title'), where).toHaveCount(0);
      } else {
        // The poster: the video's own title, not marked English (English, or an approved local video), and no note.
        const title = page.locator('.tw-video-title');
        await expect(title, where).toHaveText(lesson.watch.title);
        await expect(title, where).not.toHaveAttribute('lang', 'en');
        await expect(page.getByText(msg(messages, 'lessonPlayer.watch.videoInEnglish')), where).toHaveCount(0);
        await expect(page.getByRole('button', { name: msg(messages, 'ds.content.video.watchLabel') }), where).toBeVisible();
        // Read instead opens the written version.
        await page.getByRole('button', { name: msg(messages, 'lessonPlayer.watch.readInstead') }).click();
      }
      await expect(page.locator('.tw-watch-written-text'), where).toContainText(firstWords(lesson.watch.summary));
      await expect(page.locator('.tw-watch-keypoints li'), where).toHaveCount(lesson.watch.keyPoints.length);
      expect(await horizontalOverflow(page), `${where}: wider than the screen`).toBeLessThanOrEqual(0);

      // Answering after counts Watch as done, for this learner.
      await after.fill('Satu ide.');
      await after.blur();
      await expect.poll(async () => (await storedProgress(page, lesson.id))?.stagesDone ?? [], { message: where }).toContain('watch');

      expect(await horizontalOverflow(page), `${where}: wider than the screen`).toBeLessThanOrEqual(0);
    }
    // Nothing was ever asked of YouTube: nobody tapped Watch the video.
    expect(requests.filter((url) => VIDEO_HOSTS.test(url))).toEqual([]);
  });
}
