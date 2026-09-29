/**
 * A lesson's teacher guide (/educators/lesson/:id), for the volunteer
 * teachers who run sessions: on screen and on paper, the same page. Like
 * the print views (docs/notes/phase-6.md), it is a sheet of paper under a
 * small toolbar on screen, and black text on white without the header or
 * menus when printed (src/styles/print.css, ../print/print.css, and
 * ./teacherTools.css for what is its own).
 *
 * Everything in it comes from the lesson file. The only words written here
 * (in en.json) are headings, labels and the session plan's steps. The
 * notes come first, sensitive topics before the rest and marked, so a
 * teacher reads them before planning the session.
 */
import { Fragment, type ReactNode } from 'react';
import { educatorsPath, lessonPath, lessonPrintPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Button, Icon } from '../../components/ds';
import { type Lesson, type ThinkCheck } from '../../content';
import { useContent } from '../../content/useContent';
import { AlwaysEn, En, useI18n } from '../../i18n';
import { formatDuration } from '../../lesson/format';
import { LessonEvidence } from '../lesson/evidence/LessonEvidence';
import { feedbackWithoutVerdict } from '../lesson/read/feedbackText';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import { AnswerOptions } from './AnswerOptions';
import { planTotal, SESSION_MINUTES, SESSION_PLAN, SHORT_SESSION_MINUTES } from './sessionPlan';
import './teacherTools.css';

/** Where a teacher can watch a lesson's video: YouTube itself, opened by the teacher (never embedded or fetched here). */
export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;
}

