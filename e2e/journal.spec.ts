import { expect, test } from '@playwright/test';
import { addLearnerViaUi, L10 } from './lessonHelpers';

// Phase 7: the journal page itself (its print view is already covered by
// e2e/print.spec.ts). Saves an answer in Write and the required Reflect
// prompt, then checks the journal groups them under the lesson, the
// Writing/Reflections filter works, an entry can be edited in place and the
// edit survives a reload, and "Print my journal" still leads to the printed
// copy with the edited text.

const WRITE_TEXT = 'I would build the town at the River site because of the water and trade routes.';
const REFLECT_TEXT = 'Rivers give water and a way to trade.';
const EDITED_WRITE_TEXT = 'I would build the town at the River site because of the water, trade routes and safety from floods.';
const WRITE_PROMPT = 'Choose one place on the Riverlands map for a new town. Give two reasons for your choice and one possible problem.';

test('the journal groups saved work by lesson, filters it, and edits save in place', async ({ page }) => {
  await addLearnerViaUi(page, 'Amina');

  await page.goto(L10.path('write'));
  const writeAnswer = page.getByRole('textbox', { name: 'Your answer' });
  await writeAnswer.fill(WRITE_TEXT);
  await writeAnswer.blur();

  await page.goto(L10.path('reflect'));
  const reflectAnswer = page.getByRole('textbox', { name: /good for a town/ });
  await reflectAnswer.fill(REFLECT_TEXT);
  await reflectAnswer.blur();

  await page.goto('/journal');
  await expect(page.locator('h1')).toHaveText('My journal');
  await expect(page.getByText(`Lesson 10 · ${L10.title}`)).toBeVisible();
  await expect(page.getByText('2 pieces of writing from 1 lesson')).toBeVisible();
  await expect(page.getByText(WRITE_TEXT)).toBeVisible();
  await expect(page.getByText(REFLECT_TEXT)).toBeVisible();

  // Filtering to Writing hides the reflection, and back again.
  const filter = page.getByRole('group', { name: 'Show' });
  await filter.getByRole('button', { name: 'Writing' }).click();
  await expect(page.getByText(WRITE_TEXT)).toBeVisible();
  await expect(page.getByText(REFLECT_TEXT)).toBeHidden();
  await filter.getByRole('button', { name: 'All' }).click();
  await expect(page.getByText(REFLECT_TEXT)).toBeVisible();

  // Editing the writing entry saves it back in place, not as a new entry.
  const writingEntry = page.locator('article.tw-entry').filter({ hasText: WRITE_TEXT });
  await writingEntry.getByRole('button', { name: 'Edit' }).click();
  const editBox = page.getByRole('textbox', { name: WRITE_PROMPT });
  await editBox.fill(EDITED_WRITE_TEXT);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(EDITED_WRITE_TEXT)).toBeVisible();
  await expect(page.getByText(WRITE_TEXT, { exact: true })).toHaveCount(0);
  await expect(page.getByText('2 pieces of writing from 1 lesson')).toBeVisible();

  // The edit is really saved, not just in this render.
  await page.reload();
  await expect(page.getByText(EDITED_WRITE_TEXT)).toBeVisible();

  // Print my journal shows the same, edited text.
  await page.getByRole('link', { name: 'Print my journal' }).click();
  await expect(page).toHaveURL(/\/journal\/print$/);
  await expect(page.getByRole('heading', { level: 2, name: L10.title })).toBeVisible();
  await expect(page.getByText(EDITED_WRITE_TEXT)).toBeVisible();
  await expect(page.getByText(REFLECT_TEXT)).toBeVisible();
});
