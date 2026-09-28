/**
 * The journal on paper (/journal/print): everything the current learner
 * wrote in Write and Reflect, grouped by lesson, the most recent first
 * (journalByLesson, src/storage/progress.ts). On screen it looks like a
 * sheet of paper; printed, there is no header, navigation or colour
 * (src/styles/print.css, ./print.css).
 *
 * The journal page itself (/journal) is phase 7; its "Print my journal"
 * button should link here. Guests have nothing saved, so they are asked to
 * choose who's learning instead.
 */
import { usePageTitle } from '../../app/usePageTitle';
import { Button } from '../../components/ds';
import { getLessons, getLessonSection } from '../../content';
import { En, useI18n } from '../../i18n';
import { splitParagraphs } from '../../lesson';
import { useLearnerProgress, useLearnerSession } from '../../session';
import { journalByLesson } from '../../storage';
import { PrintToolbar } from './PrintToolbar';
import './print.css';

export function JournalPrintPage() {
  const { t, tx, contentLang } = useI18n();
  usePageTitle(t('print.journalPageTitle'));
  const session = useLearnerSession();
  const learner = session.activeLearner;
  const { status, progress } = useLearnerProgress(learner?.id ?? null);

  // Nothing (not even a heading) until the learner and their work are read,
  // like home and the course map (AppLayout moves focus to the h1 once it appears).
  if (session.status === 'loading' || status === 'loading') return null;

  const journal = learner ? journalByLesson(getLessons(), progress) : [];

  return (
    <div className="tw-print-page">
      <PrintToolbar backHref="/journal" backLabel={t('print.backToJournal')} canPrint={learner !== null && journal.length > 0} />

      <article className="tw-print-sheet" aria-labelledby="print-title">
        <header className="tw-print-head">
          <p className="tw-print-brand">{t('print.brand')}</p>
          <h1 id="print-title" className="tw-print-title" tabIndex={-1}>
            {t('pages.journal.title')}
          </h1>
          {learner ? <p className="tw-print-question">{learner.name}</p> : null}
        </header>

        {!learner ? (
          <div className="tw-print-part">
            <p>{t('print.journalNoLearner')}</p>
            <p className="tw-no-print">
              <Button variant="secondary" href="/">
                {t('print.chooseLearner')}
              </Button>
            </p>
          </div>
        ) : journal.length === 0 ? (
          <p className="tw-print-part">{t('print.journalEmpty')}</p>
        ) : (
          journal.map(({ lesson, pieces }) => (
            <section key={lesson.id} className="tw-print-part">
              <p className="tw-print-eyebrow">
                {tx('pages.course.lessonLabel', { number: lesson.number, section: <En>{getLessonSection(lesson).title}</En> })}
              </p>
              <h2 {...contentLang}>{lesson.title}</h2>
              {pieces.map((piece, index) => (
                <div key={index} className="tw-print-entry">
                  <h3>{t(piece.kind === 'writing' ? 'print.writing' : 'print.reflection')}</h3>
                  <p className="tw-print-prompt" {...contentLang}>
                    {piece.prompt}
                  </p>
                  {splitParagraphs(piece.text).map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} className="tw-print-answer">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
            </section>
          ))
        )}
      </article>
    </div>
  );
}
