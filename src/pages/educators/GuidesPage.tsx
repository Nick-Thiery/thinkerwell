/**
 * Teacher guides and answer keys (/educators/guides): the one list of every
 * lesson's teacher guide and print view, and each section check's answer
 * key, for every course: linked from the Educators page's "Teaching
 * materials". Justin's brief of 10 November 2026 put all four courses here
 * in the same shape (a course, its four sections, each section's lessons and
 * its answer key), in the order the course choice has them, instead of at the
 * bottom of each course's own page.
 *
 * Exploring Our World's lessons come from the content (this page's chunk
 * loads them); the other courses' from the build-time outline
 * (src/content/outline.ts), so the whole list is there offline and without
 * downloading a course. A section opens with `?section=`, and a course's
 * heading is at `#<course id>` (the old `#teacher-guides` links on a course's
 * page come here: src/pages/course/CourseOverview.tsx). Nothing here saves or
 * changes anything.
 */
import { useEffect, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { answerKeyPath, educatorsPath, lessonPrintPath, teacherGuidePath } from '../../app/lessonUrls';
import { usePageTitle } from '../../app/usePageTitle';
import { Button, Icon, type IconName } from '../../components/ds';
import { courseSummaries } from '../../content/catalog';
import { COURSES, DEFAULT_COURSE_ID } from '../../content/courses';
import { useCourseOutlines } from '../../content/outline';
import type { CourseOutline } from '../../content/outlineTypes';
import { useContent } from '../../content/useContent';
import { En, useI18n } from '../../i18n';
import { SECTION_ICONS } from '../course/sectionIcons';
import { LessonDisclosure } from '../lesson/LessonDisclosure';
import '../EducatorsPage.css';
import './GuidesPage.css';

/** One section as this page lists it, whichever course it is from. */
interface GuideSection {
  id: string;
  number: number;
  /** The title, already marked with its language (course text). */
  title: ReactNode;
  /** The title as plain text, for a link's accessible name. */
  titleText: string;
  tone: string;
  icon: IconName;
  range: string;
  lessons: ReadonlyArray<{ id: string; number: number; title: ReactNode; titleText: string }>;
  /** How many questions its section check has, or null when it has none. */
  checkQuestions: number | null;
}

interface GuideCourse {
  id: string;
  title: ReactNode;
  titleText: string;
  icon: IconName;
  lessonCount: number;
  /** Every lesson on paper: another course's whole-course print view, none for Our World. */
  printPath: string | null;
  sections: readonly GuideSection[];
}

export function GuidesPage() {
  const { t, tx, contentLang, contentLocale } = useI18n();
  const content = useContent();
  const title = t('pages.guides.title');
  usePageTitle(title);
  const [searchParams] = useSearchParams();
  const open = searchParams.get('section');
  const { hash } = useLocation();
  const { outlines, failed } = useCourseOutlines();

  const range = (numbers: readonly number[]): string => {
    const first = numbers[0] ?? 0;
    const last = numbers[numbers.length - 1] ?? first;
    return first === last ? String(first) : t('pages.course.numberRange', { first, last });
  };

  const ourWorld: GuideCourse = {
    id: DEFAULT_COURSE_ID,
    title: <span {...contentLang}>{content.getCourse().course.title}</span>,
    titleText: content.getCourse().course.title,
    icon: 'Globe',
    lessonCount: content.getLessons().length,
    printPath: null,
    sections: content.getSections().map((section) => ({
      id: section.id,
      number: section.number,
      title: <span {...contentLang}>{section.title}</span>,
      titleText: section.title,
      tone: section.id,
      icon: SECTION_ICONS[section.id],
      range: range(section.lessons),
      lessons: content.getSectionLessons(section.id).map((lesson) => ({ id: lesson.id, number: lesson.number, title: <En>{lesson.title}</En>, titleText: lesson.title })),
      checkQuestions: content.getQuiz(section.id)?.questions.length ?? null,
    })),
  };

  // The language's own name where the course has one, else English (marked).
  const named = (titles: Readonly<Record<string, string>>): { node: ReactNode; text: string } => {
    const translated = titles[contentLocale.code];
    const text = translated ?? titles.en ?? '';
    return { text, node: <span {...(translated ? contentLang : { lang: 'en' })}>{text}</span> };
  };

  const others: GuideCourse[] = outlines
    ? COURSES.filter((course) => course.id !== DEFAULT_COURSE_ID && outlines[course.id]).map((course) => {
        const outline: CourseOutline = outlines[course.id]!;
        const name = named(courseSummaries[course.id]?.titles ?? {});
        return {
          id: course.id,
          title: name.node,
          titleText: name.text,
          icon: (course.icon ?? 'BookOpen') as IconName,
          lessonCount: outline.lessons.length,
          printPath: `/course/${course.id}/print`,
          sections: outline.sections.map((section) => {
            const sectionName = named(section.titles);
            return {
              id: section.id,
              number: section.number,
              title: sectionName.node,
              titleText: sectionName.text,
              tone: section.look.tone,
              icon: section.look.icon as IconName,
              range: range(section.lessons),
              lessons: outline.lessons
                .filter((lesson) => lesson.section === section.id)
                .map((lesson) => {
                  const lessonName = named(lesson.titles);
                  return { id: lesson.id, number: lesson.number, title: lessonName.node, titleText: lessonName.text };
                }),
              checkQuestions: section.checkQuestions,
            };
          }),
        };
      })
    : [];

  const courses = [ourWorld, ...others];

  // A link to one course (/educators/guides#digital-world, the old course-page links) scrolls to its heading once it is there.
  const target = hash.slice(1);
  useEffect(() => {
    if (!target) return undefined;
    if (!courses.some((course) => course.id === target)) return undefined;
    const frame = requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
    // The courses are listed again once the outline has loaded: only then is a course other than Our World there to scroll to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, outlines]);

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
      <nav aria-label={t('courseChoice.label')} className="tw-guides-jump">
        <ul role="list">
          {COURSES.filter((course) => course.id === DEFAULT_COURSE_ID || course.open).map((course) => {
            const found = courses.find((c) => c.id === course.id);
            const label = found ? found.title : named(courseSummaries[course.id]?.titles ?? {}).node;
            return (
              <li key={course.id}>
                <a href={`#${course.id}`} className="tw-chip">
                  <Icon name={found?.icon ?? ((course.icon ?? 'Globe') as IconName)} size={18} />
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      {courses.map((course) => (
        <section key={course.id} id={course.id} aria-labelledby={`${course.id}-guides-title`} className="tw-guides-course">
          <div className="tw-guides-course-head">
            <h2 id={`${course.id}-guides-title`} className="h2 tw-guides-course-title">
              <Icon name={course.icon} size={26} />
              {course.title}
            </h2>
            <p className="small tw-guides-range">{t('pages.guides.lessonCount', { count: course.lessonCount })}</p>
            {course.printPath ? (
              <Button variant="secondary" icon="Printer" href={course.printPath} aria-label={t('pages.guides.printAllLabel', { course: course.titleText })}>
                {t('pages.guides.printAll')}
              </Button>
            ) : null}
          </div>
          {course.sections.map((section) => (
            <LessonDisclosure
              key={section.id}
              className={`tw-guides-section tw-guides-${section.tone}`}
              defaultOpen={open === section.id}
              summary={
                <span className="tw-guides-summary" id={`guides-${section.id}`}>
                  <span className="tw-guides-icon">
                    <Icon name={section.icon} size={22} />
                  </span>
                  <span className="tw-guides-summary-text">
                    <span className="tw-guides-section-title">{section.title}</span>
                    <span className="small tw-guides-range">{t('pages.guides.lessons', { range: section.range })}</span>
                  </span>
                </span>
              }
            >
              <ul className="tw-guides-lessons" role="list">
                {section.lessons.map((lesson) => (
                  <li key={lesson.id} className="tw-guides-lesson">
                    <span className="tw-guides-lesson-title">{tx('pages.guides.lesson', { number: lesson.number, title: lesson.title })}</span>
                    <span className="tw-guides-actions">
                      <Button
                        variant="secondary"
                        icon="GraduationCap"
                        href={teacherGuidePath(lesson.id)}
                        aria-label={t('pages.guides.teacherGuideLabel', { number: lesson.number, title: lesson.titleText })}
                      >
                        {t('pages.educators.teacherGuide')}
                      </Button>
                      <Button variant="ghost" icon="Printer" href={lessonPrintPath(lesson.id)} aria-label={t('pages.guides.printLabel', { number: lesson.number, title: lesson.titleText })}>
                        {t('pages.guides.print')}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
              {section.checkQuestions !== null ? (
                <div className="tw-edu-check tw-guides-check">
                  <span className="tw-edu-check-icon">
                    <Icon name="ClipboardCheck" size={22} />
                  </span>
                  <span className="tw-edu-check-text">
                    <span className="tw-edu-check-title">{tx('pages.sectionCheck.title', { section: section.title })}</span>
                    <span className="small tw-edu-check-meta">{t('pages.sectionCheck.factQuestions', { count: section.checkQuestions, range: section.range })}</span>
                  </span>
                  <Button
                    variant="secondary"
                    icon="ClipboardCheck"
                    href={answerKeyPath(section.id)}
                    aria-label={t('pages.educators.answerKeyLabel', { section: section.titleText })}
                  >
                    {t('pages.educators.answerKey')}
                  </Button>
                </div>
              ) : null}
            </LessonDisclosure>
          ))}
        </section>
      ))}
      {failed ? <p className="body tw-guides-failed">{t('pages.guides.outlineFailed')}</p> : null}
      {!outlines && !failed ? <p className="small tw-guides-failed">{t('pages.guides.loading')}</p> : null}
    </div>
  );
}
