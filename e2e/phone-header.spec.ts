import { expect, test, type Page } from '@playwright/test';
import { addLearnerViaUi } from './lessonHelpers';

// Found by the October 2026 pilot dry run (docs/notes/pilot-dry-run-2026-10.md):
// on a phone with a learner chosen, the header's language panel ran off the
// start edge of the screen, and the lesson's step path cut off its last step
// (Reflect) at 360 to 390px. Both worked at 320px and at 412px, so the width
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

    test(`every step of the step path fits on the screen at ${width}px`, { tag: '@own-size' }, async ({ page }) => {
      await addLearnerViaUi(page, 'Amina');
      for (const language of LANGUAGES) {
        await chooseLanguage(page, language.name);
        for (const stage of ['read', 'write', 'speak', 'watch', 'reflect']) {
          await page.goto(`/lesson/towns-near-rivers/${stage}`);
          await expect(page.locator('.tw-stages')).toBeVisible();
          const lastRight = await page.evaluate(() => {
            const last = document.querySelector('.tw-stages')!.lastElementChild!;
            return last.getBoundingClientRect().right;
          });
          // The page's own side gutter is 16px.
          expect(lastRight, `${language.name} ${stage}: the last step is cut off`).toBeLessThanOrEqual(width - 16 + 1);
        }
      }
    });
  });
}
