/**
 * A lesson on paper (/lesson/:id/print; design-system README: "every lesson
 * has a print view (plain black text on white, no header)"): the warm-up,
 * the picture and evidence, the reading in both levels with the key words
 * in bold, the key words, the quick check and every task, with lines to
 * write on. On screen it looks like a sheet of paper under a small toolbar;
 * printed (src/styles/print.css, ./print.css), there is no header,
 * navigation or colour, and the reading levels and tasks start on new
 * pages. Nothing here is saved or read from storage.
 */
import { Fragment } from 'react';
import { lessonPath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { type CourseLesson, type GlossaryEntry, type ReadSection } from '../../content';
import { useLessonContent } from '../../content/useContent';
import { AlwaysEn, En, useI18n } from '../../i18n';
import { splitParagraphs } from '../../lesson';
import { LessonSlot } from '../../lesson/extras';
import type { ReadingLevel } from '../../storage';
import { LessonEvidence } from '../lesson/evidence/LessonEvidence';
import { buildReading } from '../lesson/read/readingPieces';
import { AnswerLines, PrintToolbar } from './PrintToolbar';
import './print.css';

export function LessonPrintPage({ lesson }: { lesson: CourseLesson }) {
  // Everything from the lesson file is course text, marked as English (`en`).
  const { t, tx, contentLang: en } = useI18n();
  const content = useLessonContent();
  usePageTitle(t('print.lessonPageTitle', { number: lesson.number }));
  const section = content.getLessonSection(lesson);
  const [min, max] = lesson.estimatedMinutes;
  const { read, write, speak, watch, reflect } = lesson;

  return (
    <div className="tw-print-page">
      <PrintToolbar backHref={lessonPath(lesson.id, 'read')} backLabel={t('print.backToLesson')} />
      <p className="tw-print-intro tw-no-print">{t('print.lessonIntro')}</p>

      <article className="tw-print-sheet" aria-labelledby="print-title">
        <header className="tw-print-head">
          <p className="tw-print-brand">{t('print.brand')}</p>
          <LessonSlot name="sheet:top" />
          <p className="tw-print-eyebrow">{tx('pages.course.lessonLabel', { number: lesson.number, section: <En>{section.title}</En> })}</p>
          <h1 id="print-title" className="tw-print-title" tabIndex={-1} {...en}>
            {lesson.title}
          </h1>
          <p className="tw-print-question" {...en}>
            {lesson.essentialQuestion}
          </p>
          <p>
            <strong>{t('print.learningGoal')}</strong> <En>{lesson.learningGoal}</En>
          </p>
          <p className="tw-print-muted">{t('lesson.minutes', { min, max })}</p>
        </header>

        <section className="tw-print-part">
          <h2>{t('lessonPlayer.read.warmUpEyebrow')}</h2>
          <p {...en}>{lesson.warmUp.question}</p>
          {lesson.warmUp.options ? (
            <ul className="tw-print-boxes" {...en}>
              {lesson.warmUp.options.map((option, index) => (
                <li key={index}>{option}</li>
              ))}
            </ul>
          ) : (
            <AnswerLines count={2} />
          )}
        </section>

        <section className="tw-print-part tw-print-evidence">
          <h2>{t('lessonPlayer.evidence.sectionLabel')}</h2>
          <LessonEvidence evidence={lesson.evidence} visual={lesson.visual} enlargeablePicture={false} />
        </section>
        <LessonSlot name="print:after-evidence" />

        <Reading
          title={t('print.readingStandard')}
          sections={read.sections}
          level="standard"
          glossary={read.glossary}
        />
        <Reading
          title={t('print.readingSimpler')}
          sections={read.sections}
          level="simpler"
          glossary={read.glossary}
        />

        <section className="tw-print-part">
          <h2>{t('lessonPlayer.read.keyWordsTitle')}</h2>
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

        <section className="tw-print-part">
          <h2>{t('lessonPlayer.read.checkTitle')}</h2>
          <ol className="tw-print-questions">
            {read.checks.map((check, index) => (
              <li key={index} className="tw-print-keep">
                <p>
                  <En>{check.question}</En>
                  {check.type === 'think' && check.optional ? <> {t('print.optional')}</> : null}
                </p>
                {check.type === 'choice' ? (
                  <ul className="tw-print-boxes" {...en}>
                    {check.options.map((option, optionIndex) => (
                      <li key={optionIndex}>{option.text}</li>
                    ))}
                  </ul>
                ) : (
                  <AnswerLines count={3} />
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="tw-print-part tw-print-new-page">
          <h2>{t('stages.write')}</h2>
          <p className="tw-print-task" {...en}>
            {write.prompt}
          </p>
          <div className="tw-print-keep">
            <h3>{t('lessonPlayer.write.modeStarters')}</h3>
            <ul {...en}>
              {write.sentenceStarters.map((starter, index) => (
                <li key={index}>{starter}</li>
              ))}
            </ul>
          </div>
          <h3>{t('lessonPlayer.write.modePlan')}</h3>
          {write.planningBoxes.map((box, index) => (
            <div key={index} className="tw-print-keep">
              <p {...en}>{box}</p>
              <AnswerLines count={2} />
            </div>
          ))}
          <h3>{t('lessonPlayer.write.answerLabel')}</h3>
          <AnswerLines count={8} />
          <div className="tw-print-keep">
            <h3>{t('lessonPlayer.write.selfCheckTitle')}</h3>
            <ul className="tw-print-boxes" {...en}>
              {write.selfCheck.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
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
          <h2>{t('print.watchTitle')}</h2>
          <p className="tw-print-muted">{tx('print.videoNote', { title: <AlwaysEn>{watch.title}</AlwaysEn>, channel: <AlwaysEn>{watch.channel}</AlwaysEn> })}</p>
          <div className="tw-print-keep">
            <h3>{t('lessonPlayer.watch.thinkFirst')}</h3>
            <p {...en}>{watch.beforeQuestion}</p>
            <AnswerLines count={2} />
          </div>
          <h3>{tx('print.writtenVersion', { title: <AlwaysEn>{watch.title}</AlwaysEn> })}</h3>
          {splitParagraphs(watch.summary).map((paragraph, index) => (
            <p key={index} className="tw-print-reading-text" {...en}>
              {paragraph}
            </p>
          ))}
          <div className="tw-print-keep">
            <h4>{t('lessonPlayer.watch.keyPoints')}</h4>
            <ul {...en}>
              {watch.keyPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
          <div className="tw-print-keep">
            <h3>{t('lessonPlayer.watch.afterEyebrow')}</h3>
            <p {...en}>{watch.afterQuestion}</p>
            <AnswerLines count={3} />
          </div>
        </section>

        <section className="tw-print-part">
          <h2>{t('stages.reflect')}</h2>
          {reflect.prompts.map((prompt, index) => (
            <div key={index} className="tw-print-keep">
              <p>
                <En>{prompt.text}</En>
                {prompt.required ? null : <> {t('print.optional')}</>}
              </p>
              <AnswerLines count={3} />
            </div>
          ))}
        </section>
      </article>
    </div>
  );
}

interface ReadingProps {
  title: string;
  sections: readonly ReadSection[];
  level: ReadingLevel;
  glossary: readonly GlossaryEntry[];
}

/** Every part of the reading in one level, key words in bold on their first appearance in each part, as on screen. */
function Reading({ title, sections, level, glossary }: ReadingProps) {
  const { t, contentLang } = useI18n();
  return (
    <section className="tw-print-part tw-print-new-page">
      <h2>{title}</h2>
      <p className="tw-print-muted">{t('print.keyWordsNote')}</p>
      {sections.map((part, index) => (
        <Fragment key={index}>
          <h3 {...contentLang}>{part.heading}</h3>
          {buildReading(level === 'simpler' ? part.simpler : part.text, glossary).map((paragraph) => (
            <p key={paragraph.start} className="tw-print-reading-text" {...contentLang}>
              {paragraph.runs.flatMap((run) => run.segments).map((segment, index) =>
                segment.kind === 'term' ? <strong key={index}>{segment.text}</strong> : <Fragment key={index}>{segment.text}</Fragment>,
              )}
            </p>
          ))}
        </Fragment>
      ))}
    </section>
  );
}
