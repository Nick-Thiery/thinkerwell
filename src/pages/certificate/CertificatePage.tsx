/**
 * A printable certificate: one for each section (/certificate/section/:id)
 * and one for the whole course (/certificate/course). Built on the print
 * views' page and toolbar (../print), with its own sheet: on screen a
 * certificate on the canvas, on paper one landscape page that fits A4 and
 * US Letter, black on white apart from the mascot and the section discs
 * (./CertificatePage.css, docs/notes/certificates.md).
 *
 * Who sees what (nothing is locked, so anyone can open this by address):
 * - A learner who has finished every lesson in it (Reflect's required
 *   answer, as everywhere): the certificate, with their name in a field that
 *   changes it just for this print. The section check is never needed.
 * - A learner who hasn't: how many lessons are left, with a link to each.
 * - Guests (looking around, or nobody chosen) have no saved work: they are
 *   told certificates are for learners who have finished lessons.
 */
import { useState, type ReactNode } from 'react';
import { lessonPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Button, LessonRow, SectionBadge, TextField } from '../../components/ds';
import { getCourse, getLessons, getSectionLessons, getSections, type LessonSummary, type Section } from '../../content/catalog';
import { En, useI18n } from '../../i18n';
import { useLearnerProgress, useLearnerSession } from '../../session';
import { isLessonComplete, lessonSetStatus, nextStageForLesson, stagesDoneForLesson, type ProgressByLessonId } from '../../storage';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import './CertificatePage.css';

const MASCOT_SRC = '/images/thinkerwell-mascot-transparent.png';

/** The longest name the field takes: a full name, and still one page. */
export const CERTIFICATE_NAME_MAX = 60;

export type CertificateScope = { kind: 'section'; section: Section } | { kind: 'course' };

/** The lessons a certificate is for: a section's, or all 24. */
export function certificateLessons(scope: CertificateScope): readonly LessonSummary[] {
  return scope.kind === 'section' ? getSectionLessons(scope.section.id) : getLessons();
}

/** How big the name is printed: smaller for a longer name, so it stays on two lines at most. */
export function certificateNameSize(name: string): 'l' | 'm' | 's' {
  const length = name.trim().length;
  return length <= 22 ? 'l' : length <= 36 ? 'm' : 's';
}

export interface CertificatePageProps {
  scope: CertificateScope;
}

export function CertificatePage({ scope }: CertificatePageProps) {
  const { t, tx } = useI18n();
  const title =
    scope.kind === 'section'
      ? t('certificates.sectionPageTitle', { section: scope.section.title })
      : t('certificates.coursePageTitle');
  usePageTitle(title);
  // The same, with the section's name (course text) marked as English.
  const heading =
    scope.kind === 'section'
      ? tx('certificates.sectionPageTitle', { section: <En>{scope.section.title}</En> })
      : title;
  const session = useLearnerSession();
  const learner = session.activeLearner;
  const { status, progress } = useLearnerProgress(learner?.id ?? null);

  // Nothing (not even a heading) until the learner and their work are read,
  // like the other print views (AppLayout moves focus to the h1 once it appears).
  if (session.status === 'loading' || status === 'loading') return null;

  const back =
    scope.kind === 'section'
      ? { href: `/course#${scope.section.id}`, label: t('certificates.backToCourse') }
      : { href: '/', label: t('certificates.backToHome') };
  const lessons = certificateLessons(scope);
  const certificate = learner ? lessonSetStatus(lessons, progress) : null;

  return (
    <div className="tw-print-page tw-cert-page">
      <PrintToolbar backHref={back.href} backLabel={back.label} canPrint={certificate?.complete === true} />
      {!learner || !certificate ? (
        <article className="tw-print-sheet" aria-labelledby="cert-title">
          <header className="tw-print-head">
            <h1 id="cert-title" className="tw-print-title" tabIndex={-1}>
              {heading}
            </h1>
          </header>
          <div className="tw-print-part">
            <p>{t('certificates.guest')}</p>
            <p className="tw-no-print">
              <Button variant="secondary" href="/">
                {t('print.chooseLearner')}
              </Button>
            </p>
          </div>
        </article>
      ) : certificate.complete && certificate.finishedAt ? (
        <CertificateSheet key={learner.id} scope={scope} learnerName={learner.name} finishedAt={certificate.finishedAt} />
      ) : (
        <LessonsLeft scope={scope} title={heading} left={certificate.left} progress={progress} />
      )}
    </div>
  );
}

