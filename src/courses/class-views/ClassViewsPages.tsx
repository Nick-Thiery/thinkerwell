import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import words from 'virtual:thinkerwell/messages/classViews';
import { usePageTitle } from '../../app/usePageTitle';
import { ApiError, postWithKey } from '../../classes/client';
import type { ClassDetail, ProgramOverview, ViewLearner } from '../../classes/protocol';
import { Button, TextField } from '../../components/ds';
import { useI18n, withWords, type I18nContextValue } from '../../i18n';
import { AdminDashboard } from './AdminDashboard';
import { ClassView, CopyLink, ProblemNote, Typed } from './ClassView';
import { ConfirmAction } from './ConfirmAction';
import { useFlatCourses } from './courses';
import './stylesheet';
import { linkFor, useApi, useLinkKey } from './useApi';

function useWords(): I18nContextValue {
  const parent = useI18n();
  return useMemo(() => withWords(parent, words), [parent]);
}

function Frame({ eyebrow, title, intro, children }: { eyebrow: ReactNode; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="tw-cv-page">
      <header className="tw-cv-head">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="h1" tabIndex={-1}>
          {title}
        </h1>
        {intro}
      </header>
      {children}
    </div>
  );
}

/** /teach#key=…: a teacher's own class, with the secret link their organisation sent. */
export function TeacherPage() {
  const i18n = useWords();
  const { t } = i18n;
  const key = useLinkKey();
  const courses = useFlatCourses();
  const [state, reload] = useApi<ClassDetail>('class', key);
  usePageTitle(state.status === 'ready' ? state.data.name : t('classViews.teacher.pageTitle'));

  const remove = async (learner: ViewLearner) => {
    if (!key) return;
    await postWithKey('class.removeLearner', key, {
      learnerId: learner.id,
    }).catch(() => undefined);
    reload();
  };

  if (!key) {
    return (
      <Frame eyebrow={t('classViews.teacher.eyebrow')} title={t('classViews.teacher.pageTitle')}>
        <ProblemNote problem="noKey" i18n={i18n} />
      </Frame>
    );
  }
  if (state.status !== 'ready' || !courses) {
    return (
      <Frame eyebrow={t('classViews.teacher.eyebrow')} title={t('classViews.teacher.pageTitle')}>
        {state.status === 'error' ? <ProblemNote problem={state.problem} i18n={i18n} onRetry={reload} /> : <p>{t('classViews.common.loading')}</p>}
      </Frame>
    );
  }
  const detail = state.data;
  return (
    <Frame eyebrow={<Typed>{detail.orgName}</Typed>} title={<Typed>{detail.name}</Typed>} intro={<ClassCodeNote code={detail.code} archived={detail.archived} i18n={i18n} />}>
      <RefreshRow onRefresh={reload} i18n={i18n} />
      <ClassView detail={detail} courses={courses} i18n={i18n} onRemove={remove} />
      <p className="small tw-cv-note">{t('classViews.common.whatYouSee')}</p>
      <p className="small tw-cv-note">{t('classViews.common.keepPrivate')}</p>
    </Frame>
  );
}

function ClassCodeNote({ code, archived, i18n }: { code: string; archived: boolean; i18n: I18nContextValue }) {
  const { t } = i18n;
  return (
    <div className="tw-cv-code">
      {archived ? (
        <p className="small">{t('classViews.class.closedNote')}</p>
      ) : (
        <>
          <p className="small">{t('classViews.class.codeLabel')}</p>
          <p className="tw-cv-code-value" translate="no">
            {code}
          </p>
          <p className="small">{t('classViews.class.codeHelp')}</p>
        </>
      )}
    </div>
  );
}

function RefreshRow({ onRefresh, i18n }: { onRefresh: () => void; i18n: I18nContextValue }) {
  return (
    <div className="tw-cv-refresh">
      <Button variant="ghost" icon="RefreshCw" onClick={onRefresh}>
        {i18n.t('classViews.common.refresh')}
      </Button>
    </div>
  );
}

