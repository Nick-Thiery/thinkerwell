import { expect, test, type Page } from '@playwright/test';
import {
  addLearnerViaUi,
  dumpEverything,
  expectVisibleFocus,
  horizontalOverflow,
  L10,
  nextButton,
  recordRequests,
  storedProgress,
  tabTo,
  VIDEO_HOSTS,
  watchErrors,
} from './lessonHelpers';

// Phase 4: Lesson 10 end to end, at 390, 820 and 1280 (the phone, tablet and
// laptop projects in playwright.config.ts), against a production build.
// Each test gets a fresh browser context, so IndexedDB starts empty.

// A whole lesson with several reloads: more than the default 30s.
test.describe.configure({ timeout: 120_000 });

const RETRY = 'rgb(155, 71, 0)'; // --retry, burnt orange
const CORRECT = 'rgb(11, 107, 122)'; // --correct, teal

const Q1 = {
  wrong: 'The land by rivers was high, dry and rocky.',
  right: 'Floods left mud that made the soil fertile.',
};
const Q2_RIGHT = 'The river may flood the land.';

function question(page: Page, index: number) {
  return page.locator('.tw-question').nth(index);
}

/** The glossary popover: open the first marked word in the reading, check it, close it. */
async function tapGlossaryWord(page: Page) {
  const term = page.locator('.tw-reading .tw-term').first();
  const word = (await term.textContent())!.trim();
  await term.click();
  expect(word.length).toBeGreaterThan(0);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
}

/** A stage other than the current one shows its tick in the StagePath. */
async function expectStageDone(page: Page, stage: string) {
  // Done stages carry a ", done" suffix: visually hidden text, or in the
  // compact label on phones. The current stage has none.
  const nav = page.getByRole('navigation', { name: 'Lesson steps' }).first();
  await expect(nav.getByRole('link', { name: new RegExp(`^${stage}.*done`, 'i') })).toBeVisible();
}

