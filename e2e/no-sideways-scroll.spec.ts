import { expect, test, type Page } from '@playwright/test';
import { nextButton } from './lessonHelpers';
import { courseLessons, courseSections, settle, walkTour } from './pageTour';

// Phase 8: no page is ever wider than the screen. A page that is (a flex item
// that can't shrink, a long word, a fixed width) makes a phone zoom out or
// scroll sideways, and everything on it gets smaller.
//
// Every kind of page (e2e/pageTour.ts) at every width the pilot devices might
// have: two phones, small and large tablets, and laptops. These tests set
// their own sizes, so they run in one Playwright project only (@own-size, see
// playwright.config.ts).

const WIDTHS = [320, 360, 390, 640, 768, 820, 1024, 1280];

/** What sticks out past the right edge (or the left, in right to left): the deepest elements, so the cause is named. */
async function overflowReport(page: Page): Promise<{ overflow: number; culprits: string[] }> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const width = root.clientWidth;
    const overflow = root.scrollWidth - width;
    if (overflow <= 0) return { overflow, culprits: [] };
    const describe = (el: Element) => {
      const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
      const box = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()}${cls} (${Math.round(box.left)} to ${Math.round(box.right)})`;
    };
    const outside = Array.from(document.body.querySelectorAll('*')).filter((el) => {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false;
      return box.right > width + 0.5 || box.left < -0.5;
    });
    // Only the deepest: drop any element that has an offending descendant.
    const deepest = outside.filter((el) => !outside.some((other) => other !== el && el.contains(other)));
    return { overflow, culprits: deepest.slice(0, 8).map(describe) };
  });
}

for (const width of WIDTHS) {
  test.describe(`${width}px wide`, () => {
    const touch = width < 1100;
    test.use({ viewport: { width, height: width < 600 ? 800 : 1000 }, hasTouch: touch, isMobile: width < 600 });

    test(`no page is wider than the screen at ${width}px`, { tag: '@own-size' }, async ({ page }) => {
      test.setTimeout(120_000);
      await walkTour(page, async (stop) => {
        const report = await overflowReport(page);
        expect
          .soft(report.overflow, `${stop.name} is ${report.overflow}px wider than the screen:\n${report.culprits.join('\n')}`)
          .toBeLessThanOrEqual(0);
      });
    });
  });
}

// Content changes from lesson to lesson (evidence tables, pictures, long
// words, question stimuli), so every stage of every lesson and every question
// of every section check is checked too, at the narrowest phone width.
test.describe('every lesson and section check at 360px', () => {
  test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });

  for (const section of courseSections) {
    test(`${section.title}: no page is wider than the screen`, { tag: '@own-size' }, async ({ page }) => {
      test.setTimeout(180_000);
      const check = async (where: string) => {
        await settle(page);
        const report = await overflowReport(page);
        expect.soft(report.overflow, `${where} is ${report.overflow}px wider than the screen:\n${report.culprits.join('\n')}`).toBeLessThanOrEqual(0);
      };

      for (const lesson of courseLessons.filter((l) => section.lessons.includes(l.number))) {
        const base = `/lesson/${lesson.id}`;
        for (const part of ['', '?part=2', '?part=3', '?part=check']) {
          await page.goto(`${base}/read${part}`);
          await expect(page.locator('h1')).toHaveText(lesson.title);
          await check(`Lesson ${lesson.number} Read ${part || 'part 1'}`);
        }
        for (const stage of ['write', 'speak', 'watch', 'reflect']) {
          await page.goto(`${base}/${stage}`);
          await expect(page.locator('h1')).toHaveText(lesson.title);
          await check(`Lesson ${lesson.number} ${stage}`);
        }
        await page.goto(`${base}/watch`);
        await page.getByRole('button', { name: 'Read instead' }).click();
        await expect(page.getByRole('heading', { name: 'Key points' })).toBeVisible();
        await check(`Lesson ${lesson.number} Watch, read instead`);
        await page.goto(`${base}/print`);
        await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
        await check(`Lesson ${lesson.number} print`);
      }

      await page.goto(`/section/${section.id}/check`);
      await check(`${section.title} check: intro`);
      await page.getByRole('button', { name: 'Start the check' }).click();
      for (let i = 1; ; i++) {
        await page.getByRole('radio').first().click();
        await expect(page.locator('.tw-feedback-title')).toBeVisible();
        await check(`${section.title} check: question ${i}`);
        const next = nextButton(page, 'Next question');
        if (!(await next.isVisible())) break;
        await next.click();
      }
      await nextButton(page, 'See your results').click();
      await expect(page.getByRole('heading', { level: 1, name: /out of/ })).toBeVisible();
      await check(`${section.title} check: results`);
    });
  }
});

// What learners type can be one long word: a name with no spaces, a web
// address, a row of letters. It must wrap instead of widening the page.
test.describe('long words from learners at 360px', () => {
  test.use({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });

  test('a long name and long unbroken writing never make a page wider than the screen', { tag: '@own-size' }, async ({ page }) => {
    test.setTimeout(90_000);
    // 30 characters, the longest name the form takes.
    const name = 'Abdirahmanabdullahimohamedhass';
    const longWord = 'https://example.org/'.padEnd(90, 'a');
    const check = async (where: string) => {
      await settle(page);
      const report = await overflowReport(page);
      expect.soft(report.overflow, `${where} is ${report.overflow}px wider than the screen:\n${report.culprits.join('\n')}`).toBeLessThanOrEqual(0);
    };

    await page.goto('/');
    await page.getByRole('button', { name: "I'm new here" }).click();
    await page.getByLabel('First name or nickname').fill(name);
    await page.getByRole('button', { name: 'Start Lesson 1' }).click();
    await expect(page).toHaveURL(/\/read$/);
    await check('Lesson 1 with a long name in the header');

    await page.goto('/lesson/towns-near-rivers/write');
    const answer = page.getByRole('textbox', { name: 'Your answer' });
    await answer.fill(`${longWord} is where I read it.`);
    await answer.blur();
    await check('Write with a long word');
    await page.goto('/lesson/towns-near-rivers/reflect');
    const reflection = page.getByRole('textbox', { name: /good for a town/ });
    await reflection.fill(longWord);
    await reflection.blur();
    await nextButton(page, 'Finish lesson').click();
    await expect(page.locator('h1')).toHaveText('You finished Lesson 10.');
    await check('Lesson complete');

    await page.goto('/');
    await expect(page.locator('h1')).toHaveText(`Hi ${name}`);
    await check('learner home');
    await page.getByRole('button', { name: `Switch learner, current: ${name}` }).click();
    await check('learner switcher');
    await page.getByRole('button', { name: "Back to who's learning" }).click();
    await expect(page.locator('h1')).toHaveText("Who's learning today?");
    await check("who's learning");

    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await expect(page.locator('h1')).toHaveText(`Hi ${name}`);
    await page.goto('/journal');
    await expect(page.getByText(longWord).first()).toBeVisible();
    await check('journal');
    await page.locator('article.tw-entry').first().getByRole('button', { name: 'Edit' }).click();
    await check('journal, editing');
    await page.goto('/journal/print');
    await check('journal print');
  });
});
