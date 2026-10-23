/**
 * Teacher guides and answer keys (/educators/guides): the one list of every
 * lesson's teacher guide and print view, and each section check's answer
 * key, linked from the Educators page's "Teaching materials" (October 2026,
 * when the Educators page stopped listing every lesson).
 *
 * Four folded sections, each with its icon and name (section colours only
 * in section places), its lessons by number and title with two links each,
 * and its answer key at the end. `?section=` opens one: the teacher guides
 * and answer keys come back to it. Nothing here saves or changes anything.
 */
import { useSearchParams } from 'react-router';
import { answerKeyPath, educatorsPath, lessonPrintPath, teacherGuidePath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Button, Icon } from '../../components/ds';
import { useContent } from '../../content/useContent';
import { En, useI18n } from '../../i18n';
import { SECTION_ICONS } from '../course/sectionIcons';
import { LessonDisclosure } from '../lesson/LessonDisclosure';
import '../EducatorsPage.css';
import './GuidesPage.css';

export function GuidesPage() {
  const { t, tx, contentLang } = useI18n();
  const content = useContent();
  const title = t('pages.guides.title');
  usePageTitle(title);
  const [searchParams] = useSearchParams();
  const open = searchParams.get('section');

  return (
    <div className="tw-guides-page">
      <Button variant="ghost" icon="ArrowLeft" href={educatorsPath()} className="tw-guides-back">
        {t('pages.teacherTools.back')}
      </Button>
      <header className="tw-guides-head">
        <h1 className="h1" tabIndex={-1}>
          {title}
        </h1>
        <p className="body-lg">{t('pages.guides.intro')}</p>
      </header>
      {content.getSections().map((section) => {
        const lessons = content.getSectionLessons(section.id);
        const quiz = content.getQuiz(section.id);
        const first = section.lessons[0] ?? 0;
        const last = section.lessons[section.lessons.length - 1] ?? first;
        const range = first === last ? String(first) : t('pages.course.numberRange', { first, last });
        return (
          <LessonDisclosure
            key={section.id}
            className={`tw-guides-section tw-guides-${section.id}`}
            defaultOpen={open === section.id}
            summary={
              <span className="tw-guides-summary">
                <span className="tw-guides-icon">
                  <Icon name={SECTION_ICONS[section.id]} size={22} />
                </span>
                <span className="tw-guides-summary-text">
                  <span className="tw-guides-section-title" {...contentLang}>
                    {section.title}
                  </span>
                  <span className="small tw-guides-range">{t('pages.guides.lessons', { range })}</span>
                </span>
              </span>
            }
          >
            <ul className="tw-guides-lessons" role="list">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="tw-guides-lesson">
                  <span className="tw-guides-lesson-title">
                    {tx('pages.guides.lesson', { number: lesson.number, title: <En>{lesson.title}</En> })}
                  </span>
                  <span className="tw-guides-actions">
                    <Button
                      variant="secondary"
                      icon="GraduationCap"
                      href={teacherGuidePath(lesson.id)}
                      aria-label={t('pages.educators.teacherGuideLabel', { number: lesson.number })}
                    >
                      {t('pages.educators.teacherGuide')}
                    </Button>
                    <Button
                      variant="ghost"
                      icon="Printer"
                      href={lessonPrintPath(lesson.id)}
                      aria-label={t('pages.guides.printLabel', { number: lesson.number })}
                    >
                      {t('pages.guides.print')}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
            {quiz ? (
              <div className="tw-edu-check tw-guides-check">
                <span className="tw-edu-check-icon">
                  <Icon name="ClipboardCheck" size={22} />
                </span>
                <span className="tw-edu-check-text">
                  <span className="tw-edu-check-title">{tx('pages.sectionCheck.title', { section: <En>{section.title}</En> })}</span>
                  <span className="small tw-edu-check-meta">{t('pages.sectionCheck.factQuestions', { count: quiz.questions.length, range })}</span>
                </span>
                <Button
                  variant="secondary"
                  icon="ClipboardCheck"
                  href={answerKeyPath(section.id)}
                  aria-label={t('pages.educators.answerKeyLabel', { section: section.title })}
                >
                  {t('pages.educators.answerKey')}
                </Button>
              </div>
            ) : null}
          </LessonDisclosure>
        );
      })}
    </div>
  );
}
