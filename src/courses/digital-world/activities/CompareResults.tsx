import { Feedback } from '../../../components/ds';
import type { ChoiceOptionData, CompareResultsActivity } from '../../../content';
import { En, useI18n } from '../../../i18n';
import { AnswerOptions } from '../../../pages/educators/AnswerOptions';
import { ActivityQuestion } from './ActivityQuestion';
import { useActivityState } from './state';

/**
 * `compare-results` (Lesson 3): each group's made-up result as a bar with
 * its numbers written beside it (never the bar's length alone). The learner
 * taps the group the tool got wrong most often: real radio buttons, so the
 * choice can change at any time, with "Correct" or "Not quite" and a hint.
 * Once any group is tapped, the follow-up question appears (`afterTap`):
 * any tap opens it, right or not, so nothing is locked. Saves the group
 * and the answer.
 */
export function CompareResultsPlayer({ activity }: { activity: CompareResultsActivity }) {
  const { t, tx, contentLang } = useI18n();
  const { answers, choose } = useActivityState();
  const chosen = activity.groups.find((group) => group.id === answers.group);
  const most = activity.groups.find((group) => group.id === activity.mostMistakes);
  return (
    <div className="tw-dw-compare">
      <fieldset className="tw-dw-card">
        <legend className="tw-dw-sort-text" {...contentLang}>
          {activity.measure}
        </legend>
        <div className="tw-dw-bars">
          {activity.groups.map((group) => (
            <label key={group.id} className="tw-dw-bar-option">
              <input type="radio" name="tw-dw-compare" value={group.id} checked={chosen?.id === group.id} onChange={() => choose('group', group.id)} />
              <span className="tw-dw-bar-text">
                <span className="tw-dw-bar-label" {...contentLang}>
                  {group.label}
                </span>
                <span className="tw-dw-bar-value">{t('digitalWorld.compare.value', { right: group.right, of: group.of })}</span>
              </span>
              <span className="tw-dw-bar" aria-hidden="true">
                <span className="tw-dw-bar-fill" style={{ inlineSize: `${Math.round((group.right / group.of) * 100)}%` }} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {chosen ? (
        <Feedback tone={chosen.id === most?.id ? 'correct' : 'retry'}>
          {chosen.id === most?.id
            ? tx('digitalWorld.compare.mostMistakes', { group: <En>{chosen.label}</En> })
            : tx('digitalWorld.compare.notMost', { group: <En>{chosen.label}</En> })}
        </Feedback>
      ) : null}
      {chosen ? <ActivityQuestion answerKey="afterTap" seedIndex={0} question={activity.afterTap.question} options={activity.afterTap.options} /> : null}
    </div>
  );
}

/** On paper: the results, the question to answer and the follow-up; for teachers, the group and the right option. */
export function CompareResultsOnPaper({ activity, forTeachers }: { activity: CompareResultsActivity; forTeachers: boolean }) {
  const { t, contentLang: en } = useI18n();
  const most = activity.groups.find((group) => group.id === activity.mostMistakes);
  return (
    <>
      <table className="tw-dw-paper-table">
        <caption {...en}>{activity.measure}</caption>
        <tbody>
          {activity.groups.map((group) => (
            <tr key={group.id}>
              <th scope="row" {...en}>
                {group.label}
              </th>
              <td>{t('digitalWorld.compare.value', { right: group.right, of: group.of })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {forTeachers && most ? (
        <p>
          <strong>{t('digitalWorld.compare.paperAnswer')}</strong> <span {...en}>{most.label}</span>
        </p>
      ) : null}
      <PaperQuestion question={activity.afterTap.question} options={activity.afterTap.options} forTeachers={forTeachers} />
    </>
  );
}

/** A choice question on paper: boxes to tick, or for teachers every option's feedback with the right one marked by a tick and words. */
export function PaperQuestion({ question, options, forTeachers }: { question: string; options: readonly ChoiceOptionData[]; forTeachers: boolean }) {
  const { contentLang: en } = useI18n();
  return (
    <div className="tw-print-keep">
      <p {...en}>{question}</p>
      {forTeachers ? (
        <AnswerOptions options={options} feedback="every" />
      ) : (
        <ul className="tw-print-boxes" {...en}>
          {options.map((option, index) => (
            <li key={index}>{option.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
