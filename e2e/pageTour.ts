import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { finishLessonViaReflect, L10, nextButton } from './lessonHelpers';
import { uiPattern, uiText, type TestLocale, type UiParams, type UiText } from './uiText';

// Phase 8: one walk through every kind of page, shared by the checks that
// must hold everywhere (no sideways scroll, axe, right to left, tap sizes).
// Not a spec file itself: Playwright only runs *.spec.ts.
//
// The stops run in order in one page, because later ones build on earlier
// ones: a learner is added, Lesson 10 is worked through stage by stage, a
// section check is answered to the end, and the journal then has entries.
// Each stop leaves the page settled on what it names, so a check can run
// straight after it.
//
// Interface text is found by its key in en.json (`ui`), so the same walk
// works in the pseudo-languages too (e2e/languages.spec.ts). Course text
// (lesson titles, questions, answers) stays English in every language.

/** Interface text in the language the tour is walking in. */
export interface TourText {
  locale: TestLocale;
  ui: UiText;
  /** A message as a pattern, its {placeholders} matching anything. */
  pattern: (key: string, params?: UiParams) => RegExp;
}

export function tourText(locale: TestLocale = 'en'): TourText {
  return { locale, ui: uiText(locale), pattern: (key, params) => uiPattern(locale, key, params) };
}

export interface TourStop {
  name: string;
  go: (page: Page, text: TourText) => Promise<void>;
}

/** A long name, so every place that shows it (header, greeting, switcher) is tested at its widest. */
export const TOUR_LEARNER = 'Mohammed Abdirahman';

/** An organisation's name for the consent form and the information sheet: long, and in Indonesian, as a Jakarta partner's might be. */
export const TOUR_ORGANISATION = 'Yayasan Pendidikan Anak Pengungsi Jakarta Selatan';

/** What the tour types in Write and Reflect: the learner's own words, in any language. */
export const TOUR_WRITING = 'I would build the town by the river because of the water.';
export const TOUR_REFLECTION = 'It has water and fertile land.';

const Q1_WRONG = 'The land by rivers was high, dry and rocky.';
const Q2_RIGHT = 'The river may flood the land.';

/** "Continue to Write" and the like: a stage's name inside the button's message. */
function continueTo(ui: UiText, stage: string): string {
  return ui('lessonPlayer.shell.continueTo', { stage: ui(`stages.${stage}`) });
}

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
async function hasMenuButton(page: Page, { ui }: TourText): Promise<boolean> {
  return page.getByRole('button', { name: ui('ds.chrome.siteHeader.openMenu') }).isVisible();
}