test('Lesson 10 end to end as a new learner, in both reading levels, with reload and restore', async ({ page }) => {
  const errors = watchErrors(page);
  const requests = recordRequests(page);

  await addLearnerViaUi(page, 'Amina');
  await page.goto(L10.path('read'));
  await expect(page.locator('h1')).toHaveText(L10.title);
  await expect(page.locator('h1')).toHaveCount(1);

  // Just opening a lesson saves nothing.
  expect(await storedProgress(page, L10.id)).toBeUndefined();

  // Warm-up: any answer is fine and saved at once.
  const hill = page.getByRole('radio', { name: 'On the hill' });
  await hill.click();
  await expect(hill).toHaveAttribute('aria-checked', 'true');

  // Part 1, Standard.
  const levels = page.getByRole('group', { name: 'Reading level' });
  await expect(levels.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Rivers give water and food' })).toBeVisible();
  const standardText = await page.locator('.tw-reading').innerText();
  await tapGlossaryWord(page);

  // Key words lists every glossary word.
  await page.getByRole('button', { name: 'Key words' }).click();
  for (const word of ['settlement', 'fertile', 'crops', 'goods', 'flood', 'risk']) {
    await expect(page.locator('.tw-def').filter({ hasText: new RegExp(`^${word}`, 'i') }).first()).toBeVisible();
  }
  await page.getByRole('button', { name: 'Key words' }).click();

  // Simpler: the text changes, the label says so, and the glossary still works.
  await levels.getByRole('button', { name: 'Simpler' }).click();
  await expect(levels.getByRole('button', { name: 'Simpler' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Read · 1 of 3 · Simpler English')).toBeVisible();
  expect(await page.locator('.tw-reading').innerText()).not.toBe(standardText);
  await tapGlossaryWord(page);

  await nextButton(page, 'Next: Part 2').click();
  await expect(page).toHaveURL(/\?part=2$/);
  await expect(page.getByRole('heading', { name: 'Rivers help people travel and trade' })).toBeVisible();
  await expect(page.getByText('Read · 2 of 3 · Simpler English')).toBeVisible();
  await tapGlossaryWord(page);

  // Reload: the part, the level and the warm-up come back.
  await page.reload();
  await expect(page.getByText('Read · 2 of 3 · Simpler English')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Reading level' }).getByRole('button', { name: 'Simpler' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('radio', { name: 'On the hill' })).toHaveAttribute('aria-checked', 'true');

  // Back to Standard for part 3.
  await page.getByRole('group', { name: 'Reading level' }).getByRole('button', { name: 'Standard' }).click();
  await nextButton(page, 'Next: Part 3').click();
  await expect(page).toHaveURL(/\?part=3$/);
  await expect(page.getByRole('heading', { name: 'Rivers can also bring problems' })).toBeVisible();
  await expect(page.getByText(/Simpler English/)).toHaveCount(0);
  await tapGlossaryWord(page);

  // The quick check.
  await nextButton(page, 'Next: Quick check').click();
  await expect(page).toHaveURL(/\?part=check$/);
  await expect(page.getByRole('heading', { name: 'Quick check' })).toBeFocused();

  // Wrong first: "Not quite" in burnt orange, with the option's own hint.
  await question(page, 0).getByRole('radio', { name: Q1.wrong }).click();
  const retry = question(page, 0).locator('.tw-feedback-retry');
  await expect(retry).toContainText('Not quite yet');
  await expect(retry).toContainText('Read the first section again.');
  await expect(retry.locator('.tw-feedback-title')).toHaveCSS('color', RETRY);
  // Try again, then right: teal.
  await question(page, 0).getByRole('button', { name: 'Try again' }).click();
  await expect(retry).toHaveCount(0);
  await question(page, 0).getByRole('radio', { name: Q1.right }).click();
  const correct = question(page, 0).locator('.tw-feedback-correct');
  await expect(correct).toContainText('Correct');
  await expect(correct.locator('.tw-feedback-title')).toHaveCSS('color', CORRECT);
  await question(page, 1).getByRole('radio', { name: Q2_RIGHT }).click();
  await expect(question(page, 1).locator('.tw-feedback-correct')).toBeVisible();

  // The optional think question: typed text survives a reload straight away
  // (the pagehide / visibilitychange flush), not only after the typing pause.
  const think = page.getByRole('textbox', { name: /most good things/ });
  await think.fill('The River site has water and fertile land.');
  await page.reload();
  await expect(page.getByRole('textbox', { name: /most good things/ })).toHaveValue(
    'The River site has water and fertile land.',
  );
  await expect(question(page, 0).getByRole('radio', { name: Q1.right })).toHaveAttribute('aria-checked', 'true');
  await expect(question(page, 1).getByRole('radio', { name: Q2_RIGHT })).toHaveAttribute('aria-checked', 'true');

  // Answers are stored by their index in the content file, not the shuffled position.
  const afterCheck = await storedProgress(page, L10.id);
  expect(afterCheck?.checkAnswers['0']).toMatchObject({ type: 'choice', selected: 0, correct: true, tries: 2 });
  expect(afterCheck?.checkAnswers['1']).toMatchObject({ type: 'choice', selected: 2, correct: true, tries: 1 });
  expect(afterCheck?.warmUpAnswer).toBe('On the hill');
  expect(afterCheck?.stagesDone).toContain('read');

  // Write.
  await nextButton(page, 'Continue to Write').click();
  await expect(page).toHaveURL(/\/write$/);
  await expectStageDone(page, 'Read');
  const answer = page.getByRole('textbox', { name: 'Your answer' });
  // The example is hidden until the learner writes something (or asks).
  await expect(page.getByRole('button', { name: 'See an example answer' })).toBeVisible();
  await expect(page.getByText('Compare with an example answer')).toHaveCount(0);
  // Not just the label: the example's own words aren't in the page at all.
  await expect(page.getByText('building houses on tall legs', { exact: false })).toHaveCount(0);

  await answer.fill('Rivers matter.');
  // Put the caret at the very start, then add a starter: it goes in there
  // and focus stays in the box, so typing carries on after it.
  await answer.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 0));
  await answer.press('ArrowLeft');
  await page.getByRole('button', { name: 'One reason is...' }).click();
  await expect(answer).toBeFocused();
  await page.keyboard.type('boats can carry goods. ');
  await expect(answer).toHaveValue('One reason is boats can carry goods. Rivers matter.');

  // Now there is writing, the example is offered (closed).
  const example = page.getByText('Compare with an example answer');
  await expect(example).toBeVisible();
  await example.click();
  await expect(page.getByText('This is one way to answer. Yours can be different.')).toBeVisible();

  const tick = page.getByRole('checkbox', { name: 'I named one place.' });
  await tick.check();
  await expect(tick).toBeChecked();
  // A tick saves at once. Wait for it to land before reloading: a reload
  // within milliseconds of the tap can abort a write still queued behind
  // the previous one (seen only with the whole suite running at once).
  await expect.poll(async () => (await storedProgress(page, L10.id))?.writing.selfCheck[0]).toBe(true);

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue(
    'One reason is boats can carry goods. Rivers matter.',
  );
  await expect(page.getByRole('checkbox', { name: 'I named one place.' })).toBeChecked();
  // Once shown, the example stays open when the learner comes back.
  await expect(page.getByText('This is one way to answer. Yours can be different.')).toBeVisible();

  // Speak.
  await nextButton(page, 'Continue to Speak').click();
  await expect(page).toHaveURL(/\/speak$/);
  await expectStageDone(page, 'Write');
  const partner = page.getByRole('radio', { name: 'I practised with a partner' });
  await partner.click();
  await expect(partner).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => (await storedProgress(page, L10.id))?.stagesDone).toContain('speak');

  // Watch: nothing from YouTube or Google before the tap.
  await nextButton(page, 'Continue to Watch').click();
  await expect(page).toHaveURL(/\/watch$/);
  await expect(page.getByRole('button', { name: 'Watch the video' })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Read instead' }).click();
  await expect(page.getByRole('heading', { name: 'Ancient Mesopotamia 101' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Key points' })).toBeVisible();
  const after = page.getByRole('textbox', { name: /Tigris and Euphrates/ });
  await after.fill('The rivers gave water for farms, so cities could grow.');
  await after.blur();
  await expect.poll(async () => (await storedProgress(page, L10.id))?.stagesDone).toContain('watch');
  expect(requests.filter((url) => VIDEO_HOSTS.test(new URL(url).hostname))).toEqual([]);

  // Reflect: Finish stays disabled until the required prompt has an answer.
  await nextButton(page, 'Continue to Reflect').click();
  await expect(page).toHaveURL(/\/reflect$/);
  const finish = nextButton(page, 'Finish lesson');
  await expect(finish).toBeDisabled();
  await page.getByRole('textbox', { name: /good for a town/ }).fill('It has water and fertile land.');
  await expect(finish).toBeEnabled();
  await finish.click();

  await expect(page).toHaveURL(/\/complete$/);
  await expect(page.locator('h1')).toHaveText('You finished Lesson 10.');
  await expect(page.getByText('Your writing and your reflection are saved in your journal.')).toBeVisible();

  const done = await storedProgress(page, L10.id);
  expect(done?.stagesDone.slice().sort()).toEqual(['read', 'reflect', 'speak', 'watch', 'write']);
  expect(done?.completedAt).toBeTruthy();
  expect(done?.watch).toMatchObject({ readInstead: true });
  expect(done?.speak.practisedHow).toBe(0);

  // The course map shows the lesson complete with all five stage dots.
  await page.goto('/course');
  const row = page.getByRole('link', { name: /^Lesson 10:.*Completed\./ });
  await expect(row).toBeVisible();
  await expect(row.locator('.tw-dots')).toHaveAttribute('aria-label', '5 of 5 steps done');

  // The learner home's continue card has moved on to the next lesson.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hi Amina' })).toBeVisible();
  await expect(page.getByText('Next step: Read')).toBeVisible();
  await expect(page.getByText('How do maps help us understand a place?').first()).toBeVisible();

  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('partial progress: the course map and the continue card point at the current stage', async ({ page }) => {
  await addLearnerViaUi(page, 'Deng');
  await page.goto(`${L10.path('read')}?part=check`);
  await page.locator('.tw-question').first().getByRole('radio').first().click();
  await nextButton(page, 'Continue to Write').click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('Near the river.');
  await nextButton(page, 'Continue to Speak').click();
  await expect(page).toHaveURL(/\/speak$/);
  await expect.poll(async () => (await storedProgress(page, L10.id))?.currentStage).toBe('speak');

  await page.goto('/course');
  const row = page.getByRole('link', { name: /^Lesson 10:.*In progress\./ });
  await expect(row.locator('.tw-dots')).toHaveAttribute('aria-label', '2 of 5 steps done');
  await expect(row).toHaveAttribute('href', L10.path('speak'));

  await page.goto('/');
  await expect(page.getByText('Next step: Speak')).toBeVisible();
  await expect(page.getByText(L10.title).first()).toBeVisible();
});

test('any stage opens directly, even with no progress', async ({ page }) => {
  await addLearnerViaUi(page, 'Kofi');
  for (const step of ['reflect', 'watch', 'speak', 'write', 'complete']) {
    await page.goto(L10.path(step));
    await expect(page.locator('h1')).toHaveCount(1);
  }
  // A learner who hasn't finished isn't told they have.
  await expect(page.locator('h1')).toHaveText("You're partway through Lesson 10.");
  expect(await storedProgress(page, L10.id)).toBeUndefined();
});

test('text typed just before a reload is kept even if the last IndexedDB write never lands', async ({ page }) => {
  const errors = watchErrors(page);
  await addLearnerViaUi(page, 'Lina');
  await page.goto(L10.path('write'));
  const answer = page.getByRole('textbox', { name: 'Your answer' });
  await answer.fill('Rivers give towns water.');
  // Simulate the browser dropping every IndexedDB write while the page
  // unloads (as it can when the last-moment put waits behind another save).
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException('Simulated: the page went away first', 'AbortError');
    };
  });
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('Rivers give towns water.');
  // Written back to IndexedDB on load, and the copy outside it removed.
  expect((await storedProgress(page, L10.id))?.writing.text).toBe('Rivers give towns water.');
  expect((await dumpEverything(page)).localStorageLength).toBe(0);
  expect(errors).toEqual([]);
});

test.describe('look-around saves nothing', () => {
  test('the whole of Lesson 10 as a guest writes nothing to IndexedDB or localStorage', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Just look around (nothing is saved)' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Explore the course' })).toBeVisible();
    // Look-around lives in memory, so reach the lesson by client-side links.
    const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
    if (await menuButton.isVisible()) await menuButton.click();
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Course' }).click();
    await page.getByRole('region', { name: 'Geography & Our Environment' }).getByRole('button', { name: 'Show 5 lessons' }).click();
    await page.getByRole('link', { name: /^Lesson 10:/ }).click();
    await expect(page.locator('h1')).toHaveText(L10.title);

    await page.getByRole('radio', { name: 'Near the river' }).click();
    await page.getByRole('group', { name: 'Reading level' }).getByRole('button', { name: 'Simpler' }).click();
    await nextButton(page, 'Next: Part 2').click();
    await nextButton(page, 'Next: Part 3').click();
    await nextButton(page, 'Next: Quick check').click();
    await question(page, 0).getByRole('radio', { name: Q1.right }).click();
    await question(page, 1).getByRole('radio', { name: Q2_RIGHT }).click();
    await page.getByRole('textbox', { name: /most good things/ }).fill('The River site.');
    await nextButton(page, 'Continue to Write').click();
    await expect(page.getByText('Nothing is saved while you look around.', { exact: false })).toBeVisible();
    await page.getByRole('textbox', { name: 'Your answer' }).fill('Near the river.');
    await page.getByRole('checkbox', { name: 'I named one place.' }).check();
    await nextButton(page, 'Continue to Speak').click();
    await page.getByRole('radio', { name: 'I practised on my own' }).click();
    await nextButton(page, 'Continue to Watch').click();
    await page.getByRole('button', { name: 'Read instead' }).click();
    await page.getByRole('textbox', { name: /Tigris and Euphrates/ }).fill('Water.');
    await nextButton(page, 'Continue to Reflect').click();
    await page.getByRole('textbox', { name: /good for a town/ }).fill('Water.');
    await nextButton(page, 'Finish lesson').click();
    await expect(page.locator('h1')).toHaveText('You finished Lesson 10.');

    // Moving around keeps the guest's answers for the visit.
    await page.getByRole('navigation', { name: 'Lesson steps' }).getByRole('link', { name: /^Write/ }).click();
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('Near the river.');

    const dump = await dumpEverything(page);
    for (const store of ['learners', 'progress', 'quizAttempts', 'recordings', 'settings', 'device']) {
      expect(dump.stores[store] ?? [], store).toEqual([]);
    }
    expect(dump.localStorageLength).toBe(0);
  });

  test('?preview=true saves nothing either', async ({ page }) => {
    await page.goto(`${L10.path('read')}?preview=true`);
    await expect(page.locator('h1')).toHaveText(L10.title);
    await page.getByRole('radio', { name: 'In the forest' }).click();
    await page.getByRole('group', { name: 'Reading level' }).getByRole('button', { name: 'Simpler' }).click();
    await page.goto(`${L10.path('read')}?part=check&preview=true`);
    await question(page, 0).getByRole('radio', { name: Q1.wrong }).click();
    await nextButton(page, 'Continue to Write').click();
    await page.getByRole('textbox', { name: 'Your answer' }).fill('Up the hill.');
    await nextButton(page, 'Continue to Speak').click();
    await page.getByRole('radio', { name: 'I practised in a group' }).click();

    const dump = await dumpEverything(page);
    for (const store of ['learners', 'progress', 'quizAttempts', 'recordings', 'settings', 'device']) {
      expect(dump.stores[store] ?? [], store).toEqual([]);
    }
    expect(dump.localStorageLength).toBe(0);
  });
});

test("the next guest on a shared device never sees the last guest's answers", async ({ page }) => {
  // Guest A: looks around from "Who's learning today?" and writes a reflection.
  await page.goto('/');
  const lookAround = page.getByRole('button', { name: 'Just look around (nothing is saved)' });
  await lookAround.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Explore the course' })).toBeVisible();

  async function openReflectAsGuest() {
    // Look-around lives in memory, so go by client-side links.
    const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
    if (await menuButton.isVisible()) await menuButton.click();
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Course' }).click();
    await page.getByRole('region', { name: 'Geography & Our Environment' }).getByRole('button', { name: 'Show 5 lessons' }).click();
    await page.getByRole('link', { name: /^Lesson 10:/ }).click();
    await expect(page.locator('h1')).toHaveText(L10.title);
    await page.getByRole('navigation', { name: 'Lesson steps' }).first().getByRole('link', { name: /^Reflect/ }).click();
    await expect(page).toHaveURL(/\/reflect$/);
  }

  await openReflectAsGuest();
  await page.getByRole('textbox', { name: /good for a town/ }).fill('Guest A private thought');

  // Guest A hands the device on: "Choose a learner" in the look-around banner.
  await page.locator('.tw-lookaround-banner').getByRole('button', { name: 'Choose a learner' }).click();
  await expect(page.getByRole('heading', { level: 1, name: "Who's learning today?" })).toBeVisible();

  // Guest B looks around and opens the same page: empty.
  await lookAround.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Explore the course' })).toBeVisible();
  await openReflectAsGuest();
  await expect(page.getByRole('textbox', { name: /good for a town/ })).toHaveValue('');
  await expect(page.getByText('Guest A private thought')).toHaveCount(0);
});

test.describe('Watch falls back to the written version when the player never gets going', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only.');

  async function openWatchAndTap(page: Page) {
    await page.clock.install();
    await page.goto(L10.path('watch'));
    await expect(page.locator('h1')).toHaveText(L10.title);
    await page.getByRole('button', { name: 'Watch the video' }).click();
    await expect(page.locator('iframe')).toHaveCount(1);
  }

  test('when the connection to the player is refused (the frame still "loads")', async ({ page }) => {
    await page.route(/youtube-nocookie\.com/, (route) => route.abort('connectionrefused'));
    await openWatchAndTap(page);
    // Chromium puts its own error page in the frame and fires load: that must not count.
    await page.clock.runFor(21_000);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.getByText('The video is taking a long time to load.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Key points' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try the video again' })).toBeVisible();
  });

  test('when something other than the player answers (a filter or captive portal page)', async ({ page }) => {
    await page.route(/youtube-nocookie\.com/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><p>This site is blocked.</p>' }),
    );
    await openWatchAndTap(page);
    await page.clock.runFor(21_000);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.getByText('The video is taking a long time to load.')).toBeVisible();
  });

  test('but not when the player says it is ready', async ({ page }) => {
    // A stand-in player: answers the page's "listening" message the way
    // YouTube's embed does, from the youtube-nocookie origin.
    const player = `<!doctype html><script>
      addEventListener('message', (event) => {
        let data; try { data = JSON.parse(event.data); } catch { return; }
        if (data && data.event === 'listening') {
          event.source.postMessage(JSON.stringify({ event: 'onReady', id: data.id, channel: 'widget' }), event.origin);
        }
      });
    </script><p>Player</p>`;
    let embedUrl = '';
    await page.route(/youtube-nocookie\.com/, (route) => {
      embedUrl = route.request().url();
      return route.fulfill({ status: 200, contentType: 'text/html', body: player });
    });
    await openWatchAndTap(page);
    await page.clock.runFor(25_000);
    await expect(page.locator('iframe')).toHaveCount(1);
    await expect(page.getByText('The video is taking a long time to load.')).toHaveCount(0);
    const url = new URL(embedUrl);
    expect(url.searchParams.get('enablejsapi')).toBe('1');
    expect(url.searchParams.get('origin')).toBe(new URL(page.url()).origin);
    expect(url.searchParams.has('autoplay')).toBe(false);
  });
});

