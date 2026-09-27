import { expect, test, type Page } from '@playwright/test';
import { L10, watchErrors } from './lessonHelpers';

// Turning a tablet round (820x1180 to 1180x820) or resizing a laptop window
// crosses the 1100px line where the lesson's side column appears. The stage
// must stay mounted across it: a playing video, Write's help mode, an open
// glossary popover and keyboard focus all survive. Run once, in the tablet
// project, which starts at 820x1180 with touch.

test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only.');

/** Each test starts from the tablet project's 820x1180 and turns it round, so it runs there only. */
function tabletOnly() {
  test.skip(test.info().project.name !== 'tablet', 'Starts from the tablet size and turns it round.');
}

const PORTRAIT = { width: 820, height: 1180 };
const LANDSCAPE = { width: 1180, height: 820 };

/** A stand-in for YouTube's embed, so nothing leaves the machine. */
async function fakePlayer(page: Page) {
  await page.route(/youtube-nocookie\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><p>Player</p>' }),
  );
}

/** Tags the element so a remount (a fresh element) can be told apart from the same one. */
async function tag(page: Page, selector: string) {
  await page.locator(selector).first().evaluate((el) => {
    (el as HTMLElement).dataset.rotateTag = 'kept';
  });
}

test('turning a tablet round keeps the video playing', async ({ page }) => {
  tabletOnly();
  const errors = watchErrors(page);
  await fakePlayer(page);
  await page.goto(L10.path('watch'));
  await expect(page.locator('h1')).toHaveText(L10.title);
  await page.getByRole('button', { name: 'Watch the video' }).click();
  await expect(page.locator('iframe')).toHaveCount(1);
  await tag(page, 'iframe');

  await page.setViewportSize(LANDSCAPE);
  // The side column is there now: the StagePath is vertical.
  await expect(page.locator('.tw-lesson-path-vertical')).toBeVisible();
  await expect(page.locator('iframe[data-rotate-tag="kept"]')).toHaveCount(1);

  await page.setViewportSize(PORTRAIT);
  await expect(page.locator('.tw-lesson-path-horizontal')).toBeVisible();
  await expect(page.locator('iframe[data-rotate-tag="kept"]')).toHaveCount(1);

  // A laptop window narrowed past the line.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(page.locator('iframe[data-rotate-tag="kept"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("turning a tablet round keeps Write's help mode and the focus", async ({ page }) => {
  tabletOnly();
  await page.goto(L10.path('write'));
  await expect(page.locator('h1')).toHaveText(L10.title);
  const plan = page.getByRole('button', { name: 'Plan first' });
  await plan.click();
  await expect(plan).toHaveAttribute('aria-pressed', 'true');
  await plan.focus();
  await expect(plan).toBeFocused();

  await page.setViewportSize(LANDSCAPE);
  await expect(page.locator('.tw-lesson-path-vertical')).toBeVisible();
  await expect(plan).toHaveAttribute('aria-pressed', 'true');
  await expect(plan).toBeFocused();

  await page.setViewportSize(PORTRAIT);
  await expect(page.locator('.tw-lesson-path-horizontal')).toBeVisible();
  await expect(plan).toHaveAttribute('aria-pressed', 'true');
  await expect(plan).toBeFocused();
});

test('turning a tablet round keeps an open glossary popover open', async ({ page }) => {
  tabletOnly();
  await page.goto(L10.path('read'));
  await expect(page.locator('h1')).toHaveText(L10.title);
  await page.locator('.tw-reading .tw-term').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.setViewportSize(LANDSCAPE);
  await expect(page.locator('.tw-lesson-path-vertical')).toBeVisible();
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
