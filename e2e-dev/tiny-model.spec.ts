import { expect, test, type Page } from '@playwright/test';

// Dev only (see playwright.dev.config.ts): the "train a tiny model" prototype
// at /dev/tiny-model (src/dev/tiny-model). Walks Digital World Lesson 2's
// rounds labelling like the gardener (4 of 6, 6 of 6, 0 of 2, 8 of 8, as in
// drafts/digital-world/DW02.json), part of it by keyboard, then changes a
// label in free play. Checks the page never asks another server for anything.

async function label(page: Page, description: string, choice: 'Healthy' | 'Sick') {
  await page.getByRole('group', { name: `Label for: ${description}` }).getByRole('button', { name: choice }).click();
}

const score = (page: Page) => page.getByTestId('tw-tm-score');
const train = (page: Page) => page.getByRole('button', { name: 'Train the model' });

test('trains, improves with more examples, fails on a new plant, then gets it right', async ({ page, baseURL }, testInfo) => {
  const otherHosts: string[] = [];
  const ownOrigin = new URL(baseURL ?? 'http://localhost').origin;
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    if (new URL(url).origin !== ownOrigin) otherHosts.push(url);
  });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/dev/tiny-model');
  // A cold Vite dependency cache can reload the page once; give it room.
  await expect(page.getByRole('heading', { level: 1, name: 'Train the leaf model' })).toBeVisible({ timeout: 20_000 });

  // Round 1: nothing to train on until both leaves are sorted.
  await expect(train(page)).toBeDisabled();
  await expect(page.getByText('Sort 2 more leaves to train the model.')).toBeVisible();

  // Sort the first leaf with the keyboard. It moves to the Healthy group and
  // keeps focus on its pressed label.
  await page.getByRole('group', { name: 'Label for: Big dark green leaf' }).getByRole('button', { name: 'Healthy' }).focus();
  await page.keyboard.press('Space');
  const healthyGroup = page.getByRole('region', { name: 'Healthy examples' });
  await expect(healthyGroup.getByRole('article', { name: 'Big dark green leaf' })).toBeVisible();
  await expect(page.locator(':focus')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(':focus')).toHaveText('Healthy');

  // The second by keyboard too: Tab back to Sick on the brown leaf's card.
  await page.getByRole('group', { name: 'Label for: Brown leaf with spots' }).getByRole('button', { name: 'Sick' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Sick examples' }).getByRole('article', { name: 'Brown leaf with spots' })).toBeVisible();

  await expect(train(page)).toBeEnabled();
  await train(page).focus();
  await page.keyboard.press('Enter');
  await expect(score(page)).toContainText('The model got 4 of 6 right.');
  await expect(page.getByTestId('tw-tm-announcer')).toContainText('The model got 4 of 6 right.');
  await expect(page.locator(':focus')).toHaveText('The model’s guesses');
  // Each guess shows the example it looked most like.
  await expect(page.getByText('It looked most like this example, so the model said sick.').first()).toBeVisible();
  await expect(page.getByText('Not quite')).toHaveCount(2);

  // Round 2: four more, different examples.
  await page.getByRole('button', { name: 'Next: add more examples' }).click();
  await expect(page.locator(':focus')).toHaveText('Round 2: more, different examples');
  await label(page, 'Small new leaf, light green', 'Healthy');
  await label(page, 'Yellow leaf with no spots', 'Sick');
  await label(page, 'Green leaf with a few tiny marks', 'Healthy');
  await label(page, 'Small leaf with many spots', 'Sick');
  await train(page).click();
  await expect(score(page)).toContainText('The model got 6 of 6 right.');

  // A new plant: no new examples, and the model gets both wrong.
  await page.getByRole('button', { name: 'Next: try a new plant' }).click();
  await page.getByRole('button', { name: 'Test the new leaves' }).click();
  await expect(score(page)).toContainText('The model got 0 of 2 right.');

  if (process.env.TINY_MODEL_SCREENSHOT_DIR) {
    // Not a check: screenshots for the pull request, only when asked for.
    await page.locator('#tw-tm-results-title').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({
      path: `${process.env.TINY_MODEL_SCREENSHOT_DIR}/tiny-model-${testInfo.project.name === 'phone' ? 390 : 1280}.png`,
      fullPage: false,
    });
  }

  // Round 3: add the new plant.
  await page.getByRole('button', { name: 'Next: add the new plant' }).click();
  await label(page, 'Long thin leaf with pale stripes', 'Healthy');
  await label(page, 'Long thin brown leaf with spots', 'Sick');
  await train(page).click();
  await expect(score(page)).toContainText('The model got 8 of 8 right.');

  const history = page.getByTestId('tw-tm-history').getByRole('listitem');
  await expect(history).toHaveText([/Round 1.*4 of 6/, /Round 2.*6 of 6/, /A new plant.*0 of 2/, /Round 3.*8 of 8/]);

  // Free play: the model follows the learner's labels.
  await page.getByRole('button', { name: 'Next: try it yourself' }).click();
  await label(page, 'Big dark green leaf', 'Sick');
  await page.getByRole('button', { name: 'Take out: Long thin leaf with pale stripes' }).click();
  await expect(page.getByRole('region', { name: 'Not used' }).getByRole('article', { name: 'Long thin leaf with pale stripes' })).toBeVisible();
  await train(page).click();
  await expect(score(page)).not.toContainText('8 of 8');
  await expect(page.getByRole('region', { name: 'The model’s guesses' }).getByText('The model learned your labels, so its guesses follow them.')).toBeVisible();
  // Changing a label again asks for training again.
  await label(page, 'Big dark green leaf', 'Healthy');
  await expect(score(page)).toHaveCount(0);
  await expect(page.getByTestId('tw-tm-announcer')).toContainText('Train the model again');

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll, `sideways scroll at ${testInfo.project.name}`).toBe(false);
  expect(otherHosts, 'requests to other hosts').toEqual([]);
  expect(pageErrors, 'uncaught page errors').toEqual([]);
});

test('every control is at least 44px and has a name', async ({ page }) => {
  await page.goto('/dev/tiny-model');
  await expect(page.getByRole('heading', { level: 1, name: 'Train the leaf model' })).toBeVisible({ timeout: 20_000 });
  const problems = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.tw-tm button, .tw-tm summary')]
      .map((el) => {
        const box = el.getBoundingClientRect();
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
        return { name, height: Math.round(box.height), width: Math.round(box.width) };
      })
      .filter((c) => !c.name || c.height < 44 || c.width < 44),
  );
  expect(problems).toEqual([]);
});
