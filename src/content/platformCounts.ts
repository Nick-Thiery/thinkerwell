/**
 * How big the platform is, worked out from the build-time catalog so no count
 * is written by hand: the courses every device shows (Our World and each
 * course marked `open`) and their lessons together. Used by the visitor
 * home's line ("Over 70 lessons · 4 courses") and the learner Home.
 */
import { courseSummaries } from './catalog';
import { COURSES, DEFAULT_COURSE_ID } from './courses';

export function openCourseIds(): string[] {
  return COURSES.filter((course) => course.id === DEFAULT_COURSE_ID || (course.open && courseSummaries[course.id])).map((course) => course.id);
}

/** Every lesson of every open course, and how many courses there are. */
export function platformTotals(ourWorldLessons: number): { lessons: number; courses: number } {
  const ids = openCourseIds();
  const others = ids.filter((id) => id !== DEFAULT_COURSE_ID).reduce((sum, id) => sum + (courseSummaries[id]?.lessons ?? 0), 0);
  return { lessons: ourWorldLessons + others, courses: ids.length };
}

/** "Over 70": the total rounded down to the nearest ten. */
export function roundedDownToTen(count: number): number {
  return Math.floor(count / 10) * 10;
}
