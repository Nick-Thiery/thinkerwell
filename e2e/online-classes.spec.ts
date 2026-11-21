import { expect, test } from '@playwright/test';
import { FAKE_CLASS, FAKE_CODE, FAKE_KEY, FAKE_ORG, standInForClasses } from './classesFake';
import { L10 } from './lessonHelpers';

// Online classes (docs/notes/online-classes.md), against a stand-in for
// /api/classes: a learner joins with a code and their progress is sent, a
// teacher and an organisation see their class, and the admin dashboard
// shows numbers with no names.

async function addLearner(page: import('@playwright/test').Page, name: string) {
  await page.goto('/');
  await page.getByRole('button', { name: "I'm new here" }).click();
  await page.getByLabel('First name or nickname').fill(name);
  await page.getByRole('button', { name: 'Create profile' }).click();
  await expect(page.getByRole('heading', { level: 1, name: `Hi ${name}` })).toBeVisible();
}

test('nothing is sent anywhere for a learner who hasn’t joined a class', async ({ page }) => {
  const seen = await standInForClasses(page);
  await addLearner(page, 'Amira');
  await expect(page.getByRole('heading', { name: 'Your class' })).toBeVisible();
  await page.goto(`/lesson/${L10.id}/read`);
  await page.goto('/');
  await page.waitForTimeout(4000);
  expect(seen).toEqual([]);
});

test('a learner sees what their teacher will see, joins, and their progress is sent, never their writing', async ({ page }) => {
  const seen = await standInForClasses(page);
  await addLearner(page, 'Amira');
  await page.getByRole('button', { name: 'Join a class' }).click();
  await page.getByLabel('Class code').fill('zzz zzz');
  await page.getByRole('button', { name: 'Find class' }).click();
  await expect(page.getByText("We couldn't find that class. Check the code with your teacher.")).toBeVisible();
  await page.getByLabel('Class code').fill('k7m q4p');
  await page.getByRole('button', { name: 'Find class' }).click();
  await expect(page.getByText(FAKE_CLASS)).toBeVisible();
  await expect(page.getByText(FAKE_ORG)).toBeVisible();
  // Everything the teacher's page shows, and nothing more (src/courses/class-views/ClassView.tsx).
  await expect(
    page.getByText(
      'If you join, your teacher sees your name, Amira, which lessons and steps you finish and when, how many times you try a section check, and your language and reading level.',
    ),
  ).toBeVisible();
  // The button that joins is not the one that opened the code box.
  await expect(page.getByRole('button', { name: 'Join a class' })).toHaveCount(0);
  // Nothing about the learner has gone anywhere yet: only the code was looked up.
  expect(seen.every((r) => r.method() === 'GET')).toBe(true);
  await page.getByRole('button', { name: 'Join this class' }).click();
  await expect(
    page.getByText(
      'Your teacher can see your name, which lessons and steps you finish and when, your section check tries, and your language and reading level. Not your writing, answers, scores or recordings.',
    ),
  ).toBeVisible();

  const sync = page.waitForRequest((r) => r.url().includes('/api/classes') && r.method() === 'POST', { timeout: 15_000 });
  const body = (await sync).postDataJSON() as {
    learners: Array<Record<string, unknown>>;
  };
  expect(body.learners).toHaveLength(1);
  expect(body.learners[0]).toMatchObject({
    classCode: FAKE_CODE,
    nickname: 'Amira',
  });
  expect(Object.keys(body.learners[0]!).sort()).toEqual(['checks', 'classCode', 'days', 'id', 'language', 'nickname', 'progress', 'readingLevel', 'secret']);

  // Stopping is one question away, and tells the server to forget them.
  await page.getByRole('button', { name: 'Stop sharing' }).click();
  await page.getByRole('button', { name: 'Stop sharing' }).click();
  await expect(page.getByRole('button', { name: 'Join a class' })).toBeVisible();
  const forget = page.waitForRequest((r) => r.url().includes('/api/classes') && r.method() === 'POST' && (r.postDataJSON() as { removals: unknown[] }).removals.length === 1, {
    timeout: 15_000,
  });
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await forget;
});

test('a teacher sees their class by name, with the class code to give out', async ({ page }) => {
  const seen = await standInForClasses(page);
  await page.goto(`/teach#key=${FAKE_KEY}`);
  await expect(page.getByRole('heading', { level: 1, name: FAKE_CLASS })).toBeVisible();
  await expect(page.getByText(FAKE_CODE, { exact: true })).toBeVisible();
  await expect(page.locator('.tw-cv-learner-name').getByText('Mohammed Abdirahman')).toBeVisible();
  await expect(page.getByText('Working on Lesson 10: Why do people build towns near rivers? · Write').first()).toBeVisible();
  // The key goes in a header, never in the address the server sees.
  const read = seen.find((r) => new URL(r.url()).searchParams.get('action') === 'class')!;
  expect(read.url()).not.toContain(FAKE_KEY);
  expect(await read.headerValue('authorization')).toBe(`Bearer ${FAKE_KEY}`);

  await page.getByText('More about Amira').click();
  await page.getByRole('button', { name: 'Take out of class' }).click();
  await expect(page.getByText(/Take Amira out of this class\?/)).toBeVisible();
  const remove = page.waitForRequest((r) => r.method() === 'POST' && (r.postDataJSON() as { action: string }).action === 'class.removeLearner');
  await page.getByRole('button', { name: 'Take out', exact: true }).click();
  await remove;
});

