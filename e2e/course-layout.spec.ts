import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addLearnerViaUi, horizontalOverflow, watchErrors } from './lessonHelpers';

// Justin's course layout and resource organisation brief (10 November 2026): the four
// course overviews share Exploring Our World's layout, the Teacher guides and Credits
// pages list all 73 lessons by course, and the learner Home shows one progress over
// every course. Runs at all three sizes.

test.describe.configure({ timeout: 60_000 });

const COURSES = [
  { id: 'our-world', path: '/course', title: 'Exploring Our World', section: 'geography', lessons: 24 },
  { id: 'digital-world', path: '/course/digital-world', title: 'Digital World', section: 'who-builds-ai', lessons: 17 },
  { id: 'southeast-asia-through-time', path: '/course/southeast-asia-through-time', title: 'Southeast Asia Through Time', section: 'trade-and-power', lessons: 12 },
  { id: 'art-architecture-society', path: '/course/art-architecture-society', title: 'Art, Architecture and Society', section: 'buildings-belief-places', lessons: 20 },
];

test.describe('the four overviews share one layout', () => {
  for (const course of COURSES) {
    test(`${course.title}: four sections, the "nothing is locked" note, no teacher directory, and a #section link opens its section`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(course.path);
      await expect(page.getByRole('heading', { level: 1, name: course.title })).toBeVisible();
      await expect(page.locator('.tw-course-section')).toHaveCount(4);
      await expect(page.locator('.tw-course-section .tw-row:not(.tw-row-quiz)')).toHaveCount(course.lessons);
      await expect(page.getByText('Nothing is locked. Start any lesson, in any order.').locator('visible=true').first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'For teachers' })).toHaveCount(0);
      await expect(page.getByText(/Digital World is new|Tell us what to fix|no section checks or certificates/)).toHaveCount(0);

      await page.goto(`${course.path}#${course.section}`);
      await expect(page.locator(`#${course.section} .tw-course-section-body`)).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const axe = await new AxeBuilder({ page }).include('main').analyze();
      expect(axe.violations.map((violation) => violation.id)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test('a section is opened on one course without opening the same place on another', async ({ page }) => {
    await page.goto('/course/digital-world#who-builds-ai');
    await expect(page.locator('#who-builds-ai .tw-course-section-body')).toBeVisible();
    await page.goto('/course/southeast-asia-through-time');
    await expect(page.locator('#who-builds-ai')).toHaveCount(0);
  });
});

test.describe('Teacher guides and Credits list every course', () => {
  test('/educators/guides has a teacher guide and a print link for each of the 73 lessons, and answer keys only where checks exist', async ({ page }) => {
    await page.goto('/educators/guides');
    await expect(page.getByRole('heading', { level: 2, name: 'Art, Architecture and Society' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(COURSES.map((course) => course.title));
    await expect(page.locator('a[href^="/educators/lesson/"]')).toHaveCount(73);
    await expect(page.locator('a[href^="/lesson/"][href$="/print"]')).toHaveCount(73);
    await expect(page.locator('a[href^="/educators/section/"][href$="/answers"]')).toHaveCount(8);
    for (const course of COURSES.slice(1)) {
      await expect(page.locator(`a[href="/course/${course.id}/print"]`)).toHaveCount(1);
    }
    await expect(page.getByText('Other courses')).toHaveCount(0);
  });

  test('an old course-page #teacher-guides link goes to that course on the guides page', async ({ page }) => {
    await page.goto('/course/digital-world#teacher-guides');
    await expect(page).toHaveURL(/\/educators\/guides#digital-world$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Digital World' })).toBeVisible();
  });

  test('/credits groups sources, videos and pictures by course and keeps its anchors', async ({ page }) => {
    await page.goto('/credits');
    await expect(page.getByRole('heading', { level: 1, name: 'Credits and sources' })).toBeVisible();
    for (const id of ['sources', 'videos', 'pictures', 'fonts', 'software', 'voices', 'translation']) {
      await expect(page.locator(`#credits-${id}`)).toHaveCount(1);
    }
    await expect(page.locator('#credits-pictures-art-architecture-society')).toHaveCount(1);
    await expect(page.locator('#credits-sources-digital-world')).toHaveCount(1);
  });
});

async function seed(page: Page, learnerId: string, lessonId: string, record: { stagesDone: string[]; currentStage: string; completed?: boolean }) {
  await page.evaluate(
    ({ learnerId, lessonId, record }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('thinkerwell');
        request.onerror = () => reject(new Error('open failed'));
        request.onsuccess = () => {
          const tx = request.result.transaction('progress', 'readwrite');
          const now = new Date().toISOString();
          tx.objectStore('progress').put({
            learnerId,
            lessonId,
            stagesDone: record.stagesDone,
            currentStage: record.currentStage,
            warmUpAnswer: null,
            checkAnswers: {},
            writing: { text: '', planning: {}, selfCheck: {}, exampleShown: false },
            speak: { practisedHow: null },
            watch: { beforeAnswer: '', afterAnswer: '', readInstead: false },
            reflections: {},
            startedAt: now,
            updatedAt: now,
            completedAt: record.completed ? now : null,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(new Error('write failed'));
        };
      }),
    { learnerId, lessonId, record },
  );
}

test.describe('the learner Home counts every course', () => {
  test('a new learner sees 0 of 73, four course rows, and "Choose a course" moves to the list', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await addLearnerViaUi(page, 'Amina');
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hi Amina' })).toBeVisible();
    await expect(page.getByText('0 of 73 lessons completed')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Your progress' })).toHaveAttribute('aria-valuemax', '73');
    await expect(page.getByRole('navigation', { name: 'Courses' })).toHaveCount(0); // no duplicate course pills
    await expect(page.getByRole('link', { name: /^Open (Exploring|Digital|Southeast|Art)/ })).toHaveCount(4);
    await expect(page.getByText('Nothing saved yet. Your writing and reflections show up here once you start.')).toBeVisible();
    await page.getByRole('button', { name: 'Choose a course' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Your courses' })).toBeFocused();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const axe = await new AxeBuilder({ page }).include('main').analyze();
    expect(axe.violations.map((violation) => violation.id)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('progress in a newer course counts, and Resume here goes to that lesson at its step', async ({ page }) => {
    await page.goto('/');
    await addLearnerViaUi(page, 'Amina');
    const db = await page.evaluate(
      () =>
        new Promise<{ id: string }>((resolve) => {
          const request = indexedDB.open('thinkerwell');
          request.onsuccess = () => {
            const get = request.result.transaction('learners').objectStore('learners').getAll();
            get.onsuccess = () => resolve((get.result as Array<{ id: string }>)[0]!);
          };
        }),
    );
    await seed(page, db.id, 'dw-what-ai-is', { stagesDone: ['read', 'write', 'speak', 'reflect'], currentStage: 'reflect', completed: true });
    await seed(page, db.id, 'dw-how-ai-learns', { stagesDone: ['read'], currentStage: 'write' });
    await page.goto('/');
    await expect(page.getByText('1 of 73 lessons completed')).toBeVisible();
    await expect(page.getByText('Resume here')).toBeVisible();
    await expect(page.getByRole('link', { name: /Resume lesson/ })).toHaveAttribute('href', '/lesson/dw-how-ai-learns/write');
    await expect(page.getByText('1 of 17 lessons')).toBeVisible();
  });
});