test('keyboard only through Lesson 10', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Keyboard-only use is checked at tablet and laptop widths.');
  const errors = watchErrors(page);
  await addLearnerViaUi(page, 'Yusuf');
  await page.goto(L10.path('read'));
  await expect(page.locator('h1')).toHaveText(L10.title);

  // Warm-up chips: a radio group; arrow keys move the choice.
  const river = page.getByRole('radio', { name: 'Near the river' });
  await tabTo(page, river);
  await expectVisibleFocus(page);
  await page.keyboard.press('Space');
  await expect(river).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'On the hill' })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'On the hill' })).toHaveAttribute('aria-checked', 'true');

  // The level switch.
  const simpler = page.getByRole('group', { name: 'Reading level' }).getByRole('button', { name: 'Simpler' });
  await page.keyboard.press('Shift+Tab');
  await tabTo(page, simpler);
  await expectVisibleFocus(page);
  await page.keyboard.press('Enter');
  await expect(simpler).toHaveAttribute('aria-pressed', 'true');

  // A glossary word: Enter opens its meaning, Escape closes it and returns focus.
  const term = page.locator('.tw-reading .tw-term').first();
  await tabTo(page, term);
  await expectVisibleFocus(page);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(term).toBeFocused();

  // Next part: focus moves to the new part's heading.
  for (const [label, part] of [
    ['Next: Part 2', '2'],
    ['Next: Part 3', '3'],
  ] as const) {
    const next = nextButton(page, label);
    await tabTo(page, next);
    await expectVisibleFocus(page);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`part=${part}$`));
    await expect(page.locator('.tw-reading-h')).toBeFocused();
  }
  await tabTo(page, nextButton(page, 'Next: Quick check'));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Quick check' })).toBeFocused();

  // Options: Tab into the group, arrow keys move, Space chooses.
  for (const [index, right] of [
    [0, Q1.right],
    [1, Q2_RIGHT],
  ] as const) {
    const options = question(page, index).getByRole('radio');
    await tabTo(page, options.first());
    await expectVisibleFocus(page);
    for (let i = 0; i < 3; i++) {
      if ((await page.evaluate(() => document.activeElement?.textContent ?? '')).includes(right)) break;
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('Space');
    await expect(question(page, index).getByRole('radio', { name: right })).toHaveAttribute('aria-checked', 'true');
    await expect(question(page, index).locator('.tw-feedback-correct')).toBeVisible();
  }

  await tabTo(page, nextButton(page, 'Continue to Write'));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/write$/);

  // A starter chip: Enter adds it and focus lands in the box.
  const starter = page.getByRole('button', { name: 'I would build the new town at the ___ site.' });
  await tabTo(page, starter);
  await expectVisibleFocus(page);
  await page.keyboard.press('Enter');
  const answer = page.getByRole('textbox', { name: 'Your answer' });
  await expect(answer).toBeFocused();
  await page.keyboard.type('River');
  await expect(answer).toHaveValue('I would build the new town at the River site.');
  const tick = page.getByRole('checkbox', { name: 'I named one place.' });
  await tabTo(page, tick);
  await page.keyboard.press('Space');
  await expect(tick).toBeChecked();
  await tabTo(page, nextButton(page, 'Continue to Speak'));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/speak$/);

  const onMyOwn = page.getByRole('radio', { name: 'I practised with a partner' });
  await tabTo(page, onMyOwn);
  await expectVisibleFocus(page);
  await page.keyboard.press('Space');
  await expect(onMyOwn).toHaveAttribute('aria-checked', 'true');
  await tabTo(page, nextButton(page, 'Continue to Watch'));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/watch$/);

  const readInstead = page.getByRole('button', { name: 'Read instead' });
  await tabTo(page, readInstead);
  await expectVisibleFocus(page);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ancient Mesopotamia 101' })).toBeFocused();
  // The "For teachers" note opens with the keyboard too.
  const teachers = page.locator('.tw-watch-teachers summary');
  if (await teachers.count()) {
    await tabTo(page, teachers);
    await expectVisibleFocus(page);
  }
  await tabTo(page, nextButton(page, 'Continue to Reflect'));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/reflect$/);

  const required = page.getByRole('textbox', { name: /good for a town/ });
  await tabTo(page, required);
  await expectVisibleFocus(page);
  await page.keyboard.type('Water and good soil.');
  await tabTo(page, nextButton(page, 'Finish lesson'));
  await expectVisibleFocus(page);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/complete$/);
  await expect(page.locator('h1')).toHaveText('You finished Lesson 10.');
  expect(errors).toEqual([]);
});
