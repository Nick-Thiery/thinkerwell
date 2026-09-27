import { expect, test, type Page } from '@playwright/test';

// Settings for this device (phase 6): reachable from the header menu at
// every width, and "Save data" turns the videos off.

/** The Settings link: an icon in the full header, or an item in the phone menu. */
async function openSettingsFromHeader(page: Page): Promise<void> {
  const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
}

/** settings.saveData as stored on the device. */
async function storedSaveData(page: Page): Promise<unknown> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('thinkerwell');
        open.onerror = () => reject(new Error('IndexedDB open failed'));
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction('settings').objectStore('settings').get('device');
          get.onsuccess = () => {
            db.close();
            resolve((get.result as { saveData?: unknown } | undefined)?.saveData);
          };
          get.onerror = () => reject(new Error('IndexedDB read failed'));
        };
      }),
  );
}

test('Settings is in the header menu, apart from the five main links', async ({ page }) => {
  await page.goto('/course');
  await openSettingsFromHeader(page);
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator('h1')).toHaveText('Settings for this device');
  await expect(page.locator('h1')).toBeFocused();

  const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
  if (await menuButton.isVisible()) await menuButton.click();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveCount(5);
  const settings = page.getByRole('link', { name: 'Settings', exact: true });
  await expect(settings).toHaveAttribute('aria-current', 'page');
  const box = await settings.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('Save data turns the videos off: Watch opens on the written version', async ({ page }) => {
  await page.goto('/settings');
  const saveData = page.getByRole('checkbox', { name: 'Save data' });
  await expect(saveData).toBeEnabled();
  await expect(saveData).not.toBeChecked();
  await saveData.check();
  // Saved on the device (IndexedDB), then still on after a reload.
  await expect.poll(() => storedSaveData(page)).toBe(true);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Save data' })).toBeChecked();

  await page.goto('/lesson/towns-near-rivers/watch');
  await expect(page.getByText('Videos are off to save data.')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Ancient Mesopotamia 101' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Watch the video/ })).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
});