test('without its link, a class view says how to open it and asks the server nothing', async ({ page }) => {
  const seen = await standInForClasses(page);
  for (const path of ['/teach', '/program', '/admin']) {
    await page.goto(path);
    await expect(page.getByText('This page opens only with its own link. Use the link you were sent.')).toBeVisible();
  }
  expect(seen).toEqual([]);
});

test('an organisation sees its classes, opens one, and adds a class with a teacher link to send', async ({ page }) => {
  await standInForClasses(page);
  await page.goto(`/program#key=${FAKE_KEY}`);
  await expect(page.getByRole('heading', { level: 1, name: FAKE_ORG })).toBeVisible();
  await expect(page.getByText('Add a class for each group. Each class gets a code for its learners and a link for its teacher.')).toBeVisible();
  await expect(page.getByText('Afternoon group')).toBeVisible();
  await page.getByLabel('Class name').fill('Evening group');
  await page.getByRole('button', { name: 'Add class' }).click();
  await expect(page.getByText('Evening group is ready.')).toBeVisible();
  await expect(page.getByText('PW3-9RT')).toBeVisible();
  await expect(page.getByLabel("Teacher's link")).toHaveValue(/\/teach#key=t{43}$/);
  await page.getByRole('button', { name: `Open ${FAKE_CLASS}` }).click();
  await expect(page.getByRole('heading', { level: 1, name: FAKE_CLASS })).toBeVisible();
  await expect(page.locator('.tw-cv-learner-name').getByText('Mohammed Abdirahman')).toBeVisible();
});

test('an organisation is asked before a new teacher link stops the old one, or a class closes', async ({ page }) => {
  const seen = await standInForClasses(page);
  const posted = () => seen.filter((r) => r.method() === 'POST').map((r) => (r.postDataJSON() as { action: string }).action);
  await page.goto(`/program#key=${FAKE_KEY}`);
  await page.getByRole('button', { name: `Open ${FAKE_CLASS}` }).click();
  await expect(page.getByRole('heading', { level: 1, name: FAKE_CLASS })).toBeVisible();

  await page.getByRole('button', { name: 'New teacher link' }).click();
  await expect(page.getByText('Make a new teacher link? The link you sent before stops working.')).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();
  expect(posted()).toEqual([]);
  await page.getByRole('button', { name: 'New teacher link' }).click();
  await page.getByRole('button', { name: 'Make a new link' }).click();
  await expect(page.getByLabel("Teacher's link")).toHaveValue(/\/teach#key=n{43}$/);
  expect(posted()).toEqual(['program.newTeacherLink']);

  await page.getByRole('button', { name: 'Close class' }).click();
  await expect(page.getByText(/^Close Morning group\? No one new can join/)).toBeVisible();
  await page.getByRole('button', { name: 'Close class' }).click();
  await expect.poll(posted).toEqual(['program.newTeacherLink', 'program.archiveClass']);
});

test('the admin dashboard shows the numbers, and any class with its learners numbered, never named', async ({ page }) => {
  await standInForClasses(page);
  await page.goto(`/admin#key=${FAKE_KEY}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Admin dashboard' })).toBeVisible();
  await expect(page.getByText('Lessons finished per learner').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lessons most often left unfinished' })).toBeVisible();
  await expect(page.getByText('1 of 2 learners who joined 2 to 12 weeks ago came back a week or more after joining.')).toBeVisible();
  await page.getByRole('button', { name: 'View classes' }).click();
  await page.getByRole('button', { name: `Open ${FAKE_CLASS}` }).click();
  await expect(page.getByText('Learner 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Learner 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Mohammed Abdirahman')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Take out of class' })).toHaveCount(0);
});

test('the admin is asked before a new organisation link stops the old one, or an organisation is switched off', async ({ page }) => {
  const seen = await standInForClasses(page);
  const posted = () => seen.filter((r) => r.method() === 'POST').map((r) => (r.postDataJSON() as { action: string }).action);
  await page.goto(`/admin#key=${FAKE_KEY}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Admin dashboard' })).toBeVisible();
  await page.getByRole('button', { name: 'New link' }).click();
  await expect(page.getByText(`Make a new link for ${FAKE_ORG}? The link you sent before stops working.`)).toBeVisible();
  await page.getByRole('button', { name: 'Make a new link' }).click();
  await expect(page.getByLabel(`${FAKE_ORG}'s link`)).toHaveValue(/\/program#key=o{43}$/);

  await page.getByRole('button', { name: 'Switch off' }).click();
  await expect(page.getByText(new RegExp(`^Switch off ${FAKE_ORG}\\? Its links stop working`))).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();
  expect(posted()).toEqual(['admin.newOrgLink']);
});
