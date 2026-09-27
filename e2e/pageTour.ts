import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { L10, nextButton } from './lessonHelpers';

// Phase 8: one walk through every kind of page, shared by the checks that
// must hold everywhere (no sideways scroll, axe, right to left, tap sizes).
// Not a spec file itself: Playwright only runs *.spec.ts.
//
// The stops run in order in one page, because later ones build on earlier
// ones: a learner is added, Lesson 10 is worked through stage by stage, a
// section check is answered to the end, and the journal then has entries.
// Each stop leaves the page settled on what it names, so a check can run
// straight after it.

export interface TourStop {
  name: string;
  go: (page: Page) => Promise<void>;
}

/** A long name, so every place that shows it (header, greeting, switcher) is tested at its widest. */
export const TOUR_LEARNER = 'Mohammed Abdirahman';

const Q1_WRONG = 'The land by rivers was high, dry and rocky.';
const Q2_RIGHT = 'The river may flood the land.';

async function openPath(page: Page, path: string, heading: string | RegExp): Promise<void> {
  await page.goto(path);
  await expect(page.locator('h1')).toHaveText(heading);
}

/** Waits for fonts and images, so widths are measured as they will finally be. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((resolve) => img.addEventListener('load', resolve, { once: true }))),
    );
  });
}

/** Below about 1100px the five nav links sit behind a menu button; true when that button is showing. */
async function hasMenuButton(page: Page): Promise<boolean> {
  return page.getByRole('button', { name: 'Open navigation menu' }).isVisible();
}

