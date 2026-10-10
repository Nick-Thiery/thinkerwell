import { expect, test, type Page } from '@playwright/test';
import { FINISH_ANSWER, L10, recordRequests } from './lessonHelpers';
import { overflowReport } from './overflow';
import { TOUR_LEARNER, TOUR_REFLECTION, TOUR_WRITING, tourText, walkTour } from './pageTour';
import type { TestLocale } from './uiText';

// Ready for other languages (CLAUDE.md rule 7, docs/notes/languages.md).
//
// Every kind of page (e2e/pageTour.ts) in the two test languages that the
// build makes from en.json (src/i18n/pseudo.ts), at 390px:
//  - en-XA (every letter accented, every word longer, each message in ⟦ ⟧):
//    all interface text must be pseudo-localised. Plain English outside the
//    course text (anything under lang="en") was left in the code instead of
//    en.json. Nothing may be wider than the screen, and no text may be cut
//    off.
//  - ar-XB (right to left): the page must stay right to left and fit the
//    screen.
// The test languages open with ?locale= in a browser driven by tests only
// (src/i18n/devLocale.ts). Tagged @own-size: they set their own size.

/** Text the tour's learner typed, or their name: theirs, in whatever language. */
const LEARNER_TEXT = [TOUR_LEARNER, TOUR_WRITING, TOUR_REFLECTION, FINISH_ANSWER];

/**
 * Interface text on screen that isn't pseudo-localised: visible text, and
 * the aria-label, placeholder, title and alt of anything on screen, outside
 * course text (the nearest lang attribute says "en") and outside
 * translate="no" (the wordmark). With every letter of every en.json
 * message accented, any plain ASCII letter left is English from the code.
 */
async function untranslated(page: Page): Promise<string[]> {
  return page.evaluate((learnerText) => {
    const problems = new Set<string>();
    // Course text (lang="en"), and a language's own name in the language
    // choice (lang="id" on "Indonesia"): in another language on purpose.
    const pageLang = document.documentElement.lang.toLowerCase();
    const isCourseText = (el: Element) => {
      const lang = el.closest('[lang]')?.getAttribute('lang')?.toLowerCase() ?? '';
      return lang === 'en' || (lang !== pageLang && !lang.endsWith('-xa') && !lang.endsWith('-xb'));
    };
    const skipped = (el: Element) => el.closest('script, style, noscript, template, [translate="no"]') !== null;
    const withoutLearnerText = (text: string) => learnerText.reduce((rest, typed) => rest.split(typed).join(''), text);
    const describe = (el: Element) => {
      const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
      return `${el.tagName.toLowerCase()}${cls}`;
    };
    const english = (text: string) => /[A-Za-z]/.test(withoutLearnerText(text));

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || skipped(el) || isCourseText(el) || !el.checkVisibility({ visibilityProperty: true })) continue;
      const text = node.textContent ?? '';
      if (english(text)) problems.add(`${describe(el)}: "${text.trim().slice(0, 90)}"`);
    }
    // An attribute can't mark part of itself as English, so one that is a
    // whole en.json message (wrapped in ⟦ ⟧) may hold course text in its
    // {placeholders} ("Lesson 3: {title}").
    const wholeMessage = (value: string) => value.startsWith('⟦') && value.endsWith('⟧');
    for (const el of document.body.querySelectorAll('[aria-label], [placeholder], [title], img[alt]')) {
      if (skipped(el) || isCourseText(el) || !el.checkVisibility({ visibilityProperty: true })) continue;
      for (const attribute of ['aria-label', 'placeholder', 'title', 'alt']) {
        const value = el.getAttribute(attribute);
        if (value && !wholeMessage(value) && english(value)) problems.add(`${describe(el)} [${attribute}]: "${value.slice(0, 90)}"`);
      }
    }
    return [...problems];
  }, LEARNER_TEXT);
}

