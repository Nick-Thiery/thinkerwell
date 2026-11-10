import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { dumpEverything } from './lessonHelpers';

// Justin's follow-up of 10 November 2026: a new profile lands on Home, not in a
// lesson, and /journal lists a learner's writing and reflections from every
// course, kept apart per learner. Three disposable learners:
//   Ada  (English)     Our World and Digital World
//   Bao  (Indonesian)  Southeast Asia Through Time and Art, Architecture and Society, and the same
//                      Digital World lesson as Ada, with another answer; no Our World at all
//   Cleo (Malay)       just created: nothing

const root = path.resolve(import.meta.dirname, '..');
const read = <T>(...parts: string[]): T => JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;
interface LessonFile { id: string; number: number; title: string }
const lesson = (course: string, file: string, language?: string) => read<LessonFile>('content', 'courses', course, ...(language ? [language] : []), 'lessons', `${file}.json`);
const DW10 = lesson('digital-world', 'DW10');
const SAT1 = lesson('southeast-asia-through-time', 'SAT01');
const AAS1 = lesson('art-architecture-society', 'AAS01');
const SAT1_ID = lesson('southeast-asia-through-time', 'SAT01', 'id');
const SAT_COURSE_ID = read<{ course: { title: string } }>('content', 'courses', 'southeast-asia-through-time', 'id', 'course.json').course.title;
const OUR_WORLD_L10 = 'towns-near-rivers';
type Tree = { [key: string]: Tree | string };
const messages = (code: string) => read<Tree>('src', 'i18n', 'messages', `${code}.json`);
const word = (code: string, key: string): string => {
  const value = key.split('.').reduce<Tree | string | undefined>((node, part) => (typeof node === 'object' ? node[part] : undefined), messages(code));
  if (typeof value !== 'string') throw new Error(`No message ${key} in ${code}`);
  return value;
};

const A_OUR_WORLD = 'Ada writes about a river town.';
const A_SHARED = 'Ada answer in the shared Digital World lesson.';
const B_SHARED = 'Bao answer in the shared Digital World lesson.';
const B_SAT = 'Bao writes about a pot from Ban Chiang.';
const B_AAS = 'Bao writes about a building and its place.';
const B_AAS_REFLECTION = 'Bao reflects on how art shows a society.';

async function homeOf(page: Page, name: string): Promise<void> {
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
}

async function write(page: Page, lessonId: string, stage: 'write' | 'reflect', text: string): Promise<void> {
  await page.goto(`/lesson/${lessonId}/${stage}`);
  const box = page.getByRole('textbox').first();
  await box.fill(text);
  await box.blur();
  await expect.poll(async () => JSON.stringify((await dumpEverything(page)).stores.progress ?? [])).toContain(text);
}

/** Opens the header's switcher and chooses a learner, or starts a new one. */
async function openSwitcher(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^(Switch learner|Ganti pelajar|Tukar pelajar)/ }).click();
}

async function switchTo(page: Page, name: string): Promise<void> {
  await openSwitcher(page);
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(name) }).click();
  // The choice is saved a moment after the tap: wait for the header to show it before going on.
  await expect(page.locator('.tw-learner-chip')).toHaveAttribute('aria-label', new RegExp(`${name}$`));
}

