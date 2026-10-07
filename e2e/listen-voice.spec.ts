import { expect, test, type Page } from '@playwright/test';
import { horizontalOverflow, L10, recordRequests, watchErrors } from './lessonHelpers';
import { changeVoices, fakeVoices, finishSpeaking, IPAD_VOICES, spoken } from './voiceFake';

// Listen's voice (docs/notes/listen-voices.md): the best voice on the
// device, or the one an educator chose in Settings ("Listen voice"), with a
// fake voice list like an iPad's (headless Chromium has no voices). Listen
// plays recordings where it can (docs/notes/recorded-audio.md); the device
// voice reads what has no recording here and now, so these tests block the
// recordings (noRecordings).

/** The recordings can't be downloaded: Listen and the samples use the device voice. */
const noRecordings = (page: Page) => page.route('**/audio/**', (route) => route.abort());

const SAMPLE_EN = 'This is the voice that reads the lessons aloud.';
const SAMPLE_ID = 'Ini suara yang membacakan pelajaran.';

test('Settings lists the voices on this device best first, plays a sample, and the chosen voice reads the lessons', async ({ page, baseURL }) => {
  const errors = watchErrors(page);
  const requests = recordRequests(page);
  await fakeVoices(page);
  await noRecordings(page);

  // Before anyone chooses: the best voice, never a novelty or Eloquence voice, even though Safari calls them all the default.
  await page.goto(L10.path('read'));
  await page.getByRole('button', { name: 'Listen' }).click();
  await expect.poll(() => spoken(page)).toEqual([{ text: 'Rivers give water and food.', voice: 'Daniel', lang: 'en-GB', rate: 1 }]);
  await page.getByRole('button', { name: 'Stop' }).click();

  await page.goto('/settings#listen-voice');
  const heading = page.getByRole('heading', { level: 2, name: 'Listen voice' });
  await expect(heading).toBeFocused();
  const english = page.getByRole('combobox', { name: 'Voice for English lessons' });
  await expect(english).toBeEnabled();
  await expect(english.locator('option')).toHaveText(['Automatic (best on this device)', 'Daniel', 'Samantha', 'Karen', 'Eddy']);
  await expect(english).toHaveAccessibleDescription('Automatic uses Daniel on this device.');
  const indonesian = page.getByRole('combobox', { name: 'Voice for Indonesian lessons' });
  await expect(indonesian.locator('option')).toHaveText(['Automatic (best on this device)', 'Damayanti']);
  // Nothing is spoken as Settings opens.
  expect(await spoken(page)).toEqual([]);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  // "Play a sample", only on a tap: the recording, which can't be had here, so the voice Automatic uses, then the chosen one.
  // (Each waits for the one before: a new tap replaces a sample that hasn't started.)
  const englishGroup = page.getByRole('group', { name: 'Voice for English lessons' });
  await englishGroup.getByRole('button', { name: 'Play a sample' }).click();
  await expect.poll(async () => (await spoken(page)).length).toBe(1);
  await english.selectOption({ label: 'Karen' });
  await englishGroup.getByRole('button', { name: 'Play a sample' }).click();
  await expect.poll(async () => (await spoken(page)).length).toBe(2);
  await page.getByRole('group', { name: 'Voice for Indonesian lessons' }).getByRole('button', { name: 'Play a sample' }).click();
  await expect.poll(async () => (await spoken(page)).length).toBe(3);
  expect((await spoken(page)).map(({ text, voice }) => [text, voice])).toEqual([
    [SAMPLE_EN, 'Daniel'],
    [SAMPLE_EN, 'Karen'],
    [SAMPLE_ID, 'Damayanti'],
  ]);

  // The chosen voice reads the lessons, and is kept after a reload.
  await page.goto(L10.path('read'));
  await page.getByRole('button', { name: 'Listen' }).click();
  await expect.poll(() => spoken(page)).toEqual([{ text: 'Rivers give water and food.', voice: 'Karen', lang: 'en-AU', rate: 1 }]);
  await finishSpeaking(page);
  await expect.poll(async () => (await spoken(page)).at(-1)?.text).toBe('Every community needs water to drink, cook and wash.');
  await page.goto('/settings#listen-voice');
  await expect(english).toHaveValue(/Karen/);

  // The browser logs each blocked recording; nothing else went wrong.
  expect(errors.filter((error) => error !== 'console: Failed to load resource: net::ERR_FAILED')).toEqual([]);
  const origin = new URL(baseURL ?? 'http://localhost').origin;
  expect(requests.filter((url) => !url.startsWith('data:') && new URL(url).origin !== origin)).toEqual([]);
});

test("a voice that isn't on this device any more: Automatic again, without a word", async ({ page }) => {
  await fakeVoices(page);
  await noRecordings(page);
  await page.goto('/settings#listen-voice');
  const english = page.getByRole('combobox', { name: 'Voice for English lessons' });
  await expect(english).toBeEnabled();
  await english.selectOption({ label: 'Karen' });
  await expect(english).toHaveValue(/Karen/);

  // The same settings, with Karen gone (removed, or settings from another device).
  await changeVoices(
    page,
    IPAD_VOICES.filter((voice) => voice.name !== 'Karen'),
  );
  await page.reload();
  await expect(english).toBeEnabled();
  await expect(english).toHaveValue('');
  await expect(english).toHaveAccessibleDescription('Automatic uses Daniel on this device.');

  await page.goto(L10.path('read'));
  await page.getByRole('button', { name: 'Listen' }).click();
  await expect.poll(async () => (await spoken(page))[0]?.voice).toBe('Daniel');
});

test('the setup checklist says which voice Listen uses, and links to it in Settings', async ({ page }) => {
  await fakeVoices(page);
  await page.goto('/educators/setup');
  const card = page.locator('li').filter({ has: page.getByRole('heading', { level: 2, name: /Choose the Listen voice \(optional\)/ }) });
  await expect(card.getByRole('status')).toContainText('Listen reads with Daniel, the best voice on this device.');
  await expect(card.getByRole('status')).toContainText('Optional');
  await card.getByRole('link', { name: 'Choose it in Settings' }).click();
  await expect(page).toHaveURL(/\/settings#listen-voice$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Listen voice' })).toBeFocused();
  expect(await spoken(page)).toEqual([]);
});

test('with no voice on the device, Settings says so and how to get one', async ({ page }) => {
  await page.goto('/settings#listen-voice');
  await expect(page.getByText(/This device has no English voice\. Listen still plays the recordings/)).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 3, name: 'Get a clearer voice' })).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});
