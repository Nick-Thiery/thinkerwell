import { expect, test, type Locator, type Page } from '@playwright/test';
import { courseLessons, courseSections, settle } from './pageTour';
import { addLearnerViaUi, finishLessonViaReflect, horizontalOverflow, nextButton, pdfPageOrientations } from './lessonHelpers';
import { fakeSpeechRecognition, recognitionLog } from './speechFake';

// Pilot-day tools (docs/notes/pilot-day-tools.md): the "Set up this device"
// checklist, the class view and "Print all certificates", all reached from
// the Educators page. Runs at phone, tablet and laptop widths
// (playwright.config.ts).

test.describe.configure({ timeout: 120_000 });

const sectionLessons = (id: string) => {
  const section = courseSections.find((each) => each.id === id)!;
  return courseLessons.filter((lesson) => section.lessons.includes(lesson.number));
};

/** A step of the setup checklist, found by its title. */
function step(page: Page, title: string): Locator {
  return page.locator('.tw-setup-step').filter({ has: page.getByRole('heading', { level: 2, name: title }) });
}

/** Counts calls to navigator.storage.persisted() and persist(); persist() says yes. */
async function fakePersistentStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log = { persisted: 0, persist: 0 };
    let kept = false;
    (window as unknown as { __storageLog: typeof log }).__storageLog = log;
    Object.defineProperty(StorageManager.prototype, 'persisted', {
      configurable: true,
      value: () => {
        log.persisted += 1;
        return Promise.resolve(kept);
      },
    });
    Object.defineProperty(StorageManager.prototype, 'persist', {
      configurable: true,
      value: () => {
        log.persist += 1;
        kept = true;
        return Promise.resolve(true);
      },
    });
  });
}

function storageLog(page: Page): Promise<{ persisted: number; persist: number }> {
  return page.evaluate(() => (window as unknown as { __storageLog: { persisted: number; persist: number } }).__storageLog);
}

