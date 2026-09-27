import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { horizontalOverflow, watchErrors } from './lessonHelpers';

// Phase 4: every lesson's every step renders from the one template, at
// phone, tablet and laptop widths, with no console or page errors and no
// sideways scroll. Read is checked part by part (?part=1..n) and on the
// quick check (?part=check). Lessons come straight from content/lessons.

interface LessonFile {
  id: string;
  number: number;
  title: string;
  read: { sections: unknown[] };
  evidence: { cards: unknown[] };
}

const lessonsDir = join(process.cwd(), 'content', 'lessons');
const lessons: LessonFile[] = readdirSync(lessonsDir)
  .filter((name) => /^L\d+\.json$/.test(name))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(lessonsDir, name), 'utf8')) as LessonFile);

test('there are 24 lessons', () => {
  expect(lessons).toHaveLength(24);
});

for (const lesson of lessons) {
  test(`Lesson ${lesson.number} (${lesson.id}): every step renders cleanly`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors = watchErrors(page);
    const parts = lesson.read.sections.map((_, index) => `?part=${index + 1}`);
    const steps: Array<[path: string, h1: string]> = [
      ...parts.map((query): [string, string] => [`read${query}`, lesson.title]),
      ['read?part=check', lesson.title],
      ['write', lesson.title],
      ['speak', lesson.title],
      ['watch', lesson.title],
      ['reflect', lesson.title],
      // A guest (nobody chosen) who opens it directly hasn't finished, and isn't told they have.
      ['complete', `You're partway through Lesson ${lesson.number}.`],
    ];

    for (const [step, heading] of steps) {
      await page.goto(`/lesson/${lesson.id}/${step}`);
      const h1 = page.locator('h1');
      await expect(h1, step).toHaveCount(1);
      await expect(h1, step).toHaveText(heading);
      if (step.startsWith('read?part=') && step !== 'read?part=check') {
        await expect(page.locator('.tw-reading'), step).toBeVisible();
        // The evidence renders every card.
        await expect(page.locator('figure.tw-lx-card'), step).toHaveCount(
          lesson.evidence.cards.length,
        );
        // ...each with its own padding at this width (a card's type class
        // once collided with its inner list's and zeroed it at 1100px+).
        if (step === 'read?part=1') {
          const paddings = await page
            .locator('figure.tw-lx-card')
            .evaluateAll((figures) =>
              figures.map((figure) => {
                const style = getComputedStyle(figure);
                return [figure.className, parseFloat(style.paddingInlineStart), parseFloat(style.paddingBlockStart)] as const;
              }),
            );
          for (const [name, inline, block] of paddings) {
            expect(inline, `${name}: inline padding`).toBeGreaterThanOrEqual(16);
            expect(block, `${name}: block padding`).toBeGreaterThanOrEqual(16);
          }
        }
      }
      if (step === 'read?part=check') await expect(page.locator('.tw-question').first(), step).toBeVisible();
      // One ink primary button per view: the ActionBar's Next on a stage, at most one on /complete.
      const primaries = page.locator('main .tw-btn-primary:visible');
      if (step === 'complete') expect(await primaries.count(), step).toBeLessThanOrEqual(1);
      else await expect(primaries, step).toHaveCount(1);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      expect(await horizontalOverflow(page), `${step} scrolls sideways`).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
}
