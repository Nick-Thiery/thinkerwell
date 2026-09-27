import { expect, test, type Locator, type Page } from '@playwright/test';
import { L10, storedProgress } from './lessonHelpers';

// Phase 8: a whole lesson with the keyboard only (Tab, arrow keys, Enter,
// Space, Escape and typing; page.goto stands in for typing an address).
// Every control it lands on must show a visible focus ring on the way, and
// focus must never be lost to the page. Runs at every size: a tablet or a
// phone can have a keyboard too.

/** What shows that the focused element has focus, or null if nothing does. */
async function focusRing(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return 'focus lost to the page';
    const style = getComputedStyle(el);
    if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2) return null;
    if (style.boxShadow !== 'none') return null;
    const name = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40) ?? '';
    return `no focus ring on <${el.tagName.toLowerCase()} class="${el.className}"> ${name}`;
  });
}

/**
 * Presses Tab until `target` has focus, checking the focus ring on every
 * control passed on the way. Fails if it takes more than `max` presses.
 */
async function tabTo(page: Page, target: Locator, max = 80): Promise<void> {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) {
      expect(await focusRing(page)).toBeNull();
      return;
    }
    await page.keyboard.press('Tab');
    const problem = await focusRing(page);
    expect.soft(problem, 'every control shows where focus is').toBeNull();
  }
  throw new Error(`Tab never reached ${target.toString()}`);
}

/** Tabs into a radio group, then arrows to `option` and chooses it with Space. */
async function chooseRadio(page: Page, group: Locator, option: string): Promise<void> {
  await tabTo(page, group.getByRole('radio').first());
  const target = group.getByRole('radio', { name: option });
  for (let i = 0; i < 6 && !(await target.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('ArrowDown');
  }
  await expect(target).toBeFocused();
  await page.keyboard.press('Space');
  await expect(target).toHaveAttribute('aria-checked', 'true');
}

async function pressButton(page: Page, name: string | RegExp): Promise<void> {
  await tabTo(page, page.getByRole('button', { name }).last());
  await page.keyboard.press('Enter');
}

test('Lesson 10 from start to finish with the keyboard only', async ({ page }) => {
  test.setTimeout(90_000);

  // A new learner, from the keyboard.
  await page.goto('/');
  await pressButton(page, "I'm new here");
  const name = page.getByLabel('First name or nickname');
  await tabTo(page, name);
  await page.keyboard.type('Amina');
  await pressButton(page, 'Start Lesson 1');
  await expect(page).toHaveURL(/\/lesson\/.+\/read$/);

  await page.goto(L10.path('read'));
  await expect(page.locator('h1')).toHaveText(L10.title);

  // Warm-up.
  await chooseRadio(page, page.getByRole('radiogroup').first(), 'On the hill');

  // The picture, bigger, and back.
  await pressButton(page, 'See it bigger');
  const dialog = page.getByRole('dialog', { name: 'The map' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'See it bigger' })).toBeFocused();

  // A glossary word opens with Enter and closes with Escape, keeping focus on the word.
  const term = page.locator('.tw-reading .tw-term').first();
  await tabTo(page, term);
  await page.keyboard.press('Enter');
  await expect(term).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(term).toHaveAttribute('aria-expanded', 'false');
  await expect(term).toBeFocused();

  // The reading, part by part.
  await pressButton(page, 'Next: Part 2');
  await expect(page).toHaveURL(/\?part=2$/);
  await pressButton(page, 'Next: Part 3');
  await expect(page.getByRole('heading', { name: 'Rivers can also bring problems' })).toBeVisible();
  await pressButton(page, 'Next: Quick check');
  await expect(page.getByRole('heading', { name: 'Quick check' })).toBeFocused();

  // The quick check: arrow keys move without answering; Space answers.
  const questions = page.locator('.tw-question');
  await chooseRadio(page, questions.nth(0), 'Floods left mud that made the soil fertile.');
  await expect(questions.nth(0).locator('.tw-feedback-correct')).toBeVisible();
  await chooseRadio(page, questions.nth(1), 'The river may flood the land.');
  await expect(questions.nth(1).locator('.tw-feedback-correct')).toBeVisible();

  // Write.
  await pressButton(page, 'Continue to Write');
  await expect(page).toHaveURL(/\/write$/);
  await tabTo(page, page.getByRole('textbox', { name: 'Your answer' }));
  await page.keyboard.type('I would build the town by the river, for water and trade.');

  // Speak.
  await pressButton(page, 'Continue to Speak');
  await expect(page).toHaveURL(/\/speak$/);
  await chooseRadio(page, page.getByRole('radiogroup').first(), 'I practised with a partner');

  // Watch: the written version, and its question.
  await pressButton(page, 'Continue to Watch');
  await pressButton(page, 'Read instead');
  await expect(page.getByRole('heading', { name: 'Key points' })).toBeVisible();
  await tabTo(page, page.getByRole('textbox', { name: /Tigris and Euphrates/ }));
  await page.keyboard.type('The rivers gave water for farms.');

  // Reflect finishes the lesson.
  await pressButton(page, 'Continue to Reflect');
  await tabTo(page, page.getByRole('textbox', { name: /good for a town/ }));
  await page.keyboard.type('It has water and fertile land.');
  await pressButton(page, 'Finish lesson');
  await expect(page.locator('h1')).toHaveText('You finished Lesson 10.');

  const done = await storedProgress(page, L10.id);
  expect(done?.stagesDone.slice().sort()).toEqual(['read', 'reflect', 'speak', 'watch', 'write']);
  expect(done?.completedAt).toBeTruthy();
});
