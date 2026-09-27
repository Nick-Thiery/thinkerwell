import { expect, test } from '@playwright/test';
import { L10 } from './lessonHelpers';

// The Educators page links each lesson's teacher guide and each section
// check's answer key, and the chosen section is kept in the address, so a
// teacher comes back to the same list.

test('a teacher goes from a section to a teacher guide and back to the same section', async ({ page }) => {
  await page.goto('/educators');
  await page.getByRole('radio', { name: /Geography/ }).click();
  await expect(page).toHaveURL(/\/educators\?section=geography$/);

  await page.getByRole('link', { name: 'Teacher guide for Lesson 10' }).click();
  await expect(page).toHaveURL(/\/educators\/lesson\/towns-near-rivers$/);
  await expect(page.locator('h1')).toHaveText(L10.title);
  await expect(page).toHaveTitle('Lesson 10: teacher guide · Thinkerwell');
  await expect(page.getByRole('heading', { level: 3, name: 'Sensitive topics: read before class' })).toBeVisible();

  await page.getByRole('link', { name: 'Back to the educators page' }).click();
  await expect(page).toHaveURL(/\/educators\?section=geography$/);
  await expect(page.getByRole('radio', { name: /Geography/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('link', { name: 'Teacher guide for Lesson 10' })).toBeVisible();
});

test('choosing a section keeps the page where it is', async ({ page }) => {
  await page.goto('/educators');
  await page.getByRole('link', { name: 'Teacher guide for Lesson 1' }).scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(0);
  await page.getByRole('radio', { name: /Culture/ }).click();
  await expect(page).toHaveURL(/\?section=culture$/);
  await expect(page.getByRole('link', { name: 'Teacher guide for Lesson 15' })).toBeVisible();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(80);
});

test("a section's answer key opens from the Educators page, and its questions lead to the lessons' guides", async ({ page }) => {
  await page.goto('/educators?section=civics');
  await page.getByRole('link', { name: 'Answer key for the Civics, Media & Everyday Economics section check' }).click();
  await expect(page).toHaveURL(/\/educators\/section\/civics\/answers$/);
  await expect(page.locator('h1')).toHaveText('Answer key: Civics, Media & Everyday Economics');
  await expect(page).toHaveTitle('Answer key: Civics, Media & Everyday Economics · Thinkerwell');
  // One marked answer per question, marked in words.
  await expect(page.locator('.tw-key-question')).toHaveCount(10);
  await expect(page.locator('.tw-key-option-correct')).toHaveCount(10);
  await expect(page.locator('.tw-key-option-correct').getByText('Correct answer')).toHaveCount(10);

  await page.getByRole('link', { name: /^From Lesson 20:/ }).first().click();
  await expect(page).toHaveURL(/\/educators\/lesson\/making-choices$/);
  await expect(page).toHaveTitle('Lesson 20: teacher guide · Thinkerwell');
});
