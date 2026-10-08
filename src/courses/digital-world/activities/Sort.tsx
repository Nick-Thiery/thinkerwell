import { useId } from 'react';
import { Icon } from '../../../components/ds';
import type { SortActivity } from '../../../content';
import { En, useI18n } from '../../../i18n';
import { useActivityState } from './state';

/**
 * `sort` (Lessons 1, 4, 7 and 10): put each item in a group. There is no
 * score and nothing is marked wrong: once an item is placed, its feedback
 * says what most people would say and why. Each item is a group of real
 * radio buttons (arrow keys move between groups, as everywhere), named by
 * the item. Any choice can be changed at any time. "Your groups" lists
 * what is in each group so far. Saves the group chosen for each item.
 */
export function SortPlayer({ activity }: { activity: SortActivity }) {
  const { t, contentLang } = useI18n();
  const { answers, choose } = useActivityState();
  const summaryId = useId();
  const groupIds = new Set(activity.groups.map((group) => group.id));
  const placedIn = (groupId: string) => activity.items.filter((item) => answers[item.id] === groupId);
  const notPlaced = activity.items.filter((item) => !groupIds.has(answers[item.id] ?? '')).length;

  return (
    <div className="tw-dw-sort">
      <ol className="tw-dw-cards" role="list">
        {activity.items.map((item) => {
          const chosen = groupIds.has(answers[item.id] ?? '') ? answers[item.id] : undefined;
          return (
            <li key={item.id}>
              <fieldset className="tw-dw-card tw-dw-sort-item">
                <legend className="tw-dw-sort-text" {...contentLang}>
                  {item.text}
                </legend>
                <div className="tw-dw-options">
                  {activity.groups.map((group) => (
                    <label key={group.id} className="tw-dw-option">
                      <input type="radio" name={`tw-dw-sort-${item.id}`} value={group.id} checked={chosen === group.id} onChange={() => choose(item.id, group.id)} />
                      <span {...contentLang}>{group.label}</span>
                    </label>
                  ))}
                </div>
                <div aria-live="polite">
                  {chosen ? (
                    <p className="tw-dw-note">
                      <Icon name="Info" size={18} />
                      <span {...contentLang}>{item.feedback}</span>
                    </p>
                  ) : null}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>
      <section className="tw-dw-summary" aria-labelledby={summaryId}>
        <h4 id={summaryId} className="tw-dw-summary-title">
          {t('digitalWorld.sort.yourGroups')}
        </h4>
        <dl className="tw-dw-sort-groups">
          {activity.groups.map((group) => {
            const items = placedIn(group.id);
            return (
              <div key={group.id} className="tw-dw-sort-group">
                <dt {...contentLang}>{group.label}</dt>
                {items.length === 0 ? (
                  <dd className="tw-dw-muted">{t('digitalWorld.sort.empty')}</dd>
                ) : (
                  items.map((item) => (
                    <dd key={item.id} {...contentLang}>
                      {item.text}
                    </dd>
                  ))
                )}
              </div>
            );
          })}
        </dl>
        {notPlaced > 0 ? <p className="small tw-dw-muted">{t('digitalWorld.sort.notPlaced', { count: notPlaced })}</p> : null}
      </section>
    </div>
  );
}

/** On paper: each item with a box for each group; for teachers, the group most people choose and why. */
export function SortOnPaper({ activity, forTeachers }: { activity: SortActivity; forTeachers: boolean }) {
  const { tx, contentLang: en } = useI18n();
  const label = new Map(activity.groups.map((group) => [group.id, group.label]));
  return (
    <ol className="tw-print-questions">
      {activity.items.map((item) => (
        <li key={item.id} className="tw-print-keep">
          <p {...en}>{item.text}</p>
          {forTeachers ? (
            <p>
              <strong>{tx('digitalWorld.sort.mostPeople', { group: <En>{label.get(item.suggested) ?? item.suggested}</En> })}</strong> <span {...en}>{item.feedback}</span>
            </p>
          ) : (
            <ul className="tw-print-boxes" {...en}>
              {activity.groups.map((group) => (
                <li key={group.id}>{group.label}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
