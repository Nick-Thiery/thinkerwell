import { expect, test, type Page } from '@playwright/test';
import { L10 } from './lessonHelpers';

/**
 * A glossary word's definition popover stays on screen and never makes the
 * page scroll sideways (a phase 2 bug on mobile Chrome: the layout viewport
 * widened to fit the popover before DefinitionCard measured it). Every marked
 * word in Lesson 10's reading at this project's width: all three parts left
 * to right, and part 1 right to left. Plus: the keyboard opens and closes it,
 * and turning a tablet round keeps it open (the stage isn't remounted when
 * the side column appears at 1100px).
 */

interface Measure {
  scrollWidth: number;
  innerWidth: number;
  clientWidth: number;
  scrollX: number;
  pop: { left: number; right: number; top: number } | null;
  word: { left: number; right: number; bottom: number } | null;
}

async function measure(page: Page): Promise<Measure> {
  return page.evaluate(() => {
    const pop = document.querySelector('.tw-def-float');
    const word = pop?.parentElement?.querySelector('.tw-term');
    const popRect = pop?.getBoundingClientRect();
    const lines = word ? Array.from(word.getClientRects()) : [];
    const first = lines[0];
    const last = lines[lines.length - 1];
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollX: window.scrollX,
      pop: popRect ? { left: popRect.left, right: popRect.right, top: popRect.top } : null,
      word: first && last ? { left: first.left, right: first.right, bottom: last.bottom } : null,
    };
  });
}

/** Opens and closes every marked word in the part on screen, checking the popover each time. */
async function checkEveryWord(page: Page, where: string, tap: boolean) {
  const terms = page.locator('.tw-reading .tw-term');
  const count = await terms.count();
  expect(count, `${where} marks glossary words`).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const term = terms.nth(index);
    await term.scrollIntoViewIfNeeded();
    if (tap) await term.tap();
    else await term.click();
    await expect(term).toHaveAttribute('aria-expanded', 'true');
    const popover = page.locator('.tw-def-float');
    await expect(popover).toBeVisible();

    const m = await measure(page);
    const label = `${where}, word ${index + 1} (${await term.textContent()})`;
    expect(m.scrollWidth, `${label}: page wider than the screen`).toBeLessThanOrEqual(m.innerWidth);
    expect(m.scrollX, `${label}: page scrolled sideways`).toBe(0);
    expect(m.pop!.left, `${label}: past the left edge`).toBeGreaterThanOrEqual(0);
    expect(m.pop!.right, `${label}: past the right edge`).toBeLessThanOrEqual(m.clientWidth);
    // Still anchored: overlapping its word sideways, just under it.
    expect(Math.min(m.pop!.right, m.word!.right) - Math.max(m.pop!.left, m.word!.left)).toBeGreaterThan(0);
    expect(m.pop!.top - m.word!.bottom).toBeGreaterThanOrEqual(0);
    expect(m.pop!.top - m.word!.bottom).toBeLessThan(16);

    const close = popover.getByRole('button', { name: 'Close' });
    if (tap) await close.tap();
    else await close.click();
    await expect(term).toHaveAttribute('aria-expanded', 'false');
  }
}

for (const [dir, parts] of [
  ['ltr', [1, 2, 3]],
  ['rtl', [1]],
] as const) {
  test(`the glossary popover stays on screen (${dir})`, async ({ page }, testInfo) => {
    const tap = !!testInfo.project.use.hasTouch;
    await page.goto(L10.path('read'));
    await expect(page.locator('.tw-reading .tw-term').first()).toBeVisible();
    // ?dir=rtl only works in development; set it directly on the production build.
    await page.evaluate((direction) => {
      document.documentElement.dir = direction;
    }, dir);
    for (const part of parts) {
      if (part > 1) {
        await page.locator('.tw-actionbar').getByRole('button', { name: `Next: Part ${part}` }).click();
        await expect(page).toHaveURL(new RegExp(`part=${part}$`));
      }
      await checkEveryWord(page, `${dir} part ${part}`, tap);
    }
  });
}

test('the keyboard opens a glossary word and Escape closes it, returning focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Keyboard use is checked at tablet and laptop widths.');
  await page.goto(L10.path('read'));
  const term = page.locator('.tw-reading .tw-term').first();
  await term.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(term).toBeFocused();
});

test('turning a tablet round keeps an open glossary popover open', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet', 'Starts from the tablet size (820x1180) and turns it round.');
  await page.goto(L10.path('read'));
  await page.locator('.tw-reading .tw-term').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // 1180 wide: the side column with the vertical StagePath appears.
  await page.setViewportSize({ width: 1180, height: 820 });
  await expect(page.locator('.tw-lesson-path-vertical')).toBeVisible();
  await expect(dialog).toBeVisible();
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(page.locator('.tw-lesson-path-horizontal')).toBeVisible();
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
