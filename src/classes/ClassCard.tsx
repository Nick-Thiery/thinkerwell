import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import words from 'virtual:thinkerwell/messages/classJoin';
import { Button, TextField } from '../components/ds';
import { useI18n, withWords } from '../i18n';
import { useLearnerSession } from '../session';
import { getStore, onSettingsSaved, type ClassLink, type Learner } from '../storage';
import { ApiError, lookupClass, type ApiProblem } from './client';
import { joinClass, leaveClass } from './links';
import { normaliseClassCode } from './protocol';

type Step = { kind: 'idle' } | { kind: 'looking' } | { kind: 'found'; code: string; className: string; orgName: string } | { kind: 'problem'; problem: ApiProblem | 'bad-code' };

/**
 * "Your class" on the learner's Home (docs/notes/online-classes.md): join
 * an online class with the code a teacher gave, see that you're sharing and
 * stop, or learn that the class has ended. Nothing is sent until the learner
 * has seen what their teacher will see and tapped "Join class". Loaded after
 * the first paint, with its own words.
 */
export default function ClassCard({ learner }: { learner: Learner }) {
  const parent = useI18n();
  const { t, tx } = useMemo(() => withWords(parent, words), [parent]);
  const { storageAvailable } = useLearnerSession();
  const [link, setLink] = useState<ClassLink | null | undefined>(undefined);
  const titleId = useId();
  const fieldId = useId();

  useEffect(() => {
    if (!storageAvailable) return undefined;
    let alive = true;
    void getStore()
      .then((store) => store.getSettings())
      .then(
        (settings) => alive && setLink(settings.classLinks?.[learner.id] ?? null),
        () => alive && setLink(null),
      );
    const stop = onSettingsSaved((settings) => setLink(settings.classLinks?.[learner.id] ?? null));
    return () => {
      alive = false;
      stop();
    };
  }, [learner.id, storageAvailable]);

  if (!storageAvailable || link === undefined) return null;

  return (
    <section className="tw-class-card" aria-labelledby={titleId}>
      <h2 id={titleId} className="h3">
        {t('classJoin.title')}
      </h2>
      {link?.ended ? (
        <Ended link={link} learnerId={learner.id} t={t} tx={tx} />
      ) : link ? (
        <Sharing link={link} learnerId={learner.id} t={t} />
      ) : (
        <Join learner={learner} fieldId={fieldId} t={t} />
      )}
    </section>
  );
}

type T = ReturnType<typeof useI18n>['t'];

function Join({ learner, fieldId, t }: { learner: Learner; fieldId: string; t: T }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(learner.classCode ?? '');
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [joining, setJoining] = useState(false);

  async function find(event: FormEvent) {
    event.preventDefault();
    const normal = normaliseClassCode(code);
    if (!normal) {
      setStep({ kind: 'problem', problem: 'bad-code' });
      return;
    }
    setStep({ kind: 'looking' });
    try {
      const found = await lookupClass(normal);
      setStep({ kind: 'found', code: normal, ...found });
    } catch (error) {
      setStep({
        kind: 'problem',
        problem: error instanceof ApiError ? error.problem : 'failed',
      });
    }
  }

  async function join() {
    if (step.kind !== 'found') return;
    setJoining(true);
    try {
      const store = await getStore();
      await joinClass(store, learner.id, step);
    } finally {
      setJoining(false);
    }
  }

  if (!open) {
    return (
      <>
        <p className="small">{t('classJoin.intro')}</p>
        <Button variant="secondary" icon="Users" onClick={() => setOpen(true)}>
          {t('classJoin.open')}
        </Button>
      </>
    );
  }

  if (step.kind === 'found') {
    return (
      <div className="tw-class-confirm">
        <p className="tw-class-name">
          <strong translate="no">{step.className}</strong>
          <span className="small" translate="no">
            {step.orgName}
          </span>
        </p>
        <p>{t('classJoin.whatTeacherSees', { name: learner.name })}</p>
        <p className="small">{t('classJoin.whatTheyDontSee')}</p>
        <div className="tw-class-actions">
          <Button variant="secondary" icon="Check" onClick={() => void join()} disabled={joining}>
            {t('classJoin.join')}
          </Button>
          <Button variant="ghost" onClick={() => setStep({ kind: 'idle' })}>
            {t('classJoin.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  const problem = step.kind === 'problem' ? t(`classJoin.problem.${step.problem}`) : undefined;
  return (
    <form className="tw-class-form" onSubmit={(event) => void find(event)} noValidate>
      <TextField
        id={fieldId}
        label={t('classJoin.codeLabel')}
        placeholder={t('classJoin.codePlaceholder')}
        helper={problem ?? t('classJoin.codeHelper')}
        invalid={step.kind === 'problem'}
        value={code}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        onValueChange={(value) => {
          setCode(value);
          if (step.kind === 'problem') setStep({ kind: 'idle' });
        }}
      />
      <Button variant="secondary" type="submit" icon="Search" disabled={step.kind === 'looking'}>
        {step.kind === 'looking' ? t('classJoin.looking') : t('classJoin.find')}
      </Button>
    </form>
  );
}

function Sharing({ link, learnerId, t }: { link: ClassLink; learnerId: string; t: T }) {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <p className="tw-class-name">
        <strong translate="no">{link.className}</strong>
        <span className="small" translate="no">
          {link.orgName}
        </span>
      </p>
      <p className="small">{t('classJoin.sharing')}</p>
      {asking ? (
        <div className="tw-class-confirm">
          <p>{t('classJoin.stopQuestion')}</p>
          <div className="tw-class-actions">
            <Button
              variant="secondary"
              onClick={() => {
                void getStore().then((store) => leaveClass(store, learnerId));
              }}
            >
              {t('classJoin.stop')}
            </Button>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              {t('classJoin.keep')}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setAsking(true)}>
          {t('classJoin.stopOpen')}
        </Button>
      )}
    </>
  );
}

function Ended({ link, learnerId, t, tx }: { link: ClassLink; learnerId: string; t: T; tx: ReturnType<typeof useI18n>['tx'] }) {
  return (
    <>
      <p>
        {tx('classJoin.ended', {
          className: <span translate="no">{link.className}</span>,
        })}
      </p>
      <Button variant="secondary" onClick={() => void getStore().then((store) => leaveClass(store, learnerId))}>
        {t('classJoin.endedOk')}
      </Button>
    </>
  );
}
