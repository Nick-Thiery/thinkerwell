import { expect, test, type Locator, type Page } from '@playwright/test';

// Phase 3: learners, home, dashboard and course map. Every test runs against
// a production build (see playwright.config.ts) at phone, tablet and laptop
// widths. Each test gets its own browser context, so IndexedDB starts empty.

// The journeys make several page loads and database round trips; on a busy
// machine (a shared CI runner, other work alongside) they can pass 30s.
test.describe.configure({ timeout: 60_000 });

interface RawProgress {
  learnerId: string;
  lessonId: string;
  stagesDone: string[];
  currentStage: string;
  /** Sets completedAt, so isLessonComplete() (and section/continue-target logic) treats this lesson as finished. */
  completed?: boolean;
}

interface DbDump {
  learners: Array<{ id: string; name: string; colour: string; classCode?: string }>;
  progress: RawProgress[];
}

/** Reads every learner and progress record straight out of IndexedDB. */
async function dumpDb(page: Page): Promise<DbDump> {
  return page.evaluate(
    () =>
      new Promise<DbDump>((resolve, reject) => {
        const request = indexedDB.open('thinkerwell');
        request.onerror = () => reject(new Error(request.error?.message ?? 'IndexedDB open failed'));
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('learners') || !db.objectStoreNames.contains('progress')) {
            db.close();
            resolve({ learners: [], progress: [] });
            return;
          }
          const tx = db.transaction(['learners', 'progress']);
          const learnersReq = tx.objectStore('learners').getAll();
          const progressReq = tx.objectStore('progress').getAll();
          tx.oncomplete = () => {
            db.close();
            resolve({ learners: learnersReq.result as DbDump['learners'], progress: progressReq.result as RawProgress[] });
          };
          tx.onerror = () => reject(new Error(tx.error?.message ?? 'IndexedDB transaction failed'));
        };
      }),
  );
}

/**
 * Every row of every store in the database, plus localStorage: a wider check
 * than `dumpDb` for "look-around saves nothing", which must hold for
 * settings, the device store (current learner) and recordings too, not only
 * learners and progress.
 */
async function dumpEverything(page: Page): Promise<{ stores: Record<string, unknown[]>; localStorageLength: number }> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('thinkerwell');
        request.onerror = () => reject(new Error(request.error?.message ?? 'IndexedDB open failed'));
        request.onsuccess = () => {
          const db = request.result;
          const names = Array.from(db.objectStoreNames);
          if (names.length === 0) {
            db.close();
            resolve({ stores: {}, localStorageLength: window.localStorage.length });
            return;
          }
          const tx = db.transaction(names);
          const requests = names.map((name) => tx.objectStore(name).getAll());
          tx.oncomplete = () => {
            db.close();
            const stores: Record<string, unknown[]> = {};
            names.forEach((name, i) => {
              stores[name] = requests[i]!.result as unknown[];
            });
            resolve({ stores, localStorageLength: window.localStorage.length });
          };
          tx.onerror = () => reject(new Error(tx.error?.message ?? 'IndexedDB transaction failed'));
        };
      }),
  );
}

/**
 * Writes a lesson-progress record straight into IndexedDB, standing in for
 * the phase 4 lesson player (which is what will normally write this store).
 */
async function seedProgress(page: Page, record: RawProgress): Promise<void> {
  await page.evaluate(
    (rec) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('thinkerwell');
        request.onerror = () => reject(new Error(request.error?.message ?? 'IndexedDB open failed'));
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('progress', 'readwrite');
          const now = new Date().toISOString();
          tx.objectStore('progress').put({
            learnerId: rec.learnerId,
            lessonId: rec.lessonId,
            stagesDone: rec.stagesDone,
            currentStage: rec.currentStage,
            warmUpAnswer: null,
            checkAnswers: {},
            writing: { text: '', planning: {}, selfCheck: {}, exampleShown: false },
            speak: { practisedHow: null },
            watch: { beforeAnswer: '', afterAnswer: '', readInstead: false },
            reflections: {},
            startedAt: now,
            updatedAt: now,
            completedAt: rec.completed ? now : null,
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(new Error(tx.error?.message ?? 'IndexedDB transaction failed'));
        };
      }),
    record,
  );
}

/**
 * A learner's own tile on the "who's learning" grid, found by its class
 * rather than its accessible name: every tile there sits beside its own
 * "Remove {name}" button, whose name also contains the learner's name, so a
 * plain role/name lookup for "Kofi" would match both.
 */
