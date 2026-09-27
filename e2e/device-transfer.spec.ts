import { expect, test } from '@playwright/test';
import { addLearnerViaUi, horizontalOverflow, L10, recordRequests, watchErrors } from './lessonHelpers';

// Moving a learner's work to another device (Settings, "Move work to another
// device"; docs/notes/device-transfer.md). One browser context is the old
// tablet: a learner writes in Lesson 10 and saves their work to a file. A
// fresh context is the new tablet: the file is loaded there, and the work
// shows in the journal and the lesson. Nothing goes to another server.

const WRITE_TEXT = 'I would build the town at the River site because of the water and trade routes.';
const REFLECT_TEXT = 'Rivers give water and a way to trade.';

test("a learner's work saved to a file on one device loads on a fresh one", async ({ page, browser, baseURL, viewport, isMobile, hasTouch }) => {
  test.setTimeout(90_000);
  const errors = watchErrors(page);

  // The old tablet: Amina writes in Lesson 10 and finishes it.
  await addLearnerViaUi(page, 'Amina');
  await page.goto(L10.path('write'));
  const writeAnswer = page.getByRole('textbox', { name: 'Your answer' });
  await writeAnswer.fill(WRITE_TEXT);
  await writeAnswer.blur();
  await page.goto(L10.path('reflect'));
  const reflectAnswer = page.getByRole('textbox', { name: /good for a town/ });
  await reflectAnswer.fill(REFLECT_TEXT);
  await reflectAnswer.blur();

  // Save her work to a file.
  await page.goto('/settings');
  const card = page.getByRole('region', { name: 'Move work to another device' });
  await expect(card.getByRole('radio', { name: 'Amina' })).toBeChecked();
  await expect(card.getByText('Recordings stay on this device.')).toBeVisible();
  const downloading = page.waitForEvent('download');
  await card.getByRole('button', { name: 'Save my work to a file' }).click();
  const download = await downloading;
  const fileName = download.suggestedFilename();
  expect(fileName).toMatch(/^thinkerwell-amina-\d{4}-\d{2}-\d{2}\.json$/);
  const filePath = test.info().outputPath(fileName);
  await download.saveAs(filePath);
  await expect(card.getByText(`Look for ${fileName} in this device's downloads.`)).toBeVisible();
  expect(errors).toEqual([]);

  // The new tablet: nothing on it yet.
  const newTablet = await browser.newContext({ baseURL, viewport, isMobile, hasTouch, serviceWorkers: 'block' });
  try {
    const fresh = await newTablet.newPage();
    const freshErrors = watchErrors(fresh);
    const requests = recordRequests(fresh);
    await fresh.goto('/');
    await expect(fresh.locator('h1')).toHaveText("Who's learning today?");
    await expect(fresh.getByRole('button', { name: /^Amina/ })).toHaveCount(0);

    // "Load my work" opens the file chooser; the file is checked and shown before anything changes.
    await fresh.goto('/settings');
    const freshCard = fresh.getByRole('region', { name: 'Move work to another device' });
    await expect(freshCard.getByText("There's no saved work on this device yet.")).toBeVisible();
    const choosing = fresh.waitForEvent('filechooser');
    await freshCard.getByRole('button', { name: 'Load my work' }).click();
    const chooser = await choosing;
    expect(chooser.isMultiple()).toBe(false);
    await chooser.setFiles(filePath);
    const preview = freshCard.getByRole('group', { name: 'Check before you load' });
    await expect(preview.getByRole('listitem')).toHaveText('Amina: 1 lesson. New on this device.');
    // Focus moves to the preview. (Checked through activeElement: after a file
    // chooser, headless Chromium reports the page itself as not focused.)
    await expect.poll(() => fresh.evaluate(() => document.activeElement?.textContent)).toBe('Check before you load');
    expect(await horizontalOverflow(fresh)).toBeLessThanOrEqual(0);

    await preview.getByRole('button', { name: 'Load it' }).click();
    await expect(freshCard.getByText('Added to this device: Amina.')).toBeVisible();

    // Loading the same file again (straight into the input) changes nothing.
    await freshCard.locator('input[type="file"]').setInputFiles(filePath);
    await expect(preview.getByRole('listitem')).toHaveText(/^Amina: 1 lesson\. Already on this device/);
    await preview.getByRole('button', { name: 'Load it' }).click();
    await expect(freshCard.getByText('This device already had all the work in this file, so nothing changed.')).toBeVisible();

    // Amina is on the new tablet, with her work.
    await fresh.goto('/');
    await fresh.getByRole('button', { name: /^Amina/ }).click();
    await expect(fresh.locator('h1')).toHaveText('Hi Amina');
    await fresh.goto('/journal');
    await expect(fresh.locator('h1')).toHaveText('My journal');
    await expect(fresh.getByText(WRITE_TEXT)).toBeVisible();
    await expect(fresh.getByText(REFLECT_TEXT)).toBeVisible();
    await fresh.goto(L10.path('write'));
    await expect(fresh.getByRole('textbox', { name: 'Your answer' })).toHaveValue(WRITE_TEXT);

    // Nothing went to another server, and nothing went wrong.
    const origin = new URL(baseURL!).origin;
    expect(requests.filter((url) => !url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:'))).toEqual([]);
    expect(freshErrors).toEqual([]);
  } finally {
    await newTablet.close();
  }
});

test('a file that is not Thinkerwell work is refused, and changes nothing', async ({ page }) => {
  await addLearnerViaUi(page, 'Omar');
  await page.goto('/settings');
  const card = page.getByRole('region', { name: 'Move work to another device' });
  await card.locator('input[type="file"]').setInputFiles({
    name: 'thinkerwell-omar-2026-09-28.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'thinkerwell-work', version: 99, learners: [] })),
  });
  await expect(card.getByText(/This file was saved by a newer version of Thinkerwell\. Update this device first/)).toBeVisible();
  await expect(page.getByRole('group', { name: 'Check before you load' })).toHaveCount(0);
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Hi Omar');
});
