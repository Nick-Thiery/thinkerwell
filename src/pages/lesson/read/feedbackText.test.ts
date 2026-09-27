import { describe, expect, it } from 'vitest';
import { getLessons } from '../../../content';
import { translate } from '../../../i18n/core';
import { withoutVerdict } from './feedbackText';

describe('withoutVerdict', () => {
  it('drops the lead the Feedback title already says', () => {
    expect(withoutVerdict('Not quite. Look at the second paragraph.', 'Not quite.')).toBe('Look at the second paragraph.');
    expect(withoutVerdict('Yes. Rivers bring water.', 'Yes.')).toBe('Rivers bring water.');
  });

  it('keeps feedback whole when it has no such lead, or nothing after it', () => {
    expect(withoutVerdict('Look again at the map.', 'Not quite.')).toBe('Look again at the map.');
    expect(withoutVerdict('Not quite.', 'Not quite.')).toBe('Not quite.');
    expect(withoutVerdict('Yesterday it rained.', 'Yes.')).toBe('Yesterday it rained.');
  });

  it('removes the lead from every option in every lesson', () => {
    const correctLead = translate('en', 'lessonPlayer.read.feedbackLead.correct');
    const retryLead = translate('en', 'lessonPlayer.read.feedbackLead.retry');
    for (const lesson of getLessons()) {
      for (const check of lesson.read.checks) {
        if (check.type !== 'choice') continue;
        for (const option of check.options) {
          const shown = withoutVerdict(option.feedback, option.correct ? correctLead : retryLead);
          expect(shown, `${lesson.id}: ${option.feedback}`).not.toMatch(/^(Yes|Not quite)\b/);
          expect(shown.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
