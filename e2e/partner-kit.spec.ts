import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { pdfPageOrientations } from './lessonHelpers';
import { settle } from './pageTour';

// The partner kit (docs/notes/partner-kit.md): For organisations, reached
// from the footer of the first page and from the Educators page; on paper,
// in English and in Indonesian, the information sheet (one page) and the
// consent form (two pages) on A4 and Letter with nothing smaller than the
// site's smallest text, and code cards on A4, all black on white; and the
// device setup checklist still one page in Indonesian. The kit's pages on
// screen (layout, tap sizes, axe, right to left, no English in Indonesian)
// are in the page tour (e2e/pageTour.ts) and indonesian.spec.ts.

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

/** The longest organisation name the information sheet and consent form take (60 characters), as a Jakarta partner's might be. */
const LONGEST_ORGANISATION = 'Yayasan Pendidikan dan Pemberdayaan Anak Pengungsi Indonesia';

/** How many pages the page prints on, on A4 and on Letter (Chromium's own PDF, print media). */
async function pageCounts(page: Page): Promise<{ A4: number; Letter: number }> {
  await page.emulateMedia({ media: 'print' });
  await settle(page);
  const A4 = pdfPageOrientations(await page.pdf({ format: 'A4' })).length;
  const Letter = pdfPageOrientations(await page.pdf({ format: 'Letter' })).length;
  await page.emulateMedia({ media: 'screen' });
  return { A4, Letter };
}

/** Printed text smaller than the site's smallest, 14px (10.5pt): none, on the partner kit's printouts. */
async function printedTooSmall(page: Page): Promise<string[]> {
  await page.emulateMedia({ media: 'print' });
  const small = await page.evaluate(() =>
    [...document.body.querySelectorAll('*')]
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el.checkVisibility() && !el.closest('.tw-visually-hidden'))
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 14)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className} ${getComputedStyle(el).fontSize}: ${el.textContent.trim().slice(0, 40)}`),
  );
  await page.emulateMedia({ media: 'screen' });
  return small;
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
  await expect(footer.getByRole('link', { name: 'Credits' })).toHaveAttribute('href', '/credits');
  await footer.getByRole('link', { name: 'For organisations' }).click();
  await expect(page.locator('h1')).toHaveText('For organisations');
  await expect(page.getByText('Thinkerwell is a student-led platform. It is not a registered charity or nonprofit.')).toBeVisible();
  // No placeholder address anywhere until the team has a real one (src/app/contact.ts).
  await expect(page.getByText(/\[CONTACT EMAIL\]/)).toHaveCount(0);

  // For organisations' "Get ready": the information sheet beside the consent form.
  const ready = page.getByRole('region', { name: 'Get ready' });
  await expect(ready.getByRole('link', { name: 'Print information sheets' })).toHaveAttribute('href', '/educators/information-sheet');
  await expect(ready.getByRole('link', { name: 'Print consent forms' })).toHaveAttribute('href', '/educators/consent-form');

  await page.goto('/educators');
  const pilot = page.getByRole('region', { name: 'Starting a pilot' });
  for (const [cta, url] of [
    ['Read about pilots', '/organisations'],
    ['Print information sheets', '/educators/information-sheet'],
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

    test('the consent form is two pages, A4 or Letter, black on white, with the organisation’s name and without the staff note', async ({
      page,
    }) => {
      await page.goto('/educators/consent-form');
      const name = page.getByRole('textbox', { name: msg(locale, 'pages.consentForm.orgLabel') });
      await name.fill('HELP for Refugees');
      const result = await printed(page);
      // Page 1 for the parent or guardian; page 2 for the learner's own answer and the witness line.
      expect(result.pages).toEqual(['portrait', 'portrait']);
      expect(result.colours).toEqual([]);
      expect(await printedTooSmall(page)).toEqual([]);
      await page.emulateMedia({ media: 'print' });
      await expect(page.getByText(msg(locale, 'pages.consentForm.staffTitle'))).toBeHidden();
      await expect(page.getByRole('button', { name: msg(locale, 'print.print') })).toBeHidden();
      await expect(page.locator('.tw-consent').first().locator('strong', { hasText: 'HELP for Refugees' })).toHaveCount(8);
      await expect(page.locator('.tw-consent').nth(1).locator('strong', { hasText: 'HELP for Refugees' })).toHaveCount(1);
      await expect(page.getByText(msg(locale, 'pages.consentForm.yes'), { exact: true })).toHaveCount(3);
      await expect(page.getByText(msg(locale, 'pages.consentForm.pageOf', { page: 2, count: 2 }))).toBeVisible();
      await page.emulateMedia({ media: 'screen' });

      // Still two pages with the name left to write by hand, or the longest name the box takes, on either paper.
      expect(await pageCounts(page)).toEqual({ A4: 2, Letter: 2 });
      await name.fill('');
      expect(await pageCounts(page)).toEqual({ A4: 2, Letter: 2 });
      await name.fill(LONGEST_ORGANISATION + ' and more');
      await expect(name).toHaveValue(LONGEST_ORGANISATION);
      expect(await pageCounts(page)).toEqual({ A4: 2, Letter: 2 });
    });

    test('the information sheet is one page, A4 or Letter, black on white, with what staff typed and without the staff note', async ({ page }) => {
      await page.goto('/educators/information-sheet');
      await expect(page.locator('h1')).toHaveText(msg(locale, 'pages.infoSheet.title'));
      // Empty boxes print lines to write on.
      expect(await pageCounts(page)).toEqual({ A4: 1, Letter: 1 });
      const fill = async (organisation: string, contact: string) => {
        for (const [key, value] of [
          ['pages.consentForm.orgLabel', organisation],
          ['pages.infoSheet.startLabel', locale === 'id' ? '13 Oktober 2026' : '13 October 2026'],
          ['pages.infoSheet.endLabel', '21 November 2026'],
          ['pages.infoSheet.sessionsLabel', '12'],
          ['pages.infoSheet.contactLabel', contact],
        ] as const) {
          await page.getByRole('textbox', { name: msg(locale, key) }).fill(value);
        }
      };
      await fill(LONGEST_ORGANISATION, 'Ibu Sari Wulandari binti Abdurrahman');
      expect(await pageCounts(page)).toEqual({ A4: 1, Letter: 1 });
      await fill('HELP for Refugees', 'Sari');
      const result = await printed(page);
      expect(result.pages).toEqual(['portrait']);
      expect(result.colours).toEqual([]);
      expect(await printedTooSmall(page)).toEqual([]);
      await page.emulateMedia({ media: 'print' });
      await expect(page.getByText(msg(locale, 'pages.consentForm.staffTitle'))).toBeHidden();
      await expect(page.getByRole('group', { name: msg(locale, 'pages.infoSheet.fieldsTitle') })).toBeHidden();
      await expect(page.locator('.tw-sheet strong', { hasText: 'HELP for Refugees' })).toHaveCount(5);
      await expect(page.locator('.tw-sheet strong', { hasText: 'Sari' })).toHaveCount(1);
      await expect(page.getByText(msg(locale, 'pages.infoSheet.runBy'))).toBeVisible();
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
