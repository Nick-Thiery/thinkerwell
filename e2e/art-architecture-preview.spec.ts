import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { horizontalOverflow, recordRequests, watchErrors } from './lessonHelpers';

// Art, Architecture and Society, the third preview course (src/content/courses.ts,
// content/courses/art-architecture-society/README.md; Justin's brief of 4 November
// 2026, expanded 7 November): invisible until a device visits
// /preview/art-architecture-society, then its map, its lessons with two real,
// credited images each, a Read that teaches without a warm-up or quick check, and
// its print views. Runs at all three sizes.

const FILES = /\/assets\/preview\/art-architecture-society\//;
const LESSON = 'aas-01-art-and-context';

/** The course needs no switching on: its map opens on any device. (Kept so each test reads as before.) */
async function turnOn(page: Page) {
  await page.goto('/course/art-architecture-society');
  await expect(page.getByRole('heading', { level: 1, name: 'Art, Architecture and Society' })).toBeVisible();
}

test('on a device that has never visited it, none of its files are downloaded until it is opened', async ({ page }) => {
  const urls = recordRequests(page);
  for (const path of ['/course']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Courses' }).getByRole('link', { name: /Art, Architecture and Society/ })).toBeVisible();
  }
  expect(urls.filter((url) => FILES.test(url))).toEqual([]);
  await page.goto(`/lesson/${LESSON}/read`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(urls.filter((url) => FILES.test(url)).length).toBeGreaterThan(0);
});

test.describe('with the course open', () => {
  test('the course choice lists it, and its map has four sections of five lessons and no section checks', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/course');
    const choice = page.getByRole('navigation', { name: 'Courses' });
    await choice.getByRole('link', { name: /Art, Architecture and Society/ }).click();
    await expect(page).toHaveURL(/\/course\/art-architecture-society$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Art, Architecture and Society' })).toBeVisible();
    await expect(page.getByText('Draft course: not yet reviewed', { exact: true })).toHaveCount(0);
    await expect(page.locator('.tw-course-section')).toHaveCount(4);
    await expect(page.locator('.tw-course-section .tw-row:not(.tw-row-quiz)')).toHaveCount(20);
    await expect(page.locator('.tw-course-section .tw-row-quiz')).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const axe = await new AxeBuilder({ page }).include('main').analyze();
    expect(axe.violations.map((violation) => violation.id)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('Read teaches through two real works, with no warm-up or quick check, and goes straight on to Write', async ({ page }) => {
    const errors = watchErrors(page);
    await turnOn(page);
    await page.goto(`/lesson/${LESSON}/read`);
    // The first work, with its caption and credit, before the reading; no warm-up.
    await expect(page.locator('.tw-lx > .tw-lesson-visual > img')).toBeVisible();
    await expect(page.locator('.tw-lx .tw-pc-picture-credit').first()).toContainText('Public domain');
    await expect(page.locator('.tw-read-warmup-question')).toHaveCount(0);
    // Four steps: no Watch until a video is approved.
    await expect(page.locator(`a[href$="/lesson/${LESSON}/watch"]`)).toHaveCount(0);
    await page.goto(`/lesson/${LESSON}/read?part=3`);
    // The second work after the last part; then on to Write, never to an empty quick check.
    await expect(page.locator('.tw-read-part .tw-lesson-visual img').first()).toBeVisible();
    await page.getByRole('button', { name: 'Continue to Write' }).click();
    await expect(page).toHaveURL(new RegExp(`/lesson/${LESSON}/write`));
    await expect(page.getByRole('heading', { name: 'Quick check' })).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const axe = await new AxeBuilder({ page }).include('main').analyze();
    expect(axe.violations.map((violation) => violation.id)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the print view has both works with their credits, all from this site', async ({ page }) => {
    const errors = watchErrors(page);
    await turnOn(page);
    await page.goto(`/lesson/${LESSON}/print`);
    const pictures = page.locator('.tw-lesson-visual img');
    await expect(pictures).toHaveCount(2);
    await expect(page.locator('.tw-pc-picture-credit')).toHaveCount(2);
    await expect(page.locator('.tw-pc-picture-credit').first().getByRole('link', { name: /See the original/ })).toHaveAttribute(
      'href',
      /metmuseum\.org/,
    );
    await expect(page.getByRole('heading', { name: 'Quick check' })).toHaveCount(0);
    for (const src of await pictures.evaluateAll((images) => images.map((image) => (image as HTMLImageElement).src))) {
      expect(new URL(src).origin).toBe(new URL(page.url()).origin);
    }
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test('in Indonesian, its lessons are translated, with the same real images and credits', async ({ page }) => {
    await turnOn(page);
    await page.goto(`/lesson/${LESSON}/read`);
    await page.getByRole('button', { name: /Language|Bahasa/ }).first().click();
    await page.getByRole('menuitemradio', { name: /Bahasa Indonesia/ }).or(page.getByRole('radio', { name: /Bahasa Indonesia/ })).first().click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Bagaimana sebuah karya seni bisa membantu kita memahami sebuah masyarakat?' }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.locator('.tw-lx > .tw-lesson-visual > img')).toBeVisible();
    await expect(page.locator('.tw-lx .tw-pc-picture-credit').first()).toContainText('Public domain');
    await page.goto('/lesson/aas-08-streets-trade-and-shared-space/read');
    await page.getByRole('button', { name: /Language|Bahasa/ }).first().click();
    await page.getByRole('menuitemradio', { name: /Bahasa Melayu/ }).or(page.getByRole('radio', { name: /Bahasa Melayu/ })).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Bagaimanakah jalan perdagangan menyatukan kehidupan yang berbeza?' })).toBeVisible();
  });
});
