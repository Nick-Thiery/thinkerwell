import { expect, test, type Page } from '@playwright/test';
import {
  addLearnerViaUi,
  dumpEverything,
  lessonSteps,
  openHelp,
  horizontalOverflow,
  L10,
  nextButton,
  recordRequests,
  storedProgress,
  VIDEO_HOSTS,
  watchErrors,
} from './lessonHelpers';

// Phase 4: Lesson 10 end to end, plus a few targeted checks, at 390, 820 and
// 1280 (the phone, tablet and laptop projects in playwright.config.ts),
// against a production build. Each test gets a fresh browser context, so
// IndexedDB starts empty. That every lesson's every step renders is checked
// in Vitest (src/pages/lesson/LessonPage.test.tsx); the glossary popover in
// glossary-popover.spec.ts.

const RETRY = 'rgb(155, 71, 0)'; // --retry, burnt orange
const CORRECT = 'rgb(11, 107, 122)'; // --correct, teal

const Q1 = {
  wrong: 'The land by rivers was high, dry and rocky.',
  right: 'Floods left mud that made the soil fertile.',
};
const Q2_RIGHT = 'The river may flood the land.';
const MAP_ALT =
  'Fictional map of Riverlands with three possible town sites: flat farmland by a river, a hill a short walk away, and a forest far from the river.';

function question(page: Page, index: number) {
  return page.locator('.tw-question').nth(index);
}

function levelButton(page: Page, name: 'Standard' | 'Simpler') {
  return page.getByRole('group', { name: 'Reading level' }).getByRole('button', { name });
}

