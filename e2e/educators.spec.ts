import { expect, test } from '@playwright/test';
import { L10 } from './lessonHelpers';

// The Educators page is a short start page (October 2026); every teacher
// guide, print view and answer key is one link away, at /educators/guides,
// and a guide or key comes back to its own section there.

test('a teacher goes from the Educators page to a teacher guide and back to the same section', async ({ page }) => {
  await page.goto('/educators');
  await expect(page.getByRole('link', { name: 'Browse the course' })).toHaveAttribute('href', '/course');
  await page.getByRole('region', { name: 'Teaching materials' }).getByRole('link', { name: 'Open the list' }).click();
  await expect(page).toHaveURL(/\/educators\/guides$/);
  await expect(page.locator('h1')).toHaveText('Teacher guides and answer keys');
  await expect(page).toHaveTitle('Teacher guides and answer keys | Thinkerwell');

  await page.getByText('Geography & Our Environment', { exact: true }).click();
  await page.getByRole('link', { name: 'Teacher guide for Lesson 10' }).click();
  await expect(page).toHaveURL(/\/educators\/lesson\/towns-near-rivers$/);
  await expect(page.locator('h1')).toHaveText(L10.title);
  await expect(page).toHaveTitle('Lesson 10: teacher guide | Thinkerwell');
  await expect(page.getByRole('heading', { level: 3, name: 'Sensitive topics: read before class' })).toBeVisible();

  await page.getByRole('link', { name: 'Back to teacher guides' }).click();
  await expect(page).toHaveURL(/\/educators\/guides\?section=geography$/);
  await expect(page.locator('details.tw-guides-geography')).toHaveAttribute('open', '');
  await expect(page.getByRole('link', { name: 'Teacher guide for Lesson 10' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Print Lesson 10' })).toHaveAttribute('href', '/lesson/towns-near-rivers/print');
});

test('the old addresses of the session guide and the learning check still open them', async ({ page }) => {
  await page.goto('/educators/pilot-day');
  await expect(page).toHaveURL(/\/educators\/session-guide$/);
  await expect(page.locator('h1')).toHaveText('Session guide');
  await page.goto('/educators/pilot-check');
  await expect(page).toHaveURL(/\/educators\/learning-check$/);
  await expect(page.locator('h1')).toHaveText('Learning check');
});

test("a section's answer key opens from the list of teacher guides, and its questions lead to the lessons' guides", async ({ page }) => {
  await page.goto('/educators/guides?section=civics');
  await page.getByRole('link', { name: 'Answer key for the Civics, Media & Everyday Economics section check' }).click();
  await expect(page).toHaveURL(/\/educators\/section\/civics\/answers$/);
  await expect(page.locator('h1')).toHaveText('Answer key: Civics, Media & Everyday Economics');
  await expect(page).toHaveTitle('Answer key: Civics, Media & Everyday Economics | Thinkerwell');
  // One marked answer per question, marked in words.
  await expect(page.locator('.tw-key-question')).toHaveCount(10);
  await expect(page.locator('.tw-key-option-correct')).toHaveCount(10);
  await expect(page.locator('.tw-key-option-correct').getByText('Correct answer')).toHaveCount(10);

  await page.getByRole('link', { name: /^From Lesson 20:/ }).first().click();
  await expect(page).toHaveURL(/\/educators\/lesson\/making-choices$/);
  await expect(page).toHaveTitle('Lesson 20: teacher guide | Thinkerwell');
});