test('a new profile opens Home with no lesson activity, and the journal keeps every learner and course apart', async ({ page }) => {
  test.setTimeout(180_000);
  const visited: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname);
  });
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  // Ada: the Enter key. Home at "/", no lesson passed through, no progress saved.
  await page.goto('/');
  await page.getByRole('button', { name: "I'm new here" }).click();
  await expect(page.getByRole('button', { name: 'Create profile' })).toBeVisible();
  await expect(page.getByText('Then choose a course from your home page.')).toBeVisible();
  await expect(page.getByText(/You will start with/i)).toHaveCount(0);
  await page.getByLabel('First name or nickname').fill('Ada');
  await page.keyboard.press('Enter');
  await homeOf(page, 'Ada');
  await expect(page.getByText('0 of 73 lessons completed')).toBeVisible();
  await expect(page.getByText('Start here')).toBeVisible();
  expect(visited.filter((p) => p.startsWith('/lesson/'))).toEqual([]);
  expect((await dumpEverything(page)).stores.progress ?? []).toHaveLength(0);
  await page.reload();
  await homeOf(page, 'Ada');
  await expect(page.getByText('0 of 73 lessons completed')).toBeVisible();

  // Ada's work: Our World and Digital World.
  await write(page, OUR_WORLD_L10, 'write', A_OUR_WORLD);
  await write(page, DW10.id, 'write', A_SHARED);

  // Bao, in Indonesian, with the button.
  await page.goto('/');
  await openSwitcher(page);
  await page.getByRole('dialog').getByRole('button', { name: "I'm new here" }).click();
  await page.getByLabel('First name or nickname').fill('Bao');
  await page.locator('summary', { hasText: 'Change language' }).click();
  await page.getByRole('radiogroup', { name: 'Your language' }).getByRole('radio', { name: 'Bahasa Indonesia' }).click();
  await page.getByRole('button', { name: 'Buat profil' }).click();
  await homeOf(page, 'Bao');
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  expect(visited.filter((p) => p.startsWith('/lesson/') && !p.includes(OUR_WORLD_L10) && !p.includes(DW10.id))).toEqual([]);

  await write(page, DW10.id, 'write', B_SHARED);
  await write(page, SAT1.id, 'write', B_SAT);
  await write(page, AAS1.id, 'write', B_AAS);
  await write(page, AAS1.id, 'reflect', B_AAS_REFLECTION);

  // Bao's journal: his newer-course work, with the course and the lesson named, and nothing of Ada's.
  await page.goto('/journal');
  for (const text of [B_SHARED, B_SAT, B_AAS, B_AAS_REFLECTION]) await expect(page.getByText(text)).toBeVisible();
  await expect(page.getByText(A_SHARED)).toHaveCount(0);
  await expect(page.getByText(A_OUR_WORLD)).toHaveCount(0);
  await expect(page.locator('.tw-journal-course').filter({ hasText: SAT_COURSE_ID })).toHaveCount(1);
  await expect(page.getByText(SAT1_ID.title)).toBeVisible();
  // Three lessons numbered 1 or 10 in three courses stay separate groups.
  await expect(page.locator('.tw-journal-group')).toHaveCount(3);
  await page.screenshot({ path: test.info().outputPath('bao-journal.png'), fullPage: true });

  // Cleo, in Malay, with the keyboard.
  await openSwitcher(page);
  await page.getByRole('dialog').getByRole('button', { name: word('id', 'pages.home.newLearnerTile') }).click();
  await page.getByLabel(word('id', 'pages.home.newLearner.nameLabel')).fill('Cleo');
  await page.locator('summary', { hasText: word('id', 'pages.home.newLearner.languageSummary') }).click();
  await page.getByRole('radiogroup', { name: word('id', 'pages.home.newLearner.languageLabel') }).getByRole('radio', { name: 'Bahasa Melayu' }).click();
  await expect(page.getByRole('button', { name: word('ms', 'pages.home.newLearner.submit') })).toBeVisible();
  await page.getByLabel(word('ms', 'pages.home.newLearner.nameLabel')).press('Enter');
  await homeOf(page, 'Cleo');
  await page.goto('/journal');
  await expect(page.getByText(word('ms', 'pages.journal.empty'))).toBeVisible();
  await expect(page.locator('.tw-journal-group')).toHaveCount(0);

  // A → B → C → A: each learner's own words, and their own language.
  await switchTo(page, 'Ada');
  await page.goto('/journal');
  await expect(page.getByText(A_SHARED)).toBeVisible();
  await expect(page.getByText(A_OUR_WORLD)).toBeVisible();
  await expect(page.getByText(B_SHARED)).toHaveCount(0);
  await expect(page.getByText(B_SAT)).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(page.getByText(A_SHARED)).toBeVisible();
  await expect(page.getByText(B_SHARED)).toHaveCount(0);

  await switchTo(page, 'Bao');
  await page.goto('/journal');
  await expect(page.getByText(B_SHARED)).toBeVisible();
  await expect(page.getByText(A_SHARED)).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');

  await switchTo(page, 'Cleo');
  await page.goto('/');
  await homeOf(page, 'Cleo');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ms');
  await expect(page.getByText(word('ms', 'pages.home.dashboard.progressCount.other').replace('{completed}', '0').replace('{total}', '73'))).toBeVisible();

  expect(errors).toEqual([]);
});
