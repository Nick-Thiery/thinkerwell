/**
 * Quick-check feedback without its opening verdict.
 *
 * docs/content/SPEC.md has every option's feedback start with its verdict
 * ("Yes." or "Not quite."), and the Feedback component already says it in
 * its own title ("Correct" in teal, "Not quite yet" in burnt orange). So the
 * lesson player drops the content's lead, as the LessonCheck screen shows,
 * rather than saying it twice. The leads come from en.json (per locale,
 * like the content itself). Feedback that doesn't start with its lead is
 * shown whole, so nothing is ever lost.
 */
export function withoutVerdict(feedback: string, lead: string): string {
  const trimmed = feedback.trimStart();
  const want = lead.trim();
  if (!want || !trimmed.startsWith(want)) return feedback;
  const rest = trimmed.slice(want.length).trimStart();
  return rest.length > 0 ? rest : feedback;
}
