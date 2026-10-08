import { useId, useState } from 'react';
import { Badge, Button, Icon } from '../../../components/ds';
import type { SpotSignsActivity } from '../../../content';
import { En, useI18n } from '../../../i18n';
import { useActivityState } from './state';

/**
 * `spot-signs` (Lesson 6): the warning signs to look for, then made-up
 * messages, each part a real button (pressed once tapped, for keyboard and
 * screen readers alike). Tapping a part shows what it is: the sign's name
 * and why, or that most people wouldn't call it a sign on its own. Tapping
 * it again hides that. No score. "Show all signs" is always there, and
 * shows every sign without changing what was tapped. Saves which parts were
 * tapped.
 */
export function SpotSignsPlayer({ activity }: { activity: SpotSignsActivity }) {
  const { t, contentLang } = useI18n();
  const { seen, see, unsee } = useActivityState();
  const [showAll, setShowAll] = useState(false);
  const keyId = useId();
  const signLabel = new Map(activity.signs.map((sign) => [sign.id, sign.label]));
  return (
    <div className="tw-dw-signs">
      <section className="tw-dw-card" aria-labelledby={keyId}>
        <h4 id={keyId} className="tw-dw-summary-title">
          {t('digitalWorld.signs.keyTitle')}
        </h4>
        <ul className="tw-dw-sign-key" role="list">
          {activity.signs.map((sign) => (
            <li key={sign.id}>
              <Badge tone="outline" icon="Hand">
                <En>{sign.label}</En>
              </Badge>
            </li>
          ))}
        </ul>
      </section>
      <div className="tw-dw-actions">
        <Button variant="secondary" icon="Eye" aria-pressed={showAll} onClick={() => setShowAll((now) => !now)}>
          {t('digitalWorld.signs.showAll')}
        </Button>
      </div>
      {activity.messages.map((message) => (
        <section key={message.id} className="tw-dw-message" aria-labelledby={`tw-dw-message-${message.id}`}>
          <h4 id={`tw-dw-message-${message.id}`} className="tw-dw-message-from" {...contentLang}>
            {message.from}
          </h4>
          <ul className="tw-dw-parts" role="list">
            {message.parts.map((part, index) => {
              const key = `${message.id}:${index}`;
              const tapped = seen.includes(key);
              const shown = tapped || (showAll && part.sign !== null);
              return (
                <li key={key}>
                  <button
                    type="button"
                    className="tw-dw-part"
                    aria-pressed={tapped}
                    onClick={() => (tapped ? unsee(key) : see(key))}
                    {...contentLang}
                  >
                    {part.text}
                  </button>
                  <div aria-live="polite">
                    {shown ? (
                      <p className={part.sign ? 'tw-dw-note tw-dw-note-sign' : 'tw-dw-note'}>
                        <Icon name={part.sign ? 'Hand' : 'Info'} size={18} />
                        {part.sign ? (
                          <span>
                            <strong>
                              <En>{signLabel.get(part.sign) ?? part.sign}</En>
                            </strong>
                            <br />
                            <En>{part.feedback ?? ''}</En>
                          </span>
                        ) : (
                          <span {...contentLang}>{activity.notASign}</span>
                        )}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** On paper: the signs and each message to mark; for teachers, every part with its sign and why. */
export function SpotSignsOnPaper({ activity, forTeachers }: { activity: SpotSignsActivity; forTeachers: boolean }) {
  const { t, contentLang: en } = useI18n();
  const signLabel = new Map(activity.signs.map((sign) => [sign.id, sign.label]));
  return (
    <>
      <h4>{t('digitalWorld.signs.keyTitle')}</h4>
      <ul {...en}>
        {activity.signs.map((sign) => (
          <li key={sign.id}>{sign.label}</li>
        ))}
      </ul>
      {activity.messages.map((message) => (
        <div key={message.id} className="tw-print-keep tw-dw-paper-card">
          <p>
            <strong {...en}>{message.from}</strong>
          </p>
          <ol {...en}>
            {message.parts.map((part, index) => (
              <li key={index}>
                {part.text}
                {forTeachers ? (
                  <>
                    <br />
                    {part.sign ? (
                      <>
                        <strong>{signLabel.get(part.sign) ?? part.sign}</strong> <em>{part.feedback}</em>
                      </>
                    ) : (
                      <em>{activity.notASign}</em>
                    )}
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </>
  );
}
