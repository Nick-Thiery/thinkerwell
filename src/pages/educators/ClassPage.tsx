/**
 * The class on this device (/educators/class): every learner on this device,
 * in order of name, with the lessons they have finished in each section, the
 * lesson they are on now, when they last worked, and which section checks
 * they have tried. Linked from the Educators page.
 *
 * - No scores, and no order by progress: anyone on a shared device can open
 *   this page, and the course has no leaderboards (CLAUDE.md).
 * - No links to learners' journals: the journal always shows the learner
 *   using the device now, and this page never switches who that is.
 * - Read from the device only (./useClassWork.ts); nothing is written.
 */
import { useId } from 'react';
import { allCertificatesPath, educatorsPath, setupPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Button, Icon, SectionBadge } from '../../components/ds';
import { useContent } from '../../content/useContent';
import { En, useI18n } from '../../i18n';
import { addedOn, learnersWithSameName, useLearnerSession } from '../../session';
import { byName, summariseLearner, type LearnerSummary, type OnNow } from './classSummary';
import './ClassPage.css';
import { useAddLearner } from './useAddLearner';
import { useClassWork } from './useClassWork';

export function ClassPage() {
  const { t, lang, formatDate } = useI18n();
  const content = useContent();
  const title = t('pages.classView.title');
  usePageTitle(title);
  const session = useLearnerSession();
  const { status, work } = useClassWork();
  const addLearner = useAddLearner();

  // Nothing (not even a heading) until every learner's work is read, like
  // home and the course map (AppLayout moves focus to the h1 once it appears).
  if (status === 'loading') return null;

  const lessons = content.getLessons();
  const sections = content.getSections();
  const summaries = byName(
    work.map((each) => summariseLearner(each, lessons, sections)),
    lang,
  );
  const sameName = learnersWithSameName(work.map((each) => each.learner));

  return (
    <div className="tw-class-page">
      <div className="tw-class-toolbar">
        <Button variant="ghost" icon="ArrowLeft" href={educatorsPath()}>
          {t('pages.teacherTools.back')}
        </Button>
        {summaries.length > 0 ? (
          <Button variant="secondary" icon="Award" href={allCertificatesPath()}>
            {t('pages.classView.printAll')}
          </Button>
        ) : null}
      </div>

      <header className="tw-class-head">
        <h1 className="h1" tabIndex={-1}>
          {title}
        </h1>
        <p className="body-lg">{t('pages.classView.intro')}</p>
        <p className="tw-class-note">
          <Icon name="Lock" size={20} />
          <span>{t('pages.classView.noScores')}</span>
        </p>
      </header>

      {!session.storageAvailable ? (
        <p className="tw-class-empty">{t('pages.classView.noStorage')}</p>
      ) : summaries.length === 0 ? (
        <section className="tw-class-empty" aria-labelledby="class-empty-title">
          <h2 id="class-empty-title" className="h3">
            {t('pages.classView.empty')}
          </h2>
          <p>{t('pages.classView.emptyBody')}</p>
          <div className="tw-class-actions">
            <Button variant="secondary" icon="Plus" onClick={addLearner}>
              {t('pages.setup.learners.add')}
            </Button>
            <Button variant="ghost" icon="ListChecks" href={setupPath()}>
              {t('pages.setup.title')}
            </Button>
          </div>
        </section>
      ) : (
        <ul className="tw-class-list" role="list" aria-label={t('pages.classView.listLabel')}>
          {summaries.map((summary) => (
            <li key={summary.learner.id}>
              <LearnerCard
                summary={summary}
                name={
                  sameName.has(summary.learner.id)
                    ? t('pages.classView.learnerAdded', { name: summary.learner.name, date: addedOn(summary.learner, formatDate) })
                    : summary.learner.name
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LearnerCard({ summary, name }: { summary: LearnerSummary; name: string }) {
  const { t, formatDate, contentLang } = useI18n();
  const { learner, sections, onNow, lastActive, checksTried } = summary;
  const titleId = useId();
  const lessonsId = useId();
  const checksId = useId();
  const lastActiveDate = lastActive ? new Date(lastActive) : null;
  const lastActiveText =
    lastActiveDate && !Number.isNaN(lastActiveDate.getTime())
      ? formatDate(lastActiveDate, { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

  return (
    <article className="tw-class-learner" aria-labelledby={titleId}>
      <header className="tw-class-learner-head">
        <span className={`tw-avatar tw-tone-${learner.colour}`} aria-hidden="true" translate="no">
          {learner.name.charAt(0).toUpperCase()}
        </span>
        <div className="tw-class-learner-name">
          <h2 id={titleId}>{name}</h2>
          {learner.classCode ? <p className="tw-class-code">{t('pages.classView.classCode', { code: learner.classCode })}</p> : null}
        </div>
      </header>

      <dl className="tw-class-facts">
        <div>
          <dt>{t('pages.classView.onNow')}</dt>
          <dd>
            <OnNowText onNow={onNow} />
          </dd>
        </div>
        <div>
          <dt>{t('pages.classView.lastActive')}</dt>
          <dd>{lastActiveText ?? t('pages.classView.never')}</dd>
        </div>
      </dl>

      <section className="tw-class-part" aria-labelledby={lessonsId}>
        <h3 id={lessonsId}>{t('pages.classView.lessonsDone')}</h3>
        <ul className="tw-class-sections" role="list">
          {sections.map(({ section, completed, total }) => (
            <li key={section.id}>
              <SectionBadge section={section.id} showName={false} size={32} />
              <span className="tw-class-section-name" {...contentLang}>
                {section.title}
              </span>
              <span className="tw-class-section-count">{t('pages.classView.lessonsOf', { completed, total })}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="tw-class-part" aria-labelledby={checksId}>
        <h3 id={checksId}>{t('pages.classView.checksTried')}</h3>
        {checksTried.length > 0 ? (
          <ul className="tw-class-checks" role="list">
            {checksTried.map((section) => (
              <li key={section.id}>
                <Icon name="ClipboardCheck" size={18} />
                <span {...contentLang}>{section.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tw-class-muted">{t('pages.classView.checksNone')}</p>
        )}
      </section>
    </article>
  );
}

function OnNowText({ onNow }: { onNow: OnNow }) {
  const { t, tx } = useI18n();
  switch (onNow.kind) {
    case 'not-started':
      return <>{t('pages.classView.notStarted')}</>;
    case 'finished':
      return <>{t('pages.classView.finished')}</>;
    case 'in-progress':
    case 'up-next':
      return (
        <>
          <span className="tw-class-lesson">
            {tx('pages.classView.lesson', { number: onNow.lesson.number, title: <En>{onNow.lesson.title}</En> })}
          </span>
          <span className="tw-class-muted">
            {onNow.kind === 'in-progress' ? t('pages.classView.atStep', { stage: t(`stages.${onNow.stage}`) }) : t('pages.classView.upNext')}
          </span>
        </>
      );
  }
}
