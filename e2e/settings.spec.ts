import { expect, test, type Page } from '@playwright/test';
import { fakeSpeechRecognition, recognitionLog } from './speechFake';

// Settings for this device (phase 6): reachable from the header menu at
// every width, "Save data" turns the videos off, and "Check this device"
// asks about speech to text only when an educator taps it.

/** The Settings link: an icon in the full header, or an item in the phone menu. */
async function openSettingsFromHeader(page: Page): Promise<void> {
  const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
}

/** One device setting as stored on the device (settings.saveData, settings.speechCheck, ...). */
async function storedSetting(page: Page, key: string): Promise<unknown> {
  return page.evaluate(
    (name) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('thinkerwell');
        open.onerror = () => reject(new Error('IndexedDB open failed'));
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction('settings').objectStore('settings').get('device');
          get.onsuccess = () => {
            db.close();
            resolve((get.result as Record<string, unknown> | undefined)?.[name]);
          };
          get.onerror = () => reject(new Error('IndexedDB read failed'));
        };
      }),
    key,
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('Save data turns the videos off: Watch opens on the written version', async ({ page }) => {
  await page.goto('/settings');
  const saveData = page.getByRole('checkbox', { name: 'Save data' });
  await expect(saveData).toBeEnabled();
  await expect(saveData).not.toBeChecked();
  await saveData.check();
  // Saved on the device (IndexedDB), then still on after a reload.
  await expect.poll(() => storedSetting(page, 'saveData')).toBe(true);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Save data' })).toBeChecked();

  await page.goto('/lesson/towns-near-rivers/watch');
  await expect(page.getByText('Videos are off to save data.')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Ancient Mesopotamia 101' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Watch the video/ })).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('Check this device asks the browser only when tapped, and keeps the answer with the date', async ({ page }) => {
  await fakeSpeechRecognition(page, 'downloadable');
  await page.goto('/settings');
  const card = page.getByRole('region', { name: 'Say it: speech to text' });
  const status = card.getByRole('status');
  await expect(status).toHaveText(/This device hasn't been checked yet/);
  const check = card.getByRole('button', { name: 'Check this device' });
  await expect(check).toHaveAccessibleDescription('The check can take a moment.');
  const box = await check.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  // Opening the page asked nothing.
  expect(await recognitionLog(page)).toEqual({ availableCalls: 0, installCalls: 0, constructed: 0, started: [] });

  await check.click();
  await expect(status).toContainText('after a one-time download');
  await expect(status).toContainText(/Checked on [A-Z][a-z]+ \d{1,2}, \d{4}\./);
  await expect(card.getByRole('button', { name: 'Download speech to text' })).toBeVisible();
  expect(await recognitionLog(page)).toEqual({ availableCalls: 1, installCalls: 0, constructed: 0, started: [] });
  await expect.poll(() => storedSetting(page, 'speechCheck')).toMatchObject({ status: 'downloadable' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  // Opened again: the saved answer, without asking.
  await page.reload();
  await expect(status).toContainText('after a one-time download');
  await expect(status).toContainText(/Checked on /);
  expect(await recognitionLog(page)).toEqual({ availableCalls: 0, installCalls: 0, constructed: 0, started: [] });
});
