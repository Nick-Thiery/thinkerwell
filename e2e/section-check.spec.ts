import { expect, test } from '@playwright/test';
import { addLearnerViaUi, dumpEverything, nextButton } from './lessonHelpers';

// Phase 7: a full section check, start to finish, against the real
// Geography quiz content -- the intro, one question at a time with feedback
// and a working "From Lesson N" link, a wrong answer showing up under
// "Worth another look", the saved attempt, and "Try the check again".

const SECTION_TITLE = 'Geography & Our Environment';
const WRONG_Q1_OPTION = 'Boats kept the river from flooding';
const Q1_TEXT = 'Long ago, why did towns often grow at places where boats stopped on a river?';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface QuizAttemptRecord {
  sectionId: string;
  attempts: number;
  best: { score: number; total: number };
}

test('a full section check: intro, ten questions with feedback, results, and a saved attempt', async ({ page }) => {
  test.setTimeout(60_000);
  await addLearnerViaUi(page, 'Amina');

  await page.goto('/section/geography/check');
  await expect(page.getByRole('heading', { level: 1, name: `Section check: ${SECTION_TITLE}` })).toBeVisible();
  await page.getByRole('button', { name: 'Start the check' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

  // Question 1, answered wrong on purpose: feedback, and a working link back to its lesson.
  await page.getByRole('radio', { name: WRONG_Q1_OPTION }).click();
  await expect(page.locator('.tw-feedback-title')).toHaveText('Not quite yet');
  const fromLesson = page.getByRole('link', { name: /^From Lesson 10:/ });
  await expect(fromLesson).toHaveAttribute('href', '/lesson/towns-near-rivers/read');
  await nextButton(page, 'Next question').click();

  // The rest: whatever comes up first, just to reach the end.
  for (let i = 1; i < 9; i++) {
    await page.getByRole('radio').first().click();
    await expect(page.locator('.tw-feedback-title')).toBeVisible();
    await nextButton(page, 'Next question').click();
  }
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '9');
  await page.getByRole('radio').first().click();
  await nextButton(page, 'See your results').click();

  // Results: a score, Q1 under "Worth another look" with a working link, and it's saved.
  await expect(page.getByRole('heading', { level: 1, name: /^\d+ out of 10$/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Worth another look' })).toBeVisible();
  const reviewLink = page.getByRole('link', { name: new RegExp(`^Question \\d+: ${escapeRegExp(Q1_TEXT)}`) });
  await expect(reviewLink).toHaveAttribute('href', '/lesson/towns-near-rivers/read');
  await expect(page.getByText('Your best try is saved.')).toBeVisible();

  const dump = await dumpEverything(page);
  const record = (dump.stores['quizAttempts'] as QuizAttemptRecord[] | undefined)?.find((r) => r.sectionId === 'geography');
  expect(record?.attempts).toBe(1);
  expect(record?.best.total).toBe(10);

  // Try again starts a clean attempt.
  await page.getByRole('button', { name: 'Try the check again' }).click();
  await expect(page.getByRole('heading', { level: 1, name: `Section check: ${SECTION_TITLE}` })).toBeVisible();
  await page.getByRole('button', { name: 'Start the check' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});