test('a staff member works through the setup checklist, which asks the browser nothing risky as it opens', async ({ page }) => {
  await fakeSpeechRecognition(page, 'available');
  await fakePersistentStorage(page);

  await page.goto('/educators');
  await page.getByRole('link', { name: 'Open the checklist' }).click();
  await expect(page).toHaveURL(/\/educators\/setup$/);
  await expect(page.locator('h1')).toHaveText('Set up this device');
  await expect(page).toHaveTitle('Set up this device · Thinkerwell');

  // Each step says where it stands on this device.
  await expect(step(page, 'Add Thinkerwell to the home screen').getByRole('status')).toContainText('Not done yet');
  await expect(step(page, 'Add Thinkerwell to the home screen').getByRole('status')).toContainText('Thinkerwell is open in the browser.');
  // The tests block the service worker, so this browser can't keep the course.
  await expect(step(page, 'Download the course for offline use').getByRole('status')).toContainText('Not on this browser');
  const storage = step(page, 'Keep saved work safe');
  await expect(storage.getByRole('status')).toContainText('The browser may delete saved work when space runs low.');
  await expect(step(page, 'Add the learners who use this device').getByRole('status')).toContainText('No learners on this device yet.');
  await expect(step(page, 'Check speech to text').getByRole('status')).toContainText('Not checked on this device yet.');
  await settle(page);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  // Opening the page asked nothing that could prompt or crash.
  expect(await recognitionLog(page)).toEqual({ availableCalls: 0, installCalls: 0, constructed: 0, started: [] });
  expect((await storageLog(page)).persist).toBe(0);

  // "Keep work safe" asks, once, on the tap.
  await storage.getByRole('button', { name: 'Keep work safe' }).click();
  await expect(storage.getByRole('status')).toContainText('Done');
  await expect(storage.getByRole('status')).toContainText('The browser keeps saved work on this device');
  expect((await storageLog(page)).persist).toBe(1);

  // On paper: one A4 page, portrait, with no states or buttons.
  await page.emulateMedia({ media: 'print' });
  await settle(page);
  expect(pdfPageOrientations(await page.pdf({ format: 'A4' }))).toEqual(['portrait']);
  await expect(page.getByRole('button', { name: 'Keep work safe' })).toBeHidden();
  await expect(page.locator('.tw-setup-status').first()).toBeHidden();
  await expect(page.locator('.tw-setup-box').first()).toBeVisible();
  // The home screen steps for every kind of device, side by side.
  await expect(page.locator('.tw-setup-platforms-paper').getByRole('heading', { level: 3 })).toHaveText([
    'iPad or iPhone (Safari)',
    'Android tablet or phone (Chrome)',
    'Windows laptop or Chromebook (Chrome or Edge)',
  ]);
  await page.emulateMedia({ media: 'screen' });

  // The speech step goes to "Check this device" in Settings.
  await step(page, 'Check speech to text').getByRole('link', { name: 'Check it in Settings' }).click();
  await expect(page).toHaveURL(/\/settings#say-it$/);
  const sayIt = page.getByRole('heading', { level: 2, name: 'Say it: speech to text' });
  await expect(sayIt).toBeFocused();
  await expect(page.getByRole('button', { name: 'Check this device' })).toBeInViewport();
  expect(await recognitionLog(page)).toEqual({ availableCalls: 0, installCalls: 0, constructed: 0, started: [] });
  await page.getByRole('button', { name: 'Check this device' }).click();
  await expect(page.getByRole('region', { name: 'Say it: speech to text' }).getByRole('status')).toContainText('not sent anywhere');

  // Back on the checklist, the saved check shows, still without asking the browser again.
  await page.goto('/educators/setup');
  await expect(step(page, 'Check speech to text').getByRole('status')).toContainText(/Done\s*Checked on [A-Z][a-z]+ \d{1,2}, \d{4}\. Speech to text works on this device/);
  expect(await recognitionLog(page)).toEqual({ availableCalls: 0, installCalls: 0, constructed: 0, started: [] });

  // "Add a learner" opens the new-learner form, and the step then counts them.
  await step(page, 'Add the learners who use this device').getByRole('button', { name: 'Add a learner' }).click();
  await page.getByLabel('First name or nickname').fill('Amina');
  await page.getByRole('button', { name: 'Start Lesson 1' }).click();
  await expect(page).toHaveURL(/\/lesson\/.+\/read$/);
  await page.goto('/educators/setup');
  const learners = step(page, 'Add the learners who use this device');
  await expect(learners.getByRole('status')).toContainText('Done');
  await expect(learners.getByRole('status')).toContainText('1 learner on this device.');

  // Before a reset: saving everyone's work in Settings.
  await page.getByRole('link', { name: 'Save work to a file in Settings' }).click();
  await expect(page).toHaveURL(/\/settings#move-work$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Move work to another device' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Save my work to a file' })).toBeInViewport();
});

test('the class view shows each learner by name without scores, and every certificate prints on its own landscape page', async ({ page }) => {
  // Yusuf is added first; the class view still lists Amina first.
  await addLearnerViaUi(page, 'Yusuf');
  for (const lesson of sectionLessons('culture')) await finishLessonViaReflect(page, lesson);
  await finishLessonViaReflect(page, courseLessons[0]!);

  // A second learner, added from the setup checklist.
  await page.goto('/educators/setup');
  await step(page, 'Add the learners who use this device').getByRole('button', { name: 'Add a learner' }).click();
  await page.getByLabel('First name or nickname').fill('Amina');
  await page.getByRole('button', { name: 'Start Lesson 1' }).click();
  await expect(page).toHaveURL(/\/lesson\/.+\/read$/);
  for (const lesson of sectionLessons('geography')) await finishLessonViaReflect(page, lesson);
  // Amina tries the Geography check.
  await page.goto('/section/geography/check');
  await page.getByRole('button', { name: 'Start the check' }).click();
  for (let i = 1; i < 10; i++) {
    await page.getByRole('radio').first().click();
    await expect(page.locator('.tw-feedback-title')).toBeVisible();
    await nextButton(page, 'Next question').click();
  }
  await page.getByRole('radio').first().click();
  await expect(page.locator('.tw-feedback-title')).toBeVisible();
  await nextButton(page, 'See your results').click();
  await expect(page.getByRole('heading', { level: 1, name: /^\d+ out of 10$/ })).toBeVisible();

  // The class view, from the Educators page.
  await page.goto('/educators');
  await page.getByRole('link', { name: 'See the class' }).click();
  await expect(page).toHaveURL(/\/educators\/class$/);
  await expect(page.locator('h1')).toHaveText('The class on this device');
  const list = page.getByRole('list', { name: 'Learners' });
  await expect(list.getByRole('heading', { level: 2 })).toHaveText(['Amina', 'Yusuf']);

  const amina = page.getByRole('article', { name: 'Amina' });
  const counts = (card: Locator) => card.locator('.tw-class-sections li');
  await expect(counts(amina)).toHaveText([
    /History & Human Stories\s*0 of 9/,
    /Geography & Our Environment\s*5 of 5/,
    /Culture, Society & Identity\s*0 of 5/,
    /Civics, Media & Everyday Economics\s*0 of 5/,
  ]);
  // Where she is now (worked out as her home's "Continue" is; checked in detail by the unit tests).
  await expect(amina.locator('dd').first()).toHaveText(/^Lesson \d+: .+(Up next|Step: (Read|Write|Speak|Watch|Reflect))$/);
  const today = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  await expect(amina.locator('dd').nth(1)).toHaveText(today);
  await expect(amina.getByRole('region', { name: 'Section checks tried' }).getByRole('listitem')).toHaveText(['Geography & Our Environment']);

  const yusuf = page.getByRole('article', { name: 'Yusuf' });
  await expect(counts(yusuf)).toHaveText([
    /History & Human Stories\s*1 of 9/,
    /Geography & Our Environment\s*0 of 5/,
    /Culture, Society & Identity\s*5 of 5/,
    /Civics, Media & Everyday Economics\s*0 of 5/,
  ]);
  await expect(yusuf.getByRole('region', { name: 'Section checks tried' })).toContainText('None yet');

  // No scores, no ranking, no links into anyone's journal.
  await expect(list).not.toContainText(/score|out of|%/i);
  await expect(list.getByRole('link')).toHaveCount(0);
  await settle(page);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  // Every certificate earned on this device, one landscape page each.
  await page.getByRole('link', { name: 'Print all certificates' }).click();
  await expect(page).toHaveURL(/\/educators\/class\/certificates$/);
  await expect(page.locator('h1')).toHaveText('All certificates');
  await expect(page.getByText('2 certificates earned on this device.')).toBeVisible();
  await expect(page.locator('.tw-cert-name')).toHaveText(['Amina', 'Yusuf']);
  await expect(page.getByRole('article', { name: 'Certificate for Amina: Geography & Our Environment' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Certificate for Yusuf: Culture, Society & Identity' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Go to the course page' })).toHaveAttribute('href', '/course');
  await settle(page);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await page.emulateMedia({ media: 'print' });
  await settle(page);
  expect(pdfPageOrientations(await page.pdf({ format: 'A4' }))).toEqual(['landscape', 'landscape']);
  expect(pdfPageOrientations(await page.pdf({ format: 'Letter' }))).toEqual(['landscape', 'landscape']);
  await expect(page.locator('h1')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
});

test('with nobody on the device, the class view and the certificates page say so', async ({ page }) => {
  await page.goto('/educators/class');
  await expect(page.getByRole('heading', { level: 2, name: 'No learners on this device yet.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Print all certificates' })).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await page.goto('/educators/class/certificates');
  await expect(page.getByText('Nobody on this device has a certificate yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print' })).toHaveCount(0);
});
