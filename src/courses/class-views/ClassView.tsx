import { useId, useMemo, useState, type ReactNode } from 'react';
import type { ApiProblem } from '../../classes/client';
import type { ClassDetail, ViewLearner } from '../../classes/protocol';
import { Button } from '../../components/ds';
import type { I18nContextValue } from '../../i18n';
import { findLocale } from '../../i18n/locales';
import type { FlatCourses } from './courses';

type T = I18nContextValue['t'];

const WEEK_MS = 7 * 86_400_000;

/** Something a person typed (a name, a class code): never translated or flagged as interface text. */
export function Typed({ children }: { children: ReactNode }) {
  return <span translate="no">{children}</span>;
}

/** A learner's name for this view: their name for a teacher or organisation, "Learner 3" on the admin dashboard. */
export function learnerName(learner: ViewLearner, t: T): string {
  return learner.name ?? t('classViews.learner.anonymous', { number: learner.number });
}

export interface ClassViewProps {
  detail: ClassDetail;
  courses: FlatCourses;
  i18n: I18nContextValue;
  /** Present for a teacher or organisation: takes a learner out of the class. */
  onRemove?: (learner: ViewLearner) => Promise<void>;
  now?: Date;
}

/**
 * One class: who is in it and how far each has got, by course and section,
 * with what they are working on now. The same for a teacher, an
 * organisation and the admin dashboard (which gets numbers, not names).
 * Never scores or a ranking: learners are in the order they joined.
 */
