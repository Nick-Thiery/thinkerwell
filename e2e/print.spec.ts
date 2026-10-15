import { expect, test, type Page } from '@playwright/test';
import { addLearnerViaUi, L10, openHelp } from './lessonHelpers';

// Print views (phase 6): a lesson in both reading levels with every task,
// and the journal, printed as black text on white with no header or menus.

/** The colours the printed sheet actually uses: every text colour and every background under it. */
async function printedColours(page: Page): Promise<{ text: string[]; backgrounds: string[] }> {
  return page.evaluate(() => {
    const sheet = document.querySelector('.tw-print-sheet')!;
    const all = [sheet, ...sheet.querySelectorAll('*')].filter((el) => !el.closest('svg'));
    const text = new Set<string>();
    const backgrounds = new Set<string>();
    for (const el of all) {
      const style = getComputedStyle(el);
      if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) text.add(style.color);
      backgrounds.add(style.backgroundColor);
    }
    return { text: [...text], backgrounds: [...backgrounds] };
  });
}

test('a lesson prints one reading level, or both on purpose, with every task, in black on white, without the header', async ({ page }) => {
  await page.goto(L10.path('read'));
  // "Print this lesson" is under "About this lesson" (open at the lesson's start, except on a phone).
  await openHelp(page, 'About this lesson');
  await page.getByRole('link', { name: 'Print this lesson' }).click();
  await expect(page).toHaveURL(/\/lesson\/towns-near-rivers\/print$/);
  await expect(page.locator('h1')).toHaveText(L10.title);
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();

  // One level by default (nobody chosen: Standard); Simpler, or both, on purpose.
  const levels = page.getByRole('group', { name: 'Reading to print' });
  await expect(levels.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { level: 2, name: 'Reading: Standard English' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Reading: Simpler English' })).toHaveCount(0);
  await levels.getByRole('button', { name: 'Simpler' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Reading: Standard English' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Reading: Simpler English' })).toBeVisible();
  await levels.getByRole('button', { name: 'Both' }).click();

  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('banner')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden();
  await expect(levels).toBeHidden();
  await expect(page.getByRole('link', { name: 'Back to the lesson' })).toBeHidden();
  for (const heading of ['Reading: Standard English', 'Reading: Simpler English', 'Key words in this lesson', 'Quick check', 'Write', 'Speak', 'Watch or read', 'Reflect']) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
  await expect(page.locator('.tw-lesson-visual img')).toBeVisible();

  const colours = await printedColours(page);
  expect(colours.text).toEqual(['rgb(0, 0, 0)']);
  expect(colours.backgrounds.every((colour) => colour === 'rgba(0, 0, 0, 0)')).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test("a learner's journal prints what they wrote", async ({ page }) => {
  await addLearnerViaUi(page, 'Amina');
  await page.goto(L10.path('reflect'));
  const answer = page.getByRole('textbox').first();
  await answer.fill('Rivers give towns water and a way to trade.');
  await answer.blur();

  await page.goto('/journal');
  await page.getByRole('link', { name: 'Print my journal' }).click();
  await expect(page).toHaveURL(/\/journal\/print$/);
  await expect(page.getByRole('heading', { level: 2, name: L10.title })).toBeVisible();
  await expect(page.getByText('Rivers give towns water and a way to trade.')).toBeVisible();

  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('banner')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden();
  await expect(page.getByText('Rivers give towns water and a way to trade.')).toBeVisible();
  expect((await printedColours(page)).text).toEqual(['rgb(0, 0, 0)']);
});

/** How many pages the page prints on, on A4 (Chromium's own PDF). */
async function a4Pages(page: Page): Promise<number> {
  const pdf = await page.pdf({ format: 'A4' });
  return pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

test('a teacher guide prints on a few A4 pages, in black on white, without the header or its buttons', { tag: '@chromium-only' }, async ({ page }) => {
  await page.goto('/educators/lesson/towns-near-rivers');
  await expect(page.locator('h1')).toHaveText(L10.title);
  await expect(page.getByRole('button', { name: 'Print teacher guide' })).toBeVisible();

  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('banner')).toBeHidden();
  for (const name of ['Print teacher guide', 'See it bigger']) await expect(page.getByRole('button', { name })).toBeHidden();
  for (const name of ['Back to the educators page', 'Preview learner lesson', 'Print learner lesson']) {
    await expect(page.getByRole('link', { name })).toBeHidden();
  }
  for (const heading of ['Before you teach', 'Session plan', 'Key words', 'The evidence and the picture', 'Quick check', 'Write', 'Speak', 'Discussion prompts', 'Watch or read instead', 'Sources']) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
  await expect(page.getByRole('table')).toBeVisible();
  // Correct answers are marked in words, which print too.
  await expect(page.locator('.tw-key-option-correct').getByText('Correct answer')).toHaveCount(2);
  // A link's address is printed after it.
  expect(await page.locator('.tw-guide-link').first().evaluate((link) => getComputedStyle(link, '::after').content)).not.toBe('none');

  const colours = await printedColours(page);
  expect(colours.text).toEqual(['rgb(0, 0, 0)']);
  expect(colours.backgrounds.every((colour) => colour === 'rgba(0, 0, 0, 0)')).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(await a4Pages(page)).toBeLessThanOrEqual(6);
});

test("a section check's answer key prints on a few A4 pages, in black on white, with every answer marked in words", { tag: '@chromium-only' }, async ({ page }) => {
  await page.goto('/educators/section/history/answers');
  await expect(page.locator('h1')).toHaveText('Answer key: History & Human Stories');

  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('banner')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden();
  await expect(page.getByRole('link', { name: 'Back to the educators page' })).toBeHidden();
  await expect(page.locator('.tw-key-option-correct').getByText('Correct answer')).toHaveCount(12);
  for (const mark of await page.locator('.tw-key-option-correct').getByText('Correct answer').all()) await expect(mark).toBeVisible();

  const colours = await printedColours(page);
  expect(colours.text).toEqual(['rgb(0, 0, 0)']);
  expect(colours.backgrounds.every((colour) => colour === 'rgba(0, 0, 0, 0)')).toBe(true);
  expect(await a4Pages(page)).toBeLessThanOrEqual(7);
});
