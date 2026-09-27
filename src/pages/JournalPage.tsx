import { useMemo, useState } from 'react';
import { usePageTitle } from '../app/usePageTitle';
import { Button, Icon, SectionBadge, SegmentedControl } from '../components/ds';
import { getLessons, getLessonSection } from '../content';
import { useI18n } from '../i18n';
import { useLearnerProgress, useLearnerSession } from '../session';
import { journalByLesson, type LessonProgress } from '../storage';
import './JournalPage.css';
import { EditableJournalEntry } from './journal/EditableJournalEntry';
import { describeJournalDate } from './journal/journalDate';

type Filter = 'All' | 'Writing' | 'Reflections';

/**
 * My journal (docs/screens/Journal.dc.html): everything the current learner
 * saved in Write and Reflect, grouped by lesson and newest first
 * (journalByLesson, src/storage/progress.ts) — the journal has no store of
 * its own (CLAUDE.md). Entries are editable in place; "Print my journal"
 * goes to the paper version built in phase 6 (/journal/print).
 *
 * Look-around and nobody-chosen-yet both have nothing to show, since
 * nothing they do is ever saved (CLAUDE.md rule 4); the message differs
 * depending on which of those it is, matching the course map's own wording.
 */
export function JournalPage() {
  const { t, lang } = useI18n();
  usePageTitle(t('pages.journal.title'));
  const session = useLearnerSession();
  const learner = session.activeLearner;
  const { status, progress } = useLearnerProgress(learner?.id ?? null);
  const [filter, setFilter] = useState<Filter>('All');
  // Edits are written straight to the store; keeping the record each save
  // returns lets the page show it at once, without a way to refetch
  // useLearnerProgress's own snapshot (it only reloads on a learner change).
  const [overrides, setOverrides] = useState<Record<string, LessonProgress>>({});

  const loading = session.status === 'loading' || (learner !== null && status === 'loading');

  const lessons = getLessons();
  const effectiveProgress = useMemo(() => {
    if (Object.keys(overrides).length === 0) return progress;
    const merged = new Map(progress);
    for (const [lessonId, record] of Object.entries(overrides)) merged.set(lessonId, record);
    return merged;
  }, [progress, overrides]);

  const journal = learner ? journalByLesson(lessons, effectiveProgress) : [];
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
            filtered.map(({ lesson, updatedAt, pieces }) => {
              const dateKind = describeJournalDate(updatedAt, lang);
              const date = dateKind.kind === 'other' ? dateKind.text : t(`pages.journal.${dateKind.kind}`);
              return (
                <section key={lesson.id} className="tw-journal-group">
                  <div className="tw-journal-group-label">
                    <SectionBadge section={getLessonSection(lesson).id} showName={false} size={36} />
                    {t('pages.journal.groupLabel', { number: lesson.number, title: lesson.title })}
                  </div>
                  {pieces.map((piece) => (
                    <EditableJournalEntry
                      key={piece.kind === 'reflection' ? `reflection-${piece.reflectionIndex}` : 'writing'}
                      lesson={lesson}
                      piece={piece}
                      date={date}
                      onSaved={(lessonId, record) => setOverrides((prev) => ({ ...prev, [lessonId]: record }))}
                    />
                  ))}
                </section>
              );
            })
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