export function TeacherGuidePage({ lesson }: { lesson: Lesson }) {
  // Everything from the lesson file is course text, marked as English (`en`).
  // en: course text (translated with the lessons); alwaysEn: the video's details, the sources and the teachers' notes, English in every language.
  const { t, tx, formatNumber, contentLang: en, englishLang: alwaysEn, contentLocale } = useI18n();
  const content = useContent();
  usePageTitle(t('pages.teacherGuide.pageTitle', { number: lesson.number }));
  const section = content.getLessonSection(lesson);
  const [min, max] = lesson.estimatedMinutes;
  const { read, write, speak, watch, reflect } = lesson;
  const thinkChecks = read.checks.filter((check): check is ThinkCheck => check.type === 'think');

  return (
    <div className="tw-print-page tw-guide-page">
      <PrintToolbar backHref={educatorsPath(section.id)} backLabel={t('pages.teacherTools.back')} />
      <div className="tw-guide-actions tw-no-print">
        <Button variant="secondary" icon="Eye" href={`${lessonPath(lesson.id)}?preview=true`}>
          {t('pages.teacherGuide.previewLesson')}
        </Button>
        <Button variant="secondary" icon="FileText" href={lessonPrintPath(lesson.id)}>
          {t('pages.teacherGuide.learnerPrint')}
        </Button>
      </div>
      <p className="tw-print-intro tw-no-print">{t('pages.teacherGuide.intro')}</p>

      <article className="tw-print-sheet tw-guide" aria-labelledby="guide-title">
        <header className="tw-print-head">
          <p className="tw-print-brand">{t('print.brand')}</p>
          <p className="tw-print-eyebrow">{t('pages.teacherGuide.eyebrow', { number: lesson.number })}</p>
          <h1 id="guide-title" className="tw-print-title" tabIndex={-1} {...en}>
            {lesson.title}
          </h1>
          <dl className="tw-guide-facts">
            <div>
              <dt>{t('pages.teacherGuide.section')}</dt>
              <dd>{tx('pages.teacherGuide.sectionValue', { number: section.number, title: <En>{section.title}</En> })}</dd>
            </div>
            <div>
              <dt>{t('pages.teacherGuide.essentialQuestion')}</dt>
              <dd {...en}>{lesson.essentialQuestion}</dd>
            </div>
            <div>
              <dt>{t('pages.teacherGuide.learningGoal')}</dt>
              <dd {...en}>{lesson.learningGoal}</dd>
            </div>
            <div>
              <dt>{t('pages.teacherGuide.time')}</dt>
              <dd>{t('lesson.minutes', { min, max })}</dd>
            </div>
          </dl>
        </header>

        <BeforeYouTeach lesson={lesson} />
        <SessionPlan lesson={lesson} />

        <section className="tw-print-part">
          <h2>{t('pages.teacherGuide.keyWordsTitle')}</h2>
          <dl className="tw-print-glossary" {...en}>
            {read.glossary.map((entry) => (
              <div key={entry.word} className="tw-print-keep">
                <dt>{entry.word}</dt>
                <dd>
                  {entry.definition}
                  <br />
                  <em>{entry.example}</em>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="tw-print-part tw-print-evidence">
          <h2>{t('pages.teacherGuide.evidenceTitle')}</h2>
          <LessonEvidence evidence={lesson.evidence} visual={lesson.visual} />
        </section>

        <section className="tw-print-part">
          <h2>{t('pages.teacherGuide.checkTitle')}</h2>
          <p className="tw-print-muted">{t('pages.teacherGuide.checkIntro')}</p>
          <ol className="tw-print-questions">
            {read.checks.map((check, index) => (
              <li key={index}>
                <p className="tw-guide-question" {...en}>
                  {check.question}
                </p>
                {check.type === 'choice' ? (
                  <AnswerOptions
                    options={check.options.map((option) =>
                      option.correct
                        ? { ...option, feedback: feedbackWithoutVerdict(option.feedback, true, contentLocale.code) }
                        : option,
                    )}
                    feedback="why"
                  />
                ) : (
                  <p className="tw-print-muted">
                    {t(check.optional ? 'pages.teacherGuide.thinkOptional' : 'pages.teacherGuide.think')}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="tw-print-part">
          <h2>{t('stages.write')}</h2>
          <div className="tw-print-keep">
            <h3>{t('pages.teacherGuide.writeTask')}</h3>
            <p className="tw-print-task" {...en}>
              {write.prompt}
            </p>
          </div>
          <div className="tw-print-keep">
            <h3>{t('pages.teacherGuide.selfCheck')}</h3>
            <ul {...en}>
              {write.selfCheck.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="tw-print-keep">
            <h3>{t('pages.teacherGuide.example')}</h3>
            <p className="tw-guide-example" {...en}>
              {write.example}
            </p>
            <p className="tw-print-muted">{t('pages.teacherGuide.exampleNote')}</p>
          </div>
        </section>

        <section className="tw-print-part">
          <h2>{t('stages.speak')}</h2>
          <div className="tw-print-keep">
            <h3>{t('lessonPlayer.speak.partnerTitle')}</h3>
            <p {...en}>{speak.partnerTask}</p>
          </div>
          <div className="tw-print-keep">
            <h3>{t('lessonPlayer.speak.soloTitle')}</h3>
            <p {...en}>{speak.independentTask}</p>
          </div>
        </section>

        <section className="tw-print-part">
          <h2>{t('pages.teacherGuide.discussTitle')}</h2>
          <p className="tw-print-muted">{t('pages.teacherGuide.discussIntro')}</p>
          <div className="tw-print-keep">
            <h3>{t('pages.teacherGuide.discussWarmUp')}</h3>
            <p {...en}>{lesson.warmUp.question}</p>
            {lesson.warmUp.options ? (
              <>
                <p className="tw-print-muted">{t('pages.teacherGuide.discussChoices')}</p>
                <ul {...en}>
                  {lesson.warmUp.options.map((option, index) => (
                    <li key={index}>{option}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          {thinkChecks.length > 0 ? (
            <div className="tw-print-keep">
              <h3>{t('pages.teacherGuide.discussThink')}</h3>
              {thinkChecks.map((check, index) => (
                <Fragment key={index}>
                  <p {...en}>{check.question}</p>
                  <p className="tw-print-muted">
                    {t('pages.teacherGuide.startHelp')} <En>{check.placeholder}</En>
                  </p>
                </Fragment>
              ))}
            </div>
          ) : null}
          <div className="tw-print-keep">
            <h3>{t('pages.teacherGuide.discussReflect')}</h3>
            <ul>
              {reflect.prompts.map((prompt, index) => (
                <li key={index}>
                  <En>{prompt.text}</En>{' '}
                  <span className="tw-print-muted">
                    {prompt.required ? t('pages.teacherGuide.reflectRequired') : t('print.optional')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="tw-print-part" id="guide-video">
          <h2>{t('pages.teacherGuide.videoTitle')}</h2>
          <dl className="tw-guide-facts">
            <div>
              <dt>{t('pages.teacherGuide.videoName')}</dt>
              <dd {...alwaysEn}>{watch.title}</dd>
            </div>
            <div>
              <dt>{t('pages.teacherGuide.videoChannel')}</dt>
              <dd {...alwaysEn}>{watch.channel}</dd>
            </div>
            <div>
              <dt>{t('pages.teacherGuide.videoLength')}</dt>
              <dd>
                {watch.durationSeconds === null
                  ? t('pages.teacherGuide.videoLengthUnknown')
                  : formatDuration(watch.durationSeconds, formatNumber)}
              </dd>
            </div>
            <div>
              <dt>{t('pages.teacherGuide.videoLink')}</dt>
              <dd>
                <ExternalLink href={youtubeWatchUrl(watch.youtubeId)}>{t('pages.teacherGuide.videoOpen')}</ExternalLink>
              </dd>
            </div>
            <div>
              <dt>{t('pages.teacherGuide.videoWhy')}</dt>
              <dd {...en}>{watch.why}</dd>
            </div>
          </dl>
          {watch.contentNote ? (
            <div className="tw-guide-callout tw-print-keep">
              <h3>
                <Icon name="Hand" size={20} />
                {t('pages.teacherGuide.contentNote')}
              </h3>
              <p {...en}>{watch.contentNote}</p>
            </div>
          ) : null}
          <p className="tw-print-muted">{t('pages.teacherGuide.videoOffline')}</p>
          <div className="tw-print-keep">
            <h3>{t('pages.teacherGuide.beforeVideo')}</h3>
            <p {...en}>{watch.beforeQuestion}</p>
          </div>
          <div className="tw-print-keep">
            <h3>{t('pages.teacherGuide.afterVideo')}</h3>
            <p {...en}>{watch.afterQuestion}</p>
          </div>
        </section>

        {lesson.sources.length > 0 ? (
          <section className="tw-print-part">
            <h2>{t('pages.teacherGuide.sourcesTitle')}</h2>
            <ul className="tw-guide-links">
              {lesson.sources.map((source) => (
                <li key={source.url}>
                  <ExternalLink href={source.url}>
                    <AlwaysEn>{source.label}</AlwaysEn>
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}

/** The notes for teachers: sensitive topics first, in a marked box, then the rest. */
function BeforeYouTeach({ lesson }: { lesson: Lesson }) {
  // The teachers' notes stay English in every language.
  const { t, englishLang } = useI18n();
  const { sensitiveNotes, educatorNotes } = lesson;
  const contentNote = lesson.watch.contentNote;
  const hasSensitive = sensitiveNotes.length > 0 || contentNote !== null;
  if (!hasSensitive && educatorNotes.length === 0) return null;

  return (
    <section className="tw-print-part">
      <h2>{t('pages.teacherGuide.beforeTitle')}</h2>
      {hasSensitive ? (
        <div className="tw-guide-callout tw-guide-sensitive tw-print-keep">
          <h3>
            <Icon name="Hand" size={20} />
            {t('pages.teacherGuide.sensitiveTitle')}
          </h3>
          <ul>
            {sensitiveNotes.map((note, index) => (
              <li key={index} {...englishLang}>
                {note}
              </li>
            ))}
            {contentNote ? <li>{t('pages.teacherGuide.contentNotePointer')}</li> : null}
          </ul>
        </div>
      ) : null}
      {educatorNotes.length > 0 ? (
        <div className="tw-guide-notes">
          <h3>{t('pages.teacherGuide.notesTitle')}</h3>
          <ul {...englishLang}>
            {educatorNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** The suggested plan for about 45 minutes (./sessionPlan.ts), with a 30-minute column and a note on shortening it. */
function SessionPlan({ lesson }: { lesson: Lesson }) {
  const { t, formatNumber } = useI18n();
  const doText = (step: (typeof SESSION_PLAN)[number]['step']): string => {
    switch (step) {
      case 'read':
        return t('pages.teacherGuide.planDo.read', { count: lesson.read.sections.length });
      case 'check':
        return t('pages.teacherGuide.planDo.check', { count: lesson.read.checks.length });
      default:
        return t(`pages.teacherGuide.planDo.${step}`);
    }
  };

  return (
    <section className="tw-print-part tw-print-keep">
      <h2>{t('pages.teacherGuide.planTitle')}</h2>
      <p>{t('pages.teacherGuide.planIntro')}</p>
      {/* Explicit roles: on a phone the rows are laid out as a grid (teacherTools.css), and Safari drops a table's meaning when its display changes. */}
      <table className="tw-guide-plan" role="table">
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">
              {t('pages.teacherGuide.planStep')}
            </th>
            <th scope="col" role="columnheader">
              {t('pages.teacherGuide.planDoTitle')}
            </th>
            <th scope="col" role="columnheader" className="tw-guide-plan-min">
              {t('pages.teacherGuide.planColumn', { minutes: SESSION_MINUTES })}
            </th>
            <th scope="col" role="columnheader" className="tw-guide-plan-min">
              {t('pages.teacherGuide.planColumn', { minutes: SHORT_SESSION_MINUTES })}
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {SESSION_PLAN.map((row) => (
            <tr key={row.step} role="row">
              <th scope="row" role="rowheader">
                {t(`pages.teacherGuide.planSteps.${row.step}`)}
              </th>
              <td role="cell">{doText(row.step)}</td>
              <td role="cell" className="tw-guide-plan-min">
                {formatNumber(row.minutes)}
              </td>
              <td role="cell" className="tw-guide-plan-min">
                {row.short === null ? t('pages.teacherGuide.planSkip') : formatNumber(row.short)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot role="rowgroup">
          <tr role="row">
            <th scope="row" role="rowheader">
              {t('pages.teacherGuide.planTotal')}
            </th>
            <td role="cell" />
            <td role="cell" className="tw-guide-plan-min">
              {formatNumber(planTotal('minutes'))}
            </td>
            <td role="cell" className="tw-guide-plan-min">
              {formatNumber(planTotal('short'))}
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="tw-print-muted">{t('pages.teacherGuide.planShorter')}</p>
    </section>
  );
}

/**
 * A link to another site, opened in a new tab so the guide stays open.
 * Nothing loads from there until the teacher taps it. Printed, its address
 * follows it (teacherTools.css).
 */
function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <a className="tw-guide-link" href={href} target="_blank" rel="noreferrer">
      {children}{' '}
      <span className="tw-visually-hidden">{t('pages.teacherTools.newTab')}</span>
    </a>
  );
}