export const pageTour: TourStop[] = [
  {
    name: 'home (nobody on this device yet)',
    go: (page, { ui }) => openPath(page, '/', ui('pages.home.title')),
  },
  {
    name: 'new learner form',
    go: async (page, { ui }) => {
      await page.getByRole('button', { name: ui('pages.home.newLearnerTile') }).click();
      await expect(page.getByLabel(ui('pages.home.newLearner.nameLabel'))).toBeVisible();
    },
  },
  {
    name: 'learner home',
    go: async (page, { ui }) => {
      await page.getByLabel(ui('pages.home.newLearner.nameLabel')).fill(TOUR_LEARNER);
      await page.getByRole('button', { name: ui('pages.home.newLearner.submit') }).click();
      await expect(page).toHaveURL(/\/lesson\/.+\/read$/);
      await openPath(page, '/', ui('pages.home.dashboard.greeting', { name: TOUR_LEARNER }));
    },
  },
  {
    name: 'learner switcher open',
    go: async (page, { ui }) => {
      await page.getByRole('button', { name: ui('ds.chrome.siteHeader.switchLearner', { name: TOUR_LEARNER }) }).click();
      await expect(page.getByRole('dialog', { name: ui('header.switcherTitle') })).toBeVisible();
    },
  },
  {
    name: 'course',
    go: (page) => openPath(page, '/course', 'Exploring Our World'),
  },
  {
    name: 'phone menu open (where there is one)',
    go: async (page, text) => {
      if (!(await hasMenuButton(page, text))) return;
      await page.getByRole('button', { name: text.ui('ds.chrome.siteHeader.openMenu') }).click();
      await expect(page.getByRole('navigation', { name: text.ui('nav.label') })).toBeVisible();
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
    go: async (page, { ui }) => {
      await page.getByRole('button', { name: ui('lessonPlayer.visual.seeBigger') }).click();
      await expect(page.getByRole('dialog', { name: ui('lessonPlayer.visual.title.map') })).toBeVisible();
    },
  },
  {
    name: 'lesson: Read part 2',
    go: async (page, { ui }) => {
      await page.getByRole('dialog', { name: ui('lessonPlayer.visual.title.map') }).getByRole('button', { name: ui('lessonPlayer.visual.close') }).click();
      await nextButton(page, ui('lessonPlayer.read.nextPart', { n: 2 })).click();
      await expect(page).toHaveURL(/\?part=2$/);
    },
  },
  {
    name: 'lesson: Read part 3',
    go: async (page, { ui }) => {
      await nextButton(page, ui('lessonPlayer.read.nextPart', { n: 3 })).click();
      await expect(page.getByRole('heading', { name: 'Rivers can also bring problems' })).toBeVisible();
    },
  },
  {
    name: 'lesson: quick check',
    go: async (page, { ui }) => {
      await nextButton(page, ui('lessonPlayer.read.nextCheck')).click();
      await expect(page.getByRole('heading', { name: ui('lessonPlayer.read.checkTitle') })).toBeVisible();
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
    go: async (page, { ui }) => {
      await nextButton(page, continueTo(ui, 'write')).click();
      await expect(page).toHaveURL(/\/write$/);
      await page.getByRole('textbox', { name: ui('lessonPlayer.write.answerLabel') }).fill(TOUR_WRITING);
      await page.getByText(ui('lessonPlayer.write.compareExample')).click();
      await expect(page.getByText(ui('lessonPlayer.write.exampleNote'))).toBeVisible();
    },
  },
  {
    name: 'lesson: Speak',
    go: async (page, { ui }) => {
      await nextButton(page, continueTo(ui, 'speak')).click();
      await expect(page).toHaveURL(/\/speak$/);
    },
  },
  {
    name: 'lesson: Watch (before the tap)',
    go: async (page, { ui }) => {
      await nextButton(page, continueTo(ui, 'watch')).click();
      await expect(page.getByRole('button', { name: ui('ds.content.video.watchLabel') })).toBeVisible();
    },
  },
  {
    name: 'lesson: Watch, read instead',
    go: async (page, { ui }) => {
      await page.getByRole('button', { name: ui('lessonPlayer.watch.readInstead') }).click();
      await expect(page.getByRole('heading', { name: ui('lessonPlayer.watch.keyPoints') })).toBeVisible();
    },
  },
  {
    name: 'lesson: Reflect',
    go: async (page, { ui }) => {
      await nextButton(page, continueTo(ui, 'reflect')).click();
      await page.getByRole('textbox', { name: /good for a town/ }).fill(TOUR_REFLECTION);
    },
  },
  {
    name: 'lesson: complete',
    go: async (page, { ui }) => {
      await nextButton(page, ui('lessonPlayer.shell.finishLesson')).click();
      await expect(page.locator('h1')).toHaveText(ui('lessonPlayer.complete.title', { number: 10 }));
    },
  },
  {
    name: 'certificate: lessons left',
    go: (page, { ui }) => openPath(page, '/certificate/section/geography', ui('certificates.sectionPageTitle', { section: sectionTitle('geography') })),
  },
  {
    // The rest of Geography, each finished through Reflect: the last one finishes the section.
    name: 'lesson: complete, finishing a section',
    go: async (page, { ui }) => {
      for (const lesson of courseLessons.filter((each) => each.number >= 11 && each.number <= 14)) {
        await finishLessonViaReflect(page, lesson, undefined, ui);
      }
      await expect(page.getByRole('link', { name: ui('certificates.offer.getCertificate') })).toBeVisible();
    },
  },
  {
    name: 'certificate',
    go: async (page, { ui }) => {
      await page.getByRole('link', { name: ui('certificates.offer.getCertificate') }).click();
      await expect(page.locator('h1')).toHaveText(ui('certificates.sheet.title'));
      await expect(page.locator('.tw-cert-name')).toHaveText(TOUR_LEARNER);
    },
  },
  {
    // Civics has the longest section name, which once made this page too wide (docs/notes/phase-7.md).
    name: 'section check: intro',
    go: (page, { ui }) => openPath(page, '/section/civics/check', ui('pages.sectionCheck.title', { section: sectionTitle('civics') })),
  },
  {
    name: 'section check: a question after answering',
    go: async (page, { ui }) => {
      await page.getByRole('button', { name: ui('pages.sectionCheck.start') }).click();
      await page.getByRole('radio').first().click();
      await expect(page.locator('.tw-feedback-title')).toBeVisible();
    },
  },
  {
    name: 'section check: results',
    go: async (page, { ui, pattern }) => {
      for (let i = 1; i < 10; i++) {
        await nextButton(page, ui('pages.sectionCheck.nextQuestion')).click();
        await page.getByRole('radio').first().click();
        await expect(page.locator('.tw-feedback-title')).toBeVisible();
      }
      await nextButton(page, ui('pages.sectionCheck.seeResults')).click();
      await expect(page.getByRole('heading', { level: 1, name: pattern('pages.sectionCheck.scoreHeading', { total: 10 }) })).toBeVisible();
    },
  },
  {
    name: 'journal',
    go: async (page, { ui }) => {
      await openPath(page, '/journal', ui('pages.journal.title'));
      await expect(page.locator('article.tw-entry').first()).toBeVisible();
    },
  },
  {
    name: 'educators',
    go: (page, { ui }) => openPath(page, '/educators', ui('pages.educators.title')),
  },
  {
    name: 'educators: teacher guide',
    go: async (page, { ui }) => {
      await page.getByRole('radio', { name: /Geography/ }).click();
      await page.getByRole('link', { name: ui('pages.educators.teacherGuideLabel', { number: 10 }) }).click();
      await expect(page.locator('h1')).toHaveText(L10.title);
      await expect(page.getByRole('table')).toBeVisible();
    },
  },
  {
    // Civics has the longest section name.
    name: 'educators: answer key',
    go: (page, { ui }) => openPath(page, '/educators/section/civics/answers', ui('pages.answerKey.title', { section: sectionTitle('civics') })),
  },
  {
    // The setup checklist, with the steps for other devices open too.
    name: 'educators: set up this device',
    go: async (page, { ui }) => {
      await openPath(page, '/educators', ui('pages.educators.title'));
      await page.getByRole('link', { name: ui('pages.educators.setupCta') }).click();
      await expect(page.locator('h1')).toHaveText(ui('pages.setup.title'));
      await page.getByText(ui('pages.setup.homeScreen.otherDevices')).click();
      await expect(page.getByRole('heading', { level: 3, name: ui('pages.setup.homeScreen.android.name') })).toBeVisible();
      await expect(page.getByText(ui('pages.setup.learners.count', { count: 1 }))).toBeVisible();
    },
  },
  {
    name: 'educators: the class on this device',
    go: async (page, { ui }) => {
      await page.getByRole('link', { name: ui('pages.setup.learners.seeClass') }).click();
      await expect(page.locator('h1')).toHaveText(ui('pages.classView.title'));
      await expect(page.getByRole('article', { name: TOUR_LEARNER })).toBeVisible();
    },
  },
  {
    // Geography is finished, so there is one certificate.
    name: 'educators: all certificates',
    go: async (page, { ui }) => {
      await page.getByRole('link', { name: ui('pages.classView.printAll') }).click();
      await expect(page.locator('h1')).toHaveText(ui('pages.allCertificates.title'));
      await expect(page.locator('.tw-cert-name')).toHaveText(TOUR_LEARNER);
    },
  },
  {
    name: 'about',
    go: (page, { ui }) => openPath(page, '/about', ui('pages.about.title')),
  },
  {
    // Credits, from the link at the end of About: every lesson's sources and video, and the rest.
    name: 'credits',
    go: async (page, { ui }) => {
      await page.getByRole('link', { name: ui('pages.about.creditsLinkCta') }).click();
      await expect(page.locator('h1')).toHaveText(ui('pages.credits.title'));
    },
  },
  {
    // The partner kit, from the footer and the Educators page's "Starting a pilot".
    name: 'for organisations',
    go: async (page, { ui }) => {
      await page.locator('.tw-site-footer').getByRole('link', { name: ui('footer.organisations') }).click();
      await expect(page.locator('h1')).toHaveText(ui('pages.organisations.title'));
    },
  },
  {
    // A long organisation name, so the form is tested at its widest.
    name: 'educators: consent form',
    go: async (page, { ui }) => {
      await page.getByRole('link', { name: ui('pages.educators.pilotConsentCta') }).click();
      await expect(page.locator('h1')).toHaveText(ui('pages.consentForm.title'));
      await page.getByRole('textbox', { name: ui('pages.consentForm.orgLabel') }).fill(TOUR_ORGANISATION);
      await expect(page.locator('.tw-consent strong').first()).toHaveText(TOUR_ORGANISATION);
    },
  },
  {
    // Every box filled, with long words, so the sheet is tested at its widest.
    name: 'educators: information sheet',
    go: async (page, { ui }) => {
      await openPath(page, '/educators', ui('pages.educators.title'));
      await page.locator('.tw-edu-tools').getByRole('link', { name: ui('pages.educators.pilotSheetCta') }).click();
      await expect(page.locator('h1')).toHaveText(ui('pages.infoSheet.title'));
      for (const [label, value] of [
        ['pages.consentForm.orgLabel', TOUR_ORGANISATION],
        ['pages.infoSheet.startLabel', 'Senin, 13 Oktober 2026'],
        ['pages.infoSheet.endLabel', 'Jumat, 21 November 2026'],
        ['pages.infoSheet.sessionsLabel', '12'],
        ['pages.infoSheet.contactLabel', TOUR_LEARNER],
      ] as const) {
        await page.getByRole('textbox', { name: ui(label) }).fill(value);
      }
      await expect(page.locator('.tw-sheet strong').first()).toHaveText('Senin, 13 Oktober 2026');
    },
  },
  {
    name: 'educators: code cards',
    go: async (page, { ui }) => {
      await openPath(page, '/educators', ui('pages.educators.title'));
      await page.locator('.tw-edu-tools').getByRole('link', { name: ui('pages.educators.pilotCodesCta') }).click();
      await expect(page.locator('h1')).toHaveText(ui('pages.codeCards.title'));
      await page.getByRole('textbox', { name: ui('pages.codeCards.prefixLabel') }).fill('HLP');
      await page.getByRole('textbox', { name: ui('pages.codeCards.countLabel') }).fill('12');
      await expect(page.locator('.tw-code-card')).toHaveCount(12);
    },
  },
  {
    name: 'settings',
    go: (page, { ui }) => openPath(page, '/settings', ui('pages.settings.title')),
  },
  {
    // "Load my work" with a file chosen: what it holds, before anything changes.
    // A different learner with the tour learner's (long) name, so the longest
    // preview text shows. Nothing is loaded.
    name: 'settings: a work file to load',
    go: async (page, { ui }) => {
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
      await expect(page.getByRole('group', { name: ui('pages.settings.transfer.load.previewTitle') })).toBeVisible();
      await expect(page.getByRole('button', { name: ui('pages.settings.transfer.load.loadIt') })).toBeVisible();
    },
  },
  {
    name: 'print: lesson',
    go: async (page, { ui }) => {
      await page.goto('/lesson/towns-near-rivers/print');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByRole('button', { name: ui('print.print') })).toBeVisible();
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
    go: (page, { ui }) => openPath(page, '/whatever', ui('notFound.title')),
  },
  {
    name: "home (who's learning, with a learner)",
    go: async (page, { ui }) => {
      await openPath(page, '/', ui('pages.home.dashboard.greeting', { name: TOUR_LEARNER }));
      await page.getByRole('button', { name: ui('ds.chrome.siteHeader.switchLearner', { name: TOUR_LEARNER }) }).click();
      await page.getByRole('button', { name: ui('header.backToPicker') }).click();
      await expect(page.locator('h1')).toHaveText(ui('pages.home.title'));
      await expect(page.getByRole('button', { name: ui('pages.home.remove.label', { name: TOUR_LEARNER }) })).toBeVisible();
    },
  },
  {
    name: 'looking around (guest home)',
    go: async (page, { ui }) => {
      await page.getByRole('button', { name: ui('pages.home.lookAround') }).click();
      await expect(page.locator('h1')).toHaveText(ui('pages.home.guest.title'));
    },
  },
  {
    name: 'certificate, with nobody chosen',
    go: async (page, { ui }) => {
      await openPath(page, '/certificate/course', ui('certificates.coursePageTitle'));
      await expect(page.getByText(ui('certificates.guest'))).toBeVisible();
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

/** A section's title, as the content (not the interface) names it. */
export function sectionTitle(id: string): string {
  const section = courseSections.find((each) => each.id === id);
  if (!section) throw new Error(`No section ${id}`);
  return section.title;
}

/** Walks the whole tour, running `check` at every stop. Interface text is found in `text`'s language (English unless given). */
export async function walkTour(page: Page, check: (stop: TourStop) => Promise<void>, text: TourText = tourText()): Promise<void> {
  for (const stop of pageTour) {
    await stop.go(page, text);
    await settle(page);
    await check(stop);
  }
}
