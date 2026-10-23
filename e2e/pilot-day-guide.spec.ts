import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { pdfPageOrientations } from './lessonHelpers';
import { settle } from './pageTour';

// The pilot day guide for staff (docs/notes/pilot-day-tools.md): one page for
// screen and paper, linked from the Educators page's "Resources for your group". On
// paper, in English, Bahasa Indonesia and Bahasa Melayu, it is one page on A4
// and on Letter, black on white, with nothing smaller than the site's
// smallest text (14px, 10.5pt). The page on screen (layout, tap sizes, axe,
// right to left, sideways scroll, no English in Indonesian or Malay) is in the
// page tour (e2e/pageTour.ts), indonesian.spec.ts and malay.spec.ts.

type Tree = { [key: string]: string | Tree };
const messages = (locale: string) =>
  JSON.parse(readFileSync(path.join(import.meta.dirname, '..', 'src', 'i18n', 'messages', `${locale}.json`), 'utf8')) as Tree;
const LOCALES = { en: messages('en'), id: messages('id'), ms: messages('ms') };
type Locale = keyof typeof LOCALES;
function msg(locale: Locale, key: string, params: Record<string, string | number> = {}): string {
  const text = key.split('.').reduce<string | Tree>((node, part) => (node as Tree)[part]!, LOCALES[locale]) as string;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
}

const LANGUAGE_NAMES: Record<Exclude<Locale, 'en'>, { name: string; code: string }> = {
  id: { name: 'Bahasa Indonesia', code: 'id' },
  ms: { name: 'Bahasa Melayu', code: 'ms' },
};

async function useLanguage(page: Page, locale: Locale): Promise<void> {
  await page.goto('/');
  if (locale === 'en') return;
  const { name, code } = LANGUAGE_NAMES[locale];
  await page.getByRole('button', { name: /^(Language|Bahasa): / }).click();
  await page.locator('.tw-language-switch-panel').getByRole('radio', { name }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', code);
}

/** The page as it prints: its pages' orientations on A4 and Letter, and whether any colour or small text is left. */
async function printed(page: Page): Promise<{ A4: string[]; Letter: string[]; colours: string[]; small: string[] }> {
  await page.emulateMedia({ media: 'print' });
  await settle(page);
  const A4 = pdfPageOrientations(await page.pdf({ format: 'A4' }));
  const Letter = pdfPageOrientations(await page.pdf({ format: 'Letter' }));
  const { colours, small } = await page.evaluate(() => {
    const colours = new Set<string>();
    const small = new Set<string>();
    for (const el of document.body.querySelectorAll('*')) {
      if (!(el instanceof HTMLElement) || !el.checkVisibility() || el.closest('.tw-visually-hidden')) continue;
      const style = getComputedStyle(el);
      const label = `${el.tagName.toLowerCase()}.${el.className}`;
      if ([...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())) {
        if (style.color !== 'rgb(0, 0, 0)') colours.add(`${label} color ${style.color}`);
        if (parseFloat(style.fontSize) < 14) small.add(`${label} ${style.fontSize}: ${el.textContent.trim().slice(0, 40)}`);
      }
      const background = style.backgroundColor;
      if (background !== 'rgba(0, 0, 0, 0)' && background !== 'rgb(255, 255, 255)') colours.add(`${label} background ${background}`);
    }
    return { colours: [...colours], small: [...small] };
  });
  await page.emulateMedia({ media: 'screen' });
  return { A4, Letter, colours, small };
}

test('staff find the guide under "Resources for your group" on the Educators page, and come back from it', async ({ page }) => {
  await page.goto('/educators');
  const group = page.getByRole('region', { name: 'Resources for your group' });
  await expect(group.getByText('Session guide')).toBeVisible();
  await group.getByRole('link', { name: 'Print the guide' }).click();
  await expect(page).toHaveURL(/\/educators\/session-guide$/);
  await expect(page.locator('h1')).toHaveText('Session guide');
  await expect(page.getByRole('article', { name: 'A one-page guide for staff' })).toBeVisible();
  // No contact line and no placeholder until the team has an address (src/app/contact.ts).
  await expect(page.getByText(/\[|CONTACT EMAIL/)).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to the educators page' }).click();
  await expect(page.locator('h1')).toHaveText('For educators');
});

for (const locale of ['en', 'id', 'ms'] as const) {
  // Prints to PDF, which only Chromium can (docs/notes/safari-testing.md).
  test(`the guide is one page on A4 and on Letter, black on white, with nothing under 14px (${locale})`, { tag: '@chromium-only' }, async ({ page }) => {
    await useLanguage(page, locale);
    await page.goto('/educators/session-guide');
    await expect(page.locator('h1')).toHaveText(msg(locale, 'pilotDay.title'));
    // The six parts, and who to contact (src/app/contact.ts).
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(7);

    const result = await printed(page);
    expect(result.A4).toEqual(['portrait']);
    expect(result.Letter).toEqual(['portrait']);
    expect(result.colours).toEqual([]);
    expect(result.small).toEqual([]);

    // What does not print: the toolbar and the screen's title and introduction.
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: msg(locale, 'print.print') })).toBeHidden();
    await expect(page.getByText(msg(locale, 'pilotDay.intro'))).toBeHidden();
    await expect(page.getByRole('article', { name: msg(locale, 'pilotDay.sheetTitle') })).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
  });
}
