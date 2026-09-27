import { expect, test } from '@playwright/test';
import { horizontalOverflow, L10, recordRequests, watchErrors } from './lessonHelpers';

// Phase 5: Listen, Say it and Record yourself. Most behaviour is covered in
// Vitest with mocked speech and media APIs; these two check the real pages
// in a real browser. Headless Chromium has no voices and no on-device speech
// pack, which is exactly the "nothing is available" case.

interface FakeSpeech {
  spoken: string[];
  finish: () => void;
}

test('with no device voice, on-device speech or microphone, nothing shows and nothing breaks', async ({
  page,
  baseURL,
}) => {
  const errors = watchErrors(page);
  const requests = recordRequests(page);
  // No microphone on this device (enumerateDevices lists none).
  await page.addInitScript(() => {
    if (navigator.mediaDevices) navigator.mediaDevices.enumerateDevices = () => Promise.resolve([]);
  });

  await page.goto(L10.path('read'));
  await expect(page.getByRole('toolbar', { name: 'Reading tools' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Reading level' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listen' })).toHaveCount(0);

  await page.goto(L10.path('write'));
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Say it' })).toHaveCount(0);

  await page.goto(L10.path('speak'));
  await expect(page.getByRole('radiogroup', { name: 'How did you practise?' })).toBeVisible();
  await expect(page.getByRole('region', { name: /Record yourself/ })).toHaveCount(0);
  await expect(page.getByText(/record yourself/i)).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  // The educators' settings say why Say it is hidden, and offer the switch.
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Settings for this device' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Allow online speech-to-text' })).not.toBeChecked();
  await expect(page.getByRole('status').filter({ hasText: /speech into text/ })).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  expect(errors).toEqual([]);
  const origin = new URL(baseURL ?? 'http://localhost').origin;
  expect(requests.filter((url) => !url.startsWith('data:') && new URL(url).origin !== origin)).toEqual([]);
});

test('Listen reads the part aloud with a device voice, and its controls work', async ({ page }) => {
  const errors = watchErrors(page);
  // A local English voice, spoken by hand: finish() ends the current sentence.
  await page.addInitScript(() => {
    type Utterance = { text: string; onend?: (() => void) | null; onerror?: ((e: { error: string }) => void) | null };
    const voice = { name: 'Test voice', lang: 'en-GB', localService: true, default: true, voiceURI: 'test-voice' };
    let queue: Utterance[] = [];
    const spoken: string[] = [];
    const events = new EventTarget();
    const synth = {
      paused: false,
      pending: false,
      get speaking() {
        return queue.length > 0;
      },
      getVoices: () => [voice],
      speak(u: Utterance) {
        spoken.push(u.text);
        queue.push(u);
      },
      cancel() {
        const dropped = queue;
        queue = [];
        dropped.forEach((u) => u.onerror?.({ error: 'interrupted' }));
      },
      pause() {},
      resume() {},
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => synth });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
    (window as unknown as { __speech: FakeSpeech }).__speech = {
      spoken,
      finish: () => queue.shift()?.onend?.(),
    };
  });
  const speech = {
    spoken: () => page.evaluate(() => (window as unknown as { __speech: FakeSpeech }).__speech.spoken),
    finish: () => page.evaluate(() => (window as unknown as { __speech: FakeSpeech }).__speech.finish()),
  };

  await page.goto(L10.path('read'));
  const listen = page.getByRole('button', { name: 'Listen' });
  await expect(listen).toBeVisible();
  await expect(listen).toHaveAttribute('aria-pressed', 'false');
  await listen.click();

  const bar = page.getByRole('group', { name: 'Reading aloud · part 1 of 3' });
  await expect(bar).toBeVisible();
  await expect(listen).toHaveAttribute('aria-pressed', 'true');
  expect(await speech.spoken()).toEqual(['Rivers give water and food']);

  // The first sentence is marked, in view, with the lemon highlight.
  await speech.finish();
  const mark = page.locator('mark.tw-speaking');
  await expect(mark).toHaveText('Every community needs water to drink, cook and wash.');
  await expect(mark).toBeInViewport();
  await expect(mark).toHaveCSS('background-color', 'rgb(255, 251, 196)'); // --lemon-soft
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await bar.getByRole('button', { name: 'Pause' }).click();
  await expect(bar.getByRole('button', { name: 'Play' })).toBeVisible();
  await bar.getByRole('button', { name: 'Play' }).click();
  await bar.getByRole('button', { name: 'Slow' }).click();
  await expect(bar.getByRole('button', { name: 'Slow' })).toHaveAttribute('aria-pressed', 'true');
  // Paused, played and slowed: the same sentence each time.
  expect((await speech.spoken()).slice(1)).toEqual(Array(3).fill('Every community needs water to drink, cook and wash.'));

  // An open definition stays open while the highlight reaches its word and moves past it.
  const fertile = page.getByRole('button', { name: 'fertile', exact: true });
  await fertile.click();
  await expect(fertile).toHaveAttribute('aria-expanded', 'true');
  for (let i = 0; i < 3; i += 1) await speech.finish();
  await expect(fertile.locator('mark.tw-speaking')).toHaveText('fertile');
  await speech.finish();
  await expect(fertile.locator('mark')).toHaveCount(0);
  await expect(fertile).toHaveAttribute('aria-expanded', 'true');
  await expect(fertile).toBeFocused();

  await bar.getByRole('button', { name: 'Stop' }).click();
  await expect(bar).toHaveCount(0);
  await expect(mark).toHaveCount(0);
  await expect(listen).toBeFocused();
  expect(errors).toEqual([]);
});