export const pageTour: TourStop[] = [
  {
    name: 'home (nobody on this device yet)',
    go: (page) => openPath(page, '/', "Who's learning today?"),
  },
  {
    name: 'new learner form',
    go: async (page) => {
      await page.getByRole('button', { name: "I'm new here" }).click();
      await expect(page.getByLabel('First name or nickname')).toBeVisible();
    },
  },
  {
    name: 'learner home',
    go: async (page) => {
      await page.getByLabel('First name or nickname').fill(TOUR_LEARNER);
      await page.getByRole('button', { name: 'Start Lesson 1' }).click();
      await expect(page).toHaveURL(/\/lesson\/.+\/read$/);
      await openPath(page, '/', `Hi ${TOUR_LEARNER}`);
    },
  },
  {
    name: 'learner switcher open',
    go: async (page) => {
      await page.getByRole('button', { name: `Switch learner, current: ${TOUR_LEARNER}` }).click();
      await expect(page.getByRole('dialog', { name: 'Switch learner' })).toBeVisible();
    },
  },
  {
    name: 'course',
    go: (page) => openPath(page, '/course', 'Exploring Our World'),
  },
  {
    name: 'phone menu open (where there is one)',
    go: async (page) => {
      if (!(await hasMenuButton(page))) return;
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    },
  },
  {
    name: 'lesson: Read part 1 (warm-up and picture)',
    go: async (page) => {
      await openPath(page, L10.path('read'), L10.title);
      await expect(page.getByRole('heading', { name: 'Rivers give water and food' })).toBeVisible();
    },
  },
  {
    name: 'lesson: the picture, bigger',
    go: async (page) => {
      await page.getByRole('button', { name: 'See it bigger' }).click();
      await expect(page.getByRole('dialog', { name: 'The map' })).toBeVisible();
    },
  },
  {
    name: 'lesson: Read part 2',
    go: async (page) => {
      await page.getByRole('dialog', { name: 'The map' }).getByRole('button', { name: 'Close' }).click();
      await nextButton(page, 'Next: Part 2').click();
      await expect(page).toHaveURL(/\?part=2$/);
    },
  },
  {
    name: 'lesson: Read part 3',
    go: async (page) => {
      await nextButton(page, 'Next: Part 3').click();
      await expect(page.getByRole('heading', { name: 'Rivers can also bring problems' })).toBeVisible();
    },
  },
  {
    name: 'lesson: quick check',
    go: async (page) => {
      await nextButton(page, 'Next: Quick check').click();
      await expect(page.getByRole('heading', { name: 'Quick check' })).toBeVisible();
    },
  },
  {
    name: 'lesson: quick-check feedback',
    go: async (page) => {
      const questions = page.locator('.tw-question');
      await questions.nth(0).getByRole('radio', { name: Q1_WRONG }).click();
      await expect(questions.nth(0).locator('.tw-feedback-retry')).toBeVisible();
      await questions.nth(1).getByRole('radio', { name: Q2_RIGHT }).click();
      await expect(questions.nth(1).locator('.tw-feedback-correct')).toBeVisible();
    },
  },
  {
    name: 'lesson: Write (with the example answer open)',
    go: async (page) => {
      await nextButton(page, 'Continue to Write').click();
      await expect(page).toHaveURL(/\/write$/);
      await page.getByRole('textbox', { name: 'Your answer' }).fill('I would build the town by the river because of the water.');
      await page.getByText('Compare with an example answer').click();
      await expect(page.getByText('This is one way to answer. Yours can be different.')).toBeVisible();
    },
  },
  {
    name: 'lesson: Speak',
    go: async (page) => {
      await nextButton(page, 'Continue to Speak').click();
      await expect(page).toHaveURL(/\/speak$/);
    },
  },
  {
    name: 'lesson: Watch (before the tap)',
    go: async (page) => {
      await nextButton(page, 'Continue to Watch').click();
      await expect(page.getByRole('button', { name: 'Watch the video' })).toBeVisible();
    },
  },
  {
    name: 'lesson: Watch, read instead',
    go: async (page) => {
      await page.getByRole('button', { name: 'Read instead' }).click();
      await expect(page.getByRole('heading', { name: 'Key points' })).toBeVisible();
    },
  },
  {
    name: 'lesson: Reflect',
    go: async (page) => {
      await nextButton(page, 'Continue to Reflect').click();
      await page.getByRole('textbox', { name: /good for a town/ }).fill('It has water and fertile land.');
    },
  },
  {
    name: 'lesson: complete',
    go: async (page) => {
      await nextButton(page, 'Finish lesson').click();
      await expect(page.locator('h1')).toHaveText('You finished Lesson 10.');
    },
  },
  {
    // Civics has the longest section name, which once made this page too wide (docs/notes/phase-7.md).
    name: 'section check: intro',
    go: (page) => openPath(page, '/section/civics/check', 'Section check: Civics, Media & Everyday Economics'),
  },
  {
    name: 'section check: a question after answering',
    go: async (page) => {
      await page.getByRole('button', { name: 'Start the check' }).click();
      await page.getByRole('radio').first().click();
      await expect(page.locator('.tw-feedback-title')).toBeVisible();
    },
  },
  {
    name: 'section check: results',
    go: async (page) => {
      for (let i = 1; i < 10; i++) {
        await nextButton(page, 'Next question').click();
        await page.getByRole('radio').first().click();
        await expect(page.locator('.tw-feedback-title')).toBeVisible();
      }
      await nextButton(page, 'See your results').click();
      await expect(page.getByRole('heading', { level: 1, name: /^\d+ out of 10$/ })).toBeVisible();
    },
  },
  {
    name: 'journal',
    go: async (page) => {
      await openPath(page, '/journal', 'My journal');
      await expect(page.locator('article.tw-entry').first()).toBeVisible();
    },
  },
  {
    name: 'educators',
    go: (page) => openPath(page, '/educators', 'For educators'),
  },
  {
    name: 'educators: teacher guide',
    go: async (page) => {
      await page.getByRole('radio', { name: /Geography/ }).click();
      await page.getByRole('link', { name: 'Teacher guide for Lesson 10' }).click();
      await expect(page.locator('h1')).toHaveText(L10.title);
      await expect(page.getByRole('table')).toBeVisible();
    },
  },
  {
    // Civics has the longest section name.
    name: 'educators: answer key',
    go: (page) => openPath(page, '/educators/section/civics/answers', 'Answer key: Civics, Media & Everyday Economics'),
  },
  {
    name: 'about',
    go: (page) => openPath(page, '/about', 'About Thinkerwell'),
  },
  {
    name: 'settings',
    go: (page) => openPath(page, '/settings', 'Settings for this device'),
  },
  {
    // "Load my work" with a file chosen: what it holds, before anything changes.
    // A different learner with the tour learner's (long) name, so the longest
    // preview text shows. Nothing is loaded.
    name: 'settings: a work file to load',
    go: async (page) => {
      const file = {
        format: 'thinkerwell-work',
        version: 1,
        savedAt: '2026-09-28T09:00:00.000Z',
        learners: [
          {
            learner: { id: 'tour-other-learner', name: TOUR_LEARNER, colour: 'civics', createdAt: '2026-09-01T08:00:00.000Z' },
            progress: [],
            quizAttempts: [],
          },
        ],
      };
      await page
        .locator('input[type="file"]')
        .setInputFiles({ name: 'thinkerwell-all-learners-2026-09-28.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
      await expect(page.getByRole('group', { name: 'Check before you load' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Load it' })).toBeVisible();
    },
  },
  {
    name: 'print: lesson',
    go: async (page) => {
      await page.goto('/lesson/towns-near-rivers/print');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
    },
  },
  {
    name: 'print: journal',
    go: async (page) => {
      await page.goto('/journal/print');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 2, name: L10.title })).toBeVisible();
    },
  },
  {
    name: 'not found',
    go: (page) => openPath(page, '/whatever', "This page isn't here"),
  },
  {
    name: "home (who's learning, with a learner)",
    go: async (page) => {
      await openPath(page, '/', `Hi ${TOUR_LEARNER}`);
      await page.getByRole('button', { name: `Switch learner, current: ${TOUR_LEARNER}` }).click();
      await page.getByRole('button', { name: "Back to who's learning" }).click();
      await expect(page.locator('h1')).toHaveText("Who's learning today?");
      await expect(page.getByRole('button', { name: `Remove ${TOUR_LEARNER}` })).toBeVisible();
    },
  },
  {
    name: 'looking around (guest home)',
    go: async (page) => {
      await page.getByRole('button', { name: 'Just look around (nothing is saved)' }).click();
      await expect(page.locator('h1')).toHaveText('Explore the course');
    },
  },
];

/** Every lesson and section, straight from content/, for checks that go through all of them. */
const contentDir = path.join(import.meta.dirname, '..', 'content');
export const courseSections = (
  JSON.parse(readFileSync(path.join(contentDir, 'course.json'), 'utf8')) as {
    sections: Array<{ id: string; title: string; lessons: number[] }>;
  }
).sections;
export const courseLessons = readdirSync(path.join(contentDir, 'lessons'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(path.join(contentDir, 'lessons', name), 'utf8')) as { id: string; number: number; title: string })
  .sort((a, b) => a.number - b.number);

/** Walks the whole tour, running `check` at every stop. */
export async function walkTour(page: Page, check: (stop: TourStop) => Promise<void>): Promise<void> {
  for (const stop of pageTour) {
    await stop.go(page);
    await settle(page);
    await check(stop);
  }
}
