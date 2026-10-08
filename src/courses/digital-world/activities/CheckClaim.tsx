import { useId, useState, type ReactNode } from 'react';
import { Badge, Icon } from '../../../components/ds';
import type { CheckClaimActivity } from '../../../content';
import { En, useI18n } from '../../../i18n';
import { ActivityQuestion } from './ActivityQuestion';
import { PaperQuestion } from './CompareResults';
import { useActivityState } from './state';

/**
 * `check-claim` (Lesson 5): a made-up post, the three questions to ask
 * first, and made-up sources the learner opens with a tap, like opening a
 * new page, in any order (each a disclosure button, open or closed at any
 * time). The question is always there: it is never locked behind opening
 * the sources. Saves which sources were opened and the answer.
 */
export function CheckClaimPlayer({ activity }: { activity: CheckClaimActivity }) {
  const { t, tx, contentLang } = useI18n();
  const { seen } = useActivityState();
  const askId = useId();
  const sourcesId = useId();
  const opened = activity.sources.filter((source) => seen.includes(source.id)).length;
  return (
    <div className="tw-dw-claim">
      <figure className="tw-dw-post">
        <figcaption className="tw-dw-post-from">
          <Icon name="MessageCircle" size={18} />
          {tx('digitalWorld.claim.postFrom', { from: <En>{activity.claim.from}</En> })}
        </figcaption>
        <blockquote className="tw-dw-post-text" {...contentLang}>
          {activity.claim.text}
        </blockquote>
      </figure>

      <section className="tw-dw-card" aria-labelledby={askId}>
        <h4 id={askId} className="tw-dw-summary-title">
          {t('digitalWorld.claim.askFirst')}
        </h4>
        <ol className="tw-dw-list" {...contentLang}>
          {activity.askFirst.map((question, index) => (
            <li key={index}>{question}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby={sourcesId}>
        <h4 id={sourcesId} className="tw-dw-summary-title">
          {t('digitalWorld.claim.sourcesTitle')}
        </h4>
        <p className="small tw-dw-muted">{t('digitalWorld.claim.openedCount', { count: opened, total: activity.sources.length })}</p>
        <ul className="tw-dw-cards" role="list">
          {activity.sources.map((source) => (
            <li key={source.id}>
              <OpenableCard id={source.id} name={source.name}>
                <dl className="tw-dw-facts" {...contentLang}>
                  <div>
                    <dt>{t('digitalWorld.claim.who')}</dt>
                    <dd>{source.who}</dd>
                  </div>
                  <div>
                    <dt>{t('digitalWorld.claim.says')}</dt>
                    <dd>{source.says}</dd>
                  </div>
                </dl>
              </OpenableCard>
            </li>
          ))}
        </ul>
      </section>

      <ActivityQuestion answerKey="question" seedIndex={0} question={activity.question.question} options={activity.question.options} />
    </div>
  );
}

/**
 * A made-up page or book the learner opens with a tap, like a new page:
 * a disclosure button (its name, and "Opened" once opened) and what it
 * says. Opening it is saved (`id` in the activity's seen list); closing it
 * again is only for now.
 */
export function OpenableCard({ id, name, children }: { id: string; name: string; children: ReactNode }) {
  const { t, contentLang } = useI18n();
  const { seen, see } = useActivityState();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const wasOpened = seen.includes(id);
  return (
    <div className={open ? 'tw-dw-page tw-dw-page-open' : 'tw-dw-page'}>
      <button
        type="button"
        className="tw-dw-page-button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => {
          setOpen((now) => !now);
          if (!open) see(id);
        }}
      >
        <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={20} />
        <span className="tw-dw-page-name" {...contentLang}>
          {name}
        </span>
        {wasOpened ? <Badge tone="outline">{t('digitalWorld.claim.opened')}</Badge> : null}
      </button>
      <div id={bodyId} className="tw-dw-page-body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}

/** On paper: the post, the questions to ask, every source, and the question; for teachers, the answer. */
export function CheckClaimOnPaper({ activity, forTeachers }: { activity: CheckClaimActivity; forTeachers: boolean }) {
  const { t, tx, contentLang: en } = useI18n();
  return (
    <>
      <div className="tw-print-keep">
        <p>{tx('digitalWorld.claim.postFrom', { from: <En>{activity.claim.from}</En> })}</p>
        <blockquote className="tw-dw-paper-quote" {...en}>
          {activity.claim.text}
        </blockquote>
      </div>
      <h4>{t('digitalWorld.claim.askFirst')}</h4>
      <ol {...en}>
        {activity.askFirst.map((question, index) => (
          <li key={index}>{question}</li>
        ))}
      </ol>
      <h4>{t('digitalWorld.claim.sourcesTitle')}</h4>
      {activity.sources.map((source) => (
        <div key={source.id} className="tw-print-keep tw-dw-paper-card">
          <p>
            <strong {...en}>{source.name}</strong>
          </p>
          <dl className="tw-dw-facts" {...en}>
            <div>
              <dt>{t('digitalWorld.claim.who')}</dt>
              <dd>{source.who}</dd>
            </div>
            <div>
              <dt>{t('digitalWorld.claim.says')}</dt>
              <dd>{source.says}</dd>
            </div>
          </dl>
        </div>
      ))}
      <PaperQuestion question={activity.question.question} options={activity.question.options} forTeachers={forTeachers} />
    </>
  );
}
