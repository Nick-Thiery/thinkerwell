import { expect, test, type Page } from '@playwright/test';
import { L10, nextButton } from './lessonHelpers';
import { walkTour } from './pageTour';

// Phase 8: the production build in right to left (Dari/Farsi and Arabic come
// later). The ?dir=rtl switch only works in development, so this forces
// dir="rtl" on <html> before the app starts and keeps it there whatever the
// app sets. The text stays English, so punctuation lands at the "wrong" end;
// that is expected until the text is translated.
//
// Every kind of page (e2e/pageTour.ts) must keep right to left, never be
// wider than the screen, and mirror the icons that point along the reading
// direction. The layout itself is checked on the lesson page. Tagged
// @own-size: it sets its own sizes, so it runs in the laptop project only.

async function forceRightToLeft(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const dir = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'dir')!;
    Object.defineProperty(HTMLElement.prototype, 'dir', {
      configurable: true,
      get(this: HTMLElement) {
        return dir.get!.call(this) as string;
      },
      set(this: HTMLElement, value: string) {
        dir.set!.call(this, this === document.documentElement ? 'rtl' : value);
      },
    });
    new MutationObserver(() => {
      if (document.documentElement.getAttribute('dir') !== 'rtl') document.documentElement.setAttribute('dir', 'rtl');
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['dir'] });
  });
}

/** Icons on screen that point along the reading direction but aren't mirrored. */
async function unmirroredArrows(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.tw-icon-directional'))
      .filter((icon) => icon.getClientRects().length > 0)
      .filter((icon) => {
        const matrix = getComputedStyle(icon).transform;
        return !matrix.startsWith('matrix(-1');
      })
      .map((icon) => icon.parentElement?.outerHTML.slice(0, 100) ?? ''),
  );
}

const SIZES = [
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'laptop', viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
];

for (const size of SIZES) {
  test.describe(`right to left on a ${size.name}`, () => {
    test.use({ viewport: size.viewport, isMobile: size.isMobile, hasTouch: size.hasTouch });

    test(`every page stays right to left, fits the screen and mirrors its arrows (${size.viewport.width}px)`, { tag: '@own-size' }, async ({ page }) => {
      test.setTimeout(120_000);
      await forceRightToLeft(page);
      await walkTour(page, async (stop) => {
        const state = await page.evaluate(() => ({
          dir: document.documentElement.dir,
          direction: getComputedStyle(document.body).direction,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        expect.soft(state.dir, `${stop.name}: dir`).toBe('rtl');
        expect.soft(state.direction, `${stop.name}: direction`).toBe('rtl');
        expect.soft(state.overflow, `${stop.name}: wider than the screen`).toBeLessThanOrEqual(0);
        expect.soft(await unmirroredArrows(page), `${stop.name}: arrows not mirrored`).toEqual([]);
      });
    });
  });
}

test.describe('right to left: the lesson page reads from the right', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the logo, the lesson steps and the next button are on the mirrored side', { tag: '@own-size' }, async ({ page }) => {
    await forceRightToLeft(page);
    await page.goto(L10.path('read'));
    await expect(page.locator('h1')).toHaveText(L10.title);

    const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!;
    // The logo starts the header on the right; the navigation follows to its left.
    expect((await box('.tw-header .tw-logo, .tw-header a[aria-label="Thinkerwell home"]')).x).toBeGreaterThan((await box('.tw-nav')).x);
    // The lesson steps (the side column) are on the right of the reading column.
    expect((await box('.tw-stages-vertical')).x).toBeGreaterThan((await box('.tw-reading')).x);
    // Read, the first step, is above Write in the vertical path (not reordered).
    const steps = page.getByRole('navigation', { name: 'Lesson steps' }).getByRole('link');
    expect((await steps.nth(0).boundingBox())!.y).toBeLessThan((await steps.nth(1).boundingBox())!.y);
    // Reading text starts at the right edge of its column.
    const align = await page.locator('.tw-reading-text').first().evaluate((el) => getComputedStyle(el).textAlign);
    expect(['start', 'right']).toContain(align);
    // "Next" points to the left, where the next part is; its arrow is mirrored.
    const next = nextButton(page, 'Next: Part 2');
    const arrow = next.locator('.tw-icon-directional');
    expect(await arrow.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^matrix\(-1/);
    // The arrow sits at the button's far (left) end, after the label.
    expect((await arrow.boundingBox())!.x).toBeLessThan((await next.locator('span').first().boundingBox())!.x);
  });

  test('arrow keys follow the reading direction in a row of chips', { tag: '@own-size' }, async ({ page }) => {
    await forceRightToLeft(page);
    await page.goto(L10.path('read'));
    const group = page.getByRole('radiogroup').first();
    const chips = group.getByRole('radio');
    await chips.first().focus();
    // The next chip sits to the left in right to left, so ArrowLeft moves to it.
    await page.keyboard.press('ArrowLeft');
    await expect(chips.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(chips.nth(0)).toBeFocused();
    expect((await chips.nth(1).boundingBox())!.x).toBeLessThan((await chips.nth(0).boundingBox())!.x);
  });
});
