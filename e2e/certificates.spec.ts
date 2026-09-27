import { expect, test, type Page } from '@playwright/test';
import { courseLessons, courseSections, settle } from './pageTour';
import { addLearnerViaUi, dumpEverything, finishLessonViaReflect, horizontalOverflow, pdfPages } from './lessonHelpers';

// Certificates (docs/notes/certificates.md): a learner who finishes every
// lesson in a section is offered a certificate, which prints on one
// landscape page on both A4 and US Letter. Runs at phone, tablet and laptop
// widths (playwright.config.ts).

test.describe.configure({ timeout: 90_000 });

const geography = courseSections.find((section) => section.id === 'geography')!;
const geographyLessons = courseLessons.filter((lesson) => geography.lessons.includes(lesson.number));
/** 60 characters, the longest name the field takes. */
const LONG_NAME = 'Abdirahman Mohamed Abdullahi Hassan Mohammed Abdirahman Ali';
/** 30 characters with no space, the longest name the new-learner form takes. */
const UNBROKEN_NAME = 'Abdirahmanabdullahimohamedhass';

/** Prints the page on A4 and on Letter (Chromium's own PDF, print media). */
async function printBoth(page: Page): Promise<Record<'A4' | 'Letter', { pages: number; landscape: boolean }>> {
  await page.emulateMedia({ media: 'print' });
  await settle(page);
  const a4 = pdfPages(await page.pdf({ format: 'A4' }));
  const letter = pdfPages(await page.pdf({ format: 'Letter' }));
  return { A4: a4, Letter: letter };
}

/** Every text colour on the printed certificate, and every fill apart from the small section discs. */
async function printedInk(page: Page): Promise<{ text: string[]; fills: string[] }> {
  return page.evaluate(() => {
    const sheet = document.querySelector('.tw-cert')!;
    const all = [sheet, ...sheet.querySelectorAll('*')].filter((el) => !el.closest('svg') && !el.closest('.tw-secdisc'));
    const text = new Set<string>();
    const fills = new Set<string>();
    for (const el of all) {
      const style = getComputedStyle(el);
      if ([...el.childNodes].some((node) => node.nodeType === 3 && node.textContent!.trim())) text.add(style.color);
      fills.add(style.backgroundColor);
    }
    return { text: [...text], fills: [...fills] };
  });
}

test('finishing a section offers a certificate that prints on one landscape page, A4 or Letter', async ({ page }) => {
  await addLearnerViaUi(page, 'Amina');

  // The first four lessons: no offer yet.
  for (const lesson of geographyLessons.slice(0, 4)) {
    await finishLessonViaReflect(page, lesson);
    await expect(page.getByRole('link', { name: /certificate/i })).toHaveCount(0);
  }
  // The last one finishes the section.
  await finishLessonViaReflect(page, geographyLessons[4]!);
  const offer = page.getByRole('region', { name: 'You finished the whole Geography & Our Environment section.' });
  await expect(offer).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await offer.getByRole('link', { name: 'Get your certificate' }).click();

  await expect(page).toHaveURL(/\/certificate\/section\/geography$/);
  const sheet = page.getByRole('article', { name: 'Certificate' });
  await expect(sheet.getByRole('heading', { level: 1, name: 'Certificate' })).toBeVisible();
  await expect(sheet.locator('.tw-cert-name')).toHaveText('Amina');
  await expect(sheet.getByText('finished the Geography & Our Environment section of Exploring Our World.')).toBeVisible();
  for (const lesson of geographyLessons) await expect(sheet.getByText(lesson.title)).toBeVisible();
  await expect(sheet.getByText("Teacher's signature")).toBeVisible();
  // The mascot and the wordmark font are really there (both precached for offline use).
  expect(await sheet.locator('img.tw-cert-mascot').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some((face) => face.family.replace(/["']/g, '') === 'Eczar' && face.status === 'loaded');
  })).toBe(true);
  await settle(page);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  // A full name, just for this print.
  const field = page.getByLabel('Name on the certificate');
  await field.fill('Amina Rahimi');
  await expect(sheet.locator('.tw-cert-name')).toHaveText('Amina Rahimi');

  // On paper: only the certificate, black on white, one landscape page on both papers.
  let printed = await printBoth(page);
  expect(printed).toEqual({ A4: { pages: 1, landscape: true }, Letter: { pages: 1, landscape: true } });
  await expect(page.getByRole('banner')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden();
  await expect(field).toBeHidden();
  await expect(sheet).toBeVisible();
  const ink = await printedInk(page);
  expect(ink.text).toEqual(['rgb(0, 0, 0)']);
  expect(ink.fills.every((fill) => fill === 'rgba(0, 0, 0, 0)')).toBe(true);

  // The longest name, and a long name with no spaces, still fit on one page and never scroll sideways on screen.
  for (const name of [LONG_NAME, UNBROKEN_NAME]) {
    await page.emulateMedia({ media: 'screen' });
    await field.fill(name);
    await expect(sheet.locator('.tw-cert-name')).toHaveText(name);
    await settle(page);
    expect(await horizontalOverflow(page), name).toBeLessThanOrEqual(0);
    printed = await printBoth(page);
    expect(printed, name).toEqual({ A4: { pages: 1, landscape: true }, Letter: { pages: 1, landscape: true } });
  }
  await page.emulateMedia({ media: 'screen' });

  // The name was never saved anywhere.
  const dump = await dumpEverything(page);
  expect(JSON.stringify(dump)).not.toContain('Rahimi');
  expect((dump.stores['learners'] as Array<{ name: string }>).map((learner) => learner.name)).toEqual(['Amina']);
  expect(dump.localStorageLength).toBe(0);

  // Back on the course, the finished section links to its certificate.
  await page.getByRole('link', { name: 'Back to the course' }).click();
  await expect(page.locator('h1')).toHaveText('Exploring Our World');
  await expect(page.getByRole('link', { name: 'Get your certificate for Geography & Our Environment' })).toHaveAttribute(
    'href',
    '/certificate/section/geography',
  );
  await expect(page.getByRole('link', { name: /Get your certificate for History/ })).toHaveCount(0);

  // Other print views stay portrait after a certificate has been open (it has a named page of its own).
  await page.goto('/lesson/towns-near-rivers/print');
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  expect(pdfPages(await page.pdf({ format: 'A4' })).landscape).toBe(false);
});

test('a certificate opened too early lists the lessons left, and a guest is told who certificates are for', async ({ page }) => {
  await addLearnerViaUi(page, 'Kofi');
  await finishLessonViaReflect(page, courseLessons.find((lesson) => lesson.number === 15)!);

  await page.goto('/certificate/section/culture');
  await expect(page.locator('h1')).toHaveText('Certificate: Culture, Society & Identity');
  await expect(page.getByText("You don't need to do the section check for it.")).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: '4 lessons left' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print' })).toHaveCount(0);
  await expect(page.locator('.tw-cert')).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  const lesson16 = courseLessons.find((lesson) => lesson.number === 16)!;
  await page.getByRole('link', { name: new RegExp(`^Lesson 16: `) }).click();
  await expect(page).toHaveURL(new RegExp(`/lesson/${lesson16.id}/read$`));

  await page.goto('/certificate/course');
  await expect(page.getByRole('heading', { level: 2, name: '23 lessons left' })).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  // Looking around (?preview=true, as on an educator's link): nothing saved, so no certificate and no name.
  await page.goto('/certificate/course?preview=true');
  await expect(page.getByText('Certificates are for learners who have finished lessons.')).toBeVisible();
  await expect(page.getByText('Kofi')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Print' })).toHaveCount(0);
});
