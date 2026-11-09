import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addLearnerViaUi, horizontalOverflow, recordRequests, watchErrors } from './lessonHelpers';

// Digital World (src/content/courses.ts, docs/notes/digital-world-preview.md):
// open on every device since 9 November 2026 (the whole-platform pilot): the
// course choice, the course's map, its lessons with their activities, and its
// print views, with one line about what is still being checked on its map.
// Runs at all three sizes; the checks at widths of their own are tagged @own-size.

const DW_FILES = /\/assets\/preview\/digital-world\//;

/** The course needs no switching on: its map opens on any device. (Kept so each test reads as before.) */
async function turnOn(page: Page) {
  await page.goto('/course/digital-world');
  await expect(page.getByRole('heading', { level: 1, name: 'Digital World' })).toBeVisible();
}

const banner = (page: Page) => page.getByText('Draft course: not yet reviewed', { exact: true });

/**
 * What runs past the window's right edge or is cut off inside its own box
 * (a button whose label doesn't fit), even where a parent hides it from
 * the page's own sideways scroll.
 */
async function cutOff(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    // A wide table in a box that scrolls sideways on its own (as Our World's evidence tables do) is meant to.
    const inScroller = (el: HTMLElement) => {
      for (let up = el.parentElement; up && up.tagName !== 'MAIN'; up = up.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(up).overflowX)) return true;
      }
      return false;
    };
    return [...document.querySelectorAll<HTMLElement>('main *')]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0 || inScroller(el)) return false;
        // Glossary words in a sentence wrap with it, so they're left out, as in Our World's lessons.
        return box.right > width + 0.5 || (el.matches('button:not(.tw-term), a') && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1);
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.getAttribute('class') ?? ''} "${el.textContent?.trim().slice(0, 40)}"`)
      .slice(0, 5);
  });
}

test.describe('on a device that has never visited it', () => {
  test('The course map lists it, and none of its files are downloaded until it is opened', async ({ page, request }) => {
    const urls = recordRequests(page);
    for (const path of ['/course']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Courses' }).getByRole('link', { name: /Digital World/ })).toBeVisible();
    }
    expect(urls.filter((url) => DW_FILES.test(url))).toEqual([]);
    await page.goto('/course/digital-world');
    await expect(page.getByRole('heading', { level: 1, name: 'Digital World' })).toBeVisible();
    expect(urls.filter((url) => DW_FILES.test(url)).length).toBeGreaterThan(0);

    // The old hidden address goes to the map. Search engines still list only the public pages.
    await page.goto('/preview/digital-world');
    await expect(page).toHaveURL(/\/course\/digital-world$/);
    for (const path of ['/course/digital-world', '/lesson/dw-what-ai-is/read']) {
      expect(await (await request.get(path)).text(), path).toContain('<meta name="robots" content="noindex"');
    }
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).not.toMatch(/dw-|digital-world|preview/);
    expect(await (await request.get('/robots.txt')).text()).not.toMatch(/digital|preview/i);
  });
});

test.describe('with the course open', () => {
  test('shows a course choice, Our World first, with no draft marking', async ({ page }) => {
    await page.goto('/course');
    const choice = page.getByRole('navigation', { name: 'Courses' });
    await expect(choice.getByRole('link')).toHaveText(['Exploring Our World', 'Digital World', 'Southeast Asia Through Time', 'Art, Architecture and Society']);
    await expect(choice.getByRole('link', { name: 'Exploring Our World' })).toHaveAttribute('aria-current', 'page');
    // Our World's map is as it was, under the choice.
    await expect(page.getByRole('heading', { level: 1, name: 'Exploring Our World' })).toBeVisible();

    await choice.getByRole('link', { name: /Digital World/ }).click();
    await expect(page).toHaveURL(/\/course\/digital-world$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Digital World' })).toBeVisible();
    await expect(banner(page)).toHaveCount(0);
    await expect(page.getByText('Digital World is new. An AI researcher is still checking its facts.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['How AI developed and how it works', 'Who builds AI, and at what cost', 'AI in daily life', 'Truth, power and choices', 'For teachers']);
    await expect(page.getByText(/Section check:/)).toHaveCount(0);
    await expect(page.locator('.tw-course-section .tw-row:not(.tw-row-quiz)')).toHaveCount(17);
  });

  test('a learner does one whole lesson, saved on the device: Read teaches without a warm-up or an activity', async ({ page, baseURL }) => {
    const errors = watchErrors(page);
    const urls = recordRequests(page);
    await addLearnerViaUi(page, 'Amina');
    await turnOn(page);
    await page.goto('/course/digital-world');
    await page.getByRole('link', { name: /^Lesson 1:/ }).click();
    await expect(page).toHaveURL(/\/lesson\/dw-what-ai-is\/read$/);
    await expect(page.getByRole('heading', { level: 1, name: "What AI is, and what it isn't" })).toBeVisible();
    await expect(banner(page)).toHaveCount(0);

    // Justin's brief of 4 November 2026: no warm-up and no activity here, just the evidence and the reading.
    await expect(page.locator('.tw-read-warmup-question')).toHaveCount(0);
    await expect(page.locator('.tw-dw-activity')).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    // The rest of Read, as in Our World.
    await page.getByRole('button', { name: 'Next: Part 2' }).click();
    await page.getByRole('button', { name: 'Next: Part 3' }).click();
    await page.getByRole('button', { name: 'Next: Quick check' }).click();
    for (const question of await page.getByRole('radiogroup').all()) await question.getByRole('radio').first().click();
    await page.getByRole('button', { name: 'Continue to Write' }).click();

    await page.getByRole('textbox', { name: 'Your answer' }).fill('The voice tool learned from recordings, and a person checks its mistakes.');
    await page.getByRole('button', { name: 'Continue to Speak' }).click();
    await page.getByRole('button', { name: 'Continue to Watch' }).click();
    await page.getByRole('button', { name: 'Continue to Reflect' }).click();
    // Wait for Reflect: until it renders, the first text box is still Watch's "Think first".
    await expect(page).toHaveURL(/\/reflect$/);
    const reflection = page.getByRole('textbox').first();
    await reflection.fill('AI guesses from examples.');
    await expect(page.getByRole('button', { name: 'Finish lesson' })).toBeEnabled();
    await page.getByRole('button', { name: 'Finish lesson' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'You finished Lesson 1.' })).toBeVisible();
    // No section check or certificate in the draft; the next lesson is up next.
    await expect(page.getByText(/Section check/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Dreams of thinking machines/ })).toBeVisible();
    await page.getByRole('link', { name: 'Back to the course' }).click();
    await expect(page).toHaveURL(/\/course\/digital-world#thinking-machines$/);
    await expect(page.getByRole('link', { name: /^Lesson 1:.*Completed\./ })).toBeVisible();

    // Saved with the lesson's work, on this device, under the lesson's own id.
    const saved = await page.evaluate(
      () =>
        new Promise<unknown>((resolve) => {
          const open = indexedDB.open('thinkerwell');
          open.onsuccess = () => {
            const get = open.result.transaction('progress').objectStore('progress').getAll();
            get.onsuccess = () => resolve(get.result.find((record: { lessonId: string }) => record.lessonId === 'dw-what-ai-is'));
          };
        }),
    );
    expect(saved).toMatchObject({ completedAt: expect.any(String), stagesDone: expect.arrayContaining(['read', 'write', 'reflect']) });

    const origin = new URL(baseURL ?? 'http://localhost').origin;
    expect(urls.filter((url) => !url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:'))).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('trains the leaf model: 4 of 6, 6 of 6, 0 of 2, 8 of 8, then 3 of 4 on leaves nobody has used', async ({ page }) => {
    await turnOn(page);
    await page.goto('/lesson/dw-how-ai-learns/read');
    // The leaf model is an optional extension, folded away until wanted.
    await page.getByText('Try it yourself (optional)').click();
    await expect(page.getByRole('heading', { level: 3, name: 'Try the leaf model' })).toBeVisible();
    const label = (description: string, choice: 'Healthy' | 'Sick') =>
      page.getByRole('group', { name: `Label for: ${description}` }).getByRole('button', { name: choice }).click();
    const score = page.getByTestId('tw-dw-tm-score');
    const train = page.getByRole('button', { name: 'Train the model' });

    await expect(train).toBeDisabled();
    // The first leaf by keyboard: it moves to the Healthy group and keeps focus.
    await page.getByRole('group', { name: 'Label for: Big dark green leaf' }).getByRole('button', { name: 'Healthy' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('region', { name: 'Healthy examples' }).getByRole('article', { name: 'Big dark green leaf' })).toBeVisible();
    await expect(page.locator(':focus')).toHaveAttribute('aria-pressed', 'true');
    await label('Brown leaf with spots', 'Sick');
    await train.click();
    await expect(score).toHaveText('The model got 4 of 6 right.');
    expect(await cutOff(page)).toEqual([]);
    await expect(page.locator(':focus')).toHaveText("The model's guesses");

    await page.getByRole('button', { name: 'Go on to “Round 2: more, different examples”' }).click();
    await label('Small new leaf, light green', 'Healthy');
    await label('Yellow leaf with no spots', 'Sick');
    await label('Green leaf with a few tiny marks', 'Healthy');
    await label('Small leaf with many spots', 'Sick');
    await train.click();
    await expect(score).toHaveText('The model got 6 of 6 right.');

    await page.getByRole('button', { name: 'Go on to “A new plant”' }).click();
    await page.getByRole('button', { name: 'Test the new leaves' }).click();
    await expect(score).toHaveText('The model got 0 of 2 right.');

    await page.getByRole('button', { name: 'Go on to “Round 3: add the new plant”' }).click();
    await label('Long thin leaf with pale stripes', 'Healthy');
    await label('Long thin brown leaf with spots', 'Sick');
    await train.click();
    await expect(score).toHaveText('The model got 8 of 8 right.');

    await page.getByRole('button', { name: 'Go on to “Round 4: leaves nobody has used”' }).click();
    await page.getByRole('button', { name: 'Test the new leaves' }).click();
    await expect(score).toHaveText('The model got 3 of 4 right.');
    expect(await cutOff(page)).toEqual([]);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('every lesson prints, with its activity on paper, and the whole course prints together', async ({ page }) => {
    await turnOn(page);
    await page.goto('/lesson/dw-how-ai-learns/print');
    await expect(page.getByRole('heading', { level: 1, name: 'How AI learns from examples' })).toBeVisible();
    await expect(page.getByText('Digital World: a new course. Its facts are still being checked.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Optional extension' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Try the leaf model' })).toBeVisible();

    await page.goto('/course/digital-world/print');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(17);
    // Since Justin's brief of 4 November 2026, four lessons keep an activity: three plus Lesson 3's optional extension.
    await expect(page.getByRole('heading', { level: 2, name: 'Activity' })).toHaveCount(3);
    await expect(page.getByRole('heading', { level: 2, name: 'Optional extension' })).toHaveCount(1);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    // On paper: no banner, toolbar or header; each lesson after the first starts a new page.
    await page.emulateMedia({ media: 'print' });
    await expect(banner(page)).toBeHidden();
    await expect(page.locator('.tw-print-sheet').nth(1)).toHaveCSS('break-before', 'page');

    await page.emulateMedia({ media: 'screen' });
    await page.goto('/educators/lesson/dw-ai-at-school');
    await expect(page.getByRole('heading', { level: 2, name: 'The activity' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'For reviewers' })).toBeVisible();
  });

  test('in Indonesian, the interface and the lessons are translated, with no Watch step', async ({ page }) => {
    await turnOn(page);
    await page.goto('/lesson/dw-what-ai-is/read');
    await page.getByRole('button', { name: /Language|Bahasa/ }).first().click();
    await page.getByRole('menuitemradio', { name: /Bahasa Indonesia/ }).or(page.getByRole('radio', { name: /Bahasa Indonesia/ })).first().click();
    await expect(page.getByText('Kursus draf: belum ditinjau')).toHaveCount(0);
    await expect(page.getByText(/pelajarannya masih dalam bahasa Inggris/)).toHaveCount(0);
    const title = page.getByRole('heading', { level: 1, name: 'Apa itu AI, dan apa yang bukan AI' });
    await expect(title).toBeVisible();
    await expect(title).not.toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    // No approved Indonesian video: Watch's address goes on to Reflect.
    await page.goto('/lesson/dw-what-ai-is/watch');
    await expect(page).toHaveURL(/\/lesson\/dw-what-ai-is\/reflect$/);
  });
});

test.describe('every page and activity', { tag: '@own-size' }, () => {
  const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'];
  const lessons = [
    'dw-what-ai-is',
    'dw-history-of-ai',
    'dw-how-ai-learns',
    'dw-language-models',
    'dw-hidden-work',
    'dw-cost-of-computing',
    'dw-ai-and-languages',
    'dw-when-ai-gets-it-wrong',
    'dw-ai-and-work',
    'dw-ai-in-your-community',
    'dw-ai-at-school',
    'dw-faces-and-cameras',
    'dw-spotting-fakes',
    'dw-checking-a-claim',
    'dw-feeds-and-elections',
    'dw-rules-for-ai',
    'dw-design-an-ai-helper',
  ];

  test('fit from 320 to 1280px wide with no sideways scroll, and pass axe', async ({ page }) => {
    test.setTimeout(240_000);
    await turnOn(page);
    const pages = [
      '/preview/digital-world',
      '/course/digital-world',
      ...lessons.map((id) => `/lesson/${id}/${id === 'dw-design-an-ai-helper' ? 'write' : 'read'}`),
      '/lesson/dw-rules-for-ai/print',
      '/educators/lesson/dw-ai-at-school',
    ];
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of pages) {
        await page.goto(path);
        await expect(page.locator('h1').first()).toBeVisible();
        // Open what can be opened, so axe and the width check see it too.
        const closed = page.locator(
          '.tw-dw-page-button[aria-expanded="false"], .tw-dw-tm-numbers:not([open]) > summary, details.tw-dw-extension:not([open]) > summary',
        );
        for (let opened = 0; opened < 20 && (await closed.count()) > 0; opened++) await closed.first().click();
        expect(await horizontalOverflow(page), `${path} at ${width}px`).toBeLessThanOrEqual(0);
        expect(await cutOff(page), `${path} at ${width}px`).toEqual([]);
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(
          results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`),
          `${path} at ${width}px`,
        ).toEqual([]);
        // An answered question shows more ("Correct", what most people say): it fits too.
        const answer = page.locator('.tw-dw-activity').getByRole('radio').first();
        if (await answer.count()) {
          await answer.check();
          expect(await cutOff(page), `${path} at ${width}px, answered`).toEqual([]);
        }
      }
    }
  });

  test('every activity control is at least 44 by 44px', async ({ page }) => {
    await turnOn(page);
    await page.setViewportSize({ width: 390, height: 900 });
    for (const id of ['dw-how-ai-learns', 'dw-ai-at-school', 'dw-checking-a-claim', 'dw-design-an-ai-helper']) {
      await page.goto(`/lesson/${id}/${id === 'dw-design-an-ai-helper' ? 'write' : 'read'}`);
      // Lesson 3's leaf model is folded away as an optional extension.
      if (id === 'dw-how-ai-learns') await page.getByText('Try it yourself (optional)').click();
      await expect(page.locator('.tw-dw-activity')).toBeVisible();
      // As e2e/tap-targets.spec.ts measures them: a radio inside its label is as big as the label.
      const small = await page.locator('.tw-dw-activity').evaluate((root) =>
        [...root.querySelectorAll<HTMLElement>('a[href], button, input:not([type="hidden"]), textarea, summary, [role="button"], [role="radio"]')]
          .map((el) => {
            const label = el.closest('label');
            const box = (label && el.tagName === 'INPUT' ? label : el).getBoundingClientRect();
            return { el, box };
          })
          .filter(({ box }) => box.width > 0 && (box.width + 0.5 < 44 || box.height + 0.5 < 44))
          .map(({ el, box }) => `${el.tagName} "${el.textContent?.trim().slice(0, 40)}" ${Math.round(box.width)}x${Math.round(box.height)}`),
      );
      expect(small, id).toEqual([]);
    }
  });
});
