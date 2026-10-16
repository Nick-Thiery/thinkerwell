/**
 * The before-and-after check (/educators/pilot-check): the paper sheets for
 * the first and last sessions of a pilot, as the consent form promises
 * (pages.pilotStudy): 16 questions, a few sentences on paper and 5 faces.
 * docs/notes/pilot-check.md says how it is run and scored.
 *
 * - Two printouts, chosen above the sheets: the learners' sheets (the same
 *   ones both times, with the pilot code and "first" or "last" session at the
 *   top, never a name), and the answer key with the writing rubric, for the
 *   team only.
 * - The questions are content (content/pilot-check/), in the language on
 *   screen when it has its own (English, Indonesian, Malay), else English,
 *   marked as English. The page's own words are the lazily loaded
 *   `pilotCheck` group.
 * - On paper only, by design: it works without the internet, needs nothing
 *   new from pilot measurement, and the team types the answers into the
 *   scoring spreadsheet (docs/pilot/pilot-check-scoring.xlsx).
 * - Black on white, nothing under 14px (10.5pt), each part on a new page.
 */
import { useEffect, useMemo, useState } from 'react';
import words from 'virtual:thinkerwell/messages/pilotCheck';
import { educatorsPath } from '../../../app/lessonUrls';
import { usePageTitle } from '../../../app/usePageTitle';
import { SegmentedControl } from '../../../components/ds';
import { useI18n, withWords } from '../../../i18n';
import { AnswerLines, PrintToolbar } from '../../print/PrintToolbar';
import '../../print/print.css';
import { CHECK_LANGUAGES, correctLetter, loadPilotCheck, OPTION_LETTERS, type PilotCheck } from './pilotCheckContent';
import './PilotCheckPage.css';

type Printout = 'learners' | 'key';

