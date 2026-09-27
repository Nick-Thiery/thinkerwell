import { expect, test, type Page } from '@playwright/test';
import { walkTour } from './pageTour';

// Phase 8: every tap target is at least 44 by 44px (CLAUDE.md rule 5), on
// every kind of page (e2e/pageTour.ts), on a phone and a tablet. Links
// inside a sentence are the one exception (WCAG 2.5.8 "inline"): they are
// as tall as the line they sit in, and making them bigger would break the
// text apart. Glossary words in the reading are such inline targets too
// (and their ::before already stretches the tappable area to 44px tall).
// Tagged @own-size: it sets its own sizes, so it runs in the laptop project.

const MIN = 44;

async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate((min) => {
    const selector = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="radio"], [role="checkbox"], [role="link"], [tabindex]:not([tabindex="-1"])';
    const small: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      // A checkbox or radio inside its label: the label is the target.
      const label = el.closest('label');
      const target = label && el.tagName === 'INPUT' ? label.getBoundingClientRect() : box;
      // Inline in running text (WCAG 2.5.8 exception): an inline element whose
      // paragraph (the nearest block around it) holds other words too.
      let block = el.parentElement;
      while (block && getComputedStyle(block).display.startsWith('inline')) block = block.parentElement;
      const inline =
        getComputedStyle(el).display.startsWith('inline') &&
        (block?.textContent?.trim().length ?? 0) > (el.textContent?.trim().length ?? 0) + 20;
      if (inline) continue;
      if (target.width + 0.5 < min || target.height + 0.5 < min) {
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
        small.push(`${Math.round(target.width)}x${Math.round(target.height)} <${el.tagName.toLowerCase()} class="${el.className}"> ${name}`);
      }
    }
    return small;
  }, MIN);
}

const SIZES = [
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true },
  { name: 'tablet', viewport: { width: 820, height: 1180 }, isMobile: false },
];

for (const size of SIZES) {
  test.describe(`on a ${size.name}`, () => {
    test.use({ viewport: size.viewport, isMobile: size.isMobile, hasTouch: true });

    test(`every tap target is at least ${MIN}px (${size.viewport.width}px)`, { tag: '@own-size' }, async ({ page }) => {
      test.setTimeout(120_000);
      await walkTour(page, async (stop) => {
        const small = await smallTargets(page);
        expect.soft(small, `${stop.name}:\n${small.join('\n')}`).toEqual([]);
      });
    });
  });
}