/** Interface text cut off at its end: an element that hides what doesn't fit and has more than fits. */
async function cutOff(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.body.querySelectorAll('*'))
      .filter((el) => {
        if (!(el instanceof HTMLElement) || el.closest('[lang="en"]') || !el.checkVisibility()) return false;
        if (![...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())) return false;
        const style = getComputedStyle(el);
        const hides = ['hidden', 'clip'].includes(style.overflowX) || style.textOverflow === 'ellipsis';
        // Screen-reader-only text is 1px wide on purpose.
        return hides && el.clientWidth > 1 && el.scrollWidth > el.clientWidth + 1;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className}: "${el.textContent.trim().slice(0, 60)}"`),
  );
}

async function walkIn(page: Page, locale: TestLocale, check: (stop: string) => Promise<void>): Promise<void> {
  await page.goto(`/?locale=${locale}`);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await walkTour(page, (stop) => check(stop.name), tourText(locale));
}

test.describe('in the test languages, at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('en-XA: every interface string comes from en.json, and nothing is too wide or cut off', { tag: '@own-size' }, async ({ page }) => {
    test.setTimeout(240_000);
    await walkIn(page, 'en-XA', async (stop) => {
      expect.soft(await page.locator('html').getAttribute('lang'), `${stop}: lang`).toBe('en-XA');
      expect.soft(await untranslated(page), `${stop}: English that isn't in en.json`).toEqual([]);
      const report = await overflowReport(page);
      expect.soft(report.overflow, `${stop} is ${report.overflow}px wider than the screen:\n${report.culprits.join('\n')}`).toBeLessThanOrEqual(0);
      expect.soft(await cutOff(page), `${stop}: text cut off`).toEqual([]);
    });
  });

  test('ar-XB: every page stays right to left and fits the screen', { tag: '@own-size' }, async ({ page }) => {
    test.setTimeout(240_000);
    await walkIn(page, 'ar-XB', async (stop) => {
      const state = await page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, direction: getComputedStyle(document.body).direction }));
      expect.soft(state, `${stop}: direction`).toEqual({ dir: 'rtl', lang: 'ar-XB', direction: 'rtl' });
      const report = await overflowReport(page);
      expect.soft(report.overflow, `${stop} is ${report.overflow}px wider than the screen:\n${report.culprits.join('\n')}`).toBeLessThanOrEqual(0);
    });
  });
});

test.describe('course text stays English', () => {
  test('lesson text, key words and quick-check questions are marked English, left to right, in a right-to-left page', async ({ page }) => {
    await page.goto(`${L10.path('read')}?locale=ar-XB`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const heading = page.locator('h1');
    await expect(heading).toHaveText(L10.title);
    await expect(heading).toHaveAttribute('lang', 'en');
    await expect(heading).toHaveAttribute('dir', 'ltr');
    const reading = page.locator('.tw-reading-text').first();
    await expect(reading.locator('xpath=ancestor-or-self::*[@lang][1]')).toHaveAttribute('lang', 'en');
    expect(await reading.evaluate((el) => getComputedStyle(el).direction)).toBe('ltr');
  });
});

test.describe('nothing extra for English', () => {
  test('an English visit fetches no other language, no test language, no Arabic font and no Vietnamese font', async ({ page }) => {
    const requests = recordRequests(page);
    await page.goto('/');
    await page.goto(L10.path('read'));
    await expect(page.locator('h1')).toHaveText(L10.title);
    await page.goto('/settings');
    await expect(page.locator('h1')).toBeVisible();
    expect(requests.filter((url) => /\/assets\/(locales|pseudo|fonts-arabic|fonts-vietnamese)\//.test(url))).toEqual([]);
  });

  test('the offline copy holds Indonesian and Malay, the other languages ready, and no test language, no language not ready and no Arabic or Vietnamese font', async ({ request }) => {
    const worker = await (await request.get('/sw.js')).text();
    expect(worker).toContain('index.html');
    expect(worker).toMatch(/assets\/locales\/id\//);
    expect(worker).toMatch(/assets\/locales\/ms\//);
    expect(worker).not.toMatch(/assets\/(locales\/(?!id\/|ms\/)|pseudo|fonts-arabic|fonts-vietnamese)/);
    expect(worker).not.toMatch(/vazirmatn|be-vietnam-pro/i);
  });

  test('a right-to-left language fetches its messages and the Arabic font stylesheet when it is used', async ({ page }) => {
    const requests = recordRequests(page);
    await page.goto('/?locale=ar-XB');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect.poll(() => requests.some((url) => /\/assets\/fonts-arabic\/[^/]+\.css$/.test(url))).toBe(true);
    expect(requests.some((url) => /\/assets\/pseudo\/pseudo-ar-XB-[^/]+\.js$/.test(url))).toBe(true);
    // Its words are Latin letters, so no Arabic letters are needed and no font file is fetched.
    expect(requests.filter((url) => /\.woff2$/.test(url) && /vazirmatn/.test(url))).toEqual([]);
  });
});
