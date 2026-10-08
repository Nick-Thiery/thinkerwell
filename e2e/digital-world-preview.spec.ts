import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addLearnerViaUi, horizontalOverflow, recordRequests, watchErrors } from './lessonHelpers';

// Digital World, a preview course (src/content/courses.ts,
// docs/notes/digital-world-preview.md): invisible on every device until it
// visits /preview/digital-world, then a course choice, the course's map, its
// lessons with their activities, and its print views, with a "Draft
// course" banner on every page. Runs at all three sizes; the checks at
// widths of their own are tagged @own-size.

const DW_FILES = /\/assets\/preview\/digital-world\//;

async function turnOn(page: Page) {
  await page.goto('/preview/digital-world');
  await expect(page.getByRole('heading', { level: 1, name: 'Digital World preview is on' })).toBeVisible();
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

test.describe('with the preview off', () => {
  test('nothing about Digital World appears, and nothing of it is downloaded', async ({ page, request }) => {
    const urls = recordRequests(page);
    for (const path of ['/', '/course']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Courses on this device' })).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('Digital World');
    }
    for (const path of ['/course/digital-world', '/course/digital-world/print', '/lesson/dw-what-ai-is/read', '/lesson/dw-how-ai-learns/print', '/educators/lesson/dw-scams']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: "This page isn't here" })).toBeVisible();
      await expect(banner(page)).toHaveCount(0);
    }
    expect(urls.filter((url) => DW_FILES.test(url))).toEqual([]);

    // No search-engine pages: every Digital World address is app.html (noindex), and none is in the sitemap.
    for (const path of ['/preview/digital-world', '/course/digital-world', '/lesson/dw-what-ai-is/read']) {
      expect(await (await request.get(path)).text(), path).toContain('<meta name="robots" content="noindex"');
    }
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).not.toMatch(/dw-|digital-world|preview/);
    expect(await (await request.get('/robots.txt')).text()).not.toMatch(/digital|preview/i);
  });
});

