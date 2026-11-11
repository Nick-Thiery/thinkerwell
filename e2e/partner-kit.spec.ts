import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { pdfPageOrientations } from './lessonHelpers';
import { settle } from './pageTour';

// The partner kit (docs/notes/partner-kit.md): For organisations, reached
// from the footer of the first page and from the Educators page; the retired
// study addresses; on paper, in English, Indonesian and Malay, code cards on
// A4, black on white; and the
// device setup checklist still one page in Indonesian and Malay. The kit's pages on
// screen (layout, tap sizes, axe, right to left, no English in Indonesian)
// are in the page tour (e2e/pageTour.ts), indonesian.spec.ts and malay.spec.ts.

type Tree = { [key: string]: string | Tree };
const messages = (locale: string) =>
  JSON.parse(readFileSync(path.join(import.meta.dirname, '..', 'src', 'i18n', 'messages', `${locale}.json`), 'utf8')) as Tree;
const LOCALES = { en: messages('en'), id: messages('id'), ms: messages('ms') };
function msg(locale: keyof typeof LOCALES, key: string, params: Record<string, string | number> = {}): string {
  const text = key.split('.').reduce<string | Tree>((node, part) => (node as Tree)[part]!, LOCALES[locale]) as string;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));
}

/** The languages after English, by the name the language switch shows. */
const OTHER_LANGUAGES = { id: 'Bahasa Indonesia', ms: 'Bahasa Melayu' } as const;

async function useLanguage(page: Page, locale: keyof typeof OTHER_LANGUAGES): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /^(Language|Bahasa): / }).click();
  await page.locator('.tw-language-switch-panel').getByRole('radio', { name: OTHER_LANGUAGES[locale] }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
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

test('an organisation finds what it needs from the first page, in the footer and on the Educators page', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer.tw-site-footer');
  await expect(footer.getByRole('link', { name: 'Credits' })).toHaveAttribute('href', '/credits');
  await footer.getByRole('link', { name: 'For organisations' }).click();
  await expect(page.locator('h1')).toHaveText('Use Thinkerwell with your learners');
  await expect(page.getByText('Thinkerwell is a student-led platform. It is not a registered charity or nonprofit.')).toBeVisible();
  await expect(page.getByText(/\[CONTACT EMAIL\]/)).toHaveCount(0);

  // The pilot is introduced in one sentence, beside the contact link: the study package was retired on 11 November 2026.
  await expect(page.getByText(/initial pilot is for selected partner organisations/)).toHaveCount(1);
  await expect(page.getByText(/pilot/i)).toHaveCount(1);
  for (const gone of ['Optional learning study', 'Optional learning study and data sharing', 'Print information sheets', 'Print consent forms', 'Print the check']) {
    await expect(page.getByText(gone)).toHaveCount(0);
  }
  const ready = page.getByRole('region', { name: 'Get ready' });
  await expect(ready.getByRole('link', { name: 'Open the checklist' })).toHaveAttribute('href', '/educators/setup');
  await expect(ready.getByRole('link', { name: 'Print the guide' })).toHaveAttribute('href', '/educators/session-guide');

  await page.goto('/educators');
  const group = page.getByRole('region', { name: 'Resources for your group' });
  for (const [cta, url] of [
    ['Read more', '/organisations'],
    ['Print the guide', '/educators/session-guide'],
    ['Make code cards', '/educators/code-cards'],
  ] as const) {
    await expect(group.getByRole('link', { name: cta })).toHaveAttribute('href', url);
  }
  for (const gone of ['Optional learning study', 'Print information sheets', 'Print consent forms', 'Print the check']) {
    await expect(page.getByText(gone)).toHaveCount(0);
  }
  // Setting up a device is the hero's second button.
  await expect(page.getByRole('link', { name: 'Set up a device' })).toHaveAttribute('href', '/educators/setup');
});

test('the retired study addresses open For organisations, in the app and after a reload, and nothing of the old pages is served', async ({ page, request }) => {
  for (const address of ['/educators/information-sheet', '/educators/consent-form', '/educators/learning-check', '/educators/pilot-check']) {
    await page.goto(address);
    await expect(page).toHaveURL(/\/organisations$/);
    await expect(page.locator('h1')).toHaveText('Use Thinkerwell with your learners');
    await expect(page.getByText(/consent form|information sheet|learning check/i)).toHaveCount(0);
    // The server answers the old address with a redirect, not the old page.
    const response = await request.get(address, { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(response.status());
    expect(response.headers().location).toBe('/organisations');
  }
  // Nothing is left on the site for the old pages' words.
  for (const asset of ['/consent-form.pdf', '/information-sheet.pdf', '/learning-check.pdf']) {
    const response = await request.get(asset);
    expect(response.headers()['content-type'] ?? '').not.toContain('pdf');
  }
});

for (const locale of ['en', 'id', 'ms'] as const) {
  test.describe(`on paper (${locale})`, { tag: '@chromium-only' }, () => {
    test.beforeEach(async ({ page }) => {
      if (locale !== 'en') await useLanguage(page, locale);
    });

    test('code cards print ten to an A4 page, then the list of codes and names', async ({ page }) => {
      await page.goto('/educators/code-cards?prefix=ABC&count=23');
      await expect(page.locator('.tw-code-card')).toHaveCount(23);
      const result = await printed(page);
      // Three pages of cards (10, 10, 3), then the list.
      expect(result.pages).toEqual(['portrait', 'portrait', 'portrait', 'portrait']);
      expect(result.colours).toEqual([]);
      await expect(page.locator('.tw-codes-list tbody th')).toHaveText(Array.from({ length: 23 }, (_, i) => `ABC-${String(i + 1).padStart(2, '0')}`));
    });

    test('the device setup checklist is one A4 page', async ({ page }) => {
      await page.goto('/educators/setup');
      await expect(page.locator('h1')).toHaveText(msg(locale, 'pages.setup.title'));
      await expect(page.getByText(msg(locale, 'pages.setup.learners.codes'))).toBeVisible();
      expect((await printed(page)).pages).toEqual(['portrait']);
    });
  });
}
