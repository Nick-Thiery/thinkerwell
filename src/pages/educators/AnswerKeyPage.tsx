/**
 * The answer key for a section check (/educators/section/:id/answers), for
 * teachers: every question with its made-up example, its options in the
 * content's order, the correct one marked in words and with a tick, the
 * feedback learners see for each option, and the lesson it comes from.
 * Like the teacher guide, the same page on screen and on paper.
 */
import { Link } from 'react-router';
import { educatorsPath, teacherGuidePath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { EvidenceCard, Icon } from '../../components/ds';
import { getLessonByNumber, type QuizFile, type QuizStimulus, type Section } from '../../content';
import { useI18n } from '../../i18n';
import { PrintToolbar } from '../print/PrintToolbar';
import '../print/print.css';
import { AnswerOptions } from './AnswerOptions';
import './teacherTools.css';

export interface AnswerKeyPageProps {
  section: Section;
  quiz: QuizFile;
}

export function AnswerKeyPage({ section, quiz }: AnswerKeyPageProps) {
  const { t } = useI18n();
  const title = t('pages.answerKey.title', { section: section.title });
  usePageTitle(title);
  const first = section.lessons[0] ?? 0;
  const last = section.lessons[section.lessons.length - 1] ?? first;
  const range = first === last ? String(first) : t('pages.course.numberRange', { first, last });

  return (
    <div className="tw-print-page tw-key-page">
      <PrintToolbar backHref={educatorsPath(section.id)} backLabel={t('pages.teacherTools.back')} />
      <p className="tw-print-intro tw-no-print">{t('pages.answerKey.intro')}</p>

      <article className="tw-print-sheet tw-key" aria-labelledby="key-title">
        <header className="tw-print-head">
          <p className="tw-print-brand">{t('print.brand')}</p>
          <p className="tw-print-eyebrow">{t('pages.answerKey.eyebrow', { number: section.number })}</p>
          <h1 id="key-title" className="tw-print-title" tabIndex={-1}>
            {title}
          </h1>
          <p className="tw-print-muted">{t('pages.sectionCheck.factQuestions', { count: quiz.questions.length, range })}</p>
          <p>{t('pages.answerKey.practice')}</p>
          <p>{t('pages.answerKey.order')}</p>
        </header>

        {quiz.questions.map((question, index) => {
          const lesson = getLessonByNumber(question.lesson);
          return (
            <section key={question.id} className="tw-print-part tw-key-question">
              <h2>
                {t('pages.answerKey.question', { n: index + 1, skill: t(`pages.sectionCheck.skill.${question.skill}`) })}
              </h2>
              {question.stimulus ? <Stimulus stimulus={question.stimulus} /> : null}
              <p className="tw-key-prompt">{question.question}</p>
              <AnswerOptions options={question.options} feedback="every" />
              {lesson ? (
                <p>
                  <Link className="tw-key-from" to={teacherGuidePath(lesson.id)}>
                    <Icon name="BookOpen" size={18} />
                    <span>{t('pages.answerKey.fromLesson', { number: lesson.number, title: lesson.title })}</span>
                  </Link>
                </p>
              ) : null}
            </section>
          );
        })}
      </article>
    </div>
  );
}

/** The made-up example a question refers to, as the section check shows it (QuizQuestionScreen). */
function Stimulus({ stimulus }: { stimulus: QuizStimulus }) {
  return stimulus.type === 'items' ? (
    <EvidenceCard title={stimulus.title} items={stimulus.items} />
  ) : (
    <EvidenceCard title={stimulus.title} text={stimulus.body} />
  );
}