function personTile(page: Page, name: string): Locator {
  return page.locator('.tw-tile').filter({ hasText: name });
}

/** The header's learner chip: its accessible name differs between the compact (phone/tablet) and full (laptop) layouts. */
function learnerChip(page: Page): Locator {
  return page.locator('.tw-learner-chip');
}

/**
 * Fills in the new-learner form (already open) and submits it. "Start Lesson
 * 1" means it: it lands the new learner straight on Lesson 1, Read, so this
 * then goes back to "/" for callers that continue on the dashboard.
 */
async function fillNewLearnerForm(page: Page, name: string, options: { classCode?: string; colour?: string } = {}): Promise<void> {
  await page.getByLabel('First name or nickname').fill(name);
  if (options.colour) await page.getByRole('radio', { name: options.colour }).click();
  if (options.classCode) await page.getByLabel('Class code').fill(options.classCode);
  await page.getByRole('button', { name: 'Start Lesson 1' }).click();
  await expect(page).toHaveURL(/\/lesson\/.+\/read$/);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: `Hi ${name}` })).toBeVisible();
}

async function addLearnerViaUi(page: Page, name: string, options: { classCode?: string; colour?: string } = {}): Promise<void> {
  await page.getByRole('button', { name: "I'm new here" }).click();
  await fillNewLearnerForm(page, name, options);
}

/** Tabs forward until `target` has focus, or fails after `maxTabs` presses. */
async function tabUntilFocused(page: Page, target: Locator, maxTabs = 50): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test.describe('new learner flow', () => {
  test('adding a learner asks only for a name, a colour and an optional class code', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: "Who's learning today?" })).toBeVisible();

    await page.getByRole('button', { name: "I'm new here" }).click();
    await expect(page.getByRole('heading', { level: 1, name: "What's your name?" })).toBeVisible();

    // The name is required.
    await page.getByRole('button', { name: 'Start Lesson 1' }).click();
    await expect(page.getByText('Type your name or a nickname.')).toBeVisible();

    await page.getByLabel('First name or nickname').fill('Amina');
    await page.getByRole('radio', { name: 'Green' }).click();
    await page.getByLabel('Class code').fill('hlp-07');
    await page.getByRole('button', { name: 'Start Lesson 1' }).click();

    // "Start Lesson 1" does exactly that.
    await expect(page).toHaveURL(/\/lesson\/.+\/read$/);

    // Going back to "/" shows her own dashboard, pointed at the same lesson.
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hi Amina' })).toBeVisible();
    await expect(page.getByText('Start here')).toBeVisible();

    // Saved with the colour picked and the class code trimmed and upper-cased.
    const db = await dumpDb(page);
    expect(db.learners).toHaveLength(1);
    expect(db.learners[0]).toMatchObject({ name: 'Amina', colour: 'geography', classCode: 'HLP-07' });
  });

  test('a name over 30 characters is rejected', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: "I'm new here" }).click();
    await page.getByLabel('First name or nickname').fill('a'.repeat(31));
    await page.getByRole('button', { name: 'Start Lesson 1' }).click();
    await expect(page.getByText('Keep it to about 30 letters.')).toBeVisible();
    expect((await dumpDb(page)).learners).toHaveLength(0);
  });

  test('an invalid class code is rejected and never saved', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: "I'm new here" }).click();
    await page.getByLabel('First name or nickname').fill('Yusuf');
    await page.getByLabel('Class code').fill('not a code!');
    await page.getByRole('button', { name: 'Start Lesson 1' }).click();
    await expect(page.getByText('Use letters, numbers and hyphens only, like HLP-07.')).toBeVisible();
    expect((await dumpDb(page)).learners).toHaveLength(0);
  });
});

