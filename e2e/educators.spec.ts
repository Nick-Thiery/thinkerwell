import { expect, test } from '@playwright/test';

// Phase 8: each lesson's teaching notes on the Educators page start closed
// and open on request. They used to show all the time: the notes box's own
// display: flex beat the browser's rule for the hidden attribute.

test('teaching notes and sources are closed until an educator opens them', async ({ page }) => {
  await page.goto('/educators');
  const toggles = page.getByRole('button', { name: 'Show teaching notes and sources' });
  await expect(toggles.first()).toBeVisible();
  const notes = page.locator('.tw-edu-notes');
  for (const box of await notes.all()) await expect(box).toBeHidden();

  const first = toggles.first();
  const bodyId = (await first.getAttribute('aria-controls'))!;
  await first.click();
  const body = page.locator(`[id="${bodyId}"]`);
  await expect(body).toBeVisible();
  await expect(body.getByRole('link').first()).toBeVisible();
  const hide = page.getByRole('button', { name: 'Hide teaching notes and sources' });
  await expect(hide).toHaveAttribute('aria-expanded', 'true');
  await hide.click();
  await expect(body).toBeHidden();
});
