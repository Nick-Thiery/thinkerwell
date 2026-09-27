import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { walkTour } from './pageTour';

// Phase 8: axe (WCAG 2.2 A and AA, plus axe's best practices) on every kind
// of page (e2e/pageTour.ts), on a phone and on a laptop, since the header,
// the lesson steps and the menus change between the two. Tagged @own-size:
// it sets its own sizes, so it runs in the laptop project only.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'];

async function axeViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'no impact given'}): ${violation.help}\n` +
      violation.nodes
        .slice(0, 5)
        .map((node) => `    ${node.target.join(' ')}\n      ${node.failureSummary?.replace(/\n/g, '\n      ') ?? ''}`)
        .join('\n'),
  );
}

const SIZES = [
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'laptop', viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
];

for (const size of SIZES) {
  test.describe(`on a ${size.name}`, () => {
    test.use({ viewport: size.viewport, isMobile: size.isMobile, hasTouch: size.hasTouch });

    test(`axe finds nothing on any page (${size.viewport.width}px)`, { tag: '@own-size' }, async ({ page }) => {
      test.setTimeout(180_000);
      await walkTour(page, async (stop) => {
        const violations = await axeViolations(page);
        expect.soft(violations, `${stop.name}:\n${violations.join('\n')}`).toEqual([]);
      });
    });
  });
}