test.describe('with the preview on', () => {
  test('shows a course choice, Our World first, and turns off again from the banner', async ({ page }) => {
    await turnOn(page);
    await page.goto('/course');
    const choice = page.getByRole('navigation', { name: 'Courses on this device' });
    await expect(choice.getByRole('link')).toHaveText(['Exploring Our World', /^Digital World\s*Draft$/]);
    await expect(choice.getByRole('link', { name: 'Exploring Our World' })).toHaveAttribute('aria-current', 'page');
    // Our World's map is as it was, under the choice.
    await expect(page.getByRole('heading', { level: 1, name: 'Exploring Our World' })).toBeVisible();

    await choice.getByRole('link', { name: /Digital World/ }).click();
    await expect(page).toHaveURL(/\/course\/digital-world$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Digital World' })).toBeVisible();
    await expect(banner(page)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['How AI works', 'Check what you see', 'Use tools wisely', 'AI where you live', 'For teachers and reviewers']);
    await expect(page.getByText(/Section check:/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Turn preview off' }).click();
    await expect(page).toHaveURL(/\/course$/);
    await expect(page.getByRole('navigation', { name: 'Courses on this device' })).toHaveCount(0);
    await page.goto('/course/digital-world');
    await expect(page.getByRole('heading', { level: 1, name: "This page isn't here" })).toBeVisible();
  });

  test('a learner does one whole lesson with its activity, saved on the device', async ({ page, baseURL }) => {
    const errors = watchErrors(page);
    const urls = recordRequests(page);
    await addLearnerViaUi(page, 'Amina');
    await turnOn(page);
    await page.goto('/course/digital-world');
    await page.getByRole('link', { name: /^Lesson 1:/ }).click();
    await expect(page).toHaveURL(/\/lesson\/dw-what-ai-is\/read$/);
    await expect(page.getByRole('heading', { level: 1, name: "What AI is, and what it isn't" })).toBeVisible();
    await expect(banner(page)).toBeVisible();

    // The activity, after the evidence: sort with the keyboard, then by tapping.
    const activity = page.getByRole('region', { name: 'AI or not AI?' });
    const calculator = activity.getByRole('group', { name: 'Calculator' });
    await calculator.getByRole('radio', { name: 'Uses AI' }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(calculator.getByRole('radio', { name: 'Not AI' })).toBeChecked();
    await expect(activity.getByText(/Most people would say not AI/)).toBeVisible();
    await activity.getByRole('group', { name: '“Smart” fan' }).getByText('Hard to say').click();
    await expect(activity.getByText(/Any group can be right here/)).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    // The rest of Read, as in Our World.
    await page.getByRole('button', { name: 'Next: Part 2' }).click();
    await page.getByRole('button', { name: 'Next: Part 3' }).click();
    await page.getByRole('button', { name: 'Next: Quick check' }).click();
    for (const question of await page.getByRole('radiogroup').all()) await question.getByRole('radio').first().click();
    await page.getByRole('button', { name: 'Continue to Write' }).click();

    await page.getByRole('textbox', { name: 'Your answer' }).fill('The calculator follows fixed steps, so it is not AI.');
    await page.getByRole('button', { name: 'Continue to Speak' }).click();
    await page.getByText('I practised on my own').click();
    await page.getByRole('button', { name: 'Continue to Watch' }).click();
    await page.getByRole('button', { name: 'Continue to Reflect' }).click();
    await page.getByRole('textbox').first().fill('AI guesses from examples.');
    await page.getByRole('button', { name: 'Finish lesson' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'You finished Lesson 1.' })).toBeVisible();
    // No section check or certificate in the draft; the next lesson is up next.
    await expect(page.getByText(/Section check/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /How AI learns from examples/ })).toBeVisible();
    await page.getByRole('link', { name: 'Back to the course' }).click();
    await expect(page).toHaveURL(/\/course\/digital-world#how-ai-works$/);
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
    expect(saved).toMatchObject({ completedAt: expect.any(String), activity: { answers: { calculator: 'not-ai', 'smart-fan': 'hard' } } });

    const origin = new URL(baseURL ?? 'http://localhost').origin;
    expect(urls.filter((url) => !url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:'))).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('trains the leaf model: 4 of 6, 6 of 6, 0 of 2, then 8 of 8', async ({ page }) => {
    await turnOn(page);
    await page.goto('/lesson/dw-how-ai-learns/read');
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
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('every lesson prints, with its activity on paper, and the whole course prints together', async ({ page }) => {
    await turnOn(page);
    await page.goto('/lesson/dw-how-ai-learns/print');
    await expect(page.getByRole('heading', { level: 1, name: 'How AI learns from examples' })).toBeVisible();
    await expect(page.getByText("Digital World, draft course: not yet reviewed. Don't use it with learners yet.")).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Train the leaf model' })).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(3);

    await page.goto('/course/digital-world/print');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(11);
    await expect(page.getByRole('heading', { level: 2, name: 'Activity' })).toHaveCount(11);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    // On paper: no banner, toolbar or header; each lesson after the first starts a new page.
    await page.emulateMedia({ media: 'print' });
    await expect(banner(page)).toBeHidden();
    await expect(page.locator('.tw-print-sheet').nth(1)).toHaveCSS('break-before', 'page');

    await page.emulateMedia({ media: 'screen' });
    await page.goto('/educators/lesson/dw-asking-good-questions');
    await expect(page.getByRole('heading', { level: 2, name: 'The activity' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'For reviewers' })).toBeVisible();
  });

  test('in Indonesian, the interface is translated and the lessons are marked as English', async ({ page }) => {
    await turnOn(page);
    await page.goto('/lesson/dw-scams/read');
    await page.getByRole('button', { name: /Language|Bahasa/ }).first().click();
    await page.getByRole('menuitemradio', { name: /Bahasa Indonesia/ }).or(page.getByRole('radio', { name: /Bahasa Indonesia/ })).first().click();
    await expect(page.getByText('Kursus draf: belum ditinjau')).toBeVisible();
    await expect(page.getByText(/Untuk saat ini, pelajarannya masih dalam bahasa Inggris\./)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Scams: fake prizes, loans and job offers' })).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  });
});

test.describe('every page and activity', { tag: '@own-size' }, () => {
  const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'];
  const lessons = [
    'dw-what-ai-is',
    'dw-how-ai-learns',
    'dw-when-ai-gets-it-wrong',
    'dw-spotting-fakes',
    'dw-checking-a-claim',
    'dw-scams',
    'dw-your-privacy',
    'dw-asking-good-questions',
    'dw-numbers-that-persuade',
    'dw-ai-in-your-community',
    'dw-design-an-ai-helper',
  ];

  test('fit from 320 to 1280px wide with no sideways scroll, and pass axe', async ({ page }) => {
    test.setTimeout(240_000);
    await turnOn(page);
    const pages = [
      '/preview/digital-world',
      '/course/digital-world',
      ...lessons.map((id) => `/lesson/${id}/${id === 'dw-design-an-ai-helper' ? 'write' : 'read'}`),
      '/lesson/dw-scams/print',
      '/educators/lesson/dw-numbers-that-persuade',
    ];
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of pages) {
        await page.goto(path);
        await expect(page.locator('h1').first()).toBeVisible();
        // Open what can be opened, so axe and the width check see it too.
        const closed = page.locator('.tw-dw-page-button[aria-expanded="false"], .tw-dw-tm-numbers:not([open]) > summary');
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
    for (const id of lessons) {
      await page.goto(`/lesson/${id}/${id === 'dw-design-an-ai-helper' ? 'write' : 'read'}`);
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