test.describe('switching learners keeps work separate', () => {
  test('each learner sees only their own progress on the dashboard and the course map', async ({ page }) => {
    await page.goto('/');
    await addLearnerViaUi(page, 'Amina');
    const afterFirst = await dumpDb(page);
    const amina = afterFirst.learners.find((l) => l.name === 'Amina')!;

    await seedProgress(page, {
      learnerId: amina.id,
      lessonId: 'finding-out-about-the-past',
      stagesDone: ['read', 'write'],
      currentStage: 'speak',
    });

    // Reload so the dashboard picks up the progress just written straight to IndexedDB.
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hi Amina' })).toBeVisible();
    // Her continue card points at the stage after the two she already finished.
    await expect(page.getByText('Next step: Speak')).toBeVisible();

    await page.goto('/course');
    await expect(page.getByRole('heading', { level: 1, name: 'Exploring Our World' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lesson 1:.*In progress\./ })).toBeVisible();

    // Switch to a brand-new second learner with nothing saved.
    await learnerChip(page).click();
    await page.getByRole('button', { name: "I'm new here" }).click(); // opens the new-learner form directly
    await fillNewLearnerForm(page, 'Deng');
    await expect(page.getByText('Start here')).toBeVisible();

    await page.goto('/course');
    await expect(page.getByRole('link', { name: /Lesson 1:.*Not started\./ })).toBeVisible();

    // Switching back to Amina (from the course map, so it stays put rather
    // than navigating) still shows her progress, untouched by Deng.
    await learnerChip(page).click();
    await page.getByRole('dialog', { name: 'Switch learner' }).getByRole('button', { name: 'Amina' }).click();
    await expect(page.getByRole('link', { name: /Lesson 1:.*In progress\./ })).toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hi Amina' })).toBeVisible();

    const finalDb = await dumpDb(page);
    expect(finalDb.progress.filter((p) => p.learnerId !== amina.id)).toHaveLength(0);
  });
});

test.describe('course map opens the learner\'s current section', () => {
  const HISTORY_LESSON_IDS = [
    'finding-out-about-the-past',
    'objects-and-people',
    'changing-scale',
    'origin-accounts',
    'early-humans',
    'farming-changes-societies',
    'cities-and-states',
    'trade-connects-communities',
    'inventions-and-daily-life',
  ];

  /** Finishes every Section 1 (History) lesson and leaves Lesson 10 (Geography) in progress. */
  async function seedAminaPartwayThroughGeography(page: Page, learnerId: string): Promise<void> {
    for (const lessonId of HISTORY_LESSON_IDS) {
      await seedProgress(page, {
        learnerId,
        lessonId,
        stagesDone: ['read', 'write', 'speak', 'watch', 'reflect'],
        currentStage: 'read',
        completed: true,
      });
    }
    await seedProgress(page, {
      learnerId,
      lessonId: 'towns-near-rivers', // Lesson 10, the first lesson of Geography
      stagesDone: ['read', 'write'],
      currentStage: 'speak',
    });
  }

  test('a learner partway through Geography sees Geography open, not History, however the page is reached', async ({ page }) => {
    await page.goto('/');
    await addLearnerViaUi(page, 'Amina');
    const { learners } = await dumpDb(page);
    const amina = learners.find((l) => l.name === 'Amina')!;
    await seedAminaPartwayThroughGeography(page, amina.id);

    // A fresh load of /course (r2-browser-1 / r2-checks-1 / r2-spec-1): with
    // Section 1 entirely finished, its old default-open initializer would
    // always show History open and hide Lesson 10 inside a collapsed
    // Geography instead.
    await page.goto('/course');
    await expect(page.getByRole('heading', { level: 1, name: 'Exploring Our World' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lesson 10:.*In progress\./ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lesson 1:.*Completed\./ })).toBeHidden();
    await expect(page.getByText('All 9 lessons done. The section check is ready.')).toBeVisible();

    // The disclosure button for the collapsed section stays focusable and
    // keeps keyboard focus when toggled (r2-checks-2 / r2-rules-2), rather
    // than dropping it to <body>.
    const history = page.locator('#history');
    const showHistory = history.getByRole('button', { name: 'Show 9 lessons' });
    await showHistory.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: /Lesson 1:.*Completed\./ })).toBeVisible();
    await expect(history.getByRole('button', { name: 'Hide lessons' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: /Lesson 1:.*Completed\./ })).toBeHidden();
    await expect(history.getByRole('button', { name: 'Show 9 lessons' })).toBeFocused();

    // Switching learners while already on /course re-evaluates it too,
    // rather than keeping the first learner's open section forever.
    await learnerChip(page).click();
    await page.getByRole('button', { name: "I'm new here" }).click();
    await fillNewLearnerForm(page, 'Deng');
    await page.goto('/course');
    await expect(page.getByText('Lessons 10–14', { exact: true })).toBeVisible(); // Geography collapsed for a brand-new learner
    await expect(page.getByRole('link', { name: /Lesson 1:.*Not started\./ })).toBeVisible(); // History open instead

    // A dashboard link to a specific, already-finished section opens and
    // scrolls to it, rather than landing on a collapsed section at the top
    // of the page (r2-spec-3).
    await learnerChip(page).click();
    await page.getByRole('dialog', { name: 'Switch learner' }).getByRole('button', { name: 'Amina' }).click();
    // The switch is saved before the header changes: wait for it, or the
    // reload below can race the write and come back as Deng.
    await expect(page.getByRole('button', { name: 'Switch learner, current: Amina' })).toBeVisible();
    await page.goto('/');
    await page.locator('a.tw-section-row[href="/course#history"]').click();
    await expect(page).toHaveURL(/\/course#history$/);
    await expect(page.getByRole('link', { name: /Lesson 1:.*Completed\./ })).toBeVisible();
  });
});

