import { expect, test, type Page } from '@playwright/test';
import { addLearnerViaUi } from './lessonHelpers';

// Found by the October 2026 pilot dry run (docs/notes/pilot-dry-run-2026-10.md):
// on a phone with a learner chosen, the header's language panel ran off the
// start edge of the screen, and the lesson's step path cut off its last step
// (Reflect) at 360 to 390px. (Since the simpler lesson pages, a phone shows
// "Step 2 of 5" and "All steps" instead of the row of five; the same widths are checked.) Both worked at 320px and at 412px, so the width
// specs didn't see them. These set their own sizes: laptop project only.

const WIDTHS = [360, 375, 390, 412];
const LANGUAGES = [
  { name: 'English', code: 'en' },
  { name: 'Bahasa Indonesia', code: 'id' },
  { name: 'Bahasa Melayu', code: 'ms' },
];

async function chooseLanguage(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: /^(Language|Bahasa|Bahasa:)/ }).first().click();
  await page.getByRole('radio', { name }).click();
  await page.keyboard.press('Escape');
}

for (const width of WIDTHS) {
  test.describe(`${width}px wide, a learner chosen`, () => {
    test.use({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true });

    test(`the language panel stays on the screen at ${width}px`, { tag: '@own-size' }, async ({ page }) => {
      await addLearnerViaUi(page, 'Amina');
      const panel = page.locator('.tw-language-switch-panel');
      for (const language of LANGUAGES) {
        await page.getByRole('button', { name: /^(Language|Bahasa|Bahasa:)/ }).first().click();
        await expect(panel).toBeVisible();
        const box = (await panel.boundingBox())!;
        expect(box.x, `${language.name}: the panel starts left of the screen`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${language.name}: the panel ends right of the screen`).toBeLessThanOrEqual(width);
        await page.getByRole('radio', { name: language.name }).click();
        await expect(page.locator('html')).toHaveAttribute('lang', language.code);
        await page.keyboard.press('Escape');
      }
    });

    test(`"Step N of 5" and every one of the steps fit on the screen at ${width}px`, { tag: '@own-size' }, async ({ page }) => {
      await addLearnerViaUi(page, 'Amina');
      for (const language of LANGUAGES) {
        await chooseLanguage(page, language.name);
        for (const stage of ['read', 'write', 'speak', 'watch', 'reflect']) {
          await page.goto(`/lesson/towns-near-rivers/${stage}`);
          // On a phone the steps are one row saying where you are, with "All steps" opening the five
          // (docs/notes/simpler-lessons.md); every one of them must fit inside the 16px gutters.
          const row = page.locator('.tw-lesson-steps-row');
          await expect(row).toBeVisible();
          await row.getByRole('button').click();
          await expect(page.locator('.tw-stages')).toBeVisible();
          const rights = await page.evaluate(() =>
            [document.querySelector('.tw-lesson-steps-row')!, ...document.querySelectorAll('.tw-stages > li')].map(
              (element) => element.getBoundingClientRect().right,
            ),
          );
          for (const right of rights) {
            expect(right, `${language.name} ${stage}: cut off`).toBeLessThanOrEqual(width - 16 + 1);
          }
        }
      }
    });
  });
}
