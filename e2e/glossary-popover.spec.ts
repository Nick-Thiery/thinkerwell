import { expect, test, type Page } from '@playwright/test';

/**
 * A glossary word's definition popover must never make the page scroll
 * sideways, on a phone as much as anywhere (phase 2 bug: on mobile Chrome
 * the layout viewport widened to fit the popover before DefinitionCard
 * measured it against window.innerWidth).
 *
 * For every glossary word in each part of Lesson 10's reading, in both
 * reading levels (Simpler text puts words on different lines) and in
 * left-to-right and right-to-left, and in Lesson 11 (longer terms such as
 * "compass rose"): tap it, then check that the page is no wider than the
 * screen, the visual viewport hasn't changed, and the popover sits inside
 * [0, clientWidth], under its word.
 */
const READINGS = [
  { path: '/lesson/towns-near-rivers/read', name: 'Lesson 10', parts: [1, 2, 3], levels: ['Standard', 'Simpler'] },
  // Part 1 has no glossary words; part 2 has the most, including "compass rose".
  { path: '/lesson/maps-and-places/read', name: 'Lesson 11', parts: [2, 3], levels: ['Standard'] },
] as const;
const DIRECTIONS = ['ltr', 'rtl'] as const;
type Reading = (typeof READINGS)[number];
type Level = 'Standard' | 'Simpler';

// Eight page loads and a tap per word: more than the default 30s.
test.describe.configure({ timeout: 240_000 });

interface Measure {
  scrollWidth: number;
  innerWidth: number;
  clientWidth: number;
  visualWidth: number;
  scrollX: number;
  pop: { left: number; right: number; top: number } | null;
  word: { left: number; right: number; bottom: number } | null;
}

async function measure(page: Page): Promise<Measure> {
  return page.evaluate(() => {
    const pop = document.querySelector('.tw-def-float');
    const word = pop?.parentElement?.querySelector('.tw-term');
    const popRect = pop?.getBoundingClientRect();
    const wordRects = word ? Array.from(word.getClientRects()) : [];
    const firstLine = wordRects[0];
    const lastLine = wordRects[wordRects.length - 1];
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      visualWidth: window.visualViewport?.width ?? window.innerWidth,
      scrollX: window.scrollX,
      pop: popRect ? { left: popRect.left, right: popRect.right, top: popRect.top } : null,
      word: firstLine && lastLine ? { left: firstLine.left, right: firstLine.right, bottom: lastLine.bottom } : null,
    };
  });
}

async function openPart(page: Page, reading: Reading, part: number, level: Level, dir: (typeof DIRECTIONS)[number]) {
  await page.goto(`${reading.path}?part=${part}`);
  await expect(page.locator('.tw-reading .tw-term').first()).toBeVisible();
  if (level === 'Simpler') {
    const simpler = page.getByRole('group', { name: 'Reading level' }).getByRole('button', { name: 'Simpler' });
    await simpler.click();
    await expect(simpler).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.tw-reading-part')).toContainText('Simpler English');
    await expect(page.locator('.tw-reading .tw-term').first()).toBeVisible();
  }
  // ?dir=rtl only works in development, so set it directly: this also
  // works against a production build.
  await page.evaluate((direction) => {
    document.documentElement.dir = direction;
  }, dir);
}

async function checkEveryWord(page: Page, dir: (typeof DIRECTIONS)[number], tap: boolean) {
  const edges = { nearStart: false, nearEnd: false };
  const runs = READINGS.flatMap((reading) =>
    reading.levels.flatMap((level) => reading.parts.map((part) => ({ reading, level, part }))),
  );
  for (const { reading, level, part } of runs) {
    await openPart(page, reading, part, level, dir);
    const before = await measure(page);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    expect(before.scrollWidth).toBeLessThanOrEqual(before.innerWidth);

    const terms = page.locator('.tw-reading .tw-term');
    const count = await terms.count();
    expect(count, `${reading.name} part ${part} (${level}) marks glossary words`).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const term = terms.nth(index);
      await term.scrollIntoViewIfNeeded();
      const box = await term.boundingBox();
      if (box) {
        if (box.x < viewport!.width / 3) edges.nearStart = true;
        if (box.x + box.width > (viewport!.width * 2) / 3) edges.nearEnd = true;
      }
      if (tap) await term.tap();
      else await term.click();
      await expect(term).toHaveAttribute('aria-expanded', 'true');
      const popover = page.locator('.tw-def-float');
      await expect(popover).toBeVisible();

      const after = await measure(page);
      const where = `${dir} ${reading.name} part ${part} ${level} word ${index + 1} (${await term.textContent()})`;
      expect(after.scrollWidth, `${where}: page wider than the screen`).toBeLessThanOrEqual(after.innerWidth);
      expect(after.innerWidth, `${where}: layout viewport widened`).toBe(before.innerWidth);
      expect(after.visualWidth, `${where}: visual viewport changed`).toBe(before.visualWidth);
      expect(after.scrollX, `${where}: page scrolled sideways`).toBe(0);
      expect(after.pop, `${where}: popover`).not.toBeNull();
      expect(after.pop!.left, `${where}: popover past the left edge`).toBeGreaterThanOrEqual(0);
      expect(after.pop!.right, `${where}: popover past the right edge`).toBeLessThanOrEqual(after.clientWidth);
      // Still anchored: overlapping its word sideways, just under it.
      expect(Math.min(after.pop!.right, after.word!.right) - Math.max(after.pop!.left, after.word!.left)).toBeGreaterThan(0);
      expect(after.pop!.top - after.word!.bottom).toBeGreaterThanOrEqual(0);
      expect(after.pop!.top - after.word!.bottom).toBeLessThan(16);

      // Close it the way a learner would: its own close button.
      const close = popover.getByRole('button', { name: 'Close' });
      if (tap) await close.tap();
      else await close.click();
      await expect(term).toHaveAttribute('aria-expanded', 'false');
    }
  }
  // On a phone, the words tested reached both edges of the screen, which is
  // where the bug showed. (Wider screens centre the reading column.)
  if ((page.viewportSize()?.width ?? 0) < 600) expect(edges).toEqual({ nearStart: true, nearEnd: true });
}

test.describe('glossary popover on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

  for (const dir of DIRECTIONS) {
    test(`never makes the page scroll sideways (${dir})`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'phone', 'Phone emulation: runs once, in the phone project.');
      await checkEveryWord(page, dir, true);
    });
  }
});

test.describe('glossary popover at this project’s width', () => {
  for (const dir of DIRECTIONS) {
    test(`stays on screen (${dir})`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'phone', 'The phone project runs the phone-emulation test above.');
      await checkEveryWord(page, dir, !!testInfo.project.use.hasTouch);
    });
  }
});