test.describe('learner switcher stays usable with several learners', () => {
  test('"Just look around" and "Back to who\'s learning" never scroll out of reach', async ({ page }) => {
    await page.goto('/');
    await addLearnerViaUi(page, 'Amina');
    await learnerChip(page).click();
    await page.getByRole('button', { name: "I'm new here" }).click();
    await fillNewLearnerForm(page, 'Reza');
    await learnerChip(page).click();
    await page.getByRole('button', { name: "I'm new here" }).click();
    await fillNewLearnerForm(page, 'Hawa');

    await learnerChip(page).click();
    const dialog = page.getByRole('dialog', { name: 'Switch learner' });
    const guestButton = dialog.getByRole('button', { name: 'Just look around' });
    const backButton = dialog.getByRole('button', { name: "Back to who's learning" });
    await expect(guestButton).toBeVisible();
    await expect(backButton).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    const guestBox = await guestButton.boundingBox();
    const backBox = await backButton.boundingBox();
    expect(dialogBox && guestBox && backBox).toBeTruthy();
    // With 3 learners the tile grid (the learners plus "I'm new here") can be
    // taller than the popover itself, but only that grid scrolls: "Just look
    // around" and "Back to who's learning" live in a fixed footer below it,
    // so they always land inside the popover's own box rather than past its
    // bottom edge with no visible way to find them (r2-browser-2 / r2-checks-3).
    expect(guestBox!.y + guestBox!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height + 1);
    expect(backBox!.y + backBox!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height + 1);
  });
});

test.describe('look-around mode saves nothing', () => {
  test('browsing as a guest writes no learner and no progress to IndexedDB', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Just look around (nothing is saved)' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Explore the course' })).toBeVisible();
    await expect(page.getByText('Open any lesson to see how it works.')).toBeVisible();

    // A real client-side navigation (not page.goto): the header's own "Course"
    // link, opening the phone menu sheet first where the nav is hidden behind
    // it. Look-around lives only in memory, so this is the only way to prove
    // it survives moving around the app, not just a single page.
    const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Course' }).click();
    } else {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Course' }).click();
    }
    await expect(page.getByRole('heading', { level: 1, name: 'Exploring Our World' })).toBeVisible();
    // Look-around is still on: the header banner is still there, and progress
    // (the 0/9 rings and dots a chosen learner would see) is left off entirely.
    await expect(page.getByText('Nothing you do on this visit is saved.')).toBeVisible();
    await expect(page.getByText("You're looking around, so progress isn't shown.")).toBeVisible();

    await page.getByRole('link', { name: /Lesson 1:.*Not started\./ }).click();
    await expect(page).toHaveURL(/\/lesson\//);

    const everything = await dumpEverything(page);
    expect(everything.stores['learners']).toEqual([]);
    expect(everything.stores['progress']).toEqual([]);
    expect(everything.stores['quizAttempts'] ?? []).toEqual([]);
    expect(everything.stores['recordings'] ?? []).toEqual([]);
    expect(everything.stores['settings'] ?? []).toEqual([]);
    expect(everything.stores['device'] ?? []).toEqual([]);
    expect(everything.localStorageLength).toBe(0);
  });

  test('?preview=true starts look-around straight away and shows the note', async ({ page }) => {
    await page.goto('/course?preview=true');
    await expect(page.getByText("You're looking around", { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: "Choose who's learning" })).toBeVisible();
    const db = await dumpDb(page);
    expect(db.learners).toEqual([]);
  });

  test('with no IndexedDB at all, Home explains that and offers to look around', async ({ page }) => {
    // Simulates a private window that blocks on-device storage entirely.
    await page.addInitScript(() => {
      // @ts-expect-error -- deliberately removing a browser API for the test
      delete window.indexedDB;
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: "Your work can't be saved on this device" })).toBeVisible();
    await page.getByRole('button', { name: 'Just look around' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Explore the course' })).toBeVisible();
  });
});

