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
 * course text, which stays English whatever the interface's language, so
 * they live here and not in en.json, where a translation would stop them
 * matching.
 */
export const CONTENT_VERDICTS = { correct: 'Yes.', retry: 'Not quite.' } as const;

/** Feedback for a right or wrong option, without the content's own verdict. */
export function feedbackWithoutVerdict(feedback: string, correct: boolean): string {
  return withoutVerdict(feedback, CONTENT_VERDICTS[correct ? 'correct' : 'retry']);
}

export function withoutVerdict(feedback: string, lead: string): string {
  const trimmed = feedback.trimStart();
  const want = lead.trim();
  if (!want || !trimmed.startsWith(want)) return feedback;
  const rest = trimmed.slice(want.length).trimStart();
  return rest.length > 0 ? rest : feedback;
}
