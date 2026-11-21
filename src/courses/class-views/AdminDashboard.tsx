import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, postWithKey } from '../../classes/client';
import type { AdminStats, ClassDetail, ProgramOverview } from '../../classes/protocol';
import { Button, TextField } from '../../components/ds';
import type { I18nContextValue } from '../../i18n';
import { findLocale } from '../../i18n/locales';
import { ClassView, CopyLink, ProblemNote, Typed } from './ClassView';
import { ConfirmAction } from './ConfirmAction';
import { SnapshotPage, SnapshotPicker } from './ImpactSnapshot';
import { useFlatCourses, type FlatCourses } from './courses';
import { linkFor, useApi } from './useApi';

type View =
  | { kind: 'home' }
  | { kind: 'org'; id: string; name: string }
  | { kind: 'class'; id: string; orgId: string; orgName: string }
  | { kind: 'snapshot'; month: string; orgId: string | null };

/**
 * The admin dashboard's body: how Thinkerwell's online classes are used,
 * across every organisation (growth, who is active, which courses and
 * languages, where learners stop), the organisations with their links, and
 * any class, with its learners numbered and never named.
 */
export function AdminDashboard({ adminKey, i18n }: { adminKey: string; i18n: I18nContextValue }) {
  const { t } = i18n;
  const [view, setView] = useState<View>({ kind: 'home' });
  const [state, reload] = useApi<AdminStats>('admin', adminKey);
  const courses = useFlatCourses();

  if (view.kind === 'org')
    return (
      <AdminOrg
        adminKey={adminKey}
        view={view}
        onBack={() => setView({ kind: 'home' })}
        onOpen={(id) => setView({ kind: 'class', id, orgId: view.id, orgName: view.name })}
        i18n={i18n}
      />
    );
  if (view.kind === 'class')
    return (
      <AdminClass
        adminKey={adminKey}
        classId={view.id}
        onBack={() => setView({ kind: 'org', id: view.orgId, name: view.orgName })}
        backLabel={view.orgName}
        courses={courses}
        i18n={i18n}
      />
    );

  if (view.kind === 'snapshot' && courses)
    return (
      <SnapshotPage
        action="admin.snapshot"
        linkKey={adminKey}
        choice={view}
        courses={courses}
        backLabel={t('classViews.admin.backToDashboard')}
        onBack={() => setView({ kind: 'home' })}
        i18n={i18n}
      />
    );

  if (state.status !== 'ready' || !courses) {
    return state.status === 'error' ? <ProblemNote problem={state.problem} i18n={i18n} onRetry={reload} /> : <p>{t('classViews.common.loading')}</p>;
  }
  const stats = state.data;
  return (
    <div className="tw-cv-admin">
      <div className="tw-cv-refresh">
        <span className="small">
          {t('classViews.admin.generated', { time: i18n.formatDate(stats.generatedAt, { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) })}
        </span>
        <Button variant="ghost" icon="RefreshCw" onClick={reload}>
          {t('classViews.common.refresh')}
        </Button>
      </div>
      <Totals stats={stats} i18n={i18n} />
      <Weeks stats={stats} i18n={i18n} />
      <div className="tw-cv-admin-grid">
        <CourseTable stats={stats} courses={courses} i18n={i18n} />
        <Stages stats={stats} i18n={i18n} />
        <Bars
          title={t('classViews.admin.languagesTitle')}
          rows={stats.languages.map((row) => ({
            key: row.language,
            label: <span lang={row.language}>{findLocale(row.language)?.endonym ?? row.language}</span>,
            value: row.learners,
          }))}
          i18n={i18n}
        />
        <Bars
          title={t('classViews.admin.levelsTitle')}
          rows={stats.readingLevels.map((row) => ({ key: row.level, label: t(`classViews.levels.${row.level === 'simpler' ? 'simpler' : 'standard'}`), value: row.learners }))}
          i18n={i18n}
        />
        <Bars
          title={t('classViews.admin.bandsTitle')}
          rows={stats.finishedBands.map((row) => ({ key: row.band, label: t('classViews.admin.band', { band: row.band }), value: row.learners }))}
          i18n={i18n}
        />
        <Retention stats={stats} i18n={i18n} />
      </div>
      <DropOff stats={stats} courses={courses} i18n={i18n} />
      <Orgs stats={stats} adminKey={adminKey} onChanged={reload} onOpen={(id, name) => setView({ kind: 'org', id, name })} i18n={i18n} />
      {stats.orgs.length > 0 ? <SnapshotPicker orgs={stats.orgs} onOpen={(choice) => setView({ kind: 'snapshot', ...choice })} i18n={i18n} /> : null}
    </div>
  );
}

function percent(part: number, whole: number, i18n: I18nContextValue): string {
  return whole > 0 ? i18n.formatNumber(part / whole, { style: 'percent', maximumFractionDigits: 0 }) : '–';
}

function Totals({ stats, i18n }: { stats: AdminStats; i18n: I18nContextValue }) {
  const { t, formatNumber } = i18n;
  const s = stats.totals;
  const tiles: Array<[string, string]> = [
    [t('classViews.admin.totals.learners'), formatNumber(s.learners)],
    [t('classViews.admin.totals.active7'), formatNumber(s.active7)],
    [t('classViews.admin.totals.active30'), formatNumber(s.active30)],
    [t('classViews.admin.totals.orgs'), formatNumber(s.orgs)],
    [t('classViews.admin.totals.classes'), formatNumber(s.classes)],
    [t('classViews.admin.totals.started'), formatNumber(s.lessonsStarted)],
    [t('classViews.admin.totals.finished'), formatNumber(s.lessonsFinished)],
    [t('classViews.admin.totals.rate'), percent(s.lessonsFinished, s.lessonsStarted, i18n)],
    [t('classViews.admin.totals.perLearner'), s.learners ? formatNumber(s.lessonsFinished / s.learners, { maximumFractionDigits: 1 }) : '–'],
    [t('classViews.admin.totals.stages'), formatNumber(s.stagesDone)],
    [t('classViews.admin.totals.checks'), formatNumber(s.checksTried)],
  ];
  return (
    <ul className="tw-cv-tiles" role="list" aria-label={t('classViews.admin.totalsTitle')}>
      {tiles.map(([label, value]) => (
        <li key={label} className="tw-cv-tile">
          <span className="tw-cv-tile-value">{value}</span>
          <span className="small">{label}</span>
        </li>
      ))}
    </ul>
  );
}

function Weeks({ stats, i18n }: { stats: AdminStats; i18n: I18nContextValue }) {
  const { t, formatDate, formatNumber } = i18n;
  const titleId = useId();
  const max = Math.max(1, ...stats.weeks.map((w) => Math.max(w.activeLearners, w.newLearners, w.lessonsFinished)));
  const series = [
    { key: 'active', label: t('classViews.admin.weeks.active'), get: (w: AdminStats['weeks'][number]) => w.activeLearners },
    { key: 'new', label: t('classViews.admin.weeks.newLearners'), get: (w: AdminStats['weeks'][number]) => w.newLearners },
    { key: 'finished', label: t('classViews.admin.weeks.finished'), get: (w: AdminStats['weeks'][number]) => w.lessonsFinished },
  ] as const;
  return (
    <section className="tw-cv-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="h2">
        {t('classViews.admin.weeksTitle')}
      </h2>
      <ul className="tw-cv-legend" role="list" aria-hidden="true">
        {series.map((s) => (
          <li key={s.key}>
            <span className={`tw-cv-swatch is-${s.key}`} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="tw-cv-weeks" aria-hidden="true">
        {stats.weeks.map((week) => (
          <div key={week.week} className="tw-cv-week">
            <div className="tw-cv-week-bars">
              {series.map((s) => (
                <span key={s.key} className={`is-${s.key}`} style={{ blockSize: `${(s.get(week) / max) * 100}%` }} />
              ))}
            </div>
            <span className="tw-cv-week-label">{formatDate(`${week.week}T00:00:00Z`, { day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>
          </div>
        ))}
      </div>
      <details className="tw-cv-details">
        <summary>{t('classViews.admin.weeksTable')}</summary>
        <div
          className="tw-cv-table-box"
          role="group"
          aria-labelledby={titleId}
          // A scrolling table must be reachable by keyboard.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        >
          <table className="tw-cv-table">
            <thead>
              <tr>
                <th scope="col">{t('classViews.admin.weeks.week')}</th>
                {series.map((s) => (
                  <th key={s.key} scope="col">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.weeks.map((week) => (
                <tr key={week.week}>
                  <th scope="row">{formatDate(`${week.week}T00:00:00Z`, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</th>
                  {series.map((s) => (
                    <td key={s.key}>{formatNumber(s.get(week))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function CourseTable({ stats, courses, i18n }: { stats: AdminStats; courses: FlatCourses; i18n: I18nContextValue }) {
  const { t, formatNumber } = i18n;
  const titleId = useId();
  return (
    <section className="tw-cv-section tw-cv-wide" aria-labelledby={titleId}>
      <h2 id={titleId} className="h3">
        {t('classViews.admin.coursesTitle')}
      </h2>
      {stats.courses.length === 0 ? (
        <p className="small">{t('classViews.admin.nothingYet')}</p>
      ) : (
        <div
          className="tw-cv-table-box"
          role="group"
          aria-labelledby={titleId}
          // A scrolling table must be reachable by keyboard.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        >
          <table className="tw-cv-table">
            <thead>
              <tr>
                <th scope="col">{t('classViews.admin.course')}</th>
                <th scope="col">{t('classViews.admin.totals.learners')}</th>
                <th scope="col">{t('classViews.admin.totals.started')}</th>
                <th scope="col">{t('classViews.admin.totals.finished')}</th>
                <th scope="col">{t('classViews.admin.totals.rate')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.courses.map((row) => (
                <tr key={row.courseId}>
                  <th scope="row" {...i18n.contentLang}>
                    {courses.courses.find((c) => c.id === row.courseId)?.title ?? row.courseId}
                  </th>
                  <td>{formatNumber(row.learners)}</td>
                  <td>{formatNumber(row.lessonsStarted)}</td>
                  <td>{formatNumber(row.lessonsFinished)}</td>
                  <td>{percent(row.lessonsFinished, row.lessonsStarted, i18n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Bars({ title, help, rows, i18n }: { title: string; help?: string; rows: Array<{ key: string; label: ReactNode; value: number }>; i18n: I18nContextValue }) {
  const titleId = useId();
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="tw-cv-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="h3">
        {title}
      </h2>
      {help ? <p className="small">{help}</p> : null}
      {rows.length === 0 ? (
        <p className="small">{i18n.t('classViews.admin.nothingYet')}</p>
      ) : (
        <ul className="tw-cv-hbars" role="list">
          {rows.map((row) => (
            <li key={row.key}>
              <span className="tw-cv-hbar-label">{row.label}</span>
              <span className="tw-cv-hbar" aria-hidden="true">
                <span style={{ inlineSize: `${(row.value / max) * 100}%` }} />
              </span>
              <span className="tw-cv-hbar-value">{i18n.formatNumber(row.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stages({ stats, i18n }: { stats: AdminStats; i18n: I18nContextValue }) {
  const { t } = i18n;
  return (
    <Bars
      title={t('classViews.admin.stagesTitle')}
      help={t('classViews.admin.stagesHelp')}
      rows={[
        { key: 'opened', label: t('classViews.admin.opened'), value: stats.totals.lessonsStarted },
        ...stats.stages.map((row) => ({ key: row.stage, label: t(`stages.${row.stage}`), value: row.lessons })),
      ]}
      i18n={i18n}
    />
  );
}

function Retention({ stats, i18n }: { stats: AdminStats; i18n: I18nContextValue }) {
  const { t } = i18n;
  const titleId = useId();
  const { cohort, returned } = stats.retention;
  return (
    <section className="tw-cv-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="h3">
        {t('classViews.admin.retentionTitle')}
      </h2>
      {cohort === 0 ? (
        <p className="small">{t('classViews.admin.retentionEmpty')}</p>
      ) : (
        <>
          <p className="tw-cv-tile-value">{percent(returned, cohort, i18n)}</p>
          <p className="small">{t('classViews.admin.retention', { returned, count: cohort })}</p>
        </>
      )}
    </section>
  );
}

function DropOff({ stats, courses, i18n }: { stats: AdminStats; courses: FlatCourses; i18n: I18nContextValue }) {
  const { t, formatNumber } = i18n;
  const titleId = useId();
  return (
    <section className="tw-cv-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="h2">
        {t('classViews.admin.dropTitle')}
      </h2>
      <p className="small">{t('classViews.admin.dropHelp')}</p>
      {stats.dropOff.length === 0 ? (
        <p className="small">{t('classViews.admin.dropEmpty')}</p>
      ) : (
        <div
          className="tw-cv-table-box"
          role="group"
          aria-labelledby={titleId}
          // A scrolling table must be reachable by keyboard.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        >
          <table className="tw-cv-table">
            <thead>
              <tr>
                <th scope="col">{t('classViews.admin.lesson')}</th>
                <th scope="col">{t('classViews.admin.totals.started')}</th>
                <th scope="col">{t('classViews.admin.totals.finished')}</th>
                <th scope="col">{t('classViews.admin.notFinished')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.dropOff.map((row) => {
                const lesson = courses.lessons.get(row.lessonId);
                const course = courses.courses.find((c) => c.id === row.courseId);
                return (
                  <tr key={row.lessonId}>
                    <th scope="row">
                      {lesson
                        ? i18n.tx('classViews.admin.lessonName', {
                            course: <span {...i18n.contentLang}>{course?.title ?? row.courseId}</span>,
                            number: i18n.formatNumber(lesson.number),
                            title: <span {...i18n.contentLang}>{lesson.title}</span>,
                          })
                        : row.lessonId}
                    </th>
                    <td>{formatNumber(row.started)}</td>
                    <td>{formatNumber(row.finished)}</td>
                    <td>{percent(row.started - row.finished, row.started, i18n)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Orgs({
  stats,
  adminKey,
  onChanged,
  onOpen,
  i18n,
}: {
  stats: AdminStats;
  adminKey: string;
  onChanged: () => void;
  onOpen: (id: string, name: string) => void;
  i18n: I18nContextValue;
}) {
  const { t } = i18n;
  const titleId = useId();
  const fieldId = useId();
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [link, setLink] = useState<{ name: string; key: string } | null>(null);

  async function add(event: FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean || clean.length > 80) {
      setProblem(t('classViews.admin.orgNameInvalid'));
      return;
    }
    try {
      const made = await postWithKey<{ name: string; orgKey: string }>('admin.createOrg', adminKey, { name: clean });
      setLink({ name: made.name, key: made.orgKey });
      setName('');
      onChanged();
    } catch (error) {
      setProblem(t(`classViews.problem.${error instanceof ApiError ? error.problem : 'failed'}`));
    }
  }

  return (
    <section className="tw-cv-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="h2">
        {t('classViews.admin.orgsTitle')}
      </h2>
      {link ? (
        <CopyLink
          label={i18n.tx('classViews.admin.orgLink', { name: <Typed>{link.name}</Typed> })}
          link={linkFor('/program', link.key)}
          help={t('classViews.admin.orgLinkHelp')}
          i18n={i18n}
        />
      ) : null}
      {stats.orgs.length === 0 ? (
        <p className="tw-cv-empty">{t('classViews.admin.orgsEmpty')}</p>
      ) : (
        <ul className="tw-cv-classes" role="list">
          {stats.orgs.map((org) => (
            <li key={org.id} className={`tw-cv-class-row${org.enabled ? '' : ' is-archived'}`}>
              <div className="tw-cv-class-text">
                <span className="tw-cv-class-name">
                  <Typed>{org.name}</Typed>
                </span>
                {org.enabled ? null : <span className="small">{t('classViews.admin.switchedOff')}</span>}
                <span className="small">
                  {t('classViews.admin.orgStats', { classes: org.classes, learners: org.learners, active: org.activeThisWeek, finished: org.lessonsFinished })}
                </span>
              </div>
              <div className="tw-cv-actions">
                <Button variant="secondary" onClick={() => onOpen(org.id, org.name)}>
                  {t('classViews.admin.viewClasses')}
                </Button>
                <ConfirmAction
                  variant="ghost"
                  i18n={i18n}
                  label={t('classViews.admin.newOrgLink')}
                  question={i18n.tx('classViews.admin.newOrgLinkQuestion', { name: <Typed>{org.name}</Typed> })}
                  confirm={t('classViews.common.makeNewLink')}
                  onConfirm={() =>
                    postWithKey<{ orgKey: string }>('admin.newOrgLink', adminKey, { orgId: org.id }).then((result) => setLink({ name: org.name, key: result.orgKey }))
                  }
                />
                {org.enabled ? (
                  <ConfirmAction
                    variant="ghost"
                    i18n={i18n}
                    label={t('classViews.admin.switchOff')}
                    question={i18n.tx('classViews.admin.switchOffQuestion', { name: <Typed>{org.name}</Typed> })}
                    confirm={t('classViews.admin.switchOff')}
                    onConfirm={() => postWithKey('admin.setOrgEnabled', adminKey, { orgId: org.id, enabled: false }).then(onChanged)}
                  />
                ) : (
                  // Switching back on takes nothing away, so it doesn't ask.
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void postWithKey('admin.setOrgEnabled', adminKey, { orgId: org.id, enabled: true }).then(onChanged, () => undefined);
                    }}
                  >
                    {t('classViews.admin.switchOn')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="small">{t('classViews.admin.switchOffHelp')}</p>
      <form className="tw-cv-form" onSubmit={(event) => void add(event)} noValidate>
        <TextField
          id={fieldId}
          label={t('classViews.admin.orgName')}
          helper={problem ?? t('classViews.admin.agreementNote')}
          invalid={Boolean(problem)}
          value={name}
          onValueChange={(value) => {
            setName(value);
            setProblem(null);
          }}
        />
        <Button variant="primary" type="submit" icon="Plus">
          {t('classViews.admin.addOrg')}
        </Button>
      </form>
    </section>
  );
}

function AdminOrg({
  adminKey,
  view,
  onBack,
  onOpen,
  i18n,
}: {
  adminKey: string;
  view: { id: string; name: string };
  onBack: () => void;
  onOpen: (id: string) => void;
  i18n: I18nContextValue;
}) {
  const { t } = i18n;
  const [state, reload] = useApi<ProgramOverview>('admin.org', adminKey, { id: view.id });
  return (
    <div className="tw-cv-admin">
      <Button variant="ghost" icon="ArrowLeft" onClick={onBack}>
        {t('classViews.admin.backToDashboard')}
      </Button>
      <h2 className="h2">
        <Typed>{view.name}</Typed>
      </h2>
      {state.status !== 'ready' ? (
        state.status === 'error' ? (
          <ProblemNote problem={state.problem} i18n={i18n} onRetry={reload} />
        ) : (
          <p>{t('classViews.common.loading')}</p>
        )
      ) : state.data.classes.length === 0 ? (
        <p className="tw-cv-empty">{t('classViews.program.noClasses')}</p>
      ) : (
        <ul className="tw-cv-classes" role="list">
          {state.data.classes.map((c) => (
            <li key={c.id} className={`tw-cv-class-row${c.archived ? ' is-archived' : ''}`}>
              <div className="tw-cv-class-text">
                <span className="tw-cv-class-name">
                  <Typed>{c.name}</Typed>
                </span>
                <span className="small">{c.archived ? t('classViews.program.closed') : i18n.tx('classViews.program.code', { code: <Typed>{c.code}</Typed> })}</span>
                <span className="small">{t('classViews.program.classStats', { learners: c.learners, active: c.activeThisWeek, finished: c.lessonsFinished })}</span>
              </div>
              <Button variant="secondary" onClick={() => onOpen(c.id)} aria-label={t('classViews.program.openLabel', { name: c.name })}>
                {t('classViews.program.open')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminClass({
  adminKey,
  classId,
  onBack,
  backLabel,
  courses,
  i18n,
}: {
  adminKey: string;
  classId: string;
  onBack: () => void;
  backLabel: string;
  courses: FlatCourses | null;
  i18n: I18nContextValue;
}) {
  const { t } = i18n;
  const [state, reload] = useApi<ClassDetail>('admin.class', adminKey, { id: classId });
  return (
    <div className="tw-cv-admin">
      <Button variant="ghost" icon="ArrowLeft" onClick={onBack}>
        {i18n.tx('classViews.program.back', { name: <Typed>{backLabel}</Typed> })}
      </Button>
      {state.status !== 'ready' || !courses ? (
        state.status === 'error' ? (
          <ProblemNote problem={state.problem} i18n={i18n} onRetry={reload} />
        ) : (
          <p>{t('classViews.common.loading')}</p>
        )
      ) : (
        <>
          <h2 className="h2">
            <Typed>{state.data.name}</Typed>
          </h2>
          <p className="small">{t('classViews.admin.anonymousNote')}</p>
          <ClassView detail={state.data} courses={courses} i18n={i18n} />
        </>
      )}
    </div>
  );
}
