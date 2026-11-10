import { expect, test, type Page } from '@playwright/test';
import { addLearnerViaUi } from './lessonHelpers';

// The other courses offline (src/offline/courseFiles.ts, docs/notes/offline-courses.md),
// against the production build with its real service worker: first what a
// device has after only opening a course, then after "Save the courses" in
// Settings. The service worker is blocked in every other spec.
test.use({ serviceWorkers: 'allow' });

const LESSONS = {
  'digital-world': { id: 'dw-what-ai-is', last: 'dw-design-an-ai-helper' },
  'southeast-asia-through-time': { id: 'sat-01-ban-chiang-pot', last: 'sat-12-shared-history-exhibit' },
  'art-architecture-society': { id: 'aas-01-art-and-context', last: 'aas-16-evidence-and-interpretation' },
} as const;

async function waitUntilOfflineReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
}

async function cachedCoursePaths(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    if (!(await caches.has('thinkerwell-courses-v1'))) return [];
    const cache = await caches.open('thinkerwell-courses-v1');
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
}

async function pictureLoaded(page: Page): Promise<boolean> {
  const picture = page.locator('.tw-lesson-visual img').first();
  await expect(picture).toBeVisible();
  return picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
}

test('a course opened online is kept as far as it went; the rest says so when offline', { tag: '@chromium-only' }, async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await waitUntilOfflineReady(page);
  // Opened online: the course's code and this lesson's pictures are fetched, and the worker keeps them.
  await page.goto('/lesson/aas-01-art-and-context/read');
  await expect(page.locator('h1')).toBeVisible();
  await expect.poll(() => pictureLoaded(page)).toBe(true);
  await expect.poll(async () => (await cachedCoursePaths(page)).length).toBeGreaterThan(3);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  await expect.poll(() => pictureLoaded(page)).toBe(true);
  // A lesson the learner never opened: its words are in the course's code, which is kept, so it opens. Its
  // pictures were never fetched, so they don't show until the device is online (or the course is saved in Settings).
  await page.goto('/lesson/aas-mughal-court-and-connections/read').catch(() => undefined);
  await expect(page.locator('h1')).toBeVisible();
  const unopened = await page.locator('.tw-lesson-visual img').first().evaluate((img: HTMLImageElement) => ({ shown: img.complete && img.naturalWidth > 0, alt: img.alt }));
  expect(unopened.shown).toBe(false);
  expect(unopened.alt.length).toBeGreaterThan(10);
  // The course's map opens too (its code is kept), whatever the lessons' pictures.
  await page.goto('/course/art-architecture-society');
  await expect(page.getByRole('heading', { level: 1, name: 'Art, Architecture and Society' })).toBeVisible();
});

test('"Save the courses" in Settings keeps all three other courses: pages, lessons and pictures open offline, in every language', { tag: '@chromium-only' }, async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await addLearnerViaUi(page, 'Amina');
  await waitUntilOfflineReady(page);
  await page.goto('/settings#course-files');
  const card = page.locator('#course-files');
  await expect(card.getByRole('heading', { name: 'Courses for offline use' })).toBeVisible();
  await expect(card).toContainText('Art, Architecture and Society: not saved yet');
  await card.getByRole('button', { name: 'Save the courses' }).click();
  await expect(card).toContainText('All the courses are on this device', { timeout: 200_000 });

  await context.setOffline(true);
  for (const [course, { id, last }] of Object.entries(LESSONS)) {
    await page.goto(`/course/${course}`);
    await expect(page.locator('h1')).toBeVisible();
    for (const lesson of [id, last]) {
      await page.goto(`/lesson/${lesson}/read`);
      await expect(page.locator('h1')).toBeVisible();
      // Digital World's 17 pictures are still to be drawn (content/courses/digital-world/README.md): its lessons show none.
      if (course !== 'digital-world') await expect.poll(() => pictureLoaded(page), { message: `${lesson}'s picture offline` }).toBe(true);
    }
    await page.goto(`/educators/lesson/${id}`);
    await expect(page.locator('h1')).toBeVisible();
  }

  // Indonesian and Malay: the translated lesson and its picture open from the same files, with no internet.
  await page.goto('/lesson/aas-01-art-and-context/read');
  for (const [name, lang] of [
    [/Bahasa Indonesia/, 'id'],
    [/Bahasa Melayu/, 'ms'],
  ] as const) {
    await page.getByRole('button', { name: /Language|Bahasa/ }).first().click();
    await page.getByRole('menuitemradio', { name }).or(page.getByRole('radio', { name })).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('h1')).not.toHaveText('How can a work of art help us understand a society?');
    await expect.poll(() => pictureLoaded(page), { message: `${lang} picture offline` }).toBe(true);
  }

  // Saved work stays with the learner after switching courses.
  await page.goto('/lesson/dw-what-ai-is/write');
  const box = page.getByRole('textbox').first();
  await box.fill('AI is a tool people made.');
  await box.blur();
  await page.goto('/lesson/sat-01-ban-chiang-pot/read');
  await page.goto('/lesson/dw-what-ai-is/write');
  await expect(page.getByRole('textbox').first()).toHaveValue('AI is a tool people made.');
});