/** The four faces for the confidence statements, from "not yet" to "yes". Drawn here: they're not icons. */
function Face({ level }: { level: 1 | 2 | 3 | 4 }) {
  const mouth = {
    1: 'M8 16.5 Q12 13 16 16.5',
    2: 'M8.5 15.5 L15.5 15.5',
    3: 'M8 14.5 Q12 17.5 16 14.5',
    4: 'M7.5 13.5 Q12 19 16.5 13.5 Z',
  }[level];
  return (
    <svg className="tw-check-face" viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="9.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="9.5" r="1.2" fill="currentColor" />
      <path d={mouth} fill={level === 4 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PilotCheckPage() {
  const parent = useI18n();
  const i18n = useMemo(() => withWords(parent, words), [parent]);
  const { t, formatNumber } = i18n;
  const title = t('pilotCheck.title');
  usePageTitle(title);

  // The check's own language: the one on screen if it has one, else English.
  const language = (CHECK_LANGUAGES as readonly string[]).includes(parent.locale) ? parent.locale : 'en';
  const lang = language === 'en' ? parent.englishLang : {};
  const [check, setCheck] = useState<PilotCheck | null>(null);
  useEffect(() => {
    let current = true;
    void loadPilotCheck(language).then((loaded) => {
      if (current) setCheck(loaded);
    });
    return () => {
      current = false;
    };
  }, [language]);

  const [printout, setPrintout] = useState<Printout>('learners');
  const faces = [t('pilotCheck.face1'), t('pilotCheck.face2'), t('pilotCheck.face3'), t('pilotCheck.face4')];

  return (
    <div className="tw-print-page tw-check-page">
      <PrintToolbar backHref={educatorsPath()} backLabel={parent.t('pages.teacherTools.back')} />

      <section className="tw-check-setup tw-no-print" aria-labelledby="check-title">
        <h1 id="check-title" className="h1" tabIndex={-1}>
          {title}
        </h1>
        <p className="body-lg">{t('pilotCheck.intro')}</p>
        <div className="tw-check-howto">
          <h2 className="h3">{t('pilotCheck.howTitle')}</h2>
          <ul>
            <li>{t('pilotCheck.how1')}</li>
            <li>{t('pilotCheck.how2')}</li>
            <li>{t('pilotCheck.how3')}</li>
            <li>{t('pilotCheck.how4')}</li>
            <li>{t('pilotCheck.how5')}</li>
          </ul>
        </div>
        <div className="tw-print-levels">
          <span className="label" aria-hidden="true">
            {t('pilotCheck.printLabel')}
          </span>
          <SegmentedControl
            label={t('pilotCheck.printLabel')}
            options={[
              { label: t('pilotCheck.printLearners'), value: 'learners' },
              { label: t('pilotCheck.printKey'), value: 'key' },
            ]}
            value={printout}
            onChange={(value) => setPrintout(value as Printout)}
          />
        </div>
      </section>

      {!check ? null : printout === 'learners' ? (
        <>
          <article className="tw-print-sheet tw-check-sheet" aria-labelledby="check-part1">
            <SheetHead t={t} />
            <h2 id="check-part1" className="tw-check-part-title">
              {t('pilotCheck.part1Title')}
            </h2>
            <p className="tw-check-help">{t('pilotCheck.part1Help')}</p>
            <ol className="tw-check-questions" {...lang}>
              {check.questions.map((question, index) => (
                <li key={question.id} className="tw-check-question">
                  <span className="tw-check-number">{formatNumber(index + 1)}</span>
                  <div>
                    {question.stimulus ? <p className="tw-check-stimulus">{question.stimulus}</p> : null}
                    <p className="tw-check-ask">{question.question}</p>
                    <ul className="tw-check-options">
                      {question.options.map((option, n) => (
                        <li key={n}>
                          <span className="tw-check-letter" aria-hidden="true">
                            {OPTION_LETTERS[n]}
                          </span>
                          <span>{option.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </article>

          <article className="tw-print-sheet tw-check-sheet tw-check-new-page" aria-labelledby="check-part2">
            <SheetHead t={t} />
            <h2 id="check-part2" className="tw-check-part-title">
              {t('pilotCheck.part2Title')}
            </h2>
            <p className="tw-check-help">{t('pilotCheck.part2Help')}</p>
            <div {...lang}>
              <p className="tw-check-stimulus">
                <strong>{check.writing.title}</strong>
              </p>
              <ul className="tw-check-clues">
                {check.writing.clues.map((clue) => (
                  <li key={clue}>{clue}</li>
                ))}
              </ul>
              <p className="tw-check-ask">{check.writing.prompt}</p>
            </div>
            <AnswerLines count={9} />
          </article>

          <article className="tw-print-sheet tw-check-sheet tw-check-new-page" aria-labelledby="check-part3">
            <SheetHead t={t} />
            <h2 id="check-part3" className="tw-check-part-title">
              {t('pilotCheck.part3Title')}
            </h2>
            <p className="tw-check-help">{t('pilotCheck.part3Help')}</p>
            <ol className="tw-check-confidence">
              {check.confidence.map((statement, index) => (
                <li key={statement}>
                  <span className="tw-check-number">{formatNumber(index + 1)}</span>
                  <p {...lang}>{statement}</p>
                  <ul className="tw-check-faces">
                    {faces.map((label, level) => (
                      <li key={label}>
                        <Face level={(level + 1) as 1 | 2 | 3 | 4} />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <p className="tw-check-thanks">{t('pilotCheck.thanks')}</p>
          </article>
        </>
      ) : (
        <article className="tw-print-sheet tw-check-sheet" aria-labelledby="check-key">
          <header className="tw-print-head">
            <p className="tw-print-brand">{parent.t('print.brand')}</p>
            <h2 id="check-key" className="tw-print-title">
              {t('pilotCheck.keyTitle')}
            </h2>
            <p className="tw-print-eyebrow">{t('pilotCheck.keyFor')}</p>
          </header>
          <p>{t('pilotCheck.keyIntro')}</p>
          <table className="tw-check-key">
            <thead>
              <tr>
                <th scope="col">{t('pilotCheck.keyQuestion')}</th>
                <th scope="col">{t('pilotCheck.keyAnswer')}</th>
                <th scope="col">{t('pilotCheck.keyLesson')}</th>
                <th scope="col">{t('pilotCheck.keyTaught')}</th>
              </tr>
            </thead>
            <tbody>
              {check.questions.map((question, index) => (
                <tr key={question.id}>
                  <th scope="row">{formatNumber(index + 1)}</th>
                  <td>
                    <strong>{correctLetter(question)}</strong>{' '}
                    <span {...lang}>{question.options.find((option) => option.correct)!.text}</span>
                  </td>
                  <td>{formatNumber(question.lesson)}</td>
                  <td>{question.taught ? t('pilotCheck.taughtYes') : t('pilotCheck.taughtNo')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>{t('pilotCheck.keyUntaught')}</p>

          <h3 className="tw-check-rubric-title">{t('pilotCheck.rubricTitle')}</h3>
          <p>{t('pilotCheck.rubricIntro')}</p>
          <table className="tw-check-key tw-check-rubric">
            <thead>
              <tr>
                <th scope="col">{t('pilotCheck.rubricPart')}</th>
                <th scope="col">{t('pilotCheck.points', { count: 0 })}</th>
                <th scope="col">{t('pilotCheck.points', { count: 1 })}</th>
                <th scope="col">{t('pilotCheck.points', { count: 2 })}</th>
              </tr>
            </thead>
            <tbody {...lang}>
              {check.rubric.map((row) => (
                <tr key={row.part}>
                  <th scope="row">{row.part}</th>
                  <td>{row.zero}</td>
                  <td>{row.one}</td>
                  <td>{row.two}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>{t('pilotCheck.scoring')}</p>
        </article>
      )}
    </div>
  );
}

/** The top of each learner sheet: the code and which session, never a name. */
function SheetHead({ t }: { t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <header className="tw-print-head tw-check-head">
      <p className="tw-print-brand">{t('print.brand')}</p>
      <h2 className="tw-print-title">{t('pilotCheck.sheetTitle')}</h2>
      <div className="tw-check-fields">
        <p>
          <span>{t('pilotCheck.codeLabel')}</span> <span className="tw-check-blank" />
        </p>
        <p>
          <span className="tw-check-box" aria-hidden="true" /> {t('pilotCheck.sessionFirst')}
          <span className="tw-check-box" aria-hidden="true" /> {t('pilotCheck.sessionLast')}
        </p>
        <p>
          <span>{t('pilotCheck.dateLabel')}</span> <span className="tw-check-blank" />
        </p>
      </div>
      <p className="tw-check-noname">{t('pilotCheck.noName')}</p>
    </header>
  );
}
