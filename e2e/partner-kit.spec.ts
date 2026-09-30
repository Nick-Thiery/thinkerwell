import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { pdfPageOrientations } from './lessonHelpers';
import { settle } from './pageTour';

// The partner kit (docs/notes/partner-kit.md): For organisations, reached
// from the footer of the first page and from the Educators page; the consent form and
// code cards on paper, A4 and black on white, in English and in Indonesian;
// and the device setup checklist still one page in Indonesian. The kit's
// pages on screen (layout, tap sizes, axe, right to left, no English in
// Indonesian) are in the page tour (e2e/pageTour.ts) and indonesian.spec.ts.

type Tree = { [key: string]: string | Tree };
const messages = (locale: string) =>
  JSON.parse(readFileSync(path.join(import.meta.dirname, '..', 'src', 'i18n', 'messages', `${locale}.json`), 'utf8')) as Tree;
const LOCALES = { en: messages('en'), id: messages('id') };
function msg(locale: keyof typeof LOCALES, key: string, params: Record<string, string | number> = {}): string {
  const text = key.split('.').reduce<string | Tree>((node, part) => (node as Tree)[part]!, LOCALES[locale]) as string;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
}

async function useIndonesian(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /^(Language|Bahasa): / }).click();
  await page.locator('.tw-language-switch-panel').getByRole('radio', { name: 'Bahasa Indonesia' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
}

/** The page as it prints on A4: its pages' orientations, and whether any colour is left. */
async function printed(page: Page): Promise<{ pages: string[]; colours: string[] }> {
  await page.emulateMedia({ media: 'print' });
  await settle(page);
  const pages = pdfPageOrientations(await page.pdf({ format: 'A4' }));
  // Every visible text is black, and nothing has a coloured background.
  const colours = await page.evaluate(() => {
    const found = new Set<string>();
    for (const el of document.body.querySelectorAll('*')) {
      if (!(el instanceof HTMLElement) || !el.checkVisibility()) continue;
      const style = getComputedStyle(el);
      if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())) {
        if (style.color !== 'rgb(0, 0, 0)') found.add(`${el.tagName.toLowerCase()}.${el.className} color ${style.color}`);
      }
      const bg = style.backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)') found.add(`${el.tagName.toLowerCase()}.${el.className} background ${bg}`);
    }
    return [...found];
  });
  await page.emulateMedia({ media: 'screen' });
  return { pages, colours };
}

test('an organisation finds the kit from the first page, in the footer and on the Educators page', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer.tw-site-footer');
  await expect(footer).toContainText('Thinkerwell is a student-led project, not a registered charity.');
  await footer.getByRole('link', { name: 'For organisations' }).click();
  await expect(page.locator('h1')).toHaveText('For organisations');
  await expect(page.getByText('Thinkerwell is a student-led project. It is not a registered charity or nonprofit.')).toBeVisible();
  await expect(page.getByText('[CONTACT EMAIL]')).toBeVisible();

  await page.goto('/educators');
  const pilot = page.getByRole('region', { name: 'Starting a pilot' });
  for (const [cta, url] of [
    ['Read about pilots', '/organisations'],
    ['Print consent forms', '/educators/consent-form'],
    ['Make code cards', '/educators/code-cards'],
    ['Open the checklist', '/educators/setup'],
  ] as const) {
    await expect(pilot.getByRole('link', { name: cta })).toHaveAttribute('href', url);
  }
});

for (const locale of ['en', 'id'] as const) {
  test.describe(`on paper (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      if (locale === 'id') await useIndonesian(page);
    });

    test('the consent form is one A4 page, black on white, with the organisation’s name and without the staff note', async ({ page }) => {
      await page.goto('/educators/consent-form');
      await page.getByRole('textbox', { name: msg(locale, 'pages.consentForm.orgLabel') }).fill('HELP for Refugees');
      const result = await printed(page);
      expect(result.pages).toEqual(['portrait']);
      expect(result.colours).toEqual([]);
      await page.emulateMedia({ media: 'print' });
      await expect(page.getByText(msg(locale, 'pages.consentForm.staffTitle'))).toBeHidden();
      await expect(page.getByRole('button', { name: msg(locale, 'print.print') })).toBeHidden();
      await expect(page.locator('.tw-consent strong', { hasText: 'HELP for Refugees' })).toHaveCount(7);
      await expect(page.getByText(msg(locale, 'pages.consentForm.yes'))).toBeVisible();
      await page.emulateMedia({ media: 'screen' });
    });

    test('code cards print ten to an A4 page, then the list of codes and names', async ({ page }) => {
      await page.goto('/educators/code-cards?prefix=HLP&count=23');
      await expect(page.locator('.tw-code-card')).toHaveCount(23);
      const result = await printed(page);
      // Three pages of cards (10, 10, 3), then the list.
      expect(result.pages).toEqual(['portrait', 'portrait', 'portrait', 'portrait']);
      expect(result.colours).toEqual([]);
      await expect(page.locator('.tw-codes-list tbody th')).toHaveText(Array.from({ length: 23 }, (_, i) => `HLP-${String(i + 1).padStart(2, '0')}`));
    });

    test('the device setup checklist is one A4 page', async ({ page }) => {
      await page.goto('/educators/setup');
      await expect(page.locator('h1')).toHaveText(msg(locale, 'pages.setup.title'));
      await expect(page.getByText(msg(locale, 'pages.setup.learners.codes'))).toBeVisible();
      expect((await printed(page)).pages).toEqual(['portrait']);
    });
  });
}
