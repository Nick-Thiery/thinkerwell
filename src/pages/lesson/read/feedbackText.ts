/**
 * Quick-check feedback without its opening verdict.
 *
 * docs/content/SPEC.md has every option's feedback start with its verdict
 * ("Yes." or "Not quite."), and the Feedback component already says it in
 * its own title ("Correct" in teal, "Not quite yet" in burnt orange). So the
 * lesson player drops the content's lead, as the LessonCheck screen shows,
 * rather than saying it twice. Feedback that doesn't start with its lead is
 * shown whole, so nothing is ever lost.
 */

/**
 * The verdicts lesson and quiz files open their feedback with. They are
 * course text, in the lessons' language (English, whatever the interface's
 * language, except where the lessons are translated too), so they live
 * here and not in en.json, where an interface translation would stop them
 * matching. scripts/check_translation.py checks translated files use theirs.
 */
export const CONTENT_VERDICTS = { correct: 'Yes.', retry: 'Not quite.' } as const;

/** The verdicts by the lessons' language code (src/i18n/locales.ts). */
export const CONTENT_VERDICTS_BY_LANG: Readonly<Record<string, { correct: string; retry: string }>> = {
  en: CONTENT_VERDICTS,
  id: { correct: 'Benar.', retry: 'Belum tepat.' },
  vi: { correct: 'Đúng rồi.', retry: 'Chưa đúng lắm.' },
};

/** Feedback for a right or wrong option, without the content's own verdict (in `lang`, the lessons' language). */
export function feedbackWithoutVerdict(feedback: string, correct: boolean, lang = 'en'): string {
  const verdicts = CONTENT_VERDICTS_BY_LANG[lang] ?? CONTENT_VERDICTS;
  return withoutVerdict(feedback, verdicts[correct ? 'correct' : 'retry']);
}

export function withoutVerdict(feedback: string, lead: string): string {
  const trimmed = feedback.trimStart();
  const want = lead.trim();
  if (!want || !trimmed.startsWith(want)) return feedback;
  const rest = trimmed.slice(want.length).trimStart();
  return rest.length > 0 ? rest : feedback;
}
