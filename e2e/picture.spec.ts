import { expect, test } from '@playwright/test';
import { horizontalOverflow, L10 } from './lessonHelpers';

// Phase 8: a lesson's picture is about 330px wide on a phone, so its labels
// are tiny. "See it bigger" opens it in a dialog, at least 640px wide (labels
// at least 14px), that can be dragged and pinch-zoomed.

const MAP_ALT =
  'Fictional map of Riverlands with three possible town sites: flat farmland by a river, a hill a short walk away, and a forest far from the river.';

test('"See it bigger" opens the picture in a dialog, large enough to read, and gives focus back', async ({ page }) => {
  await page.goto(L10.path('read'));
  const opener = page.getByRole('button', { name: 'See it bigger' });
  await opener.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'The map' });
  await expect(dialog).toBeVisible();
  // Focus is inside the dialog, on its first control.
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  const picture = dialog.getByRole('img', { name: MAP_ALT });
  await expect(picture).toBeVisible();
  expect(await picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  // At least 640px wide (or as wide as the dialog, where that is more), up to its own 960px.
  const { width, box } = await picture.evaluate((img) => ({
    width: img.getBoundingClientRect().width,
    box: img.parentElement!.clientWidth,
  }));
  expect(width).toBeGreaterThanOrEqual(Math.min(960, Math.max(640, box)) - 1);
  // Wider than its area on a phone: the area scrolls, not the page.
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  const region = dialog.getByRole('region', { name: 'The map, bigger' });
  if (width > box + 1) {
    await region.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  }

  // Nothing stops pinch-zoom: not the page's viewport, not the dialog.
  const viewport = (await page.locator('meta[name="viewport"]').getAttribute('content')) ?? '';
  expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)|maximum-scale/);
  for (const el of [dialog, region, picture]) {
    expect(await el.evaluate((node) => getComputedStyle(node).touchAction)).toMatch(/auto|pinch-zoom|manipulation/);
  }

  // Escape closes it, and focus goes back to the button.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  // Close does the same.
  await opener.click();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('the print view has the picture but no "See it bigger"', async ({ page }) => {
  await page.goto('/lesson/towns-near-rivers/print');
  await expect(page.getByRole('img', { name: MAP_ALT })).toBeVisible();
  await expect(page.getByRole('button', { name: 'See it bigger' })).toHaveCount(0);
});
