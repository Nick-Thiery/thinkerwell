import { describe, expect, it } from 'vitest';
import { getLessons, getQuizzes } from '../../../content';
import { CONTENT_VERDICTS, CONTENT_VERDICTS_BY_LANG, feedbackWithoutVerdict, withoutVerdict } from './feedbackText';

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
    for (const lesson of getLessons()) {
      for (const check of lesson.read.checks) {
        if (check.type !== 'choice') continue;
        for (const option of check.options) {
          const shown = feedbackWithoutVerdict(option.feedback, option.correct);
          expect(shown, `${lesson.id}: ${option.feedback}`).not.toMatch(/^(Yes|Not quite)\b/);
          expect(shown.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("knows the content's own verdicts, which stay English in every interface language", () => {
    expect(CONTENT_VERDICTS).toEqual({ correct: 'Yes.', retry: 'Not quite.' });
    for (const quiz of getQuizzes()) {
      for (const question of quiz.questions) {
        for (const option of question.options) {
          expect(option.feedback.startsWith(CONTENT_VERDICTS[option.correct ? 'correct' : 'retry']), `${question.id}: ${option.feedback}`).toBe(true);
        }
      }
    }
  });
});

describe('verdicts in the lessons’ language', () => {
  it('drops the Indonesian verdict from Indonesian feedback, and only that', () => {
    expect(CONTENT_VERDICTS_BY_LANG.id).toEqual({ correct: 'Benar.', retry: 'Belum tepat.' });
    expect(feedbackWithoutVerdict('Benar. Nota itu menunjukkan harga.', true, 'id')).toBe('Nota itu menunjukkan harga.');
    expect(feedbackWithoutVerdict('Belum tepat. Lihat lagi.', false, 'id')).toBe('Lihat lagi.');
    expect(CONTENT_VERDICTS_BY_LANG.ms).toEqual({ correct: 'Betul.', retry: 'Belum tepat.' });
    expect(feedbackWithoutVerdict('Betul. Resit itu menunjukkan harga.', true, 'ms')).toBe('Resit itu menunjukkan harga.');
    expect(feedbackWithoutVerdict('Belum tepat. Lihat semula.', false, 'ms')).toBe('Lihat semula.');
    expect(feedbackWithoutVerdict('Yes. The receipt shows prices.', true, 'id')).toBe('Yes. The receipt shows prices.');
    expect(feedbackWithoutVerdict('Yes. The receipt shows prices.', true)).toBe('The receipt shows prices.');
  });
});
