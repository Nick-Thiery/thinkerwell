import type { Page } from '@playwright/test';

// Shared by the no-sideways-scroll and language specs. Not a spec file
// itself: Playwright only runs *.spec.ts.

/** What sticks out past the right edge (or the left, in right to left): the deepest elements, so the cause is named. */
export async function overflowReport(page: Page): Promise<{ overflow: number; culprits: string[] }> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const width = root.clientWidth;
    const overflow = root.scrollWidth - width;
    if (overflow <= 0) return { overflow, culprits: [] };
    const describe = (el: Element) => {
      const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
      const box = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()}${cls} (${Math.round(box.left)} to ${Math.round(box.right)})`;
    };
    const outside = Array.from(document.body.querySelectorAll('*')).filter((el) => {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false;
      return box.right > width + 0.5 || box.left < -0.5;
    });
    // Only the deepest: drop any element that has an offending descendant.
    const deepest = outside.filter((el) => !outside.some((other) => other !== el && el.contains(other)));
    return { overflow, culprits: deepest.slice(0, 8).map(describe) };
  });
}