test.describe('removing a learner', () => {
  test('deletes their progress and moves focus back to the picker', async ({ page }) => {
    await page.goto('/');
    await addLearnerViaUi(page, 'Temp');
    const { learners } = await dumpDb(page);
    const temp = learners.find((l) => l.name === 'Temp')!;
    await seedProgress(page, { learnerId: temp.id, lessonId: 'finding-out-about-the-past', stagesDone: ['read'], currentStage: 'write' });

    // Back to the picker to remove them.
    await learnerChip(page).click();
    await page.getByRole('button', { name: "Back to who's learning" }).click();
    await expect(page.getByRole('heading', { level: 1, name: "Who's learning today?" })).toBeVisible();

    await page.getByRole('button', { name: 'Remove Temp' }).click();
    await expect(page.getByRole('heading', { name: 'Remove Temp?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Remove Temp?' })).toBeFocused();

    await page.getByRole('button', { name: 'Remove Temp' }).click();
    await expect(page.getByRole('heading', { level: 1, name: "Who's learning today?" })).toBeVisible();
    await expect(personTile(page, 'Temp')).toHaveCount(0);

    const db = await dumpDb(page);
    expect(db.learners.find((l) => l.id === temp.id)).toBeUndefined();
    expect(db.progress.filter((p) => p.learnerId === temp.id)).toEqual([]);
  });

  test('keeping a learner on the confirm panel changes nothing', async ({ page }) => {
    await page.goto('/');
    await addLearnerViaUi(page, 'Keepme');
    await learnerChip(page).click();
    await page.getByRole('button', { name: "Back to who's learning" }).click();
    await expect(page.getByRole('heading', { level: 1, name: "Who's learning today?" })).toBeVisible();

    await page.getByRole('button', { name: 'Remove Keepme' }).click();
    await page.getByRole('button', { name: 'Keep Keepme' }).click();
    await expect(personTile(page, 'Keepme')).toBeVisible();
    expect((await dumpDb(page)).learners).toHaveLength(1);
  });
});

test.describe('keyboard only', () => {
  // tabUntilFocused steps through the page one Tab (and one focus check) at
  // a time, up to 50 presses, each a round trip to the browser: on a
  // machine under heavy load that can take 15-30s even though nothing here
  // is broken, which sits right next to Playwright's default 30s test
  // timeout (r3-checks-1). Give these tests Playwright's "slow" (3x)
  // timeout rather than raising the default for every test in the suite.
  test.beforeEach(() => {
    test.slow();
  });

  test('choosing an existing learner works with the keyboard alone', async ({ page }) => {
    // Setup with a mouse (not the behaviour under test): get a learner onto the device, then back to the picker.
    await page.goto('/');
    await addLearnerViaUi(page, 'Kofi');
    await learnerChip(page).click();
    await page.getByRole('button', { name: "Back to who's learning" }).click();
    await expect(page.getByRole('heading', { level: 1, name: "Who's learning today?" })).toBeVisible();
    await page.reload(); // a fresh load, so Tab starts at the very top of the page

    const kofiTile = personTile(page, 'Kofi');
    await tabUntilFocused(page, kofiTile);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Hi Kofi' })).toBeVisible();
  });

  test('reaching the course map works with the keyboard alone', async ({ page }) => {
    await page.goto('/');
    // On a narrow header the nav links are inside the phone menu sheet, not
    // visible directly; open it first (its own button is still reachable).
    const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
    if (await menuButton.isVisible()) {
      await tabUntilFocused(page, menuButton);
      await page.keyboard.press('Enter');
    }
    const courseLink = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Course' });
    await tabUntilFocused(page, courseLink);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Exploring Our World' })).toBeVisible();
  });

  test('adding a learner works with the keyboard alone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: "Who's learning today?" })).toBeVisible();

    const newTile = page.getByRole('button', { name: "I'm new here" });
    await tabUntilFocused(page, newTile);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: "What's your name?" })).toBeVisible();

    const nameField = page.getByLabel('First name or nickname');
    await tabUntilFocused(page, nameField);
    await page.keyboard.type('Zara');
    // Into the colour radio group (lands on the checked swatch, White, the
    // default), then two steps along it, wrapping round to Sand (History).
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const submit = page.getByRole('button', { name: 'Start Lesson 1' });
    await tabUntilFocused(page, submit);
    await page.keyboard.press('Enter');

    // "Start Lesson 1" does exactly that.
    await expect(page).toHaveURL(/\/lesson\/.+\/read$/);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Hi Zara' })).toBeVisible();
    const db = await dumpDb(page);
    expect(db.learners).toHaveLength(1);
    expect(db.learners[0]).toMatchObject({ name: 'Zara', colour: 'history' });
  });
});
