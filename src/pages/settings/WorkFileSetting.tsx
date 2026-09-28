/**
 * "Move work to another device" in Settings: save one learner's work (or
 * everyone's) to a file, and load such a file on another device. Nothing goes
 * online: the file is made in the browser and downloaded, and loading reads a
 * file the person picks. The format, the checks and the merge rules are in
 * src/storage/workFile.ts, src/storage/mergeWork.ts and
 * docs/notes/device-transfer.md.
 *
 * Loading reads and checks the whole file first, then shows what is in it.
 * Nothing changes on the device until someone taps "Load it", and then
 * everything is written in one transaction (store.importWork), so a failure
 * leaves nothing half-done. Everything from the file is shown as text only.
 *
 * Like the rest of Settings this is device-wide: it works while looking
 * around too, since it sets up the device rather than saving a guest's work.
 */
import { useEffect, useId, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import type { SettingsPart } from '../../app/lessonUrls';
import { Button, Icon } from '../../components/ds';
import { getLessons, getSections } from '../../content/catalog';
import { useI18n, type MessageKey } from '../../i18n';
import { addedOn, learnersWithSameName, useLearnerSession } from '../../session';
import {
  buildWorkFile,
  checkWorkFile,
  checkWorkFileSize,
  getStore,
  serialiseWorkFile,
  workFileName,
  type ImportSummary,
  type KnownContent,
  type Learner,
  type LearnerWork,
  type WorkFile,
  type WorkFileProblem,
} from '../../storage';
import { downloadFile, readFileText } from './files';

const ALL = 'all';

/** The section's address on the page (/settings#move-work), for links from elsewhere. */
const MOVE_WORK_PART: SettingsPart = 'move-work';

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; fileName: string }
  | { kind: 'failed'; tooBig: boolean };

type LoadProblem = WorkFileProblem | 'unreadable' | 'failed';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'problem'; problem: LoadProblem }
  | {
      kind: 'preview';
      file: WorkFile;
      skipped: number;
      /** The learners on this device when the file was read. */
      here: Learner[];
      loading: boolean;
      failed: boolean;
    }
  | { kind: 'done'; summary: ImportSummary };

const PROBLEM_KEYS: Record<LoadProblem, MessageKey> = {
  'not-work-file': 'pages.settings.transfer.load.problems.notWorkFile',
  'newer-version': 'pages.settings.transfer.load.problems.newerVersion',
  empty: 'pages.settings.transfer.load.problems.empty',
  'too-big': 'pages.settings.transfer.load.problems.tooBig',
  damaged: 'pages.settings.transfer.load.problems.damaged',
  unreadable: 'pages.settings.transfer.load.problems.unreadable',
  failed: 'pages.settings.transfer.load.problems.failed',
};

/** The lessons and section checks this version has; work for any other is left out of a file. */
function knownContent(): KnownContent {
  return {
    lessonIds: new Set(getLessons().map((lesson) => lesson.id)),
    sectionIds: new Set(getSections().map((section) => section.id)),
  };
}

