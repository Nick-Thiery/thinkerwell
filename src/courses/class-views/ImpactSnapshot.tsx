import { useId, useState } from 'react';
import type { ImpactSnapshot } from '../../classes/protocol';
import { Button } from '../../components/ds';
import type { I18nContextValue } from '../../i18n';
import { findLocale } from '../../i18n/locales';
import { ProblemNote, Typed } from './ClassView';
import type { FlatCourses } from './courses';
import { useApi } from './useApi';

/**
 * The monthly impact snapshot (November 2026): a printable page of anonymous
 * counts for one month, for an organisation's own classes (/program) or, on
 * the admin dashboard, for every organisation or one. Active learners,
 * lessons finished, courses and languages used, and how many came back the
 * next week. Never names, nicknames, writing or answers: the server sends
 * only counts (GET program.snapshot, admin.snapshot; api/_lib/classesDb.ts).
 */

/** Online classes began in November 2026 (FIRST_SNAPSHOT_MONTH in api/_lib/classes.ts). */
const FIRST_MONTH = '2026-11';

/** Every month from November 2026 to this one (UTC, as the server counts), newest first. */
export function snapshotMonths(now: Date): string[] {
  const months: string[] = [];
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1;
  for (let value = `${year}-${String(month).padStart(2, '0')}`; value >= FIRST_MONTH; value = `${year}-${String(month).padStart(2, '0')}`) {
    months.push(value);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return months;
}

/** "November 2026", in the language on screen. */
function monthName(month: string, i18n: I18nContextValue): string {
  const [year, number] = month.split('-').map(Number) as [number, number];
  return i18n.formatDate(new Date(Date.UTC(year, number - 1, 15)), { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export interface SnapshotChoice {
  month: string;
  /** Admin only: one organisation, or null for every organisation. */
  orgId: string | null;
}

/** The part of the organisation page or admin dashboard that opens a snapshot. */
export function SnapshotPicker({
  orgs,
  onOpen,
  i18n,
  now = new Date(),
}: {
  /** The admin dashboard's organisations; left out on an organisation's own page. */
  orgs?: ReadonlyArray<{ id: string; name: string }>;
  onOpen: (choice: SnapshotChoice) => void;
  i18n: I18nContextValue;
  now?: Date;
}) {
  const { t } = i18n;
  const months = snapshotMonths(now);
  const [month, setMonth] = useState(months[0]!);
  const [orgId, setOrgId] = useState('');
  const titleId = useId();
  const monthId = useId();
  const orgFieldId = useId();
  return (
    <section className="tw-cv-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="h2">
        {t('classViews.snapshot.title')}
      </h2>
      <p>{t('classViews.snapshot.intro')}</p>
      <div className="tw-cv-snapshot-fields">
        {orgs ? (
          <div className="tw-cv-filter">
            <label htmlFor={orgFieldId}>
              {t('classViews.snapshot.orgLabel')}
            </label>
            <select id={orgFieldId} value={orgId} onChange={(event) => setOrgId(event.target.value)}>
              <option value="">{t('classViews.snapshot.allOrgs')}</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="tw-cv-filter">
          <label htmlFor={monthId}>
            {t('classViews.snapshot.monthLabel')}
          </label>
          <select id={monthId} value={month} onChange={(event) => setMonth(event.target.value)}>
            {months.map((value) => (
              <option key={value} value={value}>
                {monthName(value, i18n)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Button variant="secondary" icon="FileText" onClick={() => onOpen({ month, orgId: orgs && orgId ? orgId : null })}>
          {t('classViews.snapshot.show')}
        </Button>
      </div>
    </section>
  );
}

/** The snapshot itself: one page, for the screen and for paper. */
export function SnapshotPage({
  action,
  linkKey,
  choice,
  courses,
  backLabel,
  onBack,
  i18n,
}: {
  action: 'program.snapshot' | 'admin.snapshot';
  linkKey: string;
  choice: SnapshotChoice;
  courses: FlatCourses;
  backLabel: string;
  onBack: () => void;
  i18n: I18nContextValue;
}) {
  const { t, tx, formatNumber, formatDate } = i18n;
  const params: Record<string, string> = { month: choice.month };
  if (choice.orgId) params.org = choice.orgId;
  const [state, reload] = useApi<ImpactSnapshot>(action, linkKey, params);

  const toolbar = (
    <div className="tw-cv-actions tw-no-print">
      <Button variant="ghost" icon="ArrowLeft" onClick={onBack}>
        {backLabel}
      </Button>
      {state.status === 'ready' ? (
        <Button variant="secondary" icon="Printer" onClick={() => window.print()}>
          {t('classViews.snapshot.print')}
        </Button>
      ) : null}
    </div>
  );
  if (state.status !== 'ready') {
    return (
      <div className="tw-cv-page">
        {toolbar}
        {state.status === 'error' ? <ProblemNote problem={state.problem} i18n={i18n} onRetry={reload} /> : <p>{t('classViews.common.loading')}</p>}
      </div>
    );
  }
  const s = state.data;
  const name = s.orgName === null ? t('classViews.snapshot.allOrgs') : <Typed>{s.orgName}</Typed>;
  return (
    <div className="tw-cv-page">
      {toolbar}
      <article className="tw-cv-snapshot" aria-labelledby="tw-cv-snapshot-title">
        <header className="tw-cv-snapshot-head">
          <span className="eyebrow">{t('classViews.snapshot.eyebrow')}</span>
          <h1 id="tw-cv-snapshot-title" className="h1">
            {tx('classViews.snapshot.sheetTitle', { name, month: monthName(s.month, i18n) })}
          </h1>
        </header>

        <dl className="tw-cv-snapshot-numbers">
          <div>
            <dt>{t('classViews.snapshot.active')}</dt>
            <dd className="tw-cv-snapshot-number">{formatNumber(s.activeLearners)}</dd>
            <dd className="small">{t('classViews.snapshot.activeHelp')}</dd>
          </div>
          <div>
            <dt>{t('classViews.snapshot.finished')}</dt>
            <dd className="tw-cv-snapshot-number">{formatNumber(s.lessonsFinished)}</dd>
            <dd className="small">{t('classViews.snapshot.finishedHelp')}</dd>
          </div>
          <div>
            <dt>{t('classViews.snapshot.cameBack')}</dt>
            <dd className="tw-cv-snapshot-number">
              {t('classViews.snapshot.cameBackValue', { returned: formatNumber(s.cameBack.returned), counted: formatNumber(s.cameBack.counted) })}
            </dd>
            <dd className="small">{t('classViews.snapshot.cameBackHelp')}</dd>
            {s.cameBack.tooRecent > 0 ? <dd className="small">{t('classViews.snapshot.tooRecent', { count: s.cameBack.tooRecent })}</dd> : null}
          </div>
        </dl>

        <section className="tw-cv-snapshot-part" aria-labelledby="tw-cv-snapshot-courses">
          <h2 id="tw-cv-snapshot-courses" className="h3">
            {t('classViews.snapshot.coursesTitle')}
          </h2>
          <p className="small">{t('classViews.snapshot.coursesHelp')}</p>
          {s.courses.length === 0 ? (
            <p>{t('classViews.snapshot.none')}</p>
          ) : (
            <table className="tw-cv-table">
              <thead>
                <tr>
                  <th scope="col">{t('classViews.admin.course')}</th>
                  <th scope="col">{t('classViews.snapshot.learners')}</th>
                  <th scope="col">{t('classViews.snapshot.finished')}</th>
                </tr>
              </thead>
              <tbody>
                {s.courses.map((row) => (
                  <tr key={row.courseId}>
                    <th scope="row" {...i18n.contentLang}>
                      {courses.courses.find((c) => c.id === row.courseId)?.title ?? row.courseId}
                    </th>
                    <td>{formatNumber(row.learners)}</td>
                    <td>{formatNumber(row.lessonsFinished)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="tw-cv-snapshot-part" aria-labelledby="tw-cv-snapshot-languages">
          <h2 id="tw-cv-snapshot-languages" className="h3">
            {t('classViews.snapshot.languagesTitle')}
          </h2>
          <p className="small">{t('classViews.snapshot.languagesHelp')}</p>
          {s.languages.length === 0 ? (
            <p>{t('classViews.snapshot.none')}</p>
          ) : (
            <table className="tw-cv-table">
              <thead>
                <tr>
                  <th scope="col">{t('classViews.snapshot.language')}</th>
                  <th scope="col">{t('classViews.snapshot.learners')}</th>
                </tr>
              </thead>
              <tbody>
                {s.languages.map((row) => (
                  <tr key={row.language}>
                    <th scope="row" lang={row.language}>
                      {findLocale(row.language)?.endonym ?? row.language}
                    </th>
                    <td>{formatNumber(row.learners)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <footer className="tw-cv-snapshot-foot small">
          <p>{t('classViews.snapshot.privacy')}</p>
          <p>{t('classViews.snapshot.made', { date: formatDate(s.generatedAt, { day: 'numeric', month: 'long', year: 'numeric' }) })}</p>
        </footer>
      </article>
    </div>
  );
}
