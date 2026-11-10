/**
 * The session record and feedback sheet (/educators/feedback-sheet): one
 * paper sheet for each group, for the educator to fill in by hand. It asks
 * which courses and lessons the group used, which checks it did, and how it
 * went: how easy Thinkerwell was to use (setting up, finding lessons,
 * switching courses), whether the lessons suited the learners, whether they
 * stayed interested, and what got in the way.
 *
 * - On paper on purpose, like the learning check: the site sends and stores
 *   nothing from it. The educator keeps it or sends it to the team (a photo,
 *   or typed answers through the contact form), so what the team learns is
 *   tied to the courses and lessons a group actually used.
 * - It never asks for a learner's name or anything a learner wrote or said.
 * - Its rows are the courses on the site (src/content/courses.ts and the
 *   build-time list), in the language on screen where a course is translated.
 *   Its own words are the lazily loaded `feedbackSheet` group.
 * - Prints on A4 or Letter in black on white, nothing under 14px (10.5pt).
 */
import { useMemo, type ReactNode } from 'react';
import words from 'virtual:thinkerwell/messages/feedbackSheet';
import { contactPath, educatorsPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { courseSummaries } from '../../content/catalog';
import { COURSES, DEFAULT_COURSE_ID } from '../../content/courses';
import { useCatalog } from '../../content/useCatalog';
import { useI18n, withWords, type MessageKey } from '../../i18n';
import { Button } from '../../components/ds';
import { AnswerLines, PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import './ConsentFormPage.css';
import './FeedbackSheetPage.css';

/** A tick box to mark by hand. Decorative on screen: the choice is the words beside it. */
function Choice({ children }: { children: ReactNode }) {
  return (
    <span className="tw-fb-choice">
      <span className="tw-fb-box" aria-hidden="true" />
      {children}
    </span>
  );
}

/** A blank to write on, with its label above. */
function Field({ label }: { label: string }) {
  return (
    <div className="tw-fb-field">
      <span className="tw-fb-label">{label}</span>
      <span className="tw-fb-blank" aria-hidden="true" />
    </div>
  );
}

interface Question {
  key: string;
  ask: MessageKey;
  options?: readonly MessageKey[];
  more?: MessageKey;
  lines: number;
}

const QUESTIONS: readonly Question[] = [
  {
    key: 'ease',
    ask: 'feedbackSheet.ease.ask',
    options: ['feedbackSheet.ease.easy', 'feedbackSheet.ease.mostly', 'feedbackSheet.ease.hard'],
    more: 'feedbackSheet.ease.more',
    lines: 2,
  },
  {
    key: 'switch',
    ask: 'feedbackSheet.switch.ask',
    options: ['feedbackSheet.yes', 'feedbackSheet.notSure', 'feedbackSheet.no'],
    more: 'feedbackSheet.switch.more',
    lines: 1,
  },
  {
    key: 'content',
    ask: 'feedbackSheet.content.ask',
    options: ['feedbackSheet.content.mostly', 'feedbackSheet.content.some', 'feedbackSheet.content.few'],
    more: 'feedbackSheet.content.more',
    lines: 2,
  },
  {
    key: 'engage',
    ask: 'feedbackSheet.engage.ask',
    options: ['feedbackSheet.engage.most', 'feedbackSheet.engage.some', 'feedbackSheet.engage.few'],
    more: 'feedbackSheet.engage.more',
    lines: 2,
  },
  { key: 'practical', ask: 'feedbackSheet.practical.ask', lines: 2 },
  { key: 'anything', ask: 'feedbackSheet.anything.ask', lines: 2 },
];

export function FeedbackSheetPage() {
  const parent = useI18n();
  const i18n = useMemo(() => withWords(parent, words), [parent]);
  const { t } = i18n;
  const ourWorld = useCatalog().getCourse().course.title;
  const title = t('feedbackSheet.title');
  usePageTitle(title);

  // One row for each course: Our World first, then the others, named in the language on screen where they are translated.
  const rows = COURSES.filter((course) => course.id === DEFAULT_COURSE_ID || courseSummaries[course.id]).map((course) => {
    if (course.id === DEFAULT_COURSE_ID) return { id: course.id, name: ourWorld, lang: parent.contentLang };
    const titles = courseSummaries[course.id]!.titles;
    const translated = titles[parent.contentLocale.code];
    return { id: course.id, name: translated ?? titles.en!, lang: translated ? parent.contentLang : parent.englishLang };
  });

  return (
    <div className="tw-print-page tw-consent-page">
      <PrintToolbar backHref={educatorsPath()} backLabel={parent.t('pages.teacherTools.back')} />

      <section className="tw-consent-setup tw-no-print" aria-labelledby="feedback-title">
        <h1 id="feedback-title" className="h1" tabIndex={-1}>
          {title}
        </h1>
        <p className="body-lg">{t('feedbackSheet.intro')}</p>
        <p>
          <Button variant="secondary" icon="Mail" href={contactPath()}>
            {t('feedbackSheet.sendLink')}
          </Button>
        </p>
      </section>

      <article className="tw-print-sheet tw-consent tw-feedback" aria-labelledby="feedback-sheet-title">
        <header className="tw-print-head">
          <p className="tw-print-brand">{parent.t('print.brandPlatform')}</p>
          <h2 id="feedback-sheet-title" className="tw-print-title">
            {t('feedbackSheet.sheetTitle')}
          </h2>
          <p className="tw-print-eyebrow">{t('feedbackSheet.sheetFor')}</p>
        </header>

        <section className="tw-consent-part tw-fb-part" aria-labelledby="fb-who">
          <h3 id="fb-who">{t('feedbackSheet.whoTitle')}</h3>
          <div className="tw-fb-fields">
            <Field label={t('feedbackSheet.organisation')} />
            <Field label={t('feedbackSheet.group')} />
            <Field label={t('feedbackSheet.dates')} />
            <Field label={t('feedbackSheet.learners')} />
          </div>
        </section>

        <section className="tw-consent-part tw-fb-part" aria-labelledby="fb-used">
          <h3 id="fb-used">{t('feedbackSheet.usedTitle')}</h3>
          <p>{t('feedbackSheet.usedHelp')}</p>
          <table className="tw-fb-table">
            <thead>
              <tr>
                <th scope="col">{t('feedbackSheet.colCourse')}</th>
                <th scope="col">{t('feedbackSheet.colLessons')}</th>
                <th scope="col">{t('feedbackSheet.colSessions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" {...row.lang}>
                    {row.name}
                  </th>
                  <td />
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="tw-consent-part tw-fb-part" aria-labelledby="fb-checks">
          <h3 id="fb-checks">{t('feedbackSheet.checksTitle')}</h3>
          <p className="tw-fb-q">
            <strong>{t('feedbackSheet.checkLearning')}</strong>{' '}
            <Choice>{t('feedbackSheet.yes')}</Choice> <Choice>{t('feedbackSheet.no')}</Choice> <Choice>{t('feedbackSheet.notUsed')}</Choice>
          </p>
          <p className="tw-fb-q">
            <strong>{t('feedbackSheet.checkSection')}</strong> <Choice>{t('feedbackSheet.yes')}</Choice> <Choice>{t('feedbackSheet.no')}</Choice>
          </p>
          <p className="tw-fb-q">
            <strong>{t('feedbackSheet.checkReview')}</strong> <Choice>{t('feedbackSheet.yes')}</Choice> <Choice>{t('feedbackSheet.no')}</Choice>{' '}
            <Choice>{t('feedbackSheet.notUsed')}</Choice>
          </p>
        </section>

        <section className="tw-consent-part tw-fb-part" aria-labelledby="fb-how">
          <h3 id="fb-how">{t('feedbackSheet.howTitle')}</h3>
          {QUESTIONS.map((question) => (
            <div key={question.key} className="tw-fb-question">
              <p className="tw-fb-q">
                <strong>{t(question.ask)}</strong>
                {question.options?.map((option) => (
                  <span key={option}>
                    {' '}
                    <Choice>{t(option)}</Choice>
                  </span>
                ))}
              </p>
              {question.more ? <p className="tw-fb-more">{t(question.more)}</p> : null}
              <AnswerLines count={question.lines} />
            </div>
          ))}
        </section>

        <p className="tw-fb-note">{t('feedbackSheet.privacy')}</p>
      </article>
    </div>
  );
}