/** A learner who hasn't finished yet: how many lessons are left, each one a link. */
function LessonsLeft({
  scope,
  title,
  left,
  progress,
}: {
  scope: CertificateScope;
  title: ReactNode;
  left: readonly LessonSummary[];
  progress: ProgressByLessonId;
}) {
  const { t } = useI18n();
  return (
    <article className="tw-print-sheet tw-cert-left" aria-labelledby="cert-title">
      <header className="tw-print-head">
        <h1 id="cert-title" className="tw-print-title" tabIndex={-1}>
          {title}
        </h1>
        <p className="tw-print-question">
          {scope.kind === 'section'
            ? t('certificates.notYet.section')
            : t('certificates.notYet.course', { count: getLessons().length })}
        </p>
        {scope.kind === 'section' ? <p className="tw-print-muted">{t('certificates.notYet.checkNotNeeded')}</p> : null}
      </header>
      <section className="tw-print-part" aria-labelledby="cert-left-title">
        <h2 id="cert-left-title">{t('certificates.notYet.lessonsLeft', { count: left.length })}</h2>
        <div className="tw-cert-left-rows">
          {left.map((lesson) => {
            const record = progress.get(lesson.id);
            const started = Boolean(record) && !isLessonComplete(record);
            return (
              <LessonRow
                key={lesson.id}
                number={lesson.number}
                title={lesson.title}
                time={t('lesson.minutes', { min: lesson.estimatedMinutes[0], max: lesson.estimatedMinutes[1] })}
                status={started ? 'in-progress' : 'not-started'}
                done={stagesDoneForLesson(record)}
                href={lessonPath(lesson.id, started ? nextStageForLesson(record) : 'read')}
              />
            );
          })}
        </div>
      </section>
    </article>
  );
}

/**
 * The certificate itself, with the name field above it (never printed).
 * The name starts as the learner's name on this device; changing it here
 * is only for this print: it lives in this component's state and is never
 * saved or sent anywhere.
 */
function CertificateSheet({
  scope,
  learnerName,
  finishedAt,
}: {
  scope: CertificateScope;
  learnerName: string;
  finishedAt: string;
}) {
  const { t, tx, formatDate } = useI18n();
  const [name, setName] = useState(learnerName);
  const shownName = name.trim();
  const course = <En>{getCourse().course.title}</En>;
  const date = formatDate(finishedAt, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <div className="tw-cert-controls tw-no-print">
        <p className="tw-print-intro">{t('certificates.printIntro')}</p>
        <TextField
          label={t('certificates.nameLabel')}
          value={name}
          onValueChange={setName}
          helper={t('certificates.nameHelp')}
          maxLength={CERTIFICATE_NAME_MAX}
          spellCheck={false}
        />
      </div>

      <article className="tw-cert" aria-labelledby="cert-title">
        <header className="tw-cert-head">
          <p className="tw-cert-brand">
            <img className="tw-cert-mascot" src={MASCOT_SRC} alt="" width={422} height={423} />
            <span className="tw-cert-wordmark">{t('app.name')}</span>
          </p>
          <h1 id="cert-title" className="tw-cert-title" tabIndex={-1}>
            {t('certificates.sheet.title')}
          </h1>
        </header>

        <div className="tw-cert-who">
          {shownName ? (
            <p className={`tw-cert-name tw-cert-name-${certificateNameSize(shownName)}`}>{shownName}</p>
          ) : (
            // No name: a line to write one on by hand.
            <div className="tw-cert-name-blank">
              <p className="tw-cert-line" />
              <p className="tw-cert-label">{t('certificates.sheet.blankName')}</p>
            </div>
          )}
          <p className="tw-cert-finished">
            {scope.kind === 'section'
              ? tx('certificates.sheet.finishedSection', { section: <En>{scope.section.title}</En>, course })
              : tx('certificates.sheet.finishedCourse', { count: getLessons().length, course })}
          </p>
        </div>

        {scope.kind === 'section' ? <SectionLessons section={scope.section} /> : <CourseSections />}

        <footer className="tw-cert-foot">
          <div className="tw-cert-signs">
            <div className="tw-cert-sign">
              <p className="tw-cert-line">{date}</p>
              <p className="tw-cert-label">{t('certificates.sheet.date')}</p>
            </div>
            <div className="tw-cert-sign">
              <p className="tw-cert-line" />
              <p className="tw-cert-label">{t('certificates.sheet.signature')}</p>
            </div>
          </div>
          <p className="tw-cert-about">{tx('certificates.sheet.about', { course })}</p>
        </footer>
      </article>
    </>
  );
}

/** A section certificate's contents: the section (its colour only beside its icon and name) and its lessons. */
function SectionLessons({ section }: { section: Section }) {
  const { contentLang } = useI18n();
  return (
    <section className="tw-cert-contents" aria-labelledby="cert-contents-title">
      <h2 id="cert-contents-title" className="tw-cert-contents-title">
        <SectionBadge section={section.id} number={section.number} name={<En>{section.title}</En>} />
      </h2>
      <ol className="tw-cert-lessons" role="list">
        {getSectionLessons(section.id).map((lesson) => (
          <li key={lesson.id}>
            <span className="tw-cert-lesson-number">{lesson.number}</span>
            <span {...contentLang}>{lesson.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The course certificate's contents: the four sections. */
function CourseSections() {
  return (
    <ul className="tw-cert-sections" role="list">
      {getSections().map((section) => (
        <li key={section.id}>
          <SectionBadge section={section.id} number={section.number} name={<En>{section.title}</En>} />
        </li>
      ))}
    </ul>
  );
}
