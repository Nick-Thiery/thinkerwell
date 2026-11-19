/**
 * Every course's sections and lessons, with their names in the language on
 * screen, for the class views: Our World from the catalog, the others from
 * the build-time outline (src/content/outline.ts), so no course is loaded.
 */
import { useMemo } from 'react';
import { courseSummaries } from '../../content/catalog';
import { COURSES, DEFAULT_COURSE_ID } from '../../content/courses';
import { useCourseOutlines } from '../../content/outline';
import { useCatalog } from '../../content/useCatalog';
import { useI18n } from '../../i18n';

export interface FlatLesson {
  id: string;
  number: number;
  title: string;
  courseId: string;
  sectionId: string;
}

export interface FlatSection {
  id: string;
  title: string;
  lessonIds: string[];
  hasCheck: boolean;
}

export interface FlatCourse {
  id: string;
  title: string;
  sections: FlatSection[];
  lessonCount: number;
}

export interface FlatCourses {
  courses: FlatCourse[];
  lessons: ReadonlyMap<string, FlatLesson>;
  sections: ReadonlyMap<string, FlatSection & { courseId: string }>;
}

export function useFlatCourses(): FlatCourses | null {
  const catalog = useCatalog();
  const { contentLocale } = useI18n();
  const { outlines } = useCourseOutlines();
  return useMemo(() => {
    if (!outlines) return null;
    const pick = (titles: Readonly<Record<string, string>>) => titles[contentLocale.code] ?? titles.en ?? '';
    const lessons = new Map<string, FlatLesson>();
    const sections = new Map<string, FlatSection & { courseId: string }>();
    const courses: FlatCourse[] = [];

    const ourLessons = catalog.getLessons();
    const ourSections: FlatSection[] = catalog.getSections().map((section) => ({
      id: section.id,
      title: section.title,
      lessonIds: ourLessons.filter((lesson) => lesson.section === section.id).map((lesson) => lesson.id),
      hasCheck: catalog.getQuizQuestionCount(section.id) > 0,
    }));
    for (const lesson of ourLessons) lessons.set(lesson.id, { id: lesson.id, number: lesson.number, title: lesson.title, courseId: DEFAULT_COURSE_ID, sectionId: lesson.section });
    courses.push({ id: DEFAULT_COURSE_ID, title: catalog.getCourse().course.title, sections: ourSections, lessonCount: ourLessons.length });

    for (const definition of COURSES) {
      if (definition.id === DEFAULT_COURSE_ID) continue;
      const outline = outlines[definition.id];
      const summary = courseSummaries[definition.id];
      if (!outline || !summary) continue;
      const byNumber = new Map(outline.lessons.map((lesson) => [lesson.number, lesson]));
      const flatSections: FlatSection[] = outline.sections.map((section) => ({
        id: section.id,
        title: pick(section.titles),
        lessonIds: section.lessons.map((number) => byNumber.get(number)?.id).filter((id): id is string => Boolean(id)),
        hasCheck: section.checkQuestions !== null,
      }));
      for (const lesson of outline.lessons)
        lessons.set(lesson.id, { id: lesson.id, number: lesson.number, title: pick(lesson.titles), courseId: definition.id, sectionId: lesson.section });
      courses.push({ id: definition.id, title: pick(summary.titles), sections: flatSections, lessonCount: outline.lessons.length });
    }
    for (const course of courses) for (const section of course.sections) sections.set(section.id, { ...section, courseId: course.id });
    return { courses, lessons, sections };
  }, [catalog, contentLocale.code, outlines]);
}