export function ClassView({ detail, courses, i18n, onRemove, now = new Date() }: ClassViewProps) {
  const { t } = i18n;
  const [courseFilter, setCourseFilter] = useState('all');
  const filterId = useId();
  const used = useMemo(() => new Set(detail.learners.flatMap((learner) => learner.progress.map((p) => p.courseId))), [detail.learners]);
  const shownCourses = courses.courses.filter((course) => (courseFilter === 'all' ? used.has(course.id) : course.id === courseFilter));
  const active = detail.learners.filter((learner) => learner.lastActiveAt && now.getTime() - Date.parse(learner.lastActiveAt) < WEEK_MS).length;
  const finished = detail.learners.reduce((sum, learner) => sum + learner.progress.filter((p) => p.completedAt).length, 0);

  return (
    <div className="tw-cv-class">
      <ul className="tw-cv-stats" role="list">
        <li>
          <strong>{i18n.formatNumber(detail.learners.length)}</strong>{' '}
          {t('classViews.class.learnersLabel', {
            count: detail.learners.length,
          })}
        </li>
        <li>
          <strong>{i18n.formatNumber(active)}</strong> {t('classViews.class.activeLabel', { count: active })}
        </li>
        <li>
          <strong>{i18n.formatNumber(finished)}</strong> {t('classViews.class.finishedLabel', { count: finished })}
        </li>
      </ul>

      {detail.learners.length === 0 ? (
        <p className="tw-cv-empty">{t('classViews.class.empty')}</p>
      ) : (
        <>
          {used.size > 1 ? (
            <div className="tw-cv-filter">
              <label htmlFor={filterId}>{t('classViews.class.courseLabel')}</label>
              <select id={filterId} value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
                <option value="all">{t('classViews.class.allCourses')}</option>
                {courses.courses
                  .filter((course) => used.has(course.id))
                  .map((course) => (
                    <option key={course.id} value={course.id} {...i18n.contentLang}>
                      {course.title}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}
          <ul className="tw-cv-learners" role="list">
            {detail.learners.map((learner) => (
              <LearnerRow key={learner.id} learner={learner} courses={courses} shownCourses={shownCourses} i18n={i18n} onRemove={onRemove} now={now} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LearnerRow({
  learner,
  courses,
  shownCourses,
  i18n,
  onRemove,
  now,
}: {
  learner: ViewLearner;
  courses: FlatCourses;
  shownCourses: FlatCourses['courses'];
  i18n: I18nContextValue;
  onRemove?: (learner: ViewLearner) => Promise<void>;
  now: Date;
}) {
  const { t, tx, formatDate, contentLang } = i18n;
  const [asking, setAsking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const name = learnerName(learner, t);
  const shownIds = new Set(shownCourses.map((course) => course.id));
  const progress = learner.progress.filter((p) => shownIds.has(p.courseId));
  const done = progress.filter((p) => p.completedAt).length;
  const total = shownCourses.reduce((sum, course) => sum + course.lessonCount, 0);
  const working = progress.filter((p) => !p.completedAt && p.updatedAt).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0];
  const workingLesson = working ? courses.lessons.get(working.lessonId) : undefined;
  const recent = learner.lastActiveAt && now.getTime() - Date.parse(learner.lastActiveAt) < WEEK_MS;
  const byLesson = new Map(learner.progress.map((p) => [p.lessonId, p]));
  const checks = new Map(learner.checks.map((c) => [c.sectionId, c.attempts]));

  return (
    <li className="tw-cv-learner">
      <div className="tw-cv-learner-head">
        <span className="tw-cv-learner-name">{learner.name ? <Typed>{name}</Typed> : name}</span>
        <span className={`small tw-cv-active${recent ? ' is-recent' : ''}`}>
          {learner.lastActiveAt
            ? t('classViews.learner.lastActive', {
                date: formatDate(learner.lastActiveAt, {
                  day: 'numeric',
                  month: 'short',
                }),
              })
            : t('classViews.learner.notStarted')}
        </span>
      </div>
      {/* With "All courses", the total counts the courses this class has used, so before anyone has
          started there is nothing to count: the head says "Not started yet", never "0 of 0". */}
      {total > 0 ? (
        <>
          <div className="tw-cv-bar" aria-hidden="true">
            <span
              style={{
                inlineSize: `${Math.round((done / total) * 100)}%`,
              }}
            />
          </div>
          <p className="small tw-cv-learner-line">{t('classViews.learner.finished', { done, count: total })}</p>
        </>
      ) : null}
      {working && workingLesson ? (
        <p className="small tw-cv-learner-line">
          {tx('classViews.learner.working', {
            number: i18n.formatNumber(workingLesson.number),
            title: <span {...contentLang}>{workingLesson.title}</span>,
            stage: working.currentStage ? t(`stages.${working.currentStage}`) : t('stages.read'),
          })}
        </p>
      ) : null}
      <details className="tw-cv-details">
        <summary>
          <span>
            {tx('classViews.learner.details', {
              name: learner.name ? <Typed>{name}</Typed> : name,
            })}
          </span>
        </summary>
        <ul className="tw-cv-facts" role="list">
          <li>
            {t('classViews.learner.joined', {
              date: formatDate(learner.joinedAt, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })}
          </li>
          {learner.language ? (
            <li>
              {tx('classViews.learner.language', {
                language: <span lang={learner.language}>{findLocale(learner.language)?.endonym ?? learner.language}</span>,
              })}
            </li>
          ) : null}
          {learner.readingLevel ? (
            <li>
              {t('classViews.learner.level', {
                level: t(`classViews.levels.${learner.readingLevel}`),
              })}
            </li>
          ) : null}
        </ul>
        {shownCourses.map((course) => (
          <div key={course.id} className="tw-cv-course">
            <p className="tw-cv-course-title" {...contentLang}>
              {course.title}
            </p>
            <ul className="tw-cv-sections" role="list">
              {course.sections.map((section) => {
                const sectionDone = section.lessonIds.filter((id) => byLesson.get(id)?.completedAt).length;
                const tries = checks.get(section.id) ?? 0;
                return (
                  <li key={section.id}>
                    <span {...contentLang}>{section.title}</span>
                    <span className="small">
                      {t('classViews.learner.sectionCount', {
                        done: sectionDone,
                        count: section.lessonIds.length,
                      })}
                      {section.hasCheck && tries > 0 ? ` · ${t('classViews.learner.checkTries', { count: tries })}` : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {onRemove ? (
          asking ? (
            <div className="tw-cv-confirm">
              <p>
                {tx('classViews.learner.removeQuestion', {
                  name: <Typed>{name}</Typed>,
                })}
              </p>
              <div className="tw-cv-actions">
                <Button
                  variant="secondary"
                  disabled={removing}
                  onClick={() => {
                    setRemoving(true);
                    void onRemove(learner).finally(() => setRemoving(false));
                  }}
                >
                  {t('classViews.learner.removeConfirm')}
                </Button>
                <Button variant="ghost" onClick={() => setAsking(false)}>
                  {t('classViews.learner.removeCancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" icon="Trash2" onClick={() => setAsking(true)}>
              {t('classViews.learner.remove')}
            </Button>
          )
        ) : null}
      </details>
    </li>
  );
}

/** A secret link to copy and send, with a reminder to keep it private. */
export function CopyLink({ label, link, help, i18n }: { label: ReactNode; link: string; help: string; i18n: I18nContextValue }) {
  const { t } = i18n;
  const id = useId();
  const [copied, setCopied] = useState(false);
  return (
    <div className="tw-cv-link">
      <label htmlFor={id} className="tw-cv-link-label">
        {label}
      </label>
      <div className="tw-cv-link-row">
        <input id={id} readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard?.writeText(link).then(
              () => setCopied(true),
              () => document.getElementById(id)?.focus(),
            );
          }}
        >
          {copied ? t('classViews.common.copied') : t('classViews.common.copy')}
        </Button>
      </div>
      <p className="small">{help}</p>
    </div>
  );
}

/** Why a class view can't show its data, in plain words, with a way to try again where that could help. */
export function ProblemNote({ problem, i18n, onRetry }: { problem: ApiProblem | 'noKey'; i18n: I18nContextValue; onRetry?: () => void }) {
  const { t } = i18n;
  return (
    <div className="tw-cv-problem" role="status">
      <p>{t(`classViews.problem.${problem}`)}</p>
      {onRetry && problem !== 'wrong-key' && problem !== 'noKey' ? (
        <Button variant="secondary" icon="RefreshCw" onClick={onRetry}>
          {t('classViews.common.retry')}
        </Button>
      ) : null}
    </div>
  );
}
