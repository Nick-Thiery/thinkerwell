import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { horizontalOverflow, recordRequests, watchErrors } from './lessonHelpers';

// Southeast Asia Through Time, the second preview course (src/content/courses.ts,
// content/courses/southeast-asia-through-time/README.md): invisible until a device
// visits /preview/southeast-asia-through-time, then its map, its lessons with their
// two pictures (a diagram, and a credited real picture after the last reading part),
// and its print views. Runs at all three sizes.

const FILES = /\/assets\/preview\/southeast-asia-through-time\//;
const LESSON = 'sat-01-ban-chiang-pot';

async function turnOn(page: Page) {
  await page.goto('/preview/southeast-asia-through-time');
  await expect(page.getByRole('heading', { level: 1, name: 'Southeast Asia Through Time preview is on' })).toBeVisible();
}

test('with the preview off, its addresses aren’t there and nothing of it is downloaded', async ({ page }) => {
  const urls = recordRequests(page);
  for (const path of ['/course/southeast-asia-through-time', `/lesson/${LESSON}/read`, `/lesson/${LESSON}/print`]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: "This page isn't here" })).toBeVisible();
  }
  expect(urls.filter((url) => FILES.test(url))).toEqual([]);
});

test.describe('with the preview on', () => {
  test('the course choice lists it, and its map has four sections of three lessons, each with its check', async ({ page }) => {
    const errors = watchErrors(page);
    await turnOn(page);
    await page.goto('/course');
    const choice = page.getByRole('navigation', { name: 'Courses on this device' });
    await choice.getByRole('link', { name: /Southeast Asia Through Time/ }).click();
    await expect(page).toHaveURL(/\/course\/southeast-asia-through-time$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Southeast Asia Through Time' })).toBeVisible();
    await expect(page.getByText('Draft course: not yet reviewed', { exact: true })).toBeVisible();
    await expect(page.locator('.tw-course-section')).toHaveCount(4);
    await expect(page.locator('.tw-course-section .tw-row:not(.tw-row-quiz)')).toHaveCount(12);
    await expect(page.locator('.tw-course-section .tw-row-quiz')).toHaveCount(4);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const axe = await new AxeBuilder({ page }).include('main').analyze();
    expect(axe.violations.map((violation) => violation.id)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('a lesson shows its diagram in Read, and its print view both pictures with the real one’s credit', async ({ page }) => {
    const errors = watchErrors(page);
    await turnOn(page);
    await page.goto(`/lesson/${LESSON}/read`);
    await expect(page.locator('.tw-lx > .tw-lesson-visual > img')).toBeVisible();
    await expect(page.locator('.tw-lx .tw-pc-picture-caption')).toBeVisible();

    await page.goto(`/lesson/${LESSON}/print`);
    const pictures = page.locator('.tw-lesson-visual img');
    await expect(pictures).toHaveCount(2);
    await expect(page.locator('.tw-pc-picture-credit')).toContainText('CC BY-SA 3.0');
    await expect(page.locator('.tw-pc-picture-credit').getByRole('link', { name: /See the original/ })).toHaveAttribute(
      'href',
      /commons\.wikimedia\.org/,
    );
    // Both pictures come from this site, never another server.
    for (const src of await pictures.evaluateAll((images) => images.map((image) => (image as HTMLImageElement).src))) {
      expect(new URL(src).origin).toBe(new URL(page.url()).origin);
    }
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test('a section check: from the map, one question at a time, results, and its answer key for teachers', async ({ page }) => {
    const errors = watchErrors(page);
    await turnOn(page);
    await page.goto('/course/southeast-asia-through-time');
    await page.getByRole('link', { name: /Section check: Evidence and early connections/ }).click();
    await expect(page).toHaveURL(/\/section\/evidence-and-connections\/check$/);
    await expect(page.getByText('Draft course: not yet reviewed', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Start the check' }).click();
    for (let n = 0; n < 6; n += 1) {
      await page.getByRole('radio').first().click();
      await expect(page.locator('.tw-feedback-title')).toBeVisible();
      await page.getByRole('button', { name: n < 5 ? 'Next question' : 'See your results' }).click();
    }
    await expect(page.getByRole('heading', { level: 1, name: /^\d out of 6$/ })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await page.goto('/educators/section/trade-and-power/answers');
    await expect(page.getByText('Correct answer').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
