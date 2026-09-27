import { expect, test, type Page } from '@playwright/test';

// Every route and three lessons (the first, lesson 10 and the last) against a
// production build: one h1, English left to right, and no sideways scroll at
// any of the three widths.
const pages: Array<[path: string, heading: string]> = [
  ['/', "Who's learning today?"],
  ['/course', 'Exploring Our World'],
  ['/journal', 'My journal'],
  ['/educators', 'For educators'],
  ['/about', 'About Thinkerwell'],
  ['/section/history/check', 'Section check: History & Human Stories'],
  ['/lesson/finding-out-about-the-past/read', 'Lesson 1: Read'],
  ['/lesson/towns-near-rivers/read', 'Lesson 10: Read'],
  ['/lesson/towns-near-rivers/watch', 'Lesson 10: Watch'],
  ['/lesson/towns-near-rivers/complete', 'Lesson 10: Lesson complete'],
  ['/lesson/young-people-contribute/reflect', 'Lesson 24: Reflect'],
];

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/**
 * Below about 1100px wide, SiteHeader hides the five nav links behind a menu
 * button (see src/app/useIsCompactHeader.ts) and shows them inside the phone
 * navigation sheet instead. Open it first when it's there, so the tests below
 * work the same way at every width Playwright runs them at.
 */
async function openMobileNavIfPresent(page: Page): Promise<void> {
  const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
  if (await menuButton.isVisible()) await menuButton.click();
}

for (const [path, heading] of pages) {
  test(`${path} has one h1, lang and dir, and no horizontal scroll`, async ({ page }) => {
    await page.goto(path);
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(heading);
    await expect(page).toHaveTitle(`${heading} · Thinkerwell`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
}

test.describe('old Base44 URLs', () => {
  test('/lesson/l6 redirects to /lesson/towns-near-rivers/read', async ({ page }) => {
    await page.goto('/lesson/l6');
    await expect(page).toHaveURL(/\/lesson\/towns-near-rivers\/read$/);
    await expect(page.locator('h1')).toHaveText('Lesson 10: Read');
  });

  test('/lesson/history-scale/watch redirects keeping the stage', async ({ page }) => {
    await page.goto('/lesson/history-scale/watch');
    await expect(page).toHaveURL(/\/lesson\/changing-scale\/watch$/);
    await expect(page.locator('h1')).toHaveText('Lesson 3: Watch');
  });

  test('/lesson/l6?preview=true keeps the query', async ({ page }) => {
    await page.goto('/lesson/l6?preview=true');
    await expect(page).toHaveURL(/\/lesson\/towns-near-rivers\/read\?preview=true$/);
    await expect(page.locator('h1')).toHaveText('Lesson 10: Read');
  });

  test('/lesson/:id redirects to Read', async ({ page }) => {
    await page.goto('/lesson/young-people-contribute');
    await expect(page).toHaveURL(/\/lesson\/young-people-contribute\/read$/);
  });

  test('/courses and /onboarding redirect', async ({ page }) => {
    await page.goto('/courses');
    await expect(page).toHaveURL(/\/course$/);
    await expect(page.locator('h1')).toHaveText('Exploring Our World');
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toHaveText("Who's learning today?");
  });

  test('Back after a redirect does not bounce into it again', async ({ page }) => {
    await page.goto('/about');
    await page.goto('/lesson/l6');
    await expect(page).toHaveURL(/\/lesson\/towns-near-rivers\/read$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/about$/);
  });
});

test.describe('not found', () => {
  for (const path of ['/whatever', '/lesson/nope/read', '/lesson/towns-near-rivers/quiz', '/section/nope/check']) {
    test(`${path} shows the friendly 404 with ways back`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText("We can't find that page");
      const main = page.locator('main');
      await expect(main.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/');
      await expect(main.getByRole('link', { name: 'See the course' })).toHaveAttribute('href', '/course');
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

      await main.getByRole('link', { name: 'See the course' }).click();
      await expect(page).toHaveURL(/\/course$/);
      await expect(page.locator('h1')).toHaveText('Exploring Our World');
    });
  }
});

test.describe('keyboard', () => {
  test('Tab first reaches the skip link, and Enter moves focus into main', async ({ page }) => {
    await page.goto('/course');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    // Visible while focused (it slides in from above the page).
    await expect(skip).toBeInViewport();

    await page.keyboard.press('Enter');
    const focusInMain = await page.evaluate(() => {
      const main = document.querySelector('main');
      return !!main && !!document.activeElement && main.contains(document.activeElement);
    });
    expect(focusInMain).toBe(true);

    // The next Tab goes on from main, not back to the top of the page.
    await page.keyboard.press('Tab');
    const inHeader = await page.evaluate(() => {
      const header = document.querySelector('header');
      const active = document.activeElement;
      return !!header && !!active && header.contains(active);
    });
    expect(inHeader).toBe(false);
  });

  test('every nav link shows a visible outline when focused with the keyboard', async ({ page }) => {
    await page.goto('/');
    await openMobileNavIfPresent(page);
    const links = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
    const count = await links.count();
    expect(count).toBe(5);

    // Tab forward until the first nav link has focus (right after the skip
    // link and logo on the full header; right after the sheet's own close
    // button on the phone one), then step through the rest of them.
    for (let i = 0; i < 20; i++) {
      if (await links.first().evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      await expect(link).toBeFocused();
      const outline = await link.evaluate((el) => {
        const style = getComputedStyle(el);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
      });
      expect(outline.style).not.toBe('none');
      expect(outline.width).toBeGreaterThanOrEqual(2);
      await page.keyboard.press('Tab');
    }
  });

  test('following a nav link moves focus to the new page heading', async ({ page }) => {
    await page.goto('/');
    await openMobileNavIfPresent(page);
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator('h1')).toBeFocused();
    await expect(page.locator('h1')).toHaveText('About Thinkerwell');
  });

  test('nav links are at least 44px tall', async ({ page }) => {
    await page.goto('/');
    await openMobileNavIfPresent(page);
    const links = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
    for (const box of await links.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  });
});

test('the dev right-to-left switch does nothing in a production build', async ({ page }) => {
  await page.goto('/?dir=rtl');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});