test('Lesson 10 end to end as a new learner', async ({ page }) => {
  // A whole lesson, with a reload and the course map: more than the default 30s on a busy machine.
  test.setTimeout(60_000);
  const errors = watchErrors(page);
  const requests = recordRequests(page);

  await addLearnerViaUi(page, 'Amina');
  await page.goto(L10.path('read'));
  await expect(page.locator('h1')).toHaveText(L10.title);
  // Just opening a lesson saves nothing.
  expect(await storedProgress(page, L10.id)).toBeUndefined();

  // Read: the map picture first, loaded from the site itself, then the warm-up about it.
  await page.getByRole('radio', { name: 'On the hill' }).click();
  const map = page.getByRole('img', { name: MAP_ALT });
  await expect(map).toBeVisible();
  expect(await map.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(new URL((await map.getAttribute('src'))!, page.url()).origin).toBe(new URL(page.url()).origin);

  // The reading, one part at a time.
  await expect(page.getByRole('heading', { name: 'Rivers give water and food' })).toBeVisible();
  await nextButton(page, 'Next: Part 2').click();
  await expect(page).toHaveURL(/\?part=2$/);
  await nextButton(page, 'Next: Part 3').click();
  await expect(page.getByRole('heading', { name: 'Rivers can also bring problems' })).toBeVisible();

  // The quick check.
  await nextButton(page, 'Next: Quick check').click();
  await expect(page.getByRole('heading', { name: 'Quick check' })).toBeFocused();
  await question(page, 0).getByRole('radio', { name: Q1.right }).click();
  await question(page, 1).getByRole('radio', { name: Q2_RIGHT }).click();
  await expect(page.locator('.tw-feedback-correct')).toHaveCount(2);
  await page.getByRole('textbox', { name: /most good things/ }).fill('The River site has water and fertile land.');

  // Write: the example stays hidden until there is writing; a starter goes in at the caret.
  await nextButton(page, 'Continue to Write').click();
  await expect(page).toHaveURL(/\/write$/);
  await expect((await lessonSteps(page)).getByRole('link', { name: /^Read.*done/i })).toBeVisible();
  await expect(page.getByText('building houses on tall legs', { exact: false })).toHaveCount(0);
  const answer = page.getByRole('textbox', { name: 'Your answer' });
  await answer.fill('Rivers matter.');
  await answer.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 0));
  await answer.press('ArrowLeft');
  // The starters wait under "Need help writing?".
  await openHelp(page, 'Need help writing?');
  await page.getByRole('button', { name: 'One reason is...' }).click();
  await expect(answer).toBeFocused();
  await page.keyboard.type('boats can carry goods. ');
  await expect(answer).toHaveValue('One reason is boats can carry goods. Rivers matter.');
  await page.getByText('Compare with an example answer').click();
  await expect(page.getByText('This is one way to answer. Yours can be different.')).toBeVisible();
  await openHelp(page, 'Check your answer');
  await page.getByRole('checkbox', { name: 'I named one place.' }).check();
  await expect.poll(async () => (await storedProgress(page, L10.id))?.writing.selfCheck[0]).toBe(true);

  // A reload brings everything back.
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue(
    'One reason is boats can carry goods. Rivers matter.',
  );
  await expect(page.getByRole('checkbox', { name: 'I named one place.' })).toBeChecked();
  await expect(page.getByText('This is one way to answer. Yours can be different.')).toBeVisible();

  // Speak: Continue marks it done.
  await nextButton(page, 'Continue to Speak').click();
  await expect(page.getByRole('heading', { name: 'With a partner' })).toBeVisible();
  await nextButton(page, 'Continue to Watch').click();
  await expect.poll(async () => (await storedProgress(page, L10.id))?.stagesDone).toContain('speak');

  // Watch: the written version, and nothing from YouTube or Google.
  await expect(page).toHaveURL(/\/watch$/);
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Read instead' }).click();
  await expect(page.getByRole('heading', { name: 'Key points' })).toBeVisible();
  await page.getByRole('textbox', { name: /Tigris and Euphrates/ }).fill('The rivers gave water for farms.');

  // Reflect: the required prompt finishes the lesson.
  await nextButton(page, 'Continue to Reflect').click();
  const finish = nextButton(page, 'Finish lesson');
  await expect(finish).toBeDisabled();
  await page.getByRole('textbox', { name: /good for a town/ }).fill('It has water and fertile land.');
  await finish.click();

  await expect(page).toHaveURL(/\/complete$/);
  await expect(page.locator('h1')).toHaveText('You finished Lesson 10.');
  await expect(page.getByText('How do maps help us understand a place?')).toBeVisible();
  const done = await storedProgress(page, L10.id);
  expect(done?.stagesDone.slice().sort()).toEqual(['read', 'reflect', 'speak', 'watch', 'write']);
  expect(done?.completedAt).toBeTruthy();
  expect(done).toMatchObject({
    warmUpAnswer: 'On the hill',
    speak: { practisedHow: null },
    watch: { readInstead: true, afterAnswer: 'The rivers gave water for farms.' },
  });
  // Answers are stored by their index in the content file, not the shuffled position.
  expect(done?.checkAnswers['0']).toMatchObject({ type: 'choice', selected: 0, correct: true });
  expect(done?.checkAnswers['1']).toMatchObject({ type: 'choice', selected: 2, correct: true });

  // The course map shows it complete.
  await page.goto('/course');
  const row = page.getByRole('link', { name: /^Lesson 10:.*Completed\./ });
  await expect(row.locator('.tw-row-status')).toHaveText('Done');

  expect(requests.filter((url) => VIDEO_HOSTS.test(new URL(url).hostname))).toEqual([]);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('switching the reading level changes the text and is remembered for the learner', async ({ page }) => {
  await addLearnerViaUi(page, 'Reza');
  await page.goto(L10.path('read'));
  await expect(levelButton(page, 'Standard')).toHaveAttribute('aria-pressed', 'true');
  const standard = await page.locator('.tw-reading-text').innerText();

  await levelButton(page, 'Simpler').click();
  await expect(levelButton(page, 'Simpler')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Read · 1 of 3 · Simpler English')).toBeVisible();
  expect(await page.locator('.tw-reading-text').innerText()).not.toBe(standard);
  // Glossary words are marked in the simpler version too.
  await expect(page.locator('.tw-reading .tw-term').first()).toBeVisible();

  // It stays on for the next part, and after a reload.
  await nextButton(page, 'Next: Part 2').click();
  await expect(page.getByText('Read · 2 of 3 · Simpler English')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Read · 2 of 3 · Simpler English')).toBeVisible();
  await expect(levelButton(page, 'Simpler')).toHaveAttribute('aria-pressed', 'true');

  await levelButton(page, 'Standard').click();
  await expect(page.getByText(/Simpler English/)).toHaveCount(0);
});

test('a quick check answer can be retried: "Not quite" in burnt orange, then correct in teal', async ({ page }) => {
  await page.goto(`${L10.path('read')}?part=check`);
  await expect(page.getByRole('heading', { name: 'Quick check' })).toBeVisible();

  await question(page, 0).getByRole('radio', { name: Q1.wrong }).click();
  const retry = question(page, 0).locator('.tw-feedback-retry');
  await expect(retry).toContainText('Not quite yet');
  await expect(retry).toContainText('Read the first section again.');
  await expect(retry.locator('.tw-feedback-title')).toHaveCSS('color', RETRY);

  await question(page, 0).getByRole('button', { name: 'Try again' }).click();
  await expect(retry).toHaveCount(0);
  await question(page, 0).getByRole('radio', { name: Q1.right }).click();
  const correct = question(page, 0).locator('.tw-feedback-correct');
  await expect(correct).toContainText('Correct');
  await expect(correct.locator('.tw-feedback-title')).toHaveCSS('color', CORRECT);
});

test('look-around saves nothing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Just look around (nothing is saved)' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Explore the course' })).toBeVisible();
  // Look-around lives in memory, so reach the lesson by client-side links.
  const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Course' }).click();
  await page.getByRole('region', { name: 'Geography & Our Environment' }).getByRole('button', { name: 'Show 5 lessons' }).click();
  await page.getByRole('link', { name: /^Lesson 10:/ }).click();
  await expect(page.locator('h1')).toHaveText(L10.title);

  // Something from every kind of save: a choice, the reading level, a check, typing, a tick, the finish.
  await page.getByRole('radio', { name: 'Near the river' }).click();
  await levelButton(page, 'Simpler').click();
  await nextButton(page, 'Next: Part 2').click();
  await nextButton(page, 'Next: Part 3').click();
  await nextButton(page, 'Next: Quick check').click();
  await question(page, 0).getByRole('radio', { name: Q1.right }).click();
  await nextButton(page, 'Continue to Write').click();
  // Said once, in the lesson's head.
  await expect(page.getByText("You're looking around: nothing is saved")).toBeVisible();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('Near the river.');
  await openHelp(page, 'Check your answer');
  await page.getByRole('checkbox', { name: 'I named one place.' }).check();
  await (await lessonSteps(page)).getByRole('link', { name: /^Reflect/ }).click();
  await page.getByRole('textbox', { name: /good for a town/ }).fill('Water.');
  await nextButton(page, 'Finish lesson').click();
  await expect(page.locator('h1')).toHaveText('You finished Lesson 10.');

  // The answers are kept for the visit...
  await (await lessonSteps(page)).getByRole('link', { name: /^Write/ }).click();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('Near the river.');

  // ...but nothing is written to the device.
  const dump = await dumpEverything(page);
  for (const store of ['learners', 'progress', 'quizAttempts', 'recordings', 'settings', 'device']) {
    expect(dump.stores[store] ?? [], store).toEqual([]);
  }
  expect(dump.localStorageLength).toBe(0);
});

test("a guest's writing is kept, on the same step, when they choose to save it", async ({ page }) => {
  await page.goto(L10.path('write'));
  await expect(page.getByText('Nothing is saved yet')).toBeVisible();
  // Nothing done yet: the head offers to choose who's learning.
  await expect(page.getByRole('button', { name: "Choose who's learning" })).toBeVisible();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('Near the river, for water.');
  await page.getByRole('button', { name: 'Save my work' }).click();

  await expect(page.getByText("Tap your name, or I'm new here, to keep your work from Lesson 10.")).toBeVisible();
  await page.getByRole('button', { name: "I'm new here" }).click();
  await page.getByLabel('First name or nickname').fill('Amina');
  await page.getByRole('button', { name: 'Save and go back to Lesson 10' }).click();

  await expect(page).toHaveURL(/\/lesson\/towns-near-rivers\/write$/);
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('Near the river, for water.');
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await expect.poll(async () => (await storedProgress(page, L10.id))?.writing.text).toBe('Near the river, for water.');
});
