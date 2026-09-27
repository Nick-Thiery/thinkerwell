import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { walkTour } from './pageTour';

// Phase 8: axe (WCAG 2.2 A and AA, plus axe's best practices) and a focus
// ring check on every kind of page (e2e/pageTour.ts), on a phone and on a
// laptop, since the header, the lesson steps and the menus change between
// the two. Tagged @own-size: it sets its own sizes, so it runs in the laptop
// project only.

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

/**
 * Every focusable control whose focus ring has less than 3:1 contrast with
 * the ground around it (WCAG 1.4.11). axe doesn't check focus rings. Each
 * control is focused in turn, after a key press so the browser treats it
 * as keyboard focus (:focus-visible), and its outline colour is compared
 * with the first solid background behind it (the control's own, when the
 * ring is drawn inside it).
 */
async function weakFocusRings(page: Page): Promise<string[]> {
  await page.keyboard.press('Shift');
  return page.evaluate(() => {
    type Rgb = [number, number, number];
    const parse = (colour: string): { rgb: Rgb; alpha: number } | null => {
      const parts = /rgba?\(([^)]+)\)/.exec(colour)?.[1]?.split(/[\s,/]+/).filter(Boolean).map(Number);
      return parts && parts.length >= 3 ? { rgb: [parts[0]!, parts[1]!, parts[2]!], alpha: parts[3] ?? 1 } : null;
    };
    const luminance = ([r, g, b]: Rgb) => {
      const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const groundOf = (start: Element | null): Rgb => {
      for (let el = start; el; el = el.parentElement) {
        const bg = parse(getComputedStyle(el).backgroundColor);
        if (bg && bg.alpha > 0.5) return bg.rgb;
      }
      return [255, 255, 255];
    };
    const weak: string[] = [];
    const controls = document.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    for (const el of controls) {
      if (el.offsetParent === null) continue;
      el.focus({ preventScroll: true });
      if (document.activeElement !== el) continue;
      const style = getComputedStyle(el);
      const ring = parse(style.outlineColor);
      if (style.outlineStyle === 'none' || !ring) {
        if (style.boxShadow === 'none') weak.push(`no focus ring: ${el.outerHTML.slice(0, 120)}`);
        continue;
      }
      const ground = groundOf(parseFloat(style.outlineOffset) < 0 ? el : el.parentElement);
      const [light, dark] = [luminance(ring.rgb), luminance(ground)].sort((a, b) => b - a);
      const ratio = (light! + 0.05) / (dark! + 0.05);
      if (ratio < 3) weak.push(`${ratio.toFixed(2)}:1 ring on rgb(${ground.join(', ')}): ${el.outerHTML.slice(0, 120)}`);
    }
    (document.activeElement as HTMLElement | null)?.blur();
    return weak;
  });
}

const SIZES = [
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'laptop', viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
];

for (const size of SIZES) {
  test.describe(`on a ${size.name}`, () => {
    test.use({ viewport: size.viewport, isMobile: size.isMobile, hasTouch: size.hasTouch });

    test(`axe and the focus ring check find nothing on any page (${size.viewport.width}px)`, { tag: '@own-size' }, async ({ page }) => {
      test.setTimeout(180_000);
      await walkTour(page, async (stop) => {
        const violations = await axeViolations(page);
        expect.soft(violations, `${stop.name}:\n${violations.join('\n')}`).toEqual([]);
        const rings = await weakFocusRings(page);
        expect.soft(rings, `${stop.name}: focus rings`).toEqual([]);
      });
    });
  });
}