export function WorkFileSetting() {
  const { t, formatDate } = useI18n();
  const session = useLearnerSession();
  const { status, storageAvailable, learners, activeLearner, reloadLearners } = session;
  const headingId = useId();
  const saveHelpId = useId();
  const radioName = useId();
  const loadHelpId = useId();
  const loadButtonId = useId();
  const previewHeadingId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const [chosen, setChosen] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' });

  // Whose work: the learner chosen here, else the learner using the device, else everyone.
  const preferred = chosen ?? activeLearner?.id ?? ALL;
  const who = preferred === ALL || learners.some((learner) => learner.id === preferred) ? preferred : ALL;
  const sameName = learnersWithSameName(learners);

  // Where focus goes once the next render is on screen: the preview's
  // heading when it appears, the result when loading is done, and back to
  // "Load my work" after Cancel (the button that had focus is gone).
  const pendingFocus = useRef<(() => HTMLElement | null) | null>(null);
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    target()?.focus();
  });
  const focusSoon = (target: () => HTMLElement | null) => {
    pendingFocus.current = target;
  };

  // ------------------------------------------------------------------ save

  const saveWork = async () => {
    if (saveState.kind === 'saving') return;
    setSaveState({ kind: 'saving' });
    try {
      const store = await getStore();
      const work: LearnerWork[] = await store.exportWork(who === ALL ? undefined : [who]);
      if (work.length === 0) throw new Error('Nobody to save.');
      const now = new Date();
      const text = serialiseWorkFile(buildWorkFile(work, now));
      // A file that couldn't be loaded again is no use: check it as loading will.
      const check = checkWorkFile(text, knownContent());
      if (!check.ok) {
        if (alive.current) setSaveState({ kind: 'failed', tooBig: check.problem === 'too-big' });
        return;
      }
      const fileName = workFileName(who === ALL ? null : work[0]!.learner.name, now);
      downloadFile(fileName, text, 'application/json');
      if (alive.current) setSaveState({ kind: 'saved', fileName });
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
      if (alive.current) setSaveState({ kind: 'failed', tooBig: false });
    }
  };

  // ------------------------------------------------------------------ load

  const chooseFile = () => {
    if (loadState.kind === 'reading' || (loadState.kind === 'preview' && loadState.loading)) return;
    inputRef.current?.click();
  };

  const onFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Cleared at once, so choosing the same file again still counts as a change.
    input.value = '';
    if (!file) return;
    setLoadState({ kind: 'reading' });

    const sizeProblem = checkWorkFileSize(file.size);
    if (sizeProblem) {
      setLoadState({ kind: 'problem', problem: sizeProblem });
      return;
    }
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      if (alive.current) setLoadState({ kind: 'problem', problem: 'unreadable' });
      return;
    }
    const result = checkWorkFile(text, knownContent());
    if (!result.ok) {
      if (alive.current) setLoadState({ kind: 'problem', problem: result.problem });
      return;
    }
    let here: Learner[];
    try {
      here = await (await getStore()).listLearners();
    } catch {
      if (alive.current) setLoadState({ kind: 'problem', problem: 'failed' });
      return;
    }
    if (!alive.current) return;
    focusSoon(() => previewHeadingRef.current);
    setLoadState({ kind: 'preview', file: result.file, skipped: result.skipped, here, loading: false, failed: false });
  };

  const loadIt = async () => {
    if (loadState.kind !== 'preview' || loadState.loading) return;
    const preview = loadState;
    setLoadState({ ...preview, loading: true, failed: false });
    let summary: ImportSummary;
    try {
      summary = await (await getStore()).importWork(preview.file.learners);
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
      if (alive.current) setLoadState({ ...preview, loading: false, failed: true });
      return;
    }
    // The header and the home page show the new learners straight away.
    await reloadLearners().catch(() => undefined);
    if (!alive.current) return;
    focusSoon(() => resultRef.current);
    setLoadState({ kind: 'done', summary });
  };

  const cancel = () => {
    focusSoon(() => document.getElementById(loadButtonId));
    setLoadState({ kind: 'idle' });
  };

  // ---------------------------------------------------------------- render

  const workLine = (work: LearnerWork): string => {
    const lessons = work.progress.length;
    const checks = work.quizAttempts.length;
    const lessonsText = t('pages.settings.transfer.load.lessons', { count: lessons });
    const checksText = t('pages.settings.transfer.load.checks', { count: checks });
    if (lessons && checks) return t('pages.settings.transfer.load.lessonsAndChecks', { lessons: lessonsText, checks: checksText });
    if (lessons) return lessonsText;
    if (checks) return checksText;
    return t('pages.settings.transfer.load.noWork');
  };

  const savedOn = (iso: string): string => formatDate(iso, { day: 'numeric', month: 'long', year: 'numeric' });

  const loadBusy = loadState.kind === 'reading' || (loadState.kind === 'preview' && loadState.loading);

  return (
    <section id={MOVE_WORK_PART} className="tw-settings-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="tw-settings-h2" tabIndex={-1}>
        {t('pages.settings.transfer.title')}
      </h2>
      <p className="tw-settings-text">{t('pages.settings.transfer.intro')}</p>

      {!storageAvailable ? (
        <p className="tw-settings-help tw-transfer-alone">{t('pages.settings.transfer.noStorage')}</p>
      ) : (
        <>
          <div className="tw-settings-field tw-transfer-part">
            <h3 className="tw-settings-label tw-transfer-h3">{t('pages.settings.transfer.save.title')}</h3>
            {status === 'loading' ? null : learners.length === 0 ? (
              <p className="tw-settings-help">{t('pages.settings.transfer.save.noLearners')}</p>
            ) : (
              <>
                <fieldset className="tw-transfer-who">
                  <legend className="tw-transfer-legend">{t('pages.settings.transfer.save.who')}</legend>
                  {learners.map((learner) => (
                    <label key={learner.id} className="tw-settings-check tw-transfer-choice">
                      <input
                        type="radio"
                        name={radioName}
                        className="tw-settings-checkbox"
                        value={learner.id}
                        checked={who === learner.id}
                        onChange={() => setChosen(learner.id)}
                      />
                      <span>
                        {sameName.has(learner.id)
                          ? t('pages.settings.transfer.save.learnerAdded', { name: learner.name, date: addedOn(learner, formatDate) })
                          : learner.name}
                      </span>
                    </label>
                  ))}
                  <label className="tw-settings-check tw-transfer-choice">
                    <input
                      type="radio"
                      name={radioName}
                      className="tw-settings-checkbox"
                      value={ALL}
                      checked={who === ALL}
                      onChange={() => setChosen(ALL)}
                    />
                    <span>{t('pages.settings.transfer.save.all')}</span>
                  </label>
                </fieldset>
                <Button variant="secondary" icon="Download" aria-describedby={saveHelpId} onClick={() => void saveWork()}>
                  {t('pages.settings.transfer.save.button')}
                </Button>
                <p id={saveHelpId} className="tw-settings-help">
                  {t('pages.settings.transfer.save.help')}
                </p>
                <p className="tw-settings-note">
                  <Icon name="Lock" size={18} />
                  <span>{t('pages.settings.transfer.save.recordings')}</span>
                </p>
              </>
            )}
            <div role="status" className="tw-transfer-live">
              {saveState.kind === 'saving' ? (
                <p className="tw-settings-status">
                  <Icon name="Clock" size={20} />
                  <span>{t('pages.settings.transfer.save.saving')}</span>
                </p>
              ) : saveState.kind === 'saved' ? (
                <p className="tw-settings-status">
                  <Icon name="Check" size={20} />
                  <span>{t('pages.settings.transfer.save.saved', { file: saveState.fileName })}</span>
                </p>
              ) : saveState.kind === 'failed' ? (
                <p className="tw-transfer-problem">
                  <Icon name="Info" size={20} />
                  <span>
                    {t(saveState.tooBig ? 'pages.settings.transfer.save.tooBig' : 'pages.settings.transfer.save.failed')}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="tw-settings-field tw-transfer-part">
            <h3 className="tw-settings-label tw-transfer-h3">{t('pages.settings.transfer.load.title')}</h3>
            <Button id={loadButtonId} variant="secondary" icon="Upload" aria-describedby={loadHelpId} onClick={chooseFile}>
              {t('pages.settings.transfer.load.button')}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              hidden
              aria-label={t('pages.settings.transfer.load.button')}
              onChange={(event) => void onFileChosen(event)}
            />
            <p id={loadHelpId} className="tw-settings-help">
              {t('pages.settings.transfer.load.help')}
            </p>

            {loadState.kind === 'preview' ? (
              <div className="tw-transfer-preview" role="group" aria-labelledby={previewHeadingId}>
                <h4 id={previewHeadingId} className="tw-settings-label" tabIndex={-1} ref={previewHeadingRef}>
                  {t('pages.settings.transfer.load.previewTitle')}
                </h4>
                <p className="tw-transfer-text">{t('pages.settings.transfer.load.savedOn', { date: savedOn(loadState.file.savedAt) })}</p>
                <ul className="tw-transfer-list">
                  {loadState.file.learners.map((work) => {
                    const isHere = loadState.here.some((learner) => learner.id === work.learner.id);
                    const clash =
                      !isHere &&
                      learnersWithSameName([...loadState.here, work.learner]).has(work.learner.id);
                    return (
                      <li key={work.learner.id}>
                        {t(isHere ? 'pages.settings.transfer.load.learnerHere' : 'pages.settings.transfer.load.learnerNew', {
                          name: work.learner.name,
                          work: workLine(work),
                        })}
                        {clash ? ` ${t('pages.settings.transfer.load.sameName', { name: work.learner.name })}` : ''}
                      </li>
                    );
                  })}
                </ul>
                {loadState.skipped > 0 ? (
                  <p className="tw-transfer-text">{t('pages.settings.transfer.load.skipped', { count: loadState.skipped })}</p>
                ) : null}
                <div className="tw-settings-actions">
                  <Button variant="primary" icon="Check" disabled={loadState.loading} onClick={() => void loadIt()}>
                    {t('pages.settings.transfer.load.loadIt')}
                  </Button>
                  <Button variant="secondary" disabled={loadState.loading} onClick={cancel}>
                    {t('pages.settings.transfer.load.cancel')}
                  </Button>
                </div>
              </div>
            ) : null}

            <div role="status" className="tw-transfer-live">
              {loadBusy ? (
                <p className="tw-settings-status">
                  <Icon name="Clock" size={20} />
                  <span>
                    {t(loadState.kind === 'reading' ? 'pages.settings.transfer.load.reading' : 'pages.settings.transfer.load.loading')}
                  </span>
                </p>
              ) : loadState.kind === 'problem' || (loadState.kind === 'preview' && loadState.failed) ? (
                <p className="tw-transfer-problem">
                  <Icon name="Info" size={20} />
                  <span>{t(PROBLEM_KEYS[loadState.kind === 'problem' ? loadState.problem : 'failed'])}</span>
                </p>
              ) : loadState.kind === 'done' ? (
                <LoadResult summary={loadState.summary} resultRef={resultRef} />
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function LoadResult({ summary, resultRef }: { summary: ImportSummary; resultRef: RefObject<HTMLDivElement | null> }) {
  const { t, formatList } = useI18n();
  // "Amina, Yusuf and Sara", in the interface's language.
  const names = (learners: Learner[]) => formatList(learners.map((learner) => learner.name), { type: 'conjunction' });
  const changed = summary.added.length + summary.updated.length > 0;
  return (
    <div className="tw-settings-status" tabIndex={-1} ref={resultRef}>
      <Icon name="Check" size={20} />
      <div className="tw-transfer-lines">
        {!changed ? <p>{t('pages.settings.transfer.load.nothingNew')}</p> : null}
        {summary.added.length > 0 ? <p>{t('pages.settings.transfer.load.added', { names: names(summary.added) })}</p> : null}
        {summary.updated.length > 0 ? <p>{t('pages.settings.transfer.load.updated', { names: names(summary.updated) })}</p> : null}
        {changed && summary.unchanged.length > 0 ? (
          <p>{t('pages.settings.transfer.load.unchanged', { names: names(summary.unchanged) })}</p>
        ) : null}
        {changed ? <p>{t('pages.settings.transfer.load.carryOn')}</p> : null}
      </div>
    </div>
  );
}
