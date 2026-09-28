/**
 * A printable certificate: one for each section (/certificate/section/:id)
 * and one for the whole course (/certificate/course). Built on the print
 * views' page and toolbar (../print), with its own sheet: on screen a
 * certificate on the canvas, on paper one landscape page that fits A4 and
 * US Letter, black on white apart from the mascot and the section discs
 * (./Certificate.tsx, ./CertificatePage.css, docs/notes/certificates.md).
 *
 * Who sees what (nothing is locked, so anyone can open this by address):
 * - A learner who has finished every lesson in it (Reflect's required
 *   answer, as everywhere): the certificate, with their name in a field that
 *   changes it just for this print. The section check is never needed.
 * - A learner who hasn't: how many lessons are left, with a link to each.
 * - Guests (looking around, or nobody chosen) have no saved work: they are
 *   told certificates are for learners who have finished lessons.
 */
import { useState } from 'react';
import { lessonPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Button, LessonRow, TextField } from '../../components/ds';
import { getLessons, type Lesson } from '../../content';
import { useI18n } from '../../i18n';
import { useLearnerProgress, useLearnerSession } from '../../session';
import { isLessonComplete, lessonSetStatus, nextStageForLesson, stagesDoneForLesson, type ProgressByLessonId } from '../../storage';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import { Certificate, certificateLessons, type CertificateScope } from './Certificate';
import './CertificatePage.css';

export { certificateLessons, certificateNameSize, type CertificateScope } from './Certificate';

/** The longest name the field takes: a full name, and still one page. */
export const CERTIFICATE_NAME_MAX = 60;

export interface CertificatePageProps {
  scope: CertificateScope;
}

export function CertificatePage({ scope }: CertificatePageProps) {
  const { t } = useI18n();
  const title =
    scope.kind === 'section'
      ? t('certificates.sectionPageTitle', { section: scope.section.title })
      : t('certificates.coursePageTitle');
  usePageTitle(title);
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
              {title}
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
        <LessonsLeft scope={scope} title={title} left={certificate.left} progress={progress} />
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
  title: string;
  left: readonly Lesson[];
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
 * The certificate, with the name field above it (never printed). The name
 * starts as the learner's name on this device; changing it here is only for
 * this print: it lives in this component's state and is never saved or sent
 * anywhere.
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
  const { t } = useI18n();
  const [name, setName] = useState(learnerName);

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
      <Certificate scope={scope} name={name} finishedAt={finishedAt} />
    </>
  );
}
