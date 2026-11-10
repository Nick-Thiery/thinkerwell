import { useMemo, useState } from 'react';
import { usePageTitle } from '../app/usePageTitle';
import { Button, Icon, SectionBadge, SegmentedControl } from '../components/ds';
import { useI18n } from '../i18n';
import { useLearnerProgress, useLearnerSession } from '../session';
import type { LessonProgress } from '../storage';
import './JournalPage.css';
import { CourseTextSpan } from './journal/CourseTextSpan';
import { EditableJournalEntry } from './journal/EditableJournalEntry';
import { describeJournalDate, JOURNAL_DATE_FORMAT } from './journal/journalDate';
import { usePlatformJournal } from './journal/usePlatformJournal';

type Filter = 'All' | 'Writing' | 'Reflections';

/**
 * My journal (docs/screens/Journal.dc.html): everything the current learner
 * saved in Write and Reflect, in every course, grouped by lesson and newest
 * first (usePlatformJournal, over journalByLesson in src/storage/progress.ts)
 * — the journal has no store of its own (CLAUDE.md). Each lesson is named
 * with its course. Entries are editable in place; "Print my journal"
 * goes to the paper version built in phase 6 (/journal/print).
 *
 * Look-around and nobody-chosen-yet both have nothing to show, since
 * nothing they do is ever saved (CLAUDE.md rule 4); the message differs
 * depending on which of those it is, matching the course map's own wording.
 */
export function JournalPage() {
  const { t, tx, formatDate } = useI18n();
  usePageTitle(t('pages.journal.title'));
  const session = useLearnerSession();
  const learner = session.activeLearner;
  const { status, progress } = useLearnerProgress(learner?.id ?? null);
  const [filter, setFilter] = useState<Filter>('All');
  // Edits are written straight to the store; keeping the record each save
  // returns lets the page show it at once, without a way to refetch
  // useLearnerProgress's own snapshot (it only reloads on a learner change).
  // Each is kept with the learner it was saved for, and only that learner's
  // are ever shown: a save that finishes after a switch stays with its owner.
  const [overrides, setOverrides] = useState<readonly { learnerId: string; lessonId: string; record: LessonProgress }[]>([]);

  const effectiveProgress = useMemo(() => {
    const mine = overrides.filter((override) => override.learnerId === learner?.id);
    if (mine.length === 0) return progress;
    const merged = new Map(progress);
    for (const { lessonId, record } of mine) merged.set(lessonId, record);
    return merged;
  }, [progress, overrides, learner?.id]);

  const platform = usePlatformJournal(learner?.id ?? null, effectiveProgress);
  const loading = session.status === 'loading' || (learner !== null && (status === 'loading' || platform.status === 'loading'));

  const journal = learner ? platform.entries : [];
  const filtered = journal
    .map((entry) => ({
      ...entry,
      pieces: entry.pieces.filter((piece) =>
        filter === 'All' ? true : filter === 'Writing' ? piece.kind === 'writing' : piece.kind === 'reflection',
      ),
    }))
    .filter((entry) => entry.pieces.length > 0);
  const totalPieces = filtered.reduce((sum, entry) => sum + entry.pieces.length, 0);
  const pieceCountLine = t('pages.journal.pieceCount', {
    count: totalPieces,
    lessons: t('pages.journal.lessonCount', { count: filtered.length }),
  });

  if (loading) return null;

  const lookingAround = session.lookAround;
  const noLearnerChosen = !lookingAround && !learner;
  const isGuest = lookingAround || noLearnerChosen;

  return (
    <div className="tw-journal-page">
      <header className="tw-journal-head">
        <div>
          <h1 className="h1" tabIndex={-1}>
            {t('pages.journal.title')}
          </h1>
          <p className="body-lg">{t('pages.journal.subtitle')}</p>
        </div>
        {learner ? (
          <Button variant="secondary" icon="Printer" href="/journal/print">
            {t('print.printJournal')}
          </Button>
        ) : null}
      </header>

      {isGuest ? (
        <div className="tw-journal-guest">
          <p className="body-lg">{t(lookingAround ? 'pages.journal.lookAroundNote' : 'pages.journal.noLearnerNote')}</p>
          <Button variant="secondary" href="/">
            {t('print.chooseLearner')}
          </Button>
        </div>
      ) : (
        <>
          <div className="tw-journal-toolbar">
            <SegmentedControl
              label={t('pages.journal.filterLabel')}
              options={[
                { label: t('pages.journal.filterAll'), value: 'All' },
                { label: t('pages.journal.filterWriting'), value: 'Writing' },
                { label: t('pages.journal.filterReflections'), value: 'Reflections' },
              ]}
              value={filter}
              onChange={(value) => setFilter(value as Filter)}
            />
            {journal.length > 0 ? <span className="small tw-journal-count">{pieceCountLine}</span> : null}
          </div>

          {journal.length === 0 ? (
            <p className="body-lg">{t('pages.journal.empty')}</p>
          ) : filtered.length === 0 ? (
            <p className="body-lg">{t('pages.journal.emptyFiltered')}</p>
          ) : (
            <div className="tw-journal-groups">
              {filtered.map(({ lesson, updatedAt, pieces }) => {
                const when = describeJournalDate(updatedAt);
                const savedLabel =
                  when.kind === 'today'
                    ? t('pages.journal.savedToday')
                    : when.kind === 'yesterday'
                      ? t('pages.journal.savedYesterday')
                      : t('ds.course.journalEntry.saved', { date: formatDate(when.date, JOURNAL_DATE_FORMAT) });
                return (
                  <section key={`${learner?.id ?? ''}:${lesson.id}`} className="tw-journal-group">
                    <div className="tw-journal-group-label">
                      <SectionBadge section={lesson.tone} showName={false} size={36} />
                      <span className="tw-journal-group-text">
                        <span className="small tw-journal-course">
                          <CourseTextSpan value={lesson.courseName} />
                        </span>
                        <span>
                          {tx('pages.journal.groupLabel', {
                            number: lesson.number,
                            title: <CourseTextSpan value={lesson.title} />,
                          })}
                        </span>
                      </span>
                    </div>
                    {pieces.map((piece) => (
                      <EditableJournalEntry
                        key={`${learner?.id ?? ''}:${piece.kind === 'reflection' ? `reflection-${piece.reflectionIndex}` : 'writing'}`}
                        lesson={lesson}
                        piece={piece}
                        savedLabel={savedLabel}
                        onSaved={(learnerId, lessonId, record) => setOverrides((prev) => [...prev, { learnerId, lessonId, record }])}
                      />
                    ))}
                  </section>
                );
              })}
            </div>
          )}

          <div className="tw-journal-privacy">
            <Icon name="Info" size={22} />
            <span>{t('pages.journal.privacyNote')}</span>
          </div>
        </>
      )}
    </div>
  );
}