/** /program#key=…: an organisation's classes; it makes classes and sends each teacher their link. */
export function ProgramPage() {
  const i18n = useWords();
  const { t } = i18n;
  const key = useLinkKey();
  const courses = useFlatCourses();
  const [state, reload] = useApi<ProgramOverview>('program', key);
  const [openClass, setOpenClass] = useState<string | null>(null);
  usePageTitle(state.status === 'ready' ? state.data.name : t('classViews.program.pageTitle'));

  if (!key) {
    return (
      <Frame eyebrow={t('classViews.program.eyebrow')} title={t('classViews.program.pageTitle')}>
        <ProblemNote problem="noKey" i18n={i18n} />
      </Frame>
    );
  }
  if (state.status !== 'ready' || !courses) {
    return (
      <Frame eyebrow={t('classViews.program.eyebrow')} title={t('classViews.program.pageTitle')}>
        {state.status === 'error' ? <ProblemNote problem={state.problem} i18n={i18n} onRetry={reload} /> : <p>{t('classViews.common.loading')}</p>}
      </Frame>
    );
  }
  const program = state.data;

  if (openClass) {
    return <ProgramClass orgKey={key} classId={openClass} orgName={program.name} onBack={() => (setOpenClass(null), reload())} i18n={i18n} />;
  }

  return (
    <Frame
      eyebrow={t('classViews.program.eyebrow')}
      title={<Typed>{program.name}</Typed>}
      // What an organisation's lead does here, for someone opening their link for the first time (20 November 2026).
      intro={<p className="body-lg">{t('classViews.program.intro')}</p>}
    >
      <RefreshRow onRefresh={reload} i18n={i18n} />
      <section className="tw-cv-section" aria-labelledby="tw-cv-classes">
        <h2 id="tw-cv-classes" className="h2">
          {t('classViews.program.classesTitle')}
        </h2>
        {program.classes.length === 0 ? (
          <p className="tw-cv-empty">{t('classViews.program.noClasses')}</p>
        ) : (
          <ul className="tw-cv-classes" role="list">
            {program.classes.map((c) => (
              <li key={c.id} className={`tw-cv-class-row${c.archived ? ' is-archived' : ''}`}>
                <div className="tw-cv-class-text">
                  <span className="tw-cv-class-name">
                    <Typed>{c.name}</Typed>
                  </span>
                  <span className="small">
                    {c.archived
                      ? t('classViews.program.closed')
                      : i18n.tx('classViews.program.code', {
                          code: <Typed>{c.code}</Typed>,
                        })}
                  </span>
                  <span className="small">
                    {t('classViews.program.classStats', {
                      learners: c.learners,
                      active: c.activeThisWeek,
                      finished: c.lessonsFinished,
                    })}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setOpenClass(c.id)}
                  aria-label={t('classViews.program.openLabel', {
                    name: c.name,
                  })}
                >
                  {t('classViews.program.open')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <AddClass orgKey={key} onAdded={reload} i18n={i18n} />
      <p className="small tw-cv-note">{t('classViews.common.whatYouSee')}</p>
      <p className="small tw-cv-note">{t('classViews.common.keepPrivate')}</p>
    </Frame>
  );
}

function AddClass({ orgKey, onAdded, i18n }: { orgKey: string; onAdded: () => void; i18n: I18nContextValue }) {
  const { t } = i18n;
  const fieldId = useId();
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{
    name: string;
    code: string;
    teacherKey: string;
  } | null>(null);

  async function add(event: FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean || clean.length > 80) {
      setProblem(t('classViews.program.nameInvalid'));
      return;
    }
    setBusy(true);
    try {
      const result = await postWithKey<{
        name: string;
        code: string;
        teacherKey: string;
      }>('program.createClass', orgKey, { name: clean });
      setMade(result);
      setName('');
      setProblem(null);
      onAdded();
    } catch (error) {
      setProblem(t(`classViews.problem.${error instanceof ApiError ? error.problem : 'failed'}`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tw-cv-section" aria-labelledby="tw-cv-add">
      <h2 id="tw-cv-add" className="h2">
        {t('classViews.program.addTitle')}
      </h2>
      {made ? (
        <div className="tw-cv-made" role="status">
          <p>
            <strong>
              {i18n.tx('classViews.program.created', {
                name: <Typed>{made.name}</Typed>,
              })}
            </strong>
          </p>
          <p className="small">{t('classViews.class.codeLabel')}</p>
          <p className="tw-cv-code-value" translate="no">
            {made.code}
          </p>
          <CopyLink label={t('classViews.program.teacherLink')} link={linkFor('/teach', made.teacherKey)} help={t('classViews.program.teacherLinkHelp')} i18n={i18n} />
        </div>
      ) : null}
      <form className="tw-cv-form" onSubmit={(event) => void add(event)} noValidate>
        <TextField
          id={fieldId}
          label={t('classViews.program.nameLabel')}
          placeholder={t('classViews.program.namePlaceholder')}
          helper={problem ?? undefined}
          invalid={Boolean(problem)}
          value={name}
          onValueChange={(value) => {
            setName(value);
            setProblem(null);
          }}
        />
        <Button variant="primary" type="submit" icon="Plus" disabled={busy}>
          {busy ? t('classViews.program.adding') : t('classViews.program.add')}
        </Button>
      </form>
    </section>
  );
}

function ProgramClass({ orgKey, classId, orgName, onBack, i18n }: { orgKey: string; classId: string; orgName: string; onBack: () => void; i18n: I18nContextValue }) {
  const { t } = i18n;
  const courses = useFlatCourses();
  const [state, reload] = useApi<ClassDetail>('program.class', orgKey, {
    id: classId,
  });
  const [teacherKey, setTeacherKey] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const renameId = useId();

  const back = (
    <Button variant="ghost" icon="ArrowLeft" onClick={onBack}>
      {i18n.tx('classViews.program.back', { name: <Typed>{orgName}</Typed> })}
    </Button>
  );
  if (state.status !== 'ready' || !courses) {
    return (
      <Frame eyebrow={<Typed>{orgName}</Typed>} title={t('classViews.program.pageTitle')}>
        {back}
        {state.status === 'error' ? <ProblemNote problem={state.problem} i18n={i18n} onRetry={reload} /> : <p>{t('classViews.common.loading')}</p>}
      </Frame>
    );
  }
  const detail = state.data;
  const act = async (action: string, body: Record<string, unknown>) => {
    await postWithKey(action, orgKey, { classId, ...body }).catch(() => undefined);
    reload();
  };

  return (
    <Frame eyebrow={<Typed>{orgName}</Typed>} title={<Typed>{detail.name}</Typed>} intro={<ClassCodeNote code={detail.code} archived={detail.archived} i18n={i18n} />}>
      {back}
      <RefreshRow onRefresh={reload} i18n={i18n} />
      <ClassView detail={detail} courses={courses} i18n={i18n} onRemove={(learner) => act('program.removeLearner', { learnerId: learner.id })} />
      <section className="tw-cv-section" aria-labelledby="tw-cv-manage">
        <h2 id="tw-cv-manage" className="h3">
          {t('classViews.program.manageTitle')}
        </h2>
        {teacherKey ? (
          <CopyLink label={t('classViews.program.teacherLink')} link={linkFor('/teach', teacherKey)} help={t('classViews.program.teacherLinkHelp')} i18n={i18n} />
        ) : null}
        <div className="tw-cv-actions">
          <ConfirmAction
            icon="RefreshCw"
            i18n={i18n}
            label={t('classViews.program.newLink')}
            question={t('classViews.program.newLinkQuestion')}
            confirm={t('classViews.common.makeNewLink')}
            onConfirm={() => postWithKey<{ teacherKey: string }>('program.newTeacherLink', orgKey, { classId }).then((result) => setTeacherKey(result.teacherKey))}
          />
          <Button variant="secondary" onClick={() => (setRenaming(true), setNewName(detail.name))}>
            {t('classViews.program.rename')}
          </Button>
          {detail.archived ? (
            // Opening a class again takes nothing away, so it doesn't ask.
            <Button variant="secondary" onClick={() => void act('program.archiveClass', { archived: false })}>
              {t('classViews.program.reopen')}
            </Button>
          ) : (
            <ConfirmAction
              i18n={i18n}
              label={t('classViews.program.close')}
              question={i18n.tx('classViews.program.closeQuestion', { name: <Typed>{detail.name}</Typed> })}
              confirm={t('classViews.program.close')}
              onConfirm={() => postWithKey('program.archiveClass', orgKey, { classId, archived: true }).then(reload)}
            />
          )}
        </div>
        <p className="small">{t('classViews.program.newLinkHelp')}</p>
        <p className="small">{t('classViews.program.closeHelp')}</p>
        {renaming ? (
          <form
            className="tw-cv-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newName.trim()) return;
              setRenaming(false);
              void act('program.renameClass', { name: newName.trim() });
            }}
          >
            <TextField id={renameId} label={t('classViews.program.nameLabel')} value={newName} onValueChange={setNewName} />
            <Button variant="secondary" type="submit">
              {t('classViews.program.renameSave')}
            </Button>
          </form>
        ) : null}
      </section>
    </Frame>
  );
}

/** /admin#key=…: Thinkerwell's own dashboard. Numbers across every organisation; learners numbered, never named. */
export function AdminPage() {
  const i18n = useWords();
  const key = useLinkKey();
  usePageTitle(i18n.t('classViews.admin.pageTitle'));
  return (
    <Frame eyebrow={i18n.t('classViews.admin.eyebrow')} title={i18n.t('classViews.admin.pageTitle')} intro={<p className="body-lg">{i18n.t('classViews.admin.intro')}</p>}>
      {key ? <AdminDashboard adminKey={key} i18n={i18n} /> : <ProblemNote problem="noKey" i18n={i18n} />}
    </Frame>
  );
}
